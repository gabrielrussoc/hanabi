// Information about a lobby.
// This is where we setup the socket to the server.
// Shows who is connected and any other useful status.
// If the game is in progress, simply returns the Game component.

import { ILobby } from "hanabi-interface";
import { useRef, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import SocketIO from 'socket.io-client';
import Game from './Game';

interface LobbyWrapperParams {
  id: string
}

// This component holds the socket we are going to use to 
// talk to the server and pass down the tree.
function LobbyWrapper() {
  const { id } = useParams<LobbyWrapperParams>();
  const socketRef = useRef<SocketIOClient.Socket | undefined>();
  const [socket, setSocket] = useState<SocketIOClient.Socket | undefined>();

  useEffect(() => {
    socketRef.current = SocketIO({ path: '/lobby/' + id });
    setSocket(socketRef.current);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    }
  }, [id]);

  if (socket) {
    return <Lobby id={id} socket={socket} />
  } else {
    return <h1>Establishing connection to the server...</h1>;
  }
}

interface LobbyProps {
  id: string,
  socket: SocketIOClient.Socket,
}

function Lobby(props: LobbyProps) {
  const { id, socket } = props;
  const emptyLobby: ILobby = {
    // TODO: timeout here for lobby not found
    id: "Looking for lobby...",
    players: [],
  }
  const [lobby, setLobby] = useState(emptyLobby);
  socket.on('state', (lobby: ILobby) => {
    setLobby(lobby);
  });

  if (lobby.game) {
    return <Game game={lobby.game} />;
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
  return (
    <div>
      <h1>{lobby.id}</h1>
      <ul>
        {lobby.players.map(p => <li>{p.name}</li>)}
      </ul>
      {isLeader && <button onClick={startFn}>Start</button>}
    </div>
  );
}

export default LobbyWrapper;