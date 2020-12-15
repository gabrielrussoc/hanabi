import { ICard, IColor, IGame, IGamePlayer, IFireworks } from "hanabi-interface";
import { useEffect, useState } from "react";
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

interface CardMoved {
  index: number,
  up: boolean,
}

interface Actions {
  play: (c: ICard) => void;
  discard: (c: ICard) => void;
  hint: () => void,
  moveCardUp: (i: number) => void,
  moveCardDown: (i: number) => void,
}

interface PlayableCardListProps {
  cards: ICard[],
  showCards: boolean,
  currentPlaying: boolean,
  actions: Actions,
  canDiscard: boolean,
  gameOver: boolean,
  cardMoved?: CardMoved,
}

function PlayableCardList(props: PlayableCardListProps) {
  const { cards, cardMoved, showCards, gameOver, currentPlaying, actions, canDiscard } = props;
  return (
    <>
      {cards.map((c, i) => {
        return (
          <div key={i}>
            <Card card={c} hidden={!showCards} />
            {<button onClick={() => actions.play(c)} disabled={gameOver || !currentPlaying}>Play</button>}
            {<button onClick={() => actions.discard(c)} disabled={gameOver || !currentPlaying || !canDiscard}>Discard</button>}
            {<button onClick={() => actions.moveCardUp(i)} disabled={gameOver}>Move up</button>}
            {<button onClick={() => actions.moveCardDown(i)} disabled={gameOver}>Move down</button>}
            {cardMoved && cardMoved.index === i && `Moved ${cardMoved.up ? "up" : "down"}`}
          </div>
        );
      })}
    </>
  );
}

function SimpleCardList(props: { cards: ICard[] }) {
  const { cards } = props;
  return (
    <>
      {cards.map((c, i) => {
        return (
          <Card key={i} card={c} hidden={false} />
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
  return <> <h1>Discard pile:</h1> <SimpleCardList cards={cards} /> </>;
}

function Fireworks(props: { fireworks: IFireworks, gameOver: boolean }) {
  const { fireworks, gameOver } = props;
  // TODO: return a proper component here
  return (
    <>
      <h1> Fireworks: </h1>
      {fireworks.inner.map(([color, count], i) =>
        <div key={i} style={{ color: IColor[color], display: "inline" }}>{count}■</div>)
      }
      {
        gameOver && <>
          <h2>Game over!</h2>
          <h2> Final score: {fireworks.score}</h2>
        </>
      }
    </>
  );
}

function Deck(props: { cardsRemaining: number }) {
  const { cardsRemaining } = props;
  return <h1>Cards on deck: {cardsRemaining}</h1>
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

function OtherPlayer(props: { player: IGamePlayer, currentPlayerIndex: number }) {
  const { player, currentPlayerIndex } = props;
  const currentPlaying = currentPlayerIndex === player.index;
  return <>
    <h1> {player.name.name} {currentPlaying ? "*" : ""}</h1>
    <SimpleCardList cards={player.cardsInOrder} />
  </>;
}

interface MainPlayerProps {
  player: IGamePlayer,
  actions: Actions,
  canDiscard: boolean,
  currentPlaying: boolean,
  gameOver: boolean,
  cardMoved?: CardMoved,
}

function MainPlayer(props: MainPlayerProps) {
  const { player, cardMoved, actions, canDiscard, currentPlaying, gameOver } = props;
  return <>
    <h1>You {currentPlaying ? "*" : ""}</h1>
    <button onClick={actions.hint} disabled={gameOver || !currentPlaying}>Give hint</button>
    <br />
    <PlayableCardList
      cards={player.cardsInOrder}
      currentPlaying={currentPlaying}
      showCards={env !== "development"}
      actions={actions}
      canDiscard={canDiscard}
      gameOver={gameOver}
      cardMoved={cardMoved} />
  </>;
}

// Compute where to display the players
// If we numbers the columns as
// 1 | 2 | 3
// 4 | 5 | 6
// 7 | 8 | 9
// We map each index (1-based) to each player.
function computeOtherPlayersMap(playersInOrder: IGamePlayer[], mainPlayerIndex: number): Map<number, IGamePlayer> {
  const N = playersInOrder.length;
  let map = new Map<number, IGamePlayer>();
  if (N === 2) {
    map.set(2, playersInOrder[(mainPlayerIndex + 1) % N]);
  } else if (N === 3) {
    map.set(4, playersInOrder[(mainPlayerIndex + 1) % N]);
    map.set(6, playersInOrder[(mainPlayerIndex + 2) % N]);
  } else if (N === 4) {
    map.set(4, playersInOrder[(mainPlayerIndex + 1) % N]);
    map.set(2, playersInOrder[(mainPlayerIndex + 2) % N]);
    map.set(6, playersInOrder[(mainPlayerIndex + 3) % N]);
  } else if (N === 5) {
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
  const [moved, setMoved] = useState<CardMoved>();

  useEffect(() => {
    if (moved) {
      const handle = setTimeout(() => setMoved(undefined), 750);
      return () => clearTimeout(handle);
    }
  });

  const actions = {
    play(card: ICard) { socket.emit('play', card); },
    hint() { socket.emit('hint'); },
    discard(card: ICard) { socket.emit('discard', card); },
    moveCardUp(index: number) {
      socket.emit('move card', { "index": index, "left": true });
      setMoved({ "index": index, "up": true });
    },
    moveCardDown(index: number) {
      socket.emit('move card', { "index": index, "left": false });
      setMoved({ "index": index, "up": false });
    },
  }

  const otherPlayersMap = computeOtherPlayersMap(game.playersInOrder, playerIndex);
  const playerPos2 = otherPlayersMap.get(2);
  const playerPos3 = otherPlayersMap.get(3);
  const playerPos4 = otherPlayersMap.get(4);
  const playerPos6 = otherPlayersMap.get(6);


  const mainPlayerComponent = (player: IGamePlayer) => {
    return <MainPlayer
      player={player}
      actions={actions}
      currentPlaying={game.currentPlaying === player.index}
      canDiscard={game.hints < game.maxHints}
      gameOver={game.gameOver}
      cardMoved={moved}
    />;
  }

  const otherPlayerComponent = (player: IGamePlayer) => {
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
      <Row debug style={{ height: "33%" }}>
        <Col debug><Deck cardsRemaining={game.remainingCards} /></Col>
        <Col debug>{playerPos2 && otherPlayerComponent(playerPos2)}</Col>
        <Col debug>{playerPos3 && otherPlayerComponent(playerPos3)}</Col>
      </Row>
      <Row debug style={{ height: "33%" }}>
        <Col debug>{playerPos4 && otherPlayerComponent(playerPos4)}</Col>
        <Col debug><Fireworks fireworks={game.fireworks} gameOver={game.gameOver} /></Col>
        <Col debug>{playerPos6 && otherPlayerComponent(playerPos6)}</Col>
      </Row>
      <Row debug style={{ height: "33%" }}>
        <Col debug><Discard cardsWithCount={game.discard.inner} /></Col>
        <Col debug>{mainPlayer}</Col>
        <Col debug><Tokens hints={game.hints} lives={game.lives} /></Col>
      </Row>
    </Container>
  );
}

export default Game;