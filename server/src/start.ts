import express from "express";
import http from "http";
import { Server } from "socket.io";
import cookie from 'cookie';

const USER_COOKIE = 'hanabi_user';

const PORT = process.env.PORT || 5000;
const app = express();
const router = express.Router();

router.get('/', (req, res) => {
  res.send('I am the server!');
});

app.use('/api', router);

const server = http.createServer(app);
server.listen(PORT, () => {
  console.log('listening on *:' + PORT);
});

const io = new Server(server, {
  path: "/lobby/ABCD",
  serveClient: false,
});

io.on('connection', (socket) => {
  const cookies = cookie.parse(socket.handshake.headers.cookie);
  // TODO: what if cookie is not present?
  console.log(cookies[USER_COOKIE]);
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});