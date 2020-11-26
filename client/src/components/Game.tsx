import { ICard, IColor, IGame } from "hanabi-interface";

interface CardProps {
  card: ICard,
  hidden: boolean,
}

function Card(props: CardProps) {
  const { card, hidden } = props;
  if (hidden) {
    return <div style={{ color: "black", display: "inline" }}>?■</div>;
  }
  return <div style={{ color: IColor[card.color], display: "inline" }}>{card.value}■</div>;
}

interface CardListProps {
  cards: ICard[],
  myCards: boolean,
  myTurn: boolean,
  playFn: (c: ICard) => void;
  discardFn: (c: ICard) => void;
}

function CardList(props: CardListProps) {
  const { cards, myCards, myTurn, playFn, discardFn } = props;
  return (
    <>
      {cards.map(c => {
        return (
          <>
            <Card card={c} hidden={myCards} />
            {myCards && <button onClick={() => playFn(c)} disabled={!myTurn}>Play</button>}
            {myCards && <button onClick={() => discardFn(c)} disabled={!myTurn}>Discard</button>}
          </>
        );
      })}
    </>
  );
}

interface GameProps {
  game: IGame,
  playerIndex: number,
  socket: SocketIOClient.Socket,
}

function Game(props: GameProps) {
  const { game, playerIndex, socket } = props;

  const playFn = (card: ICard) => socket.emit('play', card);
  const discardFn = (card: ICard) => socket.emit('discard', card);
  const hintFn = () => socket.emit('hint');

  const myTurn = game.currentPlaying === playerIndex;

  return (
    <div>
      <h1>In game</h1>
      <h2>Hints: {game.hints}</h2>
      <button onClick={hintFn} disabled={!myTurn}>Give hint</button>
      <h2>Lives: {game.lives}</h2>
      <ul>
        {game.playersInOrder.map(p => {
          const myCards = p.index === playerIndex;
          return <li>
            {p.index}:
            <CardList
              cards={p.cardsInOrder}
              myTurn={myTurn}
              myCards={myCards}
              playFn={playFn}
              discardFn={discardFn}
            />
          </li>;
        })}
      </ul>
      {myTurn && <h2>It's your turn :)))))</h2>}
    </div>
  );
}

export default Game;