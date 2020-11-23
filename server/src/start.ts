import express from "express";
import { Greeter } from 'hanabi-types';

const PORT = process.env.PORT || 5000;
const app = express();
const router = express.Router();

router.get('/', (req, res) => {
  res.send(Greeter('I am the server!'));
});

app.use('/api', router);

app.listen(PORT, () => {
  console.log('listening on *:' + PORT);
});
