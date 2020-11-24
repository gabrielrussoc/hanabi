import cookie from 'cookie';
import { PlayerCookieNotFoundError } from './errors';

const PLAYER_COOKIE = 'hanabi_player';

export class Cookie {
    #value: string;

    constructor(value: string) {
        this.#value = value;
    }

    equals(other: Cookie): boolean {
        return this.#value === other.#value;
    }
}

export function playerCookieFromRaw(raw: string): Cookie {
    const cookies = cookie.parse(raw);
    const playerCookie = cookies[PLAYER_COOKIE];
    if (playerCookie === undefined) {
        throw new PlayerCookieNotFoundError("Player cookie must be present on all requests");
    }
    return new Cookie(playerCookie);
}