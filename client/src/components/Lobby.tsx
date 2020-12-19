// Information about a lobby.
// This is where we setup the socket to the server.
// Shows who is connected and any other useful status.
// If the game is in progress, simply returns the Game component.

import { ILobby } from "hanabi-interface";
import { useRef, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import SocketIO from 'socket.io-client';
import Game from './Game';
import { CopyToClipboard } from 'react-copy-to-clipboard';

interface LobbyWrapperParams {
  id: string
}

interface LobbyWrapperProps {
  uid: string,
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
  const { uid } = props;
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
    return <Lobby id={id} socket={socket} uid={uid} />
  } else if (connection === ConnectionState.CONNECTING) {
    return <h1>Searching for room...</h1>;
  } else {
    return <h1>Room not found!</h1>;
  }
}

interface LobbyProps {
  id: string,
  socket: SocketIOClient.Socket,
  uid: string,
}

function Lobby(props: LobbyProps) {
  const { id, socket, uid } = props;
  const emptyLobby: ILobby = {
    id: "",
    players: [],
    leader: { name: "", uid: "" }
  }
  const [lobby, setLobby] = useState(emptyLobby);
  socket.on('state', (lobby: ILobby) => {
    setLobby(lobby);
  });

  const game = lobby.game;
  if (game) {
    let playerIndex: number | undefined = game.playersInOrder.findIndex((p) => p.name.uid === uid);
    if (playerIndex === -1) {
      playerIndex = undefined;
    }
    return <Game id={id} game={game} playerIndex={playerIndex} socket={socket} />;
  } else {
    return <WaitingRoom lobby={lobby} uid={uid} startFn={() => socket.emit('start')} />;
  }
}

interface WaitingRoomProps {
  lobby: ILobby,
  uid: string,
  startFn: () => void,
}

function WaitingRoom(props: WaitingRoomProps) {
  // TODO: Give feedback when game can't be started (i.e. not enough players)
  const { lobby, startFn, uid } = props;
  const isLeader = lobby.leader.uid === uid;
  const [copied, setCopied] = useState(false);
  let startComponent;
  if (isLeader) {
    startComponent = <button onClick={startFn}>Start the game</button>;
  } else {
    startComponent = <p>Waiting for leader ({lobby.leader.name}) to start the game.</p>;
  }
  return (
    <div>
      <h1> Room Code: {lobby.id}  </h1>
      <CopyToClipboard text={window.location.toString()}
        onCopy={() => setCopied(true)}>
        <button>Copy to clipboard</button>
      </CopyToClipboard>
      {copied ? <span style={{ color: 'red' }}>Copied.</span> : null}
      <p> Players: </p>
      <ul>
        {lobby.players.map(p => <li key={p.uid}>{p.name} {p.uid === uid ? '(you)' : ''}</li>)}
      </ul>
      {startComponent}
    </div>
  );
}

export default LobbyWrapper;