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

export default Home;