'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// 게임 상수
const GAME_WIDTH = 800;
const GAME_HEIGHT = 400;
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const GAME_SPEED = 5;

// 게임 오브젝트 타입
interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'obstacle' | 'coin' | 'powerup';
  emoji: string;
  active: boolean;
}

// 플레이어 타입
interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityY: number;
  isJumping: boolean;
  canDoubleJump: boolean;
  isInvincible: boolean;
  hasMagnet: boolean;
}

export default function RunnerGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // 게임 상태
  const gameStateRef = useRef({
    player: {
      x: 50,
      y: GAME_HEIGHT - 50,
      width: 30,
      height: 30,
      velocityY: 0,
      isJumping: false,
      canDoubleJump: true,
      isInvincible: false,
      hasMagnet: false,
    } as Player,
    objects: [] as GameObject[],
    distance: 0,
    frameCount: 0,
    score: 0,
  });

  // 게임 초기화
  const initGame = useCallback(() => {
    gameStateRef.current = {
      player: {
        x: 50,
        y: GAME_HEIGHT - 50,
        width: 30,
        height: 30,
        velocityY: 0,
        isJumping: false,
        canDoubleJump: true,
        isInvincible: false,
        hasMagnet: false,
      },
      objects: [],
      distance: 0,
      frameCount: 0,
      score: 0,
    };
    setGameOver(false);
    setIsPlaying(true);
  }, []);

  // 점프 처리
  const handleJump = useCallback(() => {
    const { player } = gameStateRef.current;
    if (!player.isJumping) {
      player.velocityY = JUMP_FORCE;
      player.isJumping = true;
    } else if (player.canDoubleJump) {
      player.velocityY = JUMP_FORCE;
      player.canDoubleJump = false;
    }
  }, []);

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
            gameType: 'runner',
            score: Math.floor(gameStateRef.current.distance / 10),
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
      const { player, objects } = state;

      // 플레이어 업데이트
      player.velocityY += GRAVITY;
      player.y += player.velocityY;

      // 바닥 충돌 체크
      if (player.y > GAME_HEIGHT - player.height) {
        player.y = GAME_HEIGHT - player.height;
        player.velocityY = 0;
        player.isJumping = false;
        player.canDoubleJump = true;
      }

      // 장애물 생성
      if (state.frameCount % 60 === 0) {
        const obstacleTypes = ['🌵', '⬛', '👻'];
        const randomType =
          obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        objects.push({
          x: GAME_WIDTH,
          y: GAME_HEIGHT - 30,
          width: 30,
          height: 30,
          type: 'obstacle',
          emoji: randomType,
          active: true,
        });
      }

      // 코인 생성
      if (state.frameCount % 100 === 0) {
        objects.push({
          x: GAME_WIDTH,
          y: Math.random() * (GAME_HEIGHT - 100),
          width: 20,
          height: 20,
          type: 'coin',
          emoji: '💰',
          active: true,
        });
      }

      // 파워업 생성
      if (state.frameCount % 300 === 0) {
        const powerUpTypes = ['⭐', '🦋', '🧲'];
        const randomPowerUp =
          powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        objects.push({
          x: GAME_WIDTH,
          y: Math.random() * (GAME_HEIGHT - 100),
          width: 25,
          height: 25,
          type: 'powerup',
          emoji: randomPowerUp,
          active: true,
        });
      }

      // 오브젝트 업데이트
      objects.forEach((obj) => {
        if (!obj.active) return;
        obj.x -= GAME_SPEED;

        // 충돌 체크
        if (
          player.x < obj.x + obj.width &&
          player.x + player.width > obj.x &&
          player.y < obj.y + obj.height &&
          player.y + player.height > obj.y
        ) {
          if (obj.type === 'obstacle' && !player.isInvincible) {
            handleGameOver();
          } else if (obj.type === 'coin') {
            state.score += 10;
            obj.active = false;
          } else if (obj.type === 'powerup') {
            switch (obj.emoji) {
              case '⭐':
                player.isInvincible = true;
                setTimeout(() => {
                  player.isInvincible = false;
                }, 5000);
                break;
              case '🦋':
                player.canDoubleJump = true;
                break;
              case '🧲':
                player.hasMagnet = true;
                setTimeout(() => {
                  player.hasMagnet = false;
                }, 5000);
                break;
            }
            obj.active = false;
          }
        }

        // 자석 효과
        if (player.hasMagnet && obj.type === 'coin') {
          const dx = player.x - obj.x;
          const dy = player.y - obj.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 150) {
            obj.x += dx * 0.1;
            obj.y += dy * 0.1;
          }
        }
      });

      // 화면 밖 오브젝트 제거
      state.objects = objects.filter((obj) => obj.x > -obj.width && obj.active);

      // 거리 업데이트
      state.distance += GAME_SPEED;
      state.frameCount++;

      // 화면 그리기
      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // 배경
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // 바닥
      ctx.fillStyle = '#90EE90';
      ctx.fillRect(0, GAME_HEIGHT - 20, GAME_WIDTH, 20);

      // 플레이어
      ctx.font = '30px Arial';
      ctx.fillText(player.isInvincible ? '⭐' : '🐰', player.x, player.y);

      // 오브젝트
      objects.forEach((obj) => {
        if (obj.active) {
          ctx.font = `${obj.width}px Arial`;
          ctx.fillText(obj.emoji, obj.x, obj.y);
        }
      });

      // 점수
      ctx.font = '20px Arial';
      ctx.fillStyle = 'black';
      ctx.fillText(`Score: ${Math.floor(state.distance / 10)}`, 10, 30);
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

  // 터치 이벤트 처리
  useEffect(() => {
    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      if (isPlaying && !gameOver) {
        handleJump();
      }
    };

    document.addEventListener('touchstart', handleTouch);
    return () => {
      document.removeEventListener('touchstart', handleTouch);
    };
  }, [isPlaying, gameOver, handleJump]);

  // 키보드 이벤트 처리
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isPlaying && !gameOver) {
        e.preventDefault();
        handleJump();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [isPlaying, gameOver, handleJump]);

  return (
    <div className='flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-gray-100 p-4'>
      <div className='w-full max-w-2xl bg-white rounded-lg shadow-lg p-4'>
        <div className='flex justify-between items-center mb-4'>
          <h1 className='text-2xl font-bold text-gray-800'>Runner Game</h1>
          <div className='text-lg font-semibold text-gray-600'>
            Score: {Math.floor(gameStateRef.current.distance / 10)}
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
                      점수: {Math.floor(gameStateRef.current.distance / 10)}
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
          <p>⭐: 무적 / 🦋: 이중 점프 / 🧲: 코인 자석</p>
        </div>
      </div>
    </div>
  );
}
