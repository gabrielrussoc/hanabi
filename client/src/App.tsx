import React from 'react';
import { useCookies } from 'react-cookie';
import logo from './logo.svg';
import './App.css';
import { v4 as uuid4 } from 'uuid';

const PLAYER_COOKIE = 'hanabi_player';

function App() {
  const [cookies, setCookie] = useCookies([PLAYER_COOKIE]);
  if (!cookies[PLAYER_COOKIE]) {
    setCookie(PLAYER_COOKIE, uuid4());
  }
  
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          aaaaa
        </p>
      </header>
    </div>
  );
}

export default App;
