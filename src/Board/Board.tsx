import React, {useEffect, useState} from 'react';
import {randomIntFromInterval, useInterval} from '../lib/utils.js';
import PlayCircleFilledWhiteIcon from '@mui/icons-material/PlayCircleFilledWhite';
import ReplayIcon from '@mui/icons-material/Replay';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import {ReactComponent as SnakeIcon} from './Snake.svg';

import './Board.css';
import {truncate} from 'fs';

/**
 * This has shitty naming so its hard to figure out whats happening.
 * whats been named as head is actually the tail/end of the linked list.
 * whenever we are moving the snake, we are creating a new node at the end of the linked list and adding that cell.
 * While moving we need to remove the last node, whihc has been referred to as tail but is actually the head of the LL.
 */

/**
 * TODO: add a more elegant UX for before a game starts and after a game ends.
 * A game probably shouldn't start until the user presses an arrow key, and
 * once a game is over, the board state should likely freeze until the user
 * intentionally restarts the game.
 */
enum Direction {
  UP = 'UP',
  RIGHT = 'RIGHT',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
}

interface Node {
  value: Coords;
  next: Node | null;
}

interface Coords {
  row: number;
  col: number;
  cell: number;
}

interface LinkedList {
  head: Node;
  tail: Node;
}

const BOARD_ROW_SIZE = 20;
const BOARD_COL_SIZE = 48;
let oops = new Set([
  300,
  301,
  347,
  395,
  443,
  491,
  539,
  302,
  351,
  399,
  447,
  495,
  543,
  590,
  588,
  589,
  353,
  401,
  449,
  497,
  545,
  306,
  307,
  308,
  357,
  405,
  453,
  501,
  549,
  594,
  595,
  596,
  359,
  407,
  455,
  503,
  551,
  312,
  313,
  455,
  599,
  456,
  318,
  319,
  365,
  413,
  462,
  463,
  606,
  607,
  608,
  513,
  561,
  314,
  363,
  411,
  458,
  457,
  320,
  464,
  557,
  369,
]);

const getStartingSnakeLLValue = (): LinkedList => {
  const startingRow = 6;
  const startingCol = 36;
  const head: Coords = {
    row: startingRow,
    col: startingCol,
    cell: 325,
  };
  const coord1: Coords = {
    row: startingRow + 1,
    col: startingCol,
    cell: 373,
  };
  const coord2: Coords = {
    row: startingRow + 2,
    col: startingCol,
    cell: 421,
  };
  const coord3: Coords = {
    row: startingRow + 3,
    col: startingCol,
    cell: 469,
  };
  const coord4: Coords = {
    row: startingRow + 4,
    col: startingCol,
    cell: 517,
  };
  const node4: Node = {value: coord4, next: null};
  const node3: Node = {value: coord3, next: node4};
  const node2: Node = {value: coord2, next: node3};
  const node1: Node = {value: coord1, next: node2};
  const headNode: Node = {value: head, next: node1};
  return {head: node4, tail: headNode};
};

const Board: React.FC = () => {
  const [score, setScore] = useState(0);
  const [board, setBoard] = useState(
    createBoard(BOARD_ROW_SIZE, BOARD_COL_SIZE),
  );

  const [snake, setSnake] = useState<LinkedList>(getStartingSnakeLLValue());
  const [snakeCells, setSnakeCells] = useState(
    new Set([325, 373, 421, 469, 517]),
  );

  const [direction, setDirection] = useState(Direction.DOWN);

  // Naively set the starting food cell 5 cells away from the starting snake cell.
  const [foodCell, setFoodCell] = useState(613);

  const [shouldStart, setShouldStart] = useState(false);
  const [numberOfGames, setNumberOfGames] = useState(0);

  useEffect(() => {
    window.addEventListener('keydown', e => {
      handleKeydown(e);
    });
  });

  useEffect(() => {
    window.addEventListener('keydown', e => {
      handleInitialKeyChange(e);
    });
  });

  useEffect(() => {
    getBadge();
  }, [score]);

  // `useInterval` is needed; you can't naively do `setInterval` in the
  // `useEffect` above. See the article linked above the `useInterval`
  // definition for details.
  useInterval(() => {
    if (shouldStart) {
      moveSnake();
    }
  }, 200);

  const handleInitialKeyChange = (e: KeyboardEvent) => {
    setShouldStart(true);
  };

  const handleKeydown = (e: KeyboardEvent) => {
    const newDirection = getDirectionFromKey(e.key);
    console.log(direction);
    const isValidDirection = newDirection !== '';
    if (!isValidDirection) return;
    const snakeWillRunIntoItself =
      getOppositeDirection(newDirection) === direction && snakeCells.size > 1;
    // Note: this functionality is currently broken, for the same reason that
    // `useInterval` is needed. Specifically, the `direction` and `snakeCells`
    // will currently never reflect their "latest version" when `handleKeydown`
    // is called. I leave it as an exercise to the viewer to fix this :P
    if (snakeWillRunIntoItself) return;
    setDirection(newDirection);
  };

  const onClick = () => {
    setShouldStart(true);
  };

  const getBadge = () => {
    if (score <= 100) {
      return 'Beginner';
    } else if (score <= 300) {
      return 'Mediocre';
    } else {
      return 'Expert';
    }
  };

  const moveSnake = () => {
    const nextHeadCoords = getCoordsInDirection(snake.head.value, direction)!;

    if (isOutOfBounds(nextHeadCoords, board)) {
      handleGameOver();
      return;
    }
    const nextHeadCell = board[nextHeadCoords.row][nextHeadCoords.col];
    if (snakeCells.has(nextHeadCell)) {
      handleGameOver();
      return;
    }

    //Create new node which would be appended to the end of the LL

    const newNodeForLLEnd: Coords = {
      row: nextHeadCoords.row,
      col: nextHeadCoords.col,
      cell: nextHeadCell,
    };
    const currentEndNode = snake.head;
    snake.head = {value: newNodeForLLEnd, next: null};
    currentEndNode.next = snake.head;

    //remove tail of snake(head of ll) cell
    const newSnakeCells = new Set(snakeCells);
    newSnakeCells.delete(snake.tail.value.cell);
    newSnakeCells.add(nextHeadCell);

    snake.tail = snake.tail.next!;
    if (snake.tail === null) snake.tail = snake.head;

    const foodConsumed = nextHeadCell === foodCell;
    if (foodConsumed) {
      // This function mutates newSnakeCells.
      growSnake(newSnakeCells);
      //if (foodShouldReverseDirection) reverseSnake();
      handleFoodConsumption(newSnakeCells);
    }

    setSnakeCells(newSnakeCells);
  };

  const getGrowthNodeCoords = () => {
    const tailNextNodeDirection = getNextNodeDirection(snake.tail, direction);
    const growthDirection = getOppositeDirection(tailNextNodeDirection);
    const growthNodeCoords = getCoordsInDirection(
      snake.tail.value,
      growthDirection!!,
    );
    return growthNodeCoords;
  };
  // This function mutates newSnakeCells.
  const growSnake = (newSnakeCells: Set<number>) => {
    const growthNodeCoords = getGrowthNodeCoords();
    if (isOutOfBounds(growthNodeCoords, board)) {
      // Snake is positioned such that it can't grow; don't do anything.
      return;
    }
    const newTailCell = board[growthNodeCoords!.row][growthNodeCoords!.col];
    const newNodeForLLStart: Coords = {
      row: growthNodeCoords!.row,
      col: growthNodeCoords!.col,
      cell: newTailCell,
    };
    const currentTail = snake.tail;
    snake.tail = {value: newNodeForLLStart, next: currentTail};
    snake.tail.next = currentTail;

    newSnakeCells.add(newTailCell);
  };

  const getCellClassName = (
    cellValue: number,
    foodCell: number,
    snakeCells: Set<number>,
  ) => {
    let className = 'cell';
    if (cellValue === foodCell) {
      className = 'cell cell-red';
    } else if (snakeCells.has(cellValue)) {
      className = 'cell cell-blue';
    } else if (oops.has(cellValue - 2) && shouldStart) {
      // -2 here for alignment
      className = 'cell cell-oops';
      // } else if(cellValue===foodOG){
      //   className = 'cell cell-red';
    } else if (oops.has(cellValue - 2) && !shouldStart) {
      // -2 here for alignment
      className = 'cell cell-oops-blue';
      // } else if(cellValue===foodOG){
      //   className = 'cell cell-red';
    } else className = 'cell cell-white';

    return className;
  };

  const handleFoodConsumption = (newSnakeCells: Set<number>) => {
    const maxPossibleCellValue = BOARD_ROW_SIZE * BOARD_COL_SIZE;
    let nextFoodCell;
    // In practice, this will never be a time-consuming operation. Even
    // in the extreme scenario where a snake is so big that it takes up 90%
    // of the board (nearly impossible), there would be a 10% chance of generating
    // a valid new food cell--so an average of 10 operations: trivial.
    while (true) {
      nextFoodCell = randomIntFromInterval(1, maxPossibleCellValue);
      if (newSnakeCells.has(nextFoodCell) || foodCell === nextFoodCell)
        continue;
      break;
    }

    setFoodCell(nextFoodCell);
    setScore(score + 10);
  };

  const handleGameOver = () => {
    setScore(0);
    const snakeLLStartingValue = getStartingSnakeLLValue();
    setSnake(snakeLLStartingValue);
    setFoodCell(613);
    setSnakeCells(new Set([325, 373, 421, 469, 517]));
    setShouldStart(false);
    setDirection(Direction.DOWN);
    setNumberOfGames(numberOfGames + 1);
  };

  return (
    <>
      {/* <h1>Score: {score}</h1> */}
      {
        <div className="score">
          {/* <div className="badge">
            <Chip
              icon={<StarBorderIcon />}
              label={getBadge()}
              variant="outlined"
            />
          </div> */}
          <Button
            style={{
              color: 'black',
              borderColor: 'black',
              fontWeight: 'bolder',
              fontSize: '1rem',
              fontFamily: 'Orbitron, sans-serif',
            }}
            className="scoreButton">
            {`SCORE: ${score} / 1000`}
          </Button>
          {score > 50 ? <SnakeIcon /> : undefined}
          <div className="iconStyle">
            {numberOfGames === 0 ? (
              <PlayCircleFilledWhiteIcon
                onClick={onClick}
                className="icon"
                fontSize="large"
              />
            ) : (
              <ReplayIcon onClick={onClick} className="icon" fontSize="large" />
            )}
          </div>{' '}
        </div>
      }
      <div className="board">
        {/* {!shouldStart && (
          <div className="loadingPage">
            <div className="header">OOPS!</div>
            <div className="errorMessage">OUR SERVER IS ON A BREAK</div>
            <div className="iconStyle">
              {numberOfGames === 0 ? (
                <PlayCircleFilledWhiteIcon
                  onClick={onClick}
                  className="icon"
                  fontSize="large"
                />
              ) : (
                <ReplayIcon
                  onClick={onClick}
                  className="icon"
                  fontSize="large"
                />
              )}
            </div>{' '}
          </div>
        )} */}

        {board.map((row, rowIdx) => (
          <div key={rowIdx} className="row">
            {row.map((cellValue, cellIdx) => {
              const className = getCellClassName(
                cellValue,
                foodCell,
                snakeCells,
              );
              return <div key={cellIdx} className={className}></div>;
            })}
          </div>
        ))}
      </div>
    </>
  );
};

const createBoard = (
  BOARD_ROW_SIZE: number,
  BOARD_COL_SIZE: number,
): number[][] => {
  let counter = 1;
  const board = [];
  for (let row = 0; row < BOARD_ROW_SIZE; row++) {
    const currentRow = [];
    for (let col = 0; col < BOARD_COL_SIZE; col++) {
      currentRow.push(counter++);
    }
    board.push(currentRow);
  }
  return board;
};

const getCoordsInDirection = (coords: Coords, direction: Direction) => {
  if (direction === Direction.UP) {
    return {
      row: coords.row - 1,
      col: coords.col,
    };
  }
  if (direction === Direction.RIGHT) {
    return {
      row: coords.row,
      col: coords.col + 1,
    };
  }
  if (direction === Direction.DOWN) {
    return {
      row: coords.row + 1,
      col: coords.col,
    };
  }
  if (direction === Direction.LEFT) {
    return {
      row: coords.row,
      col: coords.col - 1,
    };
  }
};

const isOutOfBounds = (coords: any, board: number[][]) => {
  const {row, col} = coords;
  if (row < 0 || col < 0) return true;
  if (row >= board.length || col >= board[0].length) return true;
  return false;
};

const getDirectionFromKey = (key: string) => {
  if (key === 'ArrowUp') return Direction.UP;
  if (key === 'ArrowRight') return Direction.RIGHT;
  if (key === 'ArrowDown') return Direction.DOWN;
  if (key === 'ArrowLeft') return Direction.LEFT;
  return '';
};

const getNextNodeDirection = (node: Node, currentDirection: Direction) => {
  if (node.next === null) return currentDirection;
  const {row: currentRow, col: currentCol} = node.value;
  const {row: nextRow, col: nextCol} = node.next.value;
  if (nextRow === currentRow && nextCol === currentCol + 1) {
    return Direction.RIGHT;
  }
  if (nextRow === currentRow && nextCol === currentCol - 1) {
    return Direction.LEFT;
  }
  if (nextCol === currentCol && nextRow === currentRow + 1) {
    return Direction.DOWN;
  }
  if (nextCol === currentCol && nextRow === currentRow - 1) {
    return Direction.UP;
  } else throw Error;
};

const getOppositeDirection = (direction: Direction) => {
  if (direction === Direction.UP) return Direction.DOWN;
  if (direction === Direction.RIGHT) return Direction.LEFT;
  if (direction === Direction.DOWN) return Direction.UP;
  if (direction === Direction.LEFT) return Direction.RIGHT;
};

export default Board;
