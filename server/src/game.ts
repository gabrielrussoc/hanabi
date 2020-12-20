import {
    CardNotFoundError,
    DevOnlyError,
    NotEnoughHintsError,
    TooManyHintsToDiscardError,
    UnknownPlayerError,
    WrongTurnError,
    GameOverError,
} from './errors';
import { LobbyId } from './lobby';
import { Cookie } from './cookie';
import { List as ImmutableList, Map as ImmutableMap, ValueObject, hash } from 'immutable';
import { ICard, IColor, IDiscard, IFireworks, IGame, IGamePlayer, ICardMove } from 'hanabi-interface';

const env = process.env.NODE_ENV || 'development';

export class Card implements ValueObject {
    color: IColor;
    value: number;

    equals(other: Card): boolean {
        return this.value === other.value && this.color === other.color;
    }

    hashCode(): number {
        let val = 17;
        val = val * 37 + hash(this.color);
        val = val * 37 + hash(this.value);
        return val | 0;
    }

    constructor(color: IColor, value: number) {
        this.color = color;
        this.value = value;
    }

    toPublic(): ICard {
        return {
            color: this.color,
            value: this.value,
        }
    }
}

// The result of a play. A play can either be successful (i.e. valid card),
// or unsuccessful. On the first case, it can also complete a color, which
// gives an extra hint.
enum PlayResult {
    Successful,
    Unsuccessful,
    IColorCompleted,
}

export class Fireworks {
    // Amount of cards per color (aka highest card of each color)
    #inner: ImmutableMap<IColor, number>;
    #score: number;

    readonly #MAXIMUM_SCORE = 25;

    constructor() {
        this.#inner = ImmutableMap();
        this.#score = 0;
    }

    tryPlayCard(card: Card): PlayResult {
        const color = card.color;
        const currentValue = this.#inner.get(color) ?? 0;
        const newValue = card.value;

        if (currentValue + 1 === newValue) {
            this.#inner = this.#inner.set(color, newValue);
            this.#score += 1;
            return newValue === 5 ? PlayResult.IColorCompleted : PlayResult.Successful;
        }
        return PlayResult.Unsuccessful;
    }

    score(): number {
        return this.#score;
    }

    win(): boolean {
        return this.score() === this.#MAXIMUM_SCORE;
    }

    toPublic(): IFireworks {
        return {
            // TODO: guarantee that every color is present and ordering is consistent
            inner: this.#inner.toArray(),
            score: this.#score,
        }
    }
}

export class Discard {
    // number of discarded cards
    #inner: ImmutableMap<Card, number>;

    constructor() {
        this.#inner = ImmutableMap();
    }

    discard(card: Card) {
        const value = this.#inner.get(card) ?? 0;
        this.#inner = this.#inner.set(card, value + 1);
    }

    status(): ReadonlyMap<Card, number> {
        return this.#inner;
    }

    toPublic(): IDiscard {
        return {
            inner: this.#inner.toArray().sort((a: [Card, number], b: [Card, number]) => {
                const lhs = a[0];
                const rhs = b[0];
                if (lhs.color === rhs.color) return lhs.value - rhs.value;
                return lhs.color - rhs.color;
            }),
        }
    }
}

export class Player {
    // Cards are 0-indexed
    #cardsInOrder: ImmutableList<Card>;

    // Index of the player on a room. Used to track turns.
    readonly index: number;

    // Unique identifier to a player.
    // Used to validate players (for reconnecting, etc).
    readonly cookie: Cookie;

    constructor(cardsInOrder: Card[], index: number, cookie: Cookie) {
        this.#cardsInOrder = ImmutableList(cardsInOrder);
        this.index = index;
        this.cookie = cookie;
    }

    removeCard(card: Card) {
        const index = this.#cardsInOrder.indexOf(card);
        if (index === -1) {
            throw new CardNotFoundError("Player doesn't have the card");
        }
        this.#cardsInOrder = this.#cardsInOrder.delete(index);
    }

    addCard(card: Card) {
        this.#cardsInOrder = this.#cardsInOrder.push(card);
    }

    cards(): ImmutableList<Card> {
        return this.#cardsInOrder;
    }

    moveCard(cardMove: ICardMove) {
        const {index, left} = cardMove;
        const card = this.#cardsInOrder.get(index);
        if (card == null) {
            throw new CardNotFoundError("Invalid card to move");
        }
        const newIndex = Math.min(Math.max(0, index - (left? 1 : -1)), this.#cardsInOrder.size - 1);
        this.#cardsInOrder = this.#cardsInOrder.delete(index).insert(newIndex, card);
    }

    toPublic(): IGamePlayer {
        return {
            index: this.index,
            cardsInOrder: this.#cardsInOrder.map(c => c.toPublic()).toArray(),
            name: this.cookie.name(),
        }
    }
}

export enum GameOver {
    ZeroLives,
    NoMoreCards,
    FireworksComplete
}

// Amount of cards per value
// I.e. we have 1 five of every color
// 2 fours of every color
// etc
//                       x  1  2  3  4  5
const CARDS_PER_VALUE = [0, 3, 2, 2, 2, 1]

function shuffleInPlace(arr: any[]) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function generateAllCards(): Card[] {
    const cards = [];
    for (let value = 1; value <= 5; value++) {
        const copies = CARDS_PER_VALUE[value];
        for (let i = 0; i < copies; i++) {
            // I dont know how to properly iterate over enum values
            cards.push(new Card(IColor.RED, value));
            cards.push(new Card(IColor.YELLOW, value));
            cards.push(new Card(IColor.WHITE, value));
            cards.push(new Card(IColor.GREEN, value));
            cards.push(new Card(IColor.BLUE, value));
        }
    }
    shuffleInPlace(cards);
    return cards;
}

// An instance of a Hanabi game
// It holds player information, hints, lives, discard, etc
export class Game {
    // The lobby this game is associated with
    readonly id: LobbyId;

    // Information about the players
    readonly #playersInOrder: Player[];
    #currentPlaying: number;
    #isLastRound: boolean;
    #lastRoundRemaining: number;

    // Information about the table
    #MAX_HINTS = 8;

    #hints = this.#MAX_HINTS;
    #lives = 3;
    #remainingCards: Card[];
    #fireworks: Fireworks;
    #discard: Discard;

    constructor(id: LobbyId, cookies: Cookie[]) {
        this.id = id;
        this.#fireworks = new Fireworks();
        this.#discard = new Discard();

        // Randomize the starting order of the players
        shuffleInPlace(cookies);
        this.#currentPlaying = 0;
        this.#isLastRound = false;
        this.#remainingCards = generateAllCards();
        // TODO: validate number of players (min 2, max 5)
        this.#playersInOrder = [];
        const numPlayers = cookies.length;
        const cardsPerPlayer = numPlayers > 3 ? 4 : 5;
        for (let i = 0; i < numPlayers; i++) {
            const cards = [];
            for (let j = 0; j < cardsPerPlayer; j++) {
                const card = this.#remainingCards.pop();
                if (card !== undefined) { // should always be true
                    cards.push(card);
                }
            }
            this.#playersInOrder.push(new Player(cards, i, cookies[i]));
        }
        this.#lastRoundRemaining = this.#playersInOrder.length;
    }

    private validateTurn(player: Player) {
        if (this.#playersInOrder.findIndex((p) => p.cookie.equals(player.cookie)) === -1) {
            throw new UnknownPlayerError("Unknown player");
        }
        if (this.#currentPlaying !== player.index) {
            throw new WrongTurnError("It's not your turn!");
        }
        if (this.gameOver() !== null) {
            throw new GameOverError();
        }
    }

    // Returns the reason the game is over
    // Returns null if game not over
    gameOver(): GameOver | null {
        if (this.#lives === 0) {
            return GameOver.ZeroLives;
        }
        if (this.#fireworks.win()) {
            return GameOver.FireworksComplete;
        }
        if (this.#lastRoundRemaining === 0) {
            return GameOver.NoMoreCards;
        }
        return null;
    }

    private advanceTurn() {
        if (this.#isLastRound) {
            this.#lastRoundRemaining--;
        }
        this.#currentPlaying = (this.#currentPlaying + 1) % this.#playersInOrder.length;
    }

    private bumpHints() {
        this.#hints = Math.min(this.#hints + 1, this.#MAX_HINTS);
    }

    private removeAndDraw(player: Player, card: Card) {
        player.removeCard(card);
        const newCard = this.#remainingCards.pop();
        if (newCard !== undefined) {
            player.addCard(newCard);
        } else {
            this.#isLastRound = true;
        }
    }

    playerFrom(cookie: Cookie): Player {
        const player = this.#playersInOrder.find((p: Player): boolean => {
            return p.cookie.equals(cookie);
        });
        if (player) {
            return player;
        }
        throw new UnknownPlayerError('Player ' + cookie.printable + ' is unknown to ' + this.id.string());
    }

    moveCard(player: Player, move: ICardMove) {
        player.moveCard(move);
    }

    // Plays a card. Throws if invalid.
    play(player: Player, card: Card) {
        this.validateTurn(player);

        // First try to remove a card from the player hand since it can throw.
        this.removeAndDraw(player, card);
        const result = this.#fireworks.tryPlayCard(card);
        if (result === PlayResult.Unsuccessful) {
            this.#discard.discard(card);
            this.#lives--;
        } else if (result === PlayResult.IColorCompleted) {
            this.bumpHints();
        }

        this.advanceTurn();
    }

    // Discards a card. Throws if invalid.
    discard(player: Player, card: Card) {
        this.validateTurn(player);

        if (this.#hints === this.#MAX_HINTS) {
            throw new TooManyHintsToDiscardError("You can't discard when all hints available");
        }

        // First try to remove a card from the player hand since it can throw.
        this.removeAndDraw(player, card);
        this.#discard.discard(card);
        this.bumpHints();

        this.advanceTurn();
    }

    // Gives a hint. Throws if invalid.
    hint(player: Player) {
        this.validateTurn(player);

        if (this.#hints === 0) {
            throw new NotEnoughHintsError("You have 0 hints.");
        }

        this.#hints--;

        this.advanceTurn();
    }

    currentPlayerCookie(): Cookie {
        if (env === "development") {
            return this.#playersInOrder[this.#currentPlaying].cookie;
        }
        throw new DevOnlyError("Can't access player cookies outside of dev environment");
    }

    toPublic(): IGame {
        return {
            playersInOrder: this.#playersInOrder.map(p => p.toPublic()),
            currentPlaying: this.#currentPlaying,
            isLastRound: this.#isLastRound,
            lastRoundRemaining: this.#lastRoundRemaining,

            hints: this.#hints,
            maxHints: this.#MAX_HINTS,
            lives: this.#lives,
            remainingCards: this.#remainingCards.length,

            fireworks: this.#fireworks.toPublic(),
            discard: this.#discard.toPublic(),

            gameOver: this.gameOver() !== null,
        }
    }
}