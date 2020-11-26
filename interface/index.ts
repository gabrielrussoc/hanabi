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
    // TODO
}

export interface IDiscard {
    // TODO
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