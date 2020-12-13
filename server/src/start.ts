import express from "express";
import http from "http";
import { Cookie, playerCookieFromRaw } from "./cookie";
import { LobbyManager } from "./lobby";

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
  const path = lobbyManager.createLobby(playerCookie, server);
  res.send(path);
});

server.listen(PORT, () => {
  console.log('listening on *:' + PORT);
});

const env = process.env.NODE_ENV || 'development';
if (env === 'development') {
  lobbyManager.createTestLobbies(new Cookie("dev1"), server);
}