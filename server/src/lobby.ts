import { Server as SocketServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { Cookie, playerCookieFromRaw } from "./cookie";
import { Game } from "./game";
import { GameInProgressError, TooManyPlayersError } from "./errors";
import { Set as ImmutableSet } from 'immutable';
import { ILobby, IPlayer } from 'hanabi-interface';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 5;

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

    equals(other: LobbyId): boolean {
        return this.#value === other.#value;
    }

    string(): string {
        return this.#value;
    }
}

class Lobby {
    // TODO: make sure lobby ids don't clash
    #id = new LobbyId();
    #leader: Cookie;
    #io: SocketServer;
    #path: string;

    // Game associated with this lobby
    #gameStarted = false;
    #game: Game | undefined;

    // Players connected
    #players: ImmutableSet<Cookie> = ImmutableSet();

    // A player can be added if:
    // - The number of players hasn't reached the maximum
    // - The game hasn't already started
    //
    // If the above conditions are not satisfied, this method will throw.
    //
    // Caveat: if we are trying to add a player which is already on the game,
    // this method does nothing.
    private maybeAddPlayer(player: Cookie) {
        if (this.#players.has(player)) {
            // Nothing to do. Player is just reconnecting.
            return;
        }
        if (this.#gameStarted) {
            throw new GameInProgressError("This game has already started");
        }
        if (this.#players.size === MAX_PLAYERS) {
            throw new TooManyPlayersError("Lobby is full");
        }
        console.log(player.printable() + ' is a new player');
        this.#players = this.#players.add(player);
    }

    // Only removes players from games that were not started.
    // This is useful to allow reconnects.
    private maybeRemovePlayer(player: Cookie) {
        if (this.#gameStarted) {
            // Nothing to do. Player disconnected but might still come back.
            return;
        }
        this.#players = this.#players.delete(player);
    }

    private publicState(): ILobby {
        return {
            players: this.#players.valueSeq().map(p => ({ name: p.printable() })).toArray()
        }
    }

    private setMessageHandlers() {
        const io = this.#io;

        io.on('connection', (socket) => {
            const playerCookie = playerCookieFromRaw(socket.handshake.headers.cookie);
            console.log('user ' + playerCookie.printable() + ' connected to ' + this.#id.string());
            console.log('total players ' + this.#players.size);
            this.maybeAddPlayer(playerCookie);
            socket.emit('state', this.publicState());
            socket.on('disconnect', () => {
                console.log('user ' + playerCookie.printable() + ' disconnected from ' + this.#id.string());
                this.maybeRemovePlayer(playerCookie);
            });
        });

        io.on('start', (socket) => {
            const playerCookie = playerCookieFromRaw(socket.handshake.headers.cookie);
            // Only the leader can start the game
            if (!this.#gameStarted && playerCookie.equals(this.#leader) && this.#players.size >= MIN_PLAYERS) {
                this.#gameStarted = true;
                this.#game = new Game(this.#id, [...this.#players]);
            }
            // We ignore if someone tries to start the game wrongly.
            // TODO: send the updated state
        })
    }

    constructor(leader: Cookie, server: HttpServer) {
        const path = '/lobby/' + this.#id.string();
        this.#path = path;
        this.#leader = leader;
        this.#io = new SocketServer(server, {
            path,
            serveClient: false,
        });
        this.setMessageHandlers();
    }

    path(): string {
        return this.#path;
    }
}

export class LobbyManager {
    #lobbies: Lobby[] = [];

    // Returns the location to access this lobby (e.g. /lobby/ABCD)
    createLobby(leader: Cookie, server: HttpServer): string {
        const lobby = new Lobby(leader, server);
        this.#lobbies.push(lobby);
        return lobby.path();
    }

    // TODO: get rid of old lobbies
}

