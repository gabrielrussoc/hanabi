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
}

export interface ILobbyPlayer {
    name: string,
}

export interface IPlayer {
    index: number,
    cookieHash: string,
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
    playersInOrder: IPlayer[];
    currentPlaying: number;
    isLastRound: boolean;
    lastRoundRemaining: number;
    
    hints: number;
    lives: number;
    remainingCards: number;
    
    fireworks: IFireworks;
    discard: IDiscard;

    gameOver: boolean,
}

export interface ILobby {
    id: string,
    
    // Used to display who is in the lobby.
    players: ILobbyPlayer[],

    game?: IGame,
}