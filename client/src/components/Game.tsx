import { ICard, IColor, IGame, IPlayer } from "hanabi-interface";
import { Container, Row, Col } from 'react-grid-system';

const env = process.env.NODE_ENV || 'development';

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

interface PlayableCardListProps {
  cards: ICard[],
  showCards: boolean,
  currentPlaying: boolean,
  playFn: (c: ICard) => void;
  discardFn: (c: ICard) => void;
  canDiscard: boolean,
}

function PlayableCardList(props: PlayableCardListProps) {
  const { cards, showCards, currentPlaying, playFn, discardFn, canDiscard } = props;
  return (
    <>
      {cards.map(c => {
        return (
          <>
            <Card card={c} hidden={!showCards} />
            {<button onClick={() => playFn(c)} disabled={!currentPlaying}>Play</button>}
            {<button onClick={() => discardFn(c)} disabled={!currentPlaying || !canDiscard}>Discard</button>}
          </>
        );
      })}
    </>
  );
}

function SimpleCardList(props: { cards: ICard[] }) {
  const { cards } = props;
  return (
    <>
      {cards.map(c => {
        return (
          <Card card={c} hidden={false} />
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
  return <SimpleCardList cards={cards} />;
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
  return <>
    <h1>Player {player.index} {currentPlaying ? "*" : ""}</h1>
    <SimpleCardList cards={player.cardsInOrder} />
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
    <br />
    <PlayableCardList
      cards={player.cardsInOrder}
      currentPlaying={currentPlaying}
      showCards={env === "development"}
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
  id: string,
  game: IGame,
  playerIndex: number,
  socket: SocketIOClient.Socket,
}

function Game(props: GameProps) {
  const { id, game, playerIndex, socket } = props;

  const playFn = (card: ICard) => socket.emit('play', card);
  const discardFn = (card: ICard) => socket.emit('discard', card);
  const hintFn = () => socket.emit('hint');

  const otherPlayersMap = computeOtherPlayersMap(game.playersInOrder, playerIndex);
  const playerPos2 = otherPlayersMap.get(2);
  const playerPos3 = otherPlayersMap.get(3);
  const playerPos4 = otherPlayersMap.get(4);
  const playerPos6 = otherPlayersMap.get(6);


  const mainPlayerComponent = (player: IPlayer) => {
    return <MainPlayer
      player={player}
      playFn={playFn}
      discardFn={discardFn}
      hintFn={hintFn}
      currentPlaying={game.currentPlaying === player.index}
      canDiscard={game.hints < game.maxHints}
    />;
  }

  const otherPlayerComponent = (player: IPlayer) => {
    if (env === "development" && id.includes("test")) {
      return mainPlayerComponent(player);
    } else {
      return <OtherPlayer player={player} currentPlayerIndex={game.currentPlaying} />;
    }
  }
  
  const mainPlayer = mainPlayerComponent(game.playersInOrder[playerIndex]);

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
        <Col debug>{playerPos2 && otherPlayerComponent(playerPos2) }</Col>
        <Col debug>{playerPos3 && otherPlayerComponent(playerPos3) }</Col>
      </Row>
      <Row debug style={{ height: "50%" }}>
        <Col debug>{playerPos4 && otherPlayerComponent(playerPos4) }</Col>
        <Col debug><Fireworks colorsWithCount={game.fireworks.inner} /></Col>
        <Col debug>{playerPos6 && otherPlayerComponent(playerPos6) }</Col>
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