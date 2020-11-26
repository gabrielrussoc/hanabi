import React from 'react';
import { useCookies } from 'react-cookie';
import { v4 as uuid4 } from 'uuid';
import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";
import NotFound from './NotFound';
import Home from './Home';
import LobbyWrapper from './Lobby';
import md5 from 'md5';

const PLAYER_COOKIE = 'hanabi_player';

function App() {
  const [cookies, setCookie] = useCookies([PLAYER_COOKIE]);
  let playerCookie = cookies[PLAYER_COOKIE];
  if (!playerCookie) {
    const newCookie = uuid4();
    setCookie(PLAYER_COOKIE, newCookie);
    playerCookie = newCookie; 
  }
  const cookieHash = md5(playerCookie);
  
  return (
    <Router>
      <Switch>
        <Route exact path="/">
          <Home />
        </Route>
        <Route path="/lobby/:id">
          <LobbyWrapper cookieHash={cookieHash} />
        </Route>
        <Route path="*">
          <NotFound />
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
