export class LobbyId {
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