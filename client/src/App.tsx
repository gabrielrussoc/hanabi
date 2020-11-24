import React from 'react';
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
} from "react-router-dom";
import SocketIO from 'socket.io-client';

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
  // This is creating a socket for every render. 
  // TODO: put this somewhere else so we can avoid recreating the socket
  const io = SocketIO({ path: '/lobby/' + id });
  const [greet, setGreet] = useState('loading');
  io.on('greet', (msg: string) => {
    setGreet(msg);
  });
  return <h1>{greet}</h1>;
}

function NotFound() {
  return <h1>Not found</h1>;
}

export default App;
