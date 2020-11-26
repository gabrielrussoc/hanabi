import React, { useEffect, useRef } from 'react';
import { useState } from 'react';
import { useCookies } from 'react-cookie';
import './App.css';
import { v4 as uuid4 } from 'uuid';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link,
  useParams,
  Redirect,
} from "react-router-dom";
import SocketIO from 'socket.io-client';
import { ILobby, IGame } from 'hanabi-interface';

const PLAYER_COOKIE = 'hanabi_player';

function App() {
  const [cookies, setCookie] = useCookies([PLAYER_COOKIE]);
  if (!cookies[PLAYER_COOKIE]) {
    setCookie(PLAYER_COOKIE, uuid4());
  }

  return (
    <Router>
      <Switch>
        <Route exact path="/">
          <Home />
        </Route>
        <Route path="/lobby/:id">
          <LobbyWrapper />
        </Route>
        <Route path="*">
          <NotFound />
        </Route>
      </Switch>
    </Router>
  );
}

function Home() {
  const [lobby, setLobby] = useState('');
  const [newLobbyPath, setNewLobbyPath] = useState('');

  const createLobby = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: deal with failures
    fetch('/create').then((res) => res.text()).then(path => setNewLobbyPath(path));
  }

  if (newLobbyPath) {
    return <Redirect push to={newLobbyPath} />
  } else {
    return (
      <div>
        <label>
          Lobby
      <input type="text" value={lobby} onChange={(e) => setLobby(e.target.value)} />
        </label>
        <Link to={'/lobby/' + lobby}>Enter</Link>
        <form onSubmit={createLobby}>
          <input type="submit" value="Create" />
        </form>
      </div>
    );
  }
}

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
    return <InGame game={lobby.game} />;
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

interface InGameProps {
  game: IGame,
}

function InGame(props: InGameProps) {
  const { game } = props;
  return (
    <div>
      <h1>In game</h1>
      <ul>
        {game.playersInOrder.map(p => <li>{p.index}</li>)}
      </ul>
    </div>
  );
}

function NotFound() {
  return <h1>Not found</h1>;
}

export default App;
