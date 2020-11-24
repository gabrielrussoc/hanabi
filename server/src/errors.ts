export class UnknownPlayerError extends Error {
    constructor(m: string) {
        super(m);
    }
}

export class WrongTurnError extends Error {
    constructor(m: string) {
        super(m);
    }
}

export class NotEnoughHintsError extends Error {
    constructor(m: string) {
        super(m);
    }
}

export class CardNotFoundError extends Error {
    constructor(m: string) {
        super(m);
    }
}