import { ICard, IColor, IGame, IPlayer } from "hanabi-interface";
import { Container, Row, Col } from 'react-grid-system';

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
  canDiscard: boolean,
}

function CardList(props: CardListProps) {
  const { cards, myCards, myTurn, playFn, discardFn, canDiscard } = props;
  return (
    <>
      {cards.map(c => {
        return (
          <>
            <Card card={c} hidden={myCards} />
            {myCards && <button onClick={() => playFn(c)} disabled={!myTurn}>Play</button>}
            {myCards && <button onClick={() => discardFn(c)} disabled={!myTurn || !canDiscard}>Discard</button>}
          </>
        );
      })}
    </>
  );
}

function Discard(props: { cardsWithCount: [ICard, number][] }) {
  const { cardsWithCount } = props;
  let cards: ICard[] = [];
  cardsWithCount.forEach(([card, count]) => {
    for (let i = 0; i < count; i++) {
      cards.push(card);
    }
  });
  // TODO: Use a proper component here instead of CardList
  return <CardList cards={cards} myTurn={false} myCards={false} playFn={() => { }} discardFn={() => { }} canDiscard={false} />;
}

function Fireworks(props: { colorsWithCount: [IColor, number][] }) {
  const { colorsWithCount } = props;
  // TODO: return a proper component here
  return (
    <>
      {colorsWithCount.map(([color, count]) =>
        <div style={{ color: IColor[color], display: "inline" }}>{count}■</div>)
      }
    </>
  );
}

function Deck(props: { cardsRemaining: number }) {
  const { cardsRemaining } = props;
  return <h1>Cards: {cardsRemaining}</h1>
}

function Tokens(props: { lives: number, hints: number }) {
  const { lives, hints } = props;
  return (
    <>
      <h1>Hints: {hints}</h1>
      <h1>Lives: {lives}</h1>
    </>
  );
}

function OtherPlayer(props: { player: IPlayer, currentPlayerIndex: number }) {
  const { player, currentPlayerIndex } = props;
  const currentPlaying = currentPlayerIndex === player.index;
  // TODO: Make CardList more generic so we don't have to supply
  // things like playFn to other players
  return <>
    <h1>Player {player.index} {currentPlaying ? "*" : ""}</h1>
    <CardList
      cards={player.cardsInOrder}
      myTurn={false}
      myCards={false}
      playFn={(c: ICard) => {}}
      discardFn={(c: ICard) => {}}
      canDiscard={false} />
  </>;
}

interface MainPlayerProps {
  player: IPlayer,
  playFn: (c: ICard) => void,
  discardFn: (c: ICard) => void,
  hintFn: () => void,
  canDiscard: boolean,
  currentPlaying: boolean,
}

function MainPlayer(props: MainPlayerProps) {
  const { player, playFn, discardFn, hintFn, canDiscard, currentPlaying } = props;
  return <>
    <h1>Player {player.index}</h1>
    <button onClick={hintFn} disabled={!currentPlaying}>Give hint</button>
    <br/>
    <CardList
      cards={player.cardsInOrder}
      myTurn={currentPlaying}
      myCards={true}
      playFn={playFn}
      discardFn={discardFn}
      canDiscard={canDiscard} />
  </>;
}

// Compute where to display the players
// If we numbers the columns as
// 1 | 2 | 3
// 4 | 5 | 6
// 7 | 8 | 9
// We map each index (1-based) to each player.
function computeOtherPlayersMap(playersInOrder: IPlayer[], mainPlayerIndex: number): Map<number, IPlayer> {
  const N = playersInOrder.length;
  let map = new Map<number, IPlayer>();
  if (N == 2) {
    map.set(2, playersInOrder[(mainPlayerIndex + 1) % N]);
  } else if (N == 3) {
    map.set(4, playersInOrder[(mainPlayerIndex + 1) % N]);
    map.set(6, playersInOrder[(mainPlayerIndex + 2) % N]);
  } else if (N == 4) {
    map.set(4, playersInOrder[(mainPlayerIndex + 1) % N]);
    map.set(2, playersInOrder[(mainPlayerIndex + 2) % N]);
    map.set(6, playersInOrder[(mainPlayerIndex + 3) % N]);
  } else if (N == 5) {
    map.set(4, playersInOrder[(mainPlayerIndex + 1) % N]);
    map.set(2, playersInOrder[(mainPlayerIndex + 2) % N]);
    map.set(3, playersInOrder[(mainPlayerIndex + 3) % N]);
    map.set(6, playersInOrder[(mainPlayerIndex + 4) % N]);
  }
  // TODO: handle the case where N is not between 2 and 5
  return map;
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

  const otherPlayersMap = computeOtherPlayersMap(game.playersInOrder, playerIndex);
  const playerPos2 = otherPlayersMap.get(2);
  const playerPos3 = otherPlayersMap.get(3);
  const playerPos4 = otherPlayersMap.get(4);
  const playerPos6 = otherPlayersMap.get(6);

  const mainPlayer =
    <MainPlayer
      player={game.playersInOrder[playerIndex]}
      playFn={playFn}
      discardFn={discardFn}
      hintFn={hintFn}
      currentPlaying={game.currentPlaying === playerIndex}
      canDiscard={game.hints < game.maxHints}
    />;

  return (
    // The game is drawn on 3x3 grid
    //
    //  deck     |    player   | player 
    //----------------------------------
    //  player   |  fireworks  | player
    //----------------------------------
    //  discard  | main player | tokens
    //
    // Player positions vary with the size of the game
    <Container style={{ height: "100vh" }}>
      <Row debug style={{ height: "25%" }}>
        <Col debug><Deck cardsRemaining={game.remainingCards} /></Col>
        <Col debug>{playerPos2 && <OtherPlayer player={playerPos2} currentPlayerIndex={game.currentPlaying} />}</Col>
        <Col debug>{playerPos3 && <OtherPlayer player={playerPos3} currentPlayerIndex={game.currentPlaying} />}</Col>
      </Row>
      <Row debug style={{ height: "50%" }}>
        <Col debug>{playerPos4 && <OtherPlayer player={playerPos4} currentPlayerIndex={game.currentPlaying} />}</Col>
        <Col debug><Fireworks colorsWithCount={game.fireworks.inner} /></Col>
        <Col debug>{playerPos6 && <OtherPlayer player={playerPos6} currentPlayerIndex={game.currentPlaying} />}</Col>
      </Row>
      <Row debug style={{ height: "25%" }}>
        <Col debug><Discard cardsWithCount={game.discard.inner} /></Col>
        <Col debug>{mainPlayer}</Col>
        <Col debug><Tokens hints={game.hints} lives={game.lives} /></Col>
      </Row>
    </Container>
  );
}

export default Game;