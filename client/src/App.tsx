import React from 'react';
import { useState, useEffect } from 'react';
import logo from './logo.svg';
import './App.css';

import {Greeter} from 'hanabi-types';

function App() {
  const [title, setTitle] = useState("Loading...");
  useEffect(() => {
    async function getTitle() {
      const title = await (await fetch('/api/')).text();
      setTitle(Greeter(title));
    }
    getTitle();
  });
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          {title}
        </p>
      </header>
    </div>
  );
}

export default App;
