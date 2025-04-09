'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// 게임 상수
const GAME_WIDTH = 1024;
const GAME_HEIGHT = 768;
const GRAVITY = 0.5;
const JUMP_FORCE = -8;
const PIPE_SPEED = 3;
const PIPE_WIDTH = 100;
const PIPE_GAP = 200;
const BIRD_SIZE = 50;
const PIPE_HEAD_HEIGHT = 40;

// 새 타입
interface Bird {
  y: number;
  velocity: number;
  rotation: number;
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
      rotation: 0,
    } as Bird,
    pipes: [] as Pipe[],
    score: 0,
    background: {
      x: 0,
    },
  });

  // 게임 초기화
  const initGame = useCallback(() => {
    gameStateRef.current = {
      bird: {
        y: GAME_HEIGHT / 2,
        velocity: 0,
        rotation: 0,
      },
      pipes: [],
      score: 0,
      background: {
        x: 0,
      },
    };
    setGameOver(false);
    setIsPlaying(true);
  }, []);

  // 점프 처리
  const handleJump = useCallback(() => {
    if (isPlaying && !gameOver) {
      gameStateRef.current.bird.velocity = JUMP_FORCE;
      gameStateRef.current.bird.rotation = -20; // 위로 올라갈 때 각도
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

      // 새의 회전 각도 업데이트
      if (bird.velocity > 0) {
        bird.rotation = Math.min(90, bird.rotation + 4); // 떨어질 때 각도
      }

      // 배경 스크롤
      state.background.x = (state.background.x - 1) % GAME_WIDTH;

      // 파이프 생성
      if (pipes.length === 0 || pipes[pipes.length - 1].x < GAME_WIDTH - 300) {
        const minHeight = 80; // 최소 높이 설정
        const maxHeight = GAME_HEIGHT - PIPE_GAP - 80; // 최대 높이 설정
        const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
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
            pipe.x < BIRD_SIZE + 30 &&
            pipe.x + PIPE_WIDTH > 30) ||
          (bird.y + BIRD_SIZE > pipe.topHeight + PIPE_GAP && // 아래쪽 파이프 충돌
            pipe.x < BIRD_SIZE + 30 &&
            pipe.x + PIPE_WIDTH > 30)
        ) {
          handleGameOver();
          return;
        }

        // 점수 계산
        if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_SIZE + 30) {
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
      ctx.fillStyle = '#70C5CE';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // 구름과 도시 배경 (간단한 사각형으로 표현)
      ctx.fillStyle = '#E0E0E0';
      for (let i = 0; i < 3; i++) {
        const x = ((state.background.x + i * 300) % GAME_WIDTH) - 50;
        ctx.fillRect(x, 100, 100, 40);
      }

      ctx.fillStyle = '#4B4B4B';
      ctx.fillRect(0, GAME_HEIGHT - 100, GAME_WIDTH, 100);

      // 파이프 그리기
      pipes.forEach((pipe) => {
        // 파이프 그라데이션 생성
        const pipeGradient = ctx.createLinearGradient(
          pipe.x,
          0,
          pipe.x + PIPE_WIDTH,
          0
        );
        pipeGradient.addColorStop(0, '#73C908'); // 기본 초록색
        pipeGradient.addColorStop(0.5, '#95EA28'); // 밝은 초록색
        pipeGradient.addColorStop(1, '#73C908'); // 기본 초록색

        // 파이프 머리 그라데이션
        const headGradient = ctx.createLinearGradient(
          pipe.x - 3,
          0,
          pipe.x + PIPE_WIDTH + 3,
          0
        );
        headGradient.addColorStop(0, '#58A006'); // 어두운 초록색
        headGradient.addColorStop(0.5, '#73C908'); // 기본 초록색
        headGradient.addColorStop(1, '#58A006'); // 어두운 초록색

        // 위쪽 파이프
        // 메인 파이프 그리기
        ctx.fillStyle = pipeGradient;
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight - PIPE_HEAD_HEIGHT);

        // 파이프 테두리
        ctx.strokeStyle = '#58A006';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          pipe.x,
          0,
          PIPE_WIDTH,
          pipe.topHeight - PIPE_HEAD_HEIGHT
        );

        // 위쪽 파이프 머리
        ctx.fillStyle = headGradient;
        // 머리 본체
        ctx.fillRect(
          pipe.x - 3,
          pipe.topHeight - PIPE_HEAD_HEIGHT,
          PIPE_WIDTH + 6,
          PIPE_HEAD_HEIGHT
        );
        // 머리 테두리
        ctx.strokeRect(
          pipe.x - 3,
          pipe.topHeight - PIPE_HEAD_HEIGHT,
          PIPE_WIDTH + 6,
          PIPE_HEAD_HEIGHT
        );
        // 머리 하단 강조선
        ctx.fillStyle = '#58A006';
        ctx.fillRect(pipe.x - 3, pipe.topHeight - 2, PIPE_WIDTH + 6, 2);

        // 아래쪽 파이프
        const bottomPipeY = pipe.topHeight + PIPE_GAP;

        // 메인 파이프 그리기
        ctx.fillStyle = pipeGradient;
        ctx.fillRect(
          pipe.x,
          bottomPipeY + PIPE_HEAD_HEIGHT,
          PIPE_WIDTH,
          GAME_HEIGHT - (bottomPipeY + PIPE_HEAD_HEIGHT)
        );

        // 파이프 테두리
        ctx.strokeRect(
          pipe.x,
          bottomPipeY + PIPE_HEAD_HEIGHT,
          PIPE_WIDTH,
          GAME_HEIGHT - (bottomPipeY + PIPE_HEAD_HEIGHT)
        );

        // 아래쪽 파이프 머리
        ctx.fillStyle = headGradient;
        // 머리 본체
        ctx.fillRect(pipe.x - 3, bottomPipeY, PIPE_WIDTH + 6, PIPE_HEAD_HEIGHT);
        // 머리 테두리
        ctx.strokeRect(
          pipe.x - 3,
          bottomPipeY,
          PIPE_WIDTH + 6,
          PIPE_HEAD_HEIGHT
        );
        // 머리 상단 강조선
        ctx.fillStyle = '#58A006';
        ctx.fillRect(
          pipe.x - 3,
          bottomPipeY + PIPE_HEAD_HEIGHT - 2,
          PIPE_WIDTH + 6,
          2
        );
      });

      // 새 그리기
      ctx.save();
      ctx.translate(30 + BIRD_SIZE / 2, bird.y + BIRD_SIZE / 2);
      ctx.rotate((bird.rotation * Math.PI) / 180);
      ctx.scale(-1, 1); // 수평으로 뒤집기
      ctx.font = `${BIRD_SIZE}px Arial`;
      ctx.fillText('🐤', -BIRD_SIZE / 2, -BIRD_SIZE / 2);
      ctx.restore();

      // 점수
      ctx.font = 'bold 48px Arial';
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      ctx.strokeText(`${state.score}`, GAME_WIDTH / 2, 80);
      ctx.fillText(`${state.score}`, GAME_WIDTH / 2, 80);
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
    <div className='flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4'>
      <div className='w-full max-w-[1024px] bg-white rounded-lg shadow-lg p-4'>
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
            className='w-full h-auto rounded-lg touch-none'
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
