import { Server as SocketServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { Cookie, playerCookieFromRaw } from "./cookie";
import { Card, Game, Player } from "./game";
import { Set as ImmutableSet } from 'immutable';
import { ICard, ILobby, ICardMove } from 'hanabi-interface';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 5;

const env = process.env.NODE_ENV || 'development';

enum PlayedAddStatus {
    NOT_ADDED,
    ADDED_TO_GAME,
    ADDED_AS_SPECTATOR,
}

export class LobbyId {
    #value: string;

    constructor(valueOverride?: string) {
        if (valueOverride) {
            this.#value = valueOverride;
            return;
        }
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
    #spectators: ImmutableSet<Cookie> = ImmutableSet();

    // A player can be added if:
    // - The number of players hasn't reached the maximum
    // - The game hasn't already started
    //
    // If the above conditions are not satisfied, this method will throw.
    //
    // Caveat: if we are trying to add a player which is already on the game,
    // this method does nothing.
    private maybeAddPlayer(player: Cookie): PlayedAddStatus {
        if (this.#players.has(player)) {
            // Nothing to do. Player is just reconnecting.
            return PlayedAddStatus.ADDED_TO_GAME;
        }
        if (this.#gameStarted) {
            this.#spectators = this.#spectators.add(player);
            return PlayedAddStatus.ADDED_AS_SPECTATOR;
        }
        if (this.#players.size === MAX_PLAYERS) {
            return PlayedAddStatus.NOT_ADDED;
        }
        console.log(player.printable() + ' is a new player');
        this.#players = this.#players.add(player);
        return PlayedAddStatus.ADDED_TO_GAME;
    }

    // Only removes players from games that were not started.
    // This is useful to allow reconnects.
    private maybeRemovePlayer(player: Cookie) {
        if (this.#spectators.has(player)) {
            this.#spectators = this.#spectators.remove(player);
            return;
        }
        if (this.#gameStarted) {
            // Nothing to do. Player disconnected but might still come back.
            return;
        }
        this.#players = this.#players.delete(player);
    }

    private publicState(): ILobby {
        return {
            id: this.#id.string(),
            players: this.#players.valueSeq().map(p => p.name()).toArray(),
            game: this.#game?.toPublic(),
            leader: this.#leader.name(),
        }
    }

    private setMessageHandlers() {
        const io = this.#io;

        io.on('connection', (socket) => {
            const playerCookie = playerCookieFromRaw(socket.handshake.headers.cookie);
            console.log('user ' + playerCookie.printable() + ' connected to ' + this.#id.string());
            console.log('total players ' + this.#players.size);
            const status = this.maybeAddPlayer(playerCookie);
            if (status === PlayedAddStatus.NOT_ADDED) {
                console.log(`user ${playerCookie.printable()} was rejected`);
                socket.disconnect(true);
                return;
            }
            io.emit('state', this.publicState());

            socket.on('disconnect', () => {
                console.log('user ' + playerCookie.printable() + ' disconnected from ' + this.#id.string());
                this.maybeRemovePlayer(playerCookie);
                io.emit('state', this.publicState());
            });

            if(status === PlayedAddStatus.ADDED_AS_SPECTATOR) {
                return;
            }

            // If this is the leader, we also register an start handler
            if (playerCookie.equals(this.#leader)) {
                console.log('Identified ' + playerCookie.printable() + ' as leader on ' + this.#id.string());
                socket.on('start', () => {
                    // TODO: return errors for invalid starts
                    if (!this.#gameStarted && this.#players.size >= MIN_PLAYERS) {
                        console.log('Game started on lobby ' + this.#id.string());
                        this.#gameStarted = true;
                        this.#game = new Game(this.#id, [...this.#players]);
                        io.emit('state', this.publicState());
                    }
                })
            }

            // If this is a dev lobby, assume the correct player is playing
            // This allows us play with all players using a single client
            const assumeCorrectPlayer = env === "development" && this.#path.includes("test");

            // TODO: What if this throws? I believe socket.io doesn't handle it:
            // https://socket.io/docs/v3/listening-to-events/#Error-handling
            // TODO: make this less repetitive.
            socket.on('play', (card: ICard) => {
                const game = this.#game;
                if (game) {
                    const cookie = assumeCorrectPlayer ? game.currentPlayerCookie() : playerCookie;
                    const player = game.playerFrom(cookie);
                    game.play(player, new Card(card.color, card.value));
                    io.emit('state', this.publicState());
                }
            });
            socket.on('discard', (card: ICard) => {
                const game = this.#game;
                if (game) {
                    const cookie = assumeCorrectPlayer ? game.currentPlayerCookie() : playerCookie;
                    const player = game.playerFrom(cookie);
                    game.discard(player, new Card(card.color, card.value));
                    io.emit('state', this.publicState());
                }
            });
            socket.on('hint', () => {
                const game = this.#game;
                if (game) {
                    const cookie = assumeCorrectPlayer ? game.currentPlayerCookie() : playerCookie;
                    const player = game.playerFrom(cookie);
                    game.hint(player);
                    io.emit('state', this.publicState());
                }
            });
            socket.on('move card', (cardMove: ICardMove) => {
                const game = this.#game;
                if (game) {
                    game.moveCard(game.playerFrom(playerCookie), cardMove);
                    io.emit('state', this.publicState());
                }

            });
        });
    }

    constructor(leader: Cookie, server: HttpServer, idOverride?: string) {
        if (idOverride) {
            this.#id = new LobbyId(idOverride);
        }
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

    fakeStart(players: Cookie[]) {
        players.forEach(p => this.maybeAddPlayer(p));
        this.#gameStarted = true;
        this.#game = new Game(this.#id, [...this.#players]);
        this.#io.emit('state', this.publicState());

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

    // Helper to create some prepopulated lobbies
    // Available lobbies are
    // /lobby/testN
    // where N is the number of players (between 2 and 5, inclusive)
    // The players have the cookies devN
    createTestLobbies(leader: Cookie, server: HttpServer) {
        const players = [new Cookie("dev1")];
        for (let n = 2; n <= 5; n++) {
            const lobby = new Lobby(leader, server, `test${n}`);
            this.#lobbies.push(lobby);
            players.push(new Cookie(`dev${n}`));
            lobby.fakeStart(players);
        }
    }

    // TODO: get rid of old lobbies
}

