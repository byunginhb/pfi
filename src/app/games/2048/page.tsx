'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// 타일 색상 매핑
const TILE_COLORS: { [key: number]: string } = {
  2: 'bg-[#eee4da] text-[#776e65]',
  4: 'bg-[#ede0c8] text-[#776e65]',
  8: 'bg-[#f2b179] text-white',
  16: 'bg-[#f59563] text-white',
  32: 'bg-[#f67c5f] text-white',
  64: 'bg-[#f65e3b] text-white',
  128: 'bg-[#edcf72] text-white',
  256: 'bg-[#edcc61] text-white',
  512: 'bg-[#edc850] text-white',
  1024: 'bg-[#edc53f] text-white',
  2048: 'bg-[#edc22e] text-white',
};

type Board = (number | null)[][];

const createEmptyBoard = (): Board =>
  Array(4)
    .fill(null)
    .map(() => Array(4).fill(null));

const addNewTile = (board: Board): Board => {
  const emptyTiles: [number, number][] = [];
  board.forEach((row, i) => {
    row.forEach((cell, j) => {
      if (cell === null) {
        emptyTiles.push([i, j]);
      }
    });
  });

  if (emptyTiles.length === 0) return board;

  const [row, col] = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
  const newBoard = board.map((row) => [...row]);
  newBoard[row][col] = Math.random() < 0.9 ? 2 : 4;
  return newBoard;
};

const moveBoard = (
  board: Board,
  direction: 'up' | 'down' | 'left' | 'right'
): [Board, number] => {
  let score = 0;
  let newBoard = board.map((row) => [...row]);
  const size = board.length;

  // 회전하여 모든 방향을 왼쪽 이동으로 처리
  const rotateBoard = (board: Board, times: number): Board => {
    let newBoard = board.map((row) => [...row]);
    for (let i = 0; i < times; i++) {
      newBoard = newBoard[0].map((_, index) =>
        newBoard.map((row) => row[row.length - 1 - index])
      );
    }
    return newBoard;
  };

  // 방향에 따라 보드 회전
  switch (direction) {
    case 'up':
      newBoard = rotateBoard(newBoard, 1);
      break;
    case 'right':
      newBoard = rotateBoard(newBoard, 2);
      break;
    case 'down':
      newBoard = rotateBoard(newBoard, 3);
      break;
    default:
      break;
  }

  // 왼쪽으로 이동 및 병합
  for (let i = 0; i < size; i++) {
    let row = newBoard[i].filter((cell) => cell !== null) as number[];
    for (let j = 0; j < row.length - 1; j++) {
      if (row[j] === row[j + 1]) {
        row[j] = row[j] * 2;
        score += row[j];
        row[j + 1] = 0;
      }
    }
    row = row.filter((cell) => cell !== 0);
    const newRow: (number | null)[] = [...row];
    while (newRow.length < size) {
      newRow.push(null);
    }
    newBoard[i] = newRow;
  }

  // 보드를 원래 방향으로 회전
  switch (direction) {
    case 'up':
      newBoard = rotateBoard(newBoard, 3);
      break;
    case 'right':
      newBoard = rotateBoard(newBoard, 2);
      break;
    case 'down':
      newBoard = rotateBoard(newBoard, 1);
      break;
    default:
      break;
  }

  return [newBoard, score];
};

const isGameOver = (board: Board): boolean => {
  // 빈 칸이 있는지 확인
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (board[i][j] === null) return false;
    }
  }

  // 인접한 같은 숫자가 있는지 확인
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const current = board[i][j];
      if (
        (i < 3 && board[i + 1][j] === current) ||
        (j < 3 && board[i][j + 1] === current)
      ) {
        return false;
      }
    }
  }

  return true;
};

export default function Game2048() {
  const router = useRouter();
  const [board, setBoard] = useState<Board>(() =>
    addNewTile(createEmptyBoard())
  );
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [touchStart, setTouchStart] = useState<[number, number] | null>(null);

  // 게임 오버 시 랭킹 업데이트
  const handleGameOver = useCallback(async (finalScore: number) => {
    setGameOver(true);
    const nickname = localStorage.getItem('nickname');
    if (nickname) {
      try {
        await fetch('/api/scores', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nickname,
            gameType: '2048',
            score: finalScore,
          }),
        });
      } catch (error) {
        console.error('점수 저장 실패:', error);
      }
    }
  }, []);

  const handleMove = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      if (gameOver) return;

      const [newBoard, moveScore] = moveBoard(board, direction);
      const boardChanged = JSON.stringify(newBoard) !== JSON.stringify(board);

      if (boardChanged) {
        const boardWithNewTile = addNewTile(newBoard);
        setBoard(boardWithNewTile);
        const newScore = score + moveScore;
        setScore(newScore);

        if (isGameOver(boardWithNewTile)) {
          handleGameOver(newScore);
        }
      }
    },
    [board, gameOver, score, handleGameOver]
  );

  useEffect(() => {
    const storedNickname = localStorage.getItem('nickname');
    if (!storedNickname) {
      router.replace('/');
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          handleMove('up');
          break;
        case 'ArrowDown':
          handleMove('down');
          break;
        case 'ArrowLeft':
          handleMove('left');
          break;
        case 'ArrowRight':
          handleMove('right');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove, router]);

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    setTouchStart([touch.clientX, touch.clientY]);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!touchStart) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart[0];
    const deltaY = touch.clientY - touchStart[1];
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (Math.max(absDeltaX, absDeltaY) > 50) {
      if (absDeltaX > absDeltaY) {
        handleMove(deltaX > 0 ? 'right' : 'left');
      } else {
        handleMove(deltaY > 0 ? 'down' : 'up');
      }
    }

    setTouchStart(null);
  };

  return (
    <div className='flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-[#faf8ef] p-4 touch-none'>
      <div className='w-full max-w-md'>
        <div className='flex justify-between items-center mb-4'>
          <h1 className='text-4xl font-bold text-[#776e65]'>2048</h1>
          <div className='flex gap-4'>
            <div className='bg-[#bbada0] rounded-md p-3'>
              <div className='text-white text-sm'>SCORE</div>
              <div className='text-white text-xl font-bold'>{score}</div>
            </div>
            <button
              onClick={() => router.push('/rankings')}
              className='bg-[#bbada0] text-white px-4 rounded-md hover:bg-[#a59a8e] transition-colors'>
              랭킹
            </button>
          </div>
        </div>

        <div
          className='bg-[#bbada0] p-3 rounded-md'
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}>
          <div className='grid grid-cols-4 gap-3'>
            {board.map((row, i) =>
              row.map((cell, j) => (
                <div
                  key={`${i}-${j}`}
                  className={`w-full aspect-square rounded-md flex items-center justify-center text-2xl font-bold
                    ${cell ? TILE_COLORS[cell] : 'bg-[#cdc1b4]'}`}>
                  {cell}
                </div>
              ))
            )}
          </div>
        </div>

        {gameOver && (
          <div className='fixed inset-0 bg-black/50 flex items-center justify-center'>
            <div className='bg-white p-6 rounded-lg text-center'>
              <h2 className='text-2xl font-bold mb-4'>게임 오버!</h2>
              <p className='text-xl mb-4'>최종 점수: {score}</p>
              <div className='flex gap-2 justify-center'>
                <button
                  onClick={() => window.location.reload()}
                  className='bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600'>
                  다시 시작
                </button>
                <button
                  onClick={() => router.push('/rankings')}
                  className='bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600'>
                  랭킹 보기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
