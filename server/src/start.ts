import express from "express";

const PORT = process.env.PORT || 5000;
const app = express();
const router = express.Router();

router.get('/', (req, res) => {
  res.send('I am the server!');
});

app.use('/api', router);

app.listen(PORT, () => {
  console.log('listening on *:' + PORT);
});
