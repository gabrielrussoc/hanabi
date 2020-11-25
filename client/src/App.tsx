import React from 'react';
import { useState, useMemo } from 'react';
import { useCookies } from 'react-cookie';
import './App.css';
import { v4 as uuid4 } from 'uuid';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link,
  useParams,
} from "react-router-dom";
import SocketIO from 'socket.io-client';
import { ILobby } from 'hanabi-interface';

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
          <Lobby />
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
  return (
    <div>
      <label>
        Lobby
      <input type="text" value={lobby} onChange={(e) => setLobby(e.target.value)} />
      </label>
      <Link to={'/lobby/' + lobby}>Enter</Link>
    </div>
  );
}

interface LobbyParams {
  id: string
}

function Lobby() {
  const { id } = useParams<LobbyParams>();
  // Memoize the connection to avoid recreating.
  // React might ignore this anytime and create new connections for each render
  // The server must be able to deal with reconnections.
  const io = useMemo(() => SocketIO({ path: '/lobby/' + id }), [id]);
  const emptyLobby: ILobby = {
    // TODO: timeout here for lobby not found
    id: "Looking for lobby...",
    players: [],
  }
  const [lobby, setLobby] = useState(emptyLobby);
  io.on('state', (lobby: ILobby) => {
    setLobby(lobby);
  });
  // TODO: hide start button for non leader
  // TODO: Give feedback when game can't be started (i.e. not enough players)
  const isLeader = true;
  return (
    <div>
      <h1>{lobby.id}</h1>
      <ul>
        {lobby.players.map(p => <li>{p.name}</li>)}
      </ul>
      {isLeader && <button onClick={() => io.emit('start')}>Start</button>}
      {lobby.game !== undefined ? "STARTED" : "PENDING"}
    </div>
  );
}

function NotFound() {
  return <h1>Not found</h1>;
}

export default App;
