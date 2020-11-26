import { ICard, IColor, IGame } from "hanabi-interface";

interface CardProps {
  card: ICard,
}

function Card(props: CardProps) {
  const { card } = props;
  return <div style={{color: IColor[card.color], display: "inline"}}>{card.value}■</div>;
}

interface CardListProps {
  cards: ICard[],
}

function CardList(props: CardListProps) {
  const { cards } = props;
  return (
    <>
      {cards.map(c => <Card card={c} />)}
    </>
  );
}

interface GameProps {
  game: IGame,
  playerIndex: number,
}

function Game(props: GameProps) {
  const { game, playerIndex } = props;
  return (
    <div>
      <h1>In game</h1>
      <ul>
  {game.playersInOrder.map(p => <li>{p.index}: {p.index === playerIndex && <CardList cards={p.cardsInOrder} />}</li>)}
      </ul>
    </div>
  );
}

export default Game;