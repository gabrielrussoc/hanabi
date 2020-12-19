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

export class GameOverError extends Error {
    constructor() {
        super("Game is already over.");
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

export class PlayerCookieNotFoundError extends Error {
    constructor(m: string) {
        super(m);
    }
}

export class TooManyHintsToDiscardError extends Error {
    constructor(m: string) {
        super(m);
    }
}

export class DevOnlyError extends Error {
    constructor(m: string) {
        super(m);
    }
}

