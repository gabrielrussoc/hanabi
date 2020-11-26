import { IGame } from "hanabi-interface";

interface GameProps {
  game: IGame,
}

function Game(props: GameProps) {
  const { game } = props;
  return (
    <div>
      <h1>In game</h1>
      <ul>
        {game.playersInOrder.map(p => <li>{p.index}</li>)}
      </ul>
    </div>
  );
}

export default Game;