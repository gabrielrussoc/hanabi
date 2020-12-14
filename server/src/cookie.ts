import cookie from 'cookie';
import { PlayerCookieNotFoundError } from './errors';
import { hash, ValueObject } from 'immutable';
import md5 from 'md5';
import { IPlayerName } from 'hanabi-interface';

const PLAYER_COOKIE = 'hanabi_player';

export class Cookie implements ValueObject {
    #value: string;

    constructor(value: string) {
        this.#value = value;
    }

    equals(other: Cookie): boolean {
        return this.#value === other.#value;
    }

    hashCode(): number {
        return hash(this.#value);
    }

    printable(): string {
        return this.#value.slice(-5);
    }

    md5(): string {
        return md5(this.#value);
    }

    name(): IPlayerName {
        return {
            "name": this.printable(),
            "uid": this.md5(),
        }
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