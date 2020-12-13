// Home page.
// Should have the logo, titles and a way for users to create and join lobbies.

import React, { useState } from "react";
import { Redirect, Link } from "react-router-dom";

function Home() {
  const [lobby, setLobby] = useState('');
  const [newLobbyPath, setNewLobbyPath] = useState('');

  const createLobby = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: deal with failures
    fetch('/create').then((res) => res.text()).then(path => {
      console.log(path);
      setNewLobbyPath(path);
    });
  }

  if (newLobbyPath) {
    return <Redirect push to={newLobbyPath} />
  } else {
    return (
      <div>
        <h1> Hanabi </h1>
        <p>How to play: </p>
        <ul>
          <li> Watch this <a href="https://youtu.be/4bqSWF2DF6I" target="_blank" rel="noreferrer">instructional video</a>. </li>
          <li> Call your friends. Hints are not shown in-game and therefore must be shared via external chat or audio.</li>
        </ul>
        <label>
          Join an existing room:
        <input type="text" value={lobby} onChange={(e) => setLobby(e.target.value)} />
        </label>
        <Link to={'/lobby/' + lobby}><input type="button" value="Join" /></Link>
        <br/>
        <label>
          Create a new room:
          <input type="button" value="Create" onClick={createLobby} />
        </label>
      </div >
    );
  }
}

export default Home;