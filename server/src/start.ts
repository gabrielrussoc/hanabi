import express from "express";
import http from "http";
import { Cookie, playerCookieFromRaw } from "./cookie";
import { LobbyManager } from "./lobby";
import path from "path";

const env = process.env.NODE_ENV || 'development';

// To make sure we don't crash the server on exceptions
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION - keeping process alive:', err);
});

const PORT = process.env.PORT || 5000;
const app = express();
const server = http.createServer(app);
const lobbyManager = new LobbyManager();

app.get('/create', (req, res) => {
  const playerCookie = playerCookieFromRaw(req.headers.cookie ?? '');
  const lobbyPath = lobbyManager.createLobby(playerCookie, server);
  res.send(lobbyPath);
});

// Serve the client bundle if this is prod
if (env === "production") {
  const root = process.env.PROD_CLIENT_ROOT ?? __dirname;
  // Static files
  app.use(express.static(root));

  // We match everything since we have client side routing (with React Router)
  // This HAS TO BE THE LAST DECLARED ROUTE since we have some endpoints (e.g. /create)
  // that are server side routed.
  // Socket.io paths doesn't end up here and I'm not really sure why.
  app.get('/*', (req, res) => {
    res.sendFile(path.join(root, 'index.html'));
  });
}

server.listen(PORT, () => {
  console.log('listening on *:' + PORT);
});

if (env === 'development') {
  lobbyManager.createTestLobbies(new Cookie("dev1"), server);
}