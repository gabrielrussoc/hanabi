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
  if (!cookies[PLAYER_COOKIE]) {
    setCookie(PLAYER_COOKIE, uuid4());
  }
  const cookieHash = md5(cookies[PLAYER_COOKIE]);
  
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
