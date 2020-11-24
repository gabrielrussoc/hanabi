export enum Color {
    RED,
    YELLOW,
    GREEN,
    BLUE,
    WHITE
}

export class Card {
    color: Color;
    value: number;

    constructor(color: Color, value: number) {
        this.color = color;
        this.value = value;
    }
}

// The result of a play. A play can either be successful (i.e. valid card),
// or unsuccessful. On the first case, it can also complete a color, which
// gives an extra hint.
enum PlayResult {
    Successful,
    Unsuccessful,
    ColorCompleted,
}

export class Fireworks {
    // Amount of cards per color (aka highest card of each color)
    #inner: Map<Color, number>;
    #score: number;

    readonly #MAXIMUM_SCORE = 25;

    constructor() {
        this.#inner = new Map();
        this.#score = 0;
    }

    tryPlayCard(card: Card): PlayResult {
        const color = card.color;
        const current_value = this.#inner.get(color) ?? 0;
        const new_value = card.value;

        if (current_value + 1 == new_value) {
            this.#inner.set(color, new_value);
            this.#score += 1;
            return new_value == 5 ? PlayResult.ColorCompleted : PlayResult.Successful;
        }
        return PlayResult.Unsuccessful;
    }

    score(): number {
        return this.#score;
    }

    win(): boolean {
        return this.score() == this.#MAXIMUM_SCORE;
    }
}

export class Discard {
    // number of discarded cards
    #inner: Map<Card, number>;

    constructor() {
        this.#inner = new Map();
    }

    discard(card: Card) {
        const value = this.#inner.get(card) ?? 0;
        this.#inner.set(card, value + 1);
    }

    status(): ReadonlyMap<Card, number> {
        return this.#inner;
    }
}

export class Cookie {
    #value: string;

    constructor(value: string) {
        this.#value = value;
    }

    equals(other: Cookie): boolean {
        return this.#value === other.#value;
    }
}

class CardNotFoundError extends Error {
    constructor(m: string) {
        super(m);
    }
}

export class Player {
    // Cards are 0-indexed
    #cardsInOrder: Array<Card>;

    // Index of the player on a room. Used to track turns.
    readonly index: number;

    // Unique identifier to a player.
    // Used to validate players (for reconnecting, etc).
    readonly cookie: Cookie;

    constructor(cardsInOrder: Array<Card>, index: number, cookie: Cookie) {
        this.#cardsInOrder = cardsInOrder;
        this.index = index;
        this.cookie = cookie;
    }

    removeCard(card: Card) {
        const index = this.#cardsInOrder.indexOf(card);
        if (index === -1) {
            throw new CardNotFoundError("Player doesn't have the card");
        }
        this.#cardsInOrder.splice(index, 1 /* amount */);
    }

    addCard(card: Card) {
        this.#cardsInOrder.push(card);
    }

    cards(): ReadonlyArray<Card> {
        return this.#cardsInOrder;
    }
}

export class RoomId {
    #value: string;

    constructor() {
        // well, it works
        this.#value = '';
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (let i = 0; i < 4; i++) {
            this.#value += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    }

    string(): string {
        return this.#value;
    }
}

export enum GameOver {
    ZeroLives,
    NoMoreCards,
    FireworksComplete
}

class UnknownPlayerError extends Error {
    constructor(m: string) {
        super(m);
    }
}

class WrongTurnError extends Error {
    constructor(m: string) {
        super(m);
    }
}

class NotEnoughHintsError extends Error {
    constructor(m: string) {
        super(m);
    }
}

// Amount of cards per value
// I.e. we have 1 five of every color
// 2 fours of every color
// etc
//                       x  1  2  3  4  5
const CARDS_PER_VALUE = [0, 3, 2, 2, 2, 1]

function shuffleInPlace(cards: Array<Card>) {
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
}

function generateAllCards(): Array<Card> {
    let cards = [];
    for (let value = 1; value <= 5; value++) {
        const copies = CARDS_PER_VALUE[value];
        for (let i = 0; i < copies; i++) {
            // I dont know how to properly iterate over enum values
            cards.push(new Card(Color.RED, value));
            cards.push(new Card(Color.YELLOW, value));
            cards.push(new Card(Color.WHITE, value));
            cards.push(new Card(Color.GREEN, value));
            cards.push(new Card(Color.BLUE, value));
        }
    }
    shuffleInPlace(cards);
    return cards;
}

// A room is effectively a game. 
// It holds player information, hints, lives, discard, etc
export class Room {
    #id: RoomId;

    // Information about the players
    readonly #playersInOrder: Array<Player>;
    #currentPlaying: number;
    #isLastRound: boolean;
    #lastRoundRemaining: number;

    // Information about the table
    #MAX_HINTS = 8;

    #hints = this.#MAX_HINTS;
    #lives = 3;
    #remainingCards: Array<Card>;
    #fireworks: Fireworks;
    #discard: Discard;

    constructor(cookies: Array<Cookie>) {
        this.#id = new RoomId();
        this.#fireworks = new Fireworks();
        this.#discard = new Discard();

        // Let's say player 0 always starts
        this.#currentPlaying = 0;
        this.#isLastRound = false;
        this.#remainingCards = generateAllCards();
        // TODO: validate number of players (min 2, max 5)
        this.#playersInOrder = [];
        const numPlayers = cookies.length;
        const cardsPerPlayer = numPlayers > 3 ? 4 : 5;
        for (let i = 0; i < numPlayers; i++) {
            let cards = [];
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
        if (this.#playersInOrder.indexOf(player) === -1) {
            throw new UnknownPlayerError("Unknown player");
        }
        if (this.#currentPlaying != player.index) {
            throw new WrongTurnError("It's not your turn!");
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
        this.#hints = Math.max(this.#hints + 1, this.#MAX_HINTS);
    }

    private removeAndDraw(player: Player, card: Card) {
        player.removeCard(card);
        const new_card = this.#remainingCards.pop();
        if (new_card !== undefined) {
            player.addCard(new_card);
        } else {
            this.#isLastRound = true;
        }
    }

    playerFrom(cookie: Cookie): Player | undefined {
        return this.#playersInOrder.find((player: Player): boolean => {
            return player.cookie.equals(cookie);
        });
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
        } else if (result === PlayResult.ColorCompleted) {
            this.bumpHints();
        }

        this.advanceTurn();
    }

    // Discards a card. Throws if invalid.
    discard(player: Player, card: Card) {
        this.validateTurn(player);

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
}