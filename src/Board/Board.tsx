import React, {useEffect, useState} from 'react';
import {
  randomIntFromInterval,
  useInterval,
} from '../lib/utils.js';
import PlayCircleFilledWhiteIcon from '@mui/icons-material/PlayCircleFilledWhite';

import './Board.css';
import { truncate } from 'fs';

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
  UP= 'UP',
  RIGHT= 'RIGHT',
  DOWN= 'DOWN',
  LEFT= 'LEFT'
};

 interface Node {
    value:Coords,
    next:Node|null
}

interface Coords{
  row:number,
  col:number,
  cell:number
}

interface LinkedList {
    head:Node,
    tail:Node
}

const BOARD_ROW_SIZE = 16;
const BOARD_COL_SIZE = 48;

const getStartingSnakeLLValue = ():LinkedList => {
  const startingRow = 6;
  const startingCol = 32;
  const startingCell = 321;
  const node:Coords= {
    row: startingRow,
    col: startingCol,
    cell: startingCell,
  };
  return {head:{value:node,next:null},tail:{value:node,next:null}}  
};

const Board: React.FC= () => {
  const [score, setScore] = useState(0);
  const [board, setBoard] = useState(
    createBoard(BOARD_ROW_SIZE, BOARD_COL_SIZE),
  );

  const [snake, setSnake] = useState<LinkedList>(
    getStartingSnakeLLValue()
  );
  const [snakeCells, setSnakeCells] = useState(
    new Set([snake.head.value.cell]),
  );

  const [direction, setDirection] = useState(Direction.DOWN);

  // Naively set the starting food cell 5 cells away from the starting snake cell.
  const [foodCell, setFoodCell] = useState(snake.head.value.cell+5);

  const [shouldStart, setShouldStart] = useState(true);

  useEffect(() => {
    window.addEventListener('keydown', e => {
      handleKeydown(e);
    });
  }, []);


  // `useInterval` is needed; you can't naively do `setInterval` in the
  // `useEffect` above. See the article linked above the `useInterval`
  // definition for details.
  useInterval(() => {
    if (shouldStart) {
      moveSnake();
    }
  }, 200);

  const handleKeydown = (e:KeyboardEvent) => {
    const newDirection = getDirectionFromKey(e.key);
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

    const newNodeForLLEnd:Coords = {
      row: nextHeadCoords.row,
      col: nextHeadCoords.col,
      cell: nextHeadCell,
    };
    const currentEndNode = snake.head;
    snake.head = {value:newNodeForLLEnd,next:null};
    currentEndNode.next = {value:newNodeForLLEnd,next:null};


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
    const tailNextNodeDirection = getNextNodeDirection(
      snake.tail,
      direction,
    );
    const growthDirection = getOppositeDirection(tailNextNodeDirection);
    const growthNodeCoords = getCoordsInDirection(
      snake.tail.value,
      growthDirection!!,
    );
    return growthNodeCoords;
  };
  // This function mutates newSnakeCells.
  const growSnake = (newSnakeCells:Set<number>) => {
    const growthNodeCoords = getGrowthNodeCoords();
    if (isOutOfBounds(growthNodeCoords, board)) {
      // Snake is positioned such that it can't grow; don't do anything.
      return;
    }
    const newTailCell = board[growthNodeCoords!.row][growthNodeCoords!.col];
    const newNodeForLLStart:Coords ={
      row: growthNodeCoords!.row,
      col: growthNodeCoords!.col,
      cell: newTailCell,
    };
    const currentTail = snake.tail;
    snake.tail = {value:newNodeForLLStart,next:currentTail};
    snake.tail.next = currentTail;

    newSnakeCells.add(newTailCell);
  };

  const handleFoodConsumption = (newSnakeCells:Set<number>) => {
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
    setFoodCell(snakeLLStartingValue.head.value.cell + 5);
    setSnakeCells(new Set([snakeLLStartingValue.head.value.cell]));
    setShouldStart(false);
    setDirection(Direction.DOWN);
  };

  return (
    <>
      {/* <h1>Score: {score}</h1> */}
      <div className="board">
        {shouldStart && <div className="score">{score}</div>}
        {!shouldStart && (
          <div className="loadingPage">
            <div className="header">OOPS!</div>
            <div className="errorMessage">OUR SERVER IS ON A BREAK</div>
            <div className="iconStyle">
              <PlayCircleFilledWhiteIcon
                //onClick={onClick}
                className="icon"
                fontSize="large"
              />
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
                return <div key={cellIdx} className={className}>{cellValue}</div>;
              })}
            </div>
          ))}
      </div>
    </>
  );
};

const createBoard = (BOARD_ROW_SIZE:number, BOARD_COL_SIZE:number):number[][] => {
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

const getCoordsInDirection = (coords:Coords, direction:Direction) => {
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

const isOutOfBounds = (coords:any, board:number[][]) => {
  const {row, col} = coords;
  if (row < 0 || col < 0) return true;
  if (row >= board.length || col >= board[0].length) return true;
  return false;
};

const getDirectionFromKey = (key:string) => {
  if (key === 'ArrowUp') return Direction.UP;
  if (key === 'ArrowRight') return Direction.RIGHT;
  if (key === 'ArrowDown') return Direction.DOWN;
  if (key === 'ArrowLeft') return Direction.LEFT;
  return '';
};

const getNextNodeDirection = (node:Node, currentDirection:Direction) => {
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
  }
  else throw Error;
};



const getOppositeDirection = (direction:Direction) => {
  if (direction === Direction.UP) return Direction.DOWN;
  if (direction === Direction.RIGHT) return Direction.LEFT;
  if (direction === Direction.DOWN) return Direction.UP;
  if (direction === Direction.LEFT) return Direction.RIGHT;
};

const getCellClassName = (cellValue:number, foodCell:number, snakeCells:Set<number>) => {
  let className = 'cell';
  if (cellValue === foodCell) {
    className = 'cell cell-red';
  }
  if (snakeCells.has(cellValue)) className = 'cell cell-green'; else className='cell cell-white'

  return className;
};

export default Board;
