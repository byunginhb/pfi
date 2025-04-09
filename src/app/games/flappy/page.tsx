'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// 게임 상수
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const GRAVITY = 0.5;
const JUMP_FORCE = -8;
const PIPE_SPEED = 3;
const PIPE_WIDTH = 80;
const PIPE_GAP = 150;
const BIRD_SIZE = 30;

// 새 타입
interface Bird {
  y: number;
  velocity: number;
}

// 파이프 타입
interface Pipe {
  x: number;
  topHeight: number;
  passed: boolean;
}

export default function FlappyBird() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // 게임 상태
  const gameStateRef = useRef({
    bird: {
      y: GAME_HEIGHT / 2,
      velocity: 0,
    } as Bird,
    pipes: [] as Pipe[],
    score: 0,
  });

  // 게임 초기화
  const initGame = useCallback(() => {
    gameStateRef.current = {
      bird: {
        y: GAME_HEIGHT / 2,
        velocity: 0,
      },
      pipes: [],
      score: 0,
    };
    setGameOver(false);
    setIsPlaying(true);
  }, []);

  // 점프 처리
  const handleJump = useCallback(() => {
    if (isPlaying && !gameOver) {
      gameStateRef.current.bird.velocity = JUMP_FORCE;
    }
  }, [isPlaying, gameOver]);

  // 게임 오버 처리
  const handleGameOver = useCallback(async () => {
    setGameOver(true);
    setIsPlaying(false);
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
            gameType: 'flappy',
            score: gameStateRef.current.score,
          }),
        });
      } catch (error) {
        console.error('점수 저장 실패:', error);
      }
    }
  }, []);

  // 게임 업데이트
  const updateGame = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const state = gameStateRef.current;
      const { bird, pipes } = state;

      // 새 업데이트
      bird.velocity += GRAVITY;
      bird.y += bird.velocity;

      // 파이프 생성
      if (pipes.length === 0 || pipes[pipes.length - 1].x < GAME_WIDTH - 300) {
        const topHeight = Math.random() * (GAME_HEIGHT - PIPE_GAP - 100) + 50;
        pipes.push({
          x: GAME_WIDTH,
          topHeight,
          passed: false,
        });
      }

      // 파이프 업데이트
      for (let i = pipes.length - 1; i >= 0; i--) {
        const pipe = pipes[i];
        pipe.x -= PIPE_SPEED;

        // 충돌 검사
        if (
          bird.y < 0 || // 천장 충돌
          bird.y + BIRD_SIZE > GAME_HEIGHT || // 바닥 충돌
          (bird.y < pipe.topHeight && // 위쪽 파이프 충돌
            bird.y + BIRD_SIZE > 0 &&
            pipe.x < BIRD_SIZE &&
            pipe.x + PIPE_WIDTH > 0) ||
          (bird.y + BIRD_SIZE > pipe.topHeight + PIPE_GAP && // 아래쪽 파이프 충돌
            bird.y < GAME_HEIGHT &&
            pipe.x < BIRD_SIZE &&
            pipe.x + PIPE_WIDTH > 0)
        ) {
          handleGameOver();
          return;
        }

        // 점수 계산
        if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_SIZE) {
          pipe.passed = true;
          state.score++;
        }

        // 화면 밖 파이프 제거
        if (pipe.x + PIPE_WIDTH < 0) {
          pipes.splice(i, 1);
        }
      }

      // 화면 그리기
      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // 배경
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // 파이프 그리기
      ctx.fillStyle = '#2E8B57';
      pipes.forEach((pipe) => {
        // 위쪽 파이프
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
        // 아래쪽 파이프
        ctx.fillRect(
          pipe.x,
          pipe.topHeight + PIPE_GAP,
          PIPE_WIDTH,
          GAME_HEIGHT - (pipe.topHeight + PIPE_GAP)
        );
      });

      // 새 그리기
      ctx.font = '30px Arial';
      ctx.fillText('🐦', 10, bird.y);

      // 점수
      ctx.font = '24px Arial';
      ctx.fillStyle = 'black';
      ctx.fillText(`Score: ${state.score}`, 10, 30);
    },
    [handleGameOver]
  );

  // 게임 루프
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const gameLoop = () => {
      if (isPlaying && !gameOver) {
        updateGame(ctx);
        animationFrameId = requestAnimationFrame(gameLoop);
      }
    };

    if (isPlaying) {
      gameLoop();
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, gameOver, updateGame]);

  // 이벤트 리스너
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!isPlaying && !gameOver) {
          initGame();
        } else {
          handleJump();
        }
      }
    };

    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      if (!isPlaying && !gameOver) {
        initGame();
      } else {
        handleJump();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('touchstart', handleTouch);

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('touchstart', handleTouch);
    };
  }, [isPlaying, gameOver, handleJump, initGame]);

  return (
    <div className='flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-gray-100 p-4'>
      <div className='w-full max-w-2xl bg-white rounded-lg shadow-lg p-4'>
        <div className='flex justify-between items-center mb-4'>
          <h1 className='text-2xl font-bold text-gray-800'>Flappy Bird</h1>
          <div className='text-lg font-semibold text-gray-600'>
            Score: {gameStateRef.current.score}
          </div>
        </div>

        <div className='relative'>
          <canvas
            ref={canvasRef}
            width={GAME_WIDTH}
            height={GAME_HEIGHT}
            className='w-full h-auto border-2 border-gray-300 rounded-lg touch-none'
          />

          {!isPlaying && (
            <div className='absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg'>
              <div className='text-center'>
                {gameOver ? (
                  <>
                    <h2 className='text-2xl font-bold text-white mb-4'>
                      게임 오버!
                    </h2>
                    <p className='text-xl text-white mb-4'>
                      점수: {gameStateRef.current.score}
                    </p>
                  </>
                ) : (
                  <h2 className='text-2xl font-bold text-white mb-4'>
                    시작하려면 탭하세요
                  </h2>
                )}
                <button
                  onClick={initGame}
                  className='px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors'>
                  {gameOver ? '다시 시작' : '시작하기'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className='mt-4 text-sm text-gray-600'>
          <p>스페이스바나 화면 터치로 점프하세요!</p>
          <p>파이프 사이를 통과하여 점수를 얻으세요!</p>
        </div>
      </div>
    </div>
  );
}
