import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faTrash, faCaretLeft, faCaretRight, faLightbulb } from '@fortawesome/free-solid-svg-icons'
import { ICard, IColor, IGame, IGamePlayer, IFireworks } from "hanabi-interface";
import { useEffect, useState } from "react";
import { Container, Row, Col } from 'react-grid-system';
import { IconProp } from "@fortawesome/fontawesome-svg-core";

const env = process.env.NODE_ENV || 'development';

interface CardProps {
  card: ICard,
  hidden: boolean,
}

function Card(props: CardProps) {
  const { card, hidden } = props;
  const style = {
    display: "inline",
    width: "100%",
    // typescript is funny. If we don't cast this it fails with
    // a type error.
    textAlign: "center" as "center",
    color: hidden ? "black" : IColor[card.color],
  };
  const text = hidden ? "?■" : `${card.value}■`;
  return <div style={style}>{text}</div>;
}

interface CardMoved {
  index: number,
  up: boolean,
}

interface Actions {
  play: (c: ICard) => void;
  discard: (c: ICard) => void;
  hint: () => void,
  moveCardLeft: (i: number) => void,
  moveCardRight: (i: number) => void,
}

interface PlayableCardProps {
  card: ICard,
  index: number,
  lastIndex: number,
  hidden: boolean,
  canDiscard: boolean,
  canPlay: boolean,
  canMove: boolean,
  actions: Actions,
}

function PlayableCard(props: PlayableCardProps) {
  const { card, hidden, actions, index, canPlay, canDiscard, canMove, lastIndex } = props;
  const Action = (props: { icon: IconProp, action: () => void, disabled: boolean }) => {
    const { icon, action, disabled } = props;
    return (
      <button onClick={action} style={{ width: "100%" }} disabled={disabled}>
        <FontAwesomeIcon icon={icon} />
      </button>
    );
  }
  return (
    <Container style={{ padding: "0.2em" }}>
      <Row nogutter>
        <Card card={card} hidden={hidden} />
      </Row>
      <Row nogutter>
        <Col><Action icon={faTrash} action={() => actions.discard(card)} disabled={!canDiscard} /></Col>
        <Col><Action icon={faPlay} action={() => actions.play(card)} disabled={!canPlay} /></Col>
      </Row>
      <Row nogutter>
        <Col>
          <Action icon={faCaretLeft} action={() => actions.moveCardLeft(index)} disabled={!canMove || index === 0} />
        </Col>
        <Col>
          <Action icon={faCaretRight} action={() => actions.moveCardRight(index)} disabled={!canMove || index === lastIndex} />
        </Col>
      </Row>
    </Container>
  );
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
  const canPlayButton = !gameOver && currentPlaying;
  const canDiscardButton = canDiscard && canPlayButton;
  const canMoveButton = !gameOver;
  return (
    <Container>
      <Row nogutter>
        {cards.map((card, i) => {
          return (
            <Col>
              <PlayableCard
                card={card}
                index={i}
                lastIndex={cards.length - 1}
                hidden={!showCards}
                canPlay={canPlayButton}
                canDiscard={canDiscardButton}
                canMove={canMoveButton}
                actions={actions}
              />
            </Col>
          );
        })}
      </Row>
    </Container>
  );
}

function SimpleCardList(props: { cards: ICard[] }) {
  const { cards } = props;
  return (
    <div>
      {cards.map((c, i) => {
        return (
          <Card key={i} card={c} hidden={false} />
        );
      })}
    </div>
  );
}

// No idea how to iterate through enum and make typescript happy.
// TODO: Don't hardcode all enum values here
function allColors(): IColor[] {
  return [IColor.BLUE, IColor.GREEN, IColor.RED, IColor.WHITE, IColor.YELLOW];
}

function Discard(props: { cardsWithCount: [ICard, number][] }) {
  const { cardsWithCount } = props;
  let cards: ICard[] = [];
  cardsWithCount.forEach(([card, count]) => {
    for (let i = 0; i < count; i++) {
      cards.push(card);
    }
  });
  const fromColor = (cards: ICard[], color: IColor) => cards.filter(c => c.color === color);
  // TODO: return a proper component here
  return (
    <>
      <h1>Discard pile:</h1>
      {allColors().map(color => <SimpleCardList cards={fromColor(cards, color)} />)}
    </>
  );
}

function Fireworks(props: { fireworks: IFireworks, gameOver: boolean, lives: number }) {
  const { fireworks, gameOver, lives } = props;
  // TODO: return a proper component here
  return (
    <>
      <h1> Fireworks: </h1>
      {!gameOver && <h4> Score: {fireworks.score}</h4>}
      {fireworks.inner.map(([color, count], i) =>
        <div key={i} style={{ color: IColor[color], display: "inline" }}>{count}■</div>)
      }
      {
        gameOver && <>
          <h2>Game over!</h2>
          <h2> Final score: {lives > 0 ? fireworks.score : 0}</h2>
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
  canHint: boolean,
  currentPlaying: boolean,
  gameOver: boolean,
  cardMoved?: CardMoved,
}

function MainPlayer(props: MainPlayerProps) {
  const { player, cardMoved, actions, canDiscard, canHint, currentPlaying, gameOver } = props;
  const disableHint = !canHint || gameOver || !currentPlaying;
  return <>
    <h1>You {currentPlaying ? "*" : ""}</h1>
    <PlayableCardList
      cards={player.cardsInOrder}
      currentPlaying={currentPlaying}
      showCards={gameOver || env === "development"}
      actions={actions}
      canDiscard={canDiscard}
      gameOver={gameOver}
      cardMoved={cardMoved} />
    <Container>
      <button onClick={actions.hint} disabled={disableHint} style={{margin: "0 auto", display: "block"}}>
        <FontAwesomeIcon icon={faLightbulb} /> Hint
      </button>
    </Container>
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
  playerIndex?: number,
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
    moveCardLeft(index: number) {
      socket.emit('move card', { "index": index, "left": true });
      setMoved({ "index": index, "up": true });
    },
    moveCardRight(index: number) {
      socket.emit('move card', { "index": index, "left": false });
      setMoved({ "index": index, "up": false });
    },
  }

  const otherPlayersMap = computeOtherPlayersMap(game.playersInOrder, playerIndex ?? 0);
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
      canHint={game.hints > 0}
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

  const mainPlayer = (() => {
    if (playerIndex != null) {
      return mainPlayerComponent(game.playersInOrder[playerIndex]);
    } else {
      // In this case, we're spectating 
      return <OtherPlayer player={game.playersInOrder[0]} currentPlayerIndex={game.currentPlaying} />;
    }
  })();

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
        <Col debug><Fireworks fireworks={game.fireworks} gameOver={game.gameOver} lives={game.lives} /></Col>
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