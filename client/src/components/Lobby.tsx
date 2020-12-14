// Information about a lobby.
// This is where we setup the socket to the server.
// Shows who is connected and any other useful status.
// If the game is in progress, simply returns the Game component.

import { ILobby } from "hanabi-interface";
import { useRef, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import SocketIO from 'socket.io-client';
import Game from './Game';
import NotFound from "./NotFound";
import { CopyToClipboard } from 'react-copy-to-clipboard';

interface LobbyWrapperParams {
  id: string
}

interface LobbyWrapperProps {
  cookieHash: string,
}

enum ConnectionState {
  CONNECTING,
  CONNECTED,
  FAILED,
}

// This component holds the socket we are going to use to 
// talk to the server and pass down the tree.
function LobbyWrapper(props: LobbyWrapperProps) {
  const { id } = useParams<LobbyWrapperParams>();
  const { cookieHash } = props;
  const socketRef = useRef<SocketIOClient.Socket | undefined>();
  const [socket, setSocket] = useState<SocketIOClient.Socket | undefined>();
  const [connection, setConnection] = useState(ConnectionState.CONNECTING);

  useEffect(() => {
    if (connection === ConnectionState.CONNECTING) {
      const timer = setTimeout(() => setConnection(ConnectionState.FAILED), 2000);
      return () => clearTimeout(timer);
    }
  }, [connection]);

  useEffect(() => {
    const sock = SocketIO({ path: '/lobby/' + id });
    sock.on('connect', () => setConnection(ConnectionState.CONNECTED));
    socketRef.current = sock;
    setSocket(sock);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    }
  }, [id]);

  if (socket && connection === ConnectionState.CONNECTED) {
    return <Lobby id={id} socket={socket} cookieHash={cookieHash} />
  } else if (connection === ConnectionState.CONNECTING) {
    return <h1>Searching for room...</h1>;
  } else {
    return <h1>Room not found!</h1>;
  }
}

interface LobbyProps {
  id: string,
  socket: SocketIOClient.Socket,
  cookieHash: string,
}

function Lobby(props: LobbyProps) {
  const { id, socket, cookieHash } = props;
  const emptyLobby: ILobby = {
    id: "",
    players: [],
  }
  const [lobby, setLobby] = useState(emptyLobby);
  socket.on('state', (lobby: ILobby) => {
    setLobby(lobby);
  });

  const game = lobby.game;
  if (game) {
    const playerIndex = game.playersInOrder.findIndex((p) => p.cookieHash == cookieHash);
    // TODO: return something other than NotFound here. 
    return playerIndex !== -1 ? <Game id={id} game={game} playerIndex={playerIndex} socket={socket} /> : <NotFound />;
  } else {
    return <WaitingRoom lobby={lobby} startFn={() => socket.emit('start')} />;
  }
}

interface WaitingRoomProps {
  lobby: ILobby,
  startFn: () => void,
}

function WaitingRoom(props: WaitingRoomProps) {
  // TODO: hide start button for non leader
  // TODO: Give feedback when game can't be started (i.e. not enough players)
  const isLeader = true;
  const { lobby, startFn } = props;
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <h1> Room Code: {lobby.id}  </h1>
      <CopyToClipboard text={window.location.toString()}
        onCopy={() => setCopied(true)}>
        <button>Copy to clipboard</button>
      </CopyToClipboard>
      {copied ? <span style={{ color: 'red' }}>Copied.</span> : null}
      <ul>
        {lobby.players.map(p => <li>{p.name}</li>)}
      </ul>
      {isLeader && <button onClick={startFn}>Start</button>}
    </div>
  );
}

export default LobbyWrapper;