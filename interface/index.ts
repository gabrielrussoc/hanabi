export enum IColor {
    RED,
    YELLOW,
    GREEN,
    BLUE,
    WHITE
}

export interface ICard {
    color: IColor,
    value: number,
    // Unique identifier for a card.
    uid: string,
}

export interface IPlayerName {
    // Unique id
    uid: string;
    // Printable name, not necessarily unique
    name: string;
}

export interface IGamePlayer {
    index: number,
    name: IPlayerName,
    cardsInOrder: ICard[],
}

export interface IFireworks {
    // Number of cards per color
    // The server guarantees a consistent order
    // and all colors to be presente exactly once
    inner: [IColor, number][],
    score: number,
}

export interface IDiscard {
    // Number of cards discarded
    // The server guarantees a consistent order
    // and all cards to be present at most once
    inner: [ICard, number][],
}

export interface IGame {
    playersInOrder: IGamePlayer[];
    currentPlaying: number;
    isLastRound: boolean;
    lastRoundRemaining: number;

    hints: number;
    maxHints: number;
    lives: number;
    remainingCards: number;

    fireworks: IFireworks;
    discard: IDiscard;

    gameOver: boolean,
}

export interface ILobby {
    id: string,

    // Used to display who is in the lobby.
    players: IPlayerName[],
    leader: IPlayerName,

    game?: IGame,
}

export interface ICardMove {
    index: number,
    // Whether to move the card left or right
    left: boolean,
}