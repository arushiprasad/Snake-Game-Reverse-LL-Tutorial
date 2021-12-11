import React, {useEffect, useState} from 'react';
import {randomIntFromInterval, useInterval} from '../lib/utils.js';
import PlayCircleFilledWhiteIcon from '@mui/icons-material/PlayCircleFilledWhite';
import ReplayIcon from '@mui/icons-material/Replay';
import Button from '@mui/material/Button';

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

  362,
  410,
  455,
  599,
  456,
  457,
  317,
  318,
  319,
  364,
  412,
  461,
  462,
  511,
  559,
  604,
  605,
  606,
  513,
  561,
  657,
]);
const p = new Array([
  357,
  405,
  453,
  501,
  549,
  597,
  310,
  311,
  360,
  408,
  455,
  454,
]);
const getStartingSnakeLLValue = (): LinkedList => {
  const startingRow = 6;
  const startingCol = 32;
  const head: Coords = {
    row: startingRow,
    col: startingCol,
    cell: 321,
  };
  const coord1: Coords = {
    row: startingRow + 1,
    col: startingCol,
    cell: 369,
  };
  const coord2: Coords = {
    row: startingRow + 2,
    col: startingCol,
    cell: 417,
  };
  const coord3: Coords = {
    row: startingRow + 3,
    col: startingCol,
    cell: 465,
  };
  const node3: Node = {value: coord3, next: null};
  const node2: Node = {value: coord2, next: node3};
  const node1: Node = {value: coord1, next: node2};
  const headNode: Node = {value: head, next: node1};
  return {head: node3, tail: headNode};
};

const Board: React.FC = () => {
  const [score, setScore] = useState(0);
  const [board, setBoard] = useState(
    createBoard(BOARD_ROW_SIZE, BOARD_COL_SIZE),
  );

  const [snake, setSnake] = useState<LinkedList>(getStartingSnakeLLValue());
  const [snakeCells, setSnakeCells] = useState(new Set([321, 369, 417, 465]));

  const [direction, setDirection] = useState(Direction.DOWN);

  // Naively set the starting food cell 5 cells away from the starting snake cell.
  const [foodCell, setFoodCell] = useState(10);

  const [shouldStart, setShouldStart] = useState(false);
  const [numberOfGames, setNumberOfGames] = useState(0);

  useEffect(() => {
    window.addEventListener('keydown', e => {
      handleKeydown(e);
    });
  });

  // `useInterval` is needed; you can't naively do `setInterval` in the
  // `useEffect` above. See the article linked above the `useInterval`
  // definition for details.
  useInterval(() => {
    if (shouldStart) {
      //moveSnake();
    }
  }, 200);

  const handleKeydown = (e: KeyboardEvent) => {
    const newDirection = getDirectionFromKey(e.key);
    console.log(direction);
    const isValidDirection = newDirection !== '';
    const something = newDirection === '' ? Direction.UP : newDirection;
    // if (!isValidDirection) return;
    const snakeWillRunIntoItself =
      getOppositeDirection(something) === direction && snakeCells.size > 1;
    // Note: this functionality is currently broken, for the same reason that
    // `useInterval` is needed. Specifically, the `direction` and `snakeCells`
    // will currently never reflect their "latest version" when `handleKeydown`
    // is called. I leave it as an exercise to the viewer to fix this :P
    if (snakeWillRunIntoItself) return;
    setDirection(something);
  };

  const onClick = () => {
    setShouldStart(true);
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
    setScore(score + 1);
  };

  const handleGameOver = () => {
    setScore(0);
    const snakeLLStartingValue = getStartingSnakeLLValue();
    setSnake(snakeLLStartingValue);
    setFoodCell(10);
    setSnakeCells(new Set([321, 369, 417, 465]));
    setShouldStart(false);
    setDirection(Direction.DOWN);
    setNumberOfGames(numberOfGames + 1);
  };

  return (
    <>
      {/* <h1>Score: {score}</h1> */}
      {shouldStart && (
        <div className="score">
          <Button variant="outlined" color="error" className="scoreButton">
            {score}
          </Button>
        </div>
      )}
      <div className="board">
        {!shouldStart && (
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
        )}

        {shouldStart &&
          board.map((row, rowIdx) => (
            <div key={rowIdx} className="row">
              {row.map((cellValue, cellIdx) => {
                const className = getCellClassName(
                  cellValue,
                  foodCell,
                  snakeCells,
                );
                return (
                  <div key={cellIdx} className={className}>
                    {cellValue}
                  </div>
                );
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
  } else if (oops.has(cellValue)) {
    className = 'cell cell-blue';
  } else className = 'cell cell-white';

  return className;
};

export default Board;
