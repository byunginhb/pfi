'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// 게임 상수
const GAME_WIDTH = 1024;
const GAME_HEIGHT = 768;
const PLAYER_SIZE = 50;
const MISSILE_SIZE = 10;
const ENEMY_SIZE = 40;
const BOSS_SIZE = 80;
const ITEM_SIZE = 30;
const BASE_ENEMY_SPEED = 2; // 기본 속도 증가
const BASE_MISSILE_SPEED = 7;
const BASE_MISSILE_POWER = 8; // 기본 데미지 감소
const SPAWN_INTERVAL = 1000; // 적 생성 간격 감소
const ITEM_SPAWN_CHANCE = 0.1;
const BOSS_SPAWN_SCORE = 500; // 보스 출현 점수 간격

// 플레이어 타입
interface Player {
  x: number;
  missileSpeed: number;
  missilePower: number;
}

// 미사일 타입
interface Missile {
  x: number;
  y: number;
  power: number;
  speed: number;
}

// 적 타입
interface Enemy {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  speed: number;
  isBoss: boolean;
  hitEffect?: {
    damage: number;
    time: number;
  };
}

// 아이템 타입
interface Item {
  x: number;
  y: number;
  type: 'speed' | 'power' | 'freeze' | 'multishot' | 'shield';
  active: boolean;
}

// 효과 타입
interface Effects {
  freeze: boolean;
  multishot: boolean;
  shield: boolean;
  freezeEndTime: number;
  multishotEndTime: number;
  shieldEndTime: number;
}

export default function ShooterGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // 게임 상태
  const gameStateRef = useRef({
    player: {
      x: GAME_WIDTH / 2,
      missileSpeed: BASE_MISSILE_SPEED,
      missilePower: BASE_MISSILE_POWER,
    } as Player,
    missiles: [] as Missile[],
    enemies: [] as Enemy[],
    items: [] as Item[],
    effects: {
      freeze: false,
      multishot: false,
      shield: false,
      freezeEndTime: 0,
      multishotEndTime: 0,
      shieldEndTime: 0,
    } as Effects,
    score: 0,
    level: 1,
    spawnInterval: SPAWN_INTERVAL,
    lastSpawnTime: 0,
  });

  // 게임 초기화
  const initGame = useCallback(() => {
    gameStateRef.current = {
      player: {
        x: GAME_WIDTH / 2,
        missileSpeed: BASE_MISSILE_SPEED,
        missilePower: BASE_MISSILE_POWER,
      },
      missiles: [],
      enemies: [],
      items: [],
      effects: {
        freeze: false,
        multishot: false,
        shield: false,
        freezeEndTime: 0,
        multishotEndTime: 0,
        shieldEndTime: 0,
      },
      score: 0,
      level: 1,
      spawnInterval: SPAWN_INTERVAL,
      lastSpawnTime: 0,
    };
    setGameOver(false);
    setIsPlaying(true);
  }, []);

  // 미사일 발사
  const fireMissile = useCallback(() => {
    const state = gameStateRef.current;
    const { player, effects } = state;

    if (effects.multishot) {
      // 멀티샷: 3발 발사
      state.missiles.push(
        {
          x: player.x - 20,
          y: GAME_HEIGHT - PLAYER_SIZE - 10,
          power: player.missilePower,
          speed: player.missileSpeed,
        },
        {
          x: player.x,
          y: GAME_HEIGHT - PLAYER_SIZE - 10,
          power: player.missilePower,
          speed: player.missileSpeed,
        },
        {
          x: player.x + 20,
          y: GAME_HEIGHT - PLAYER_SIZE - 10,
          power: player.missilePower,
          speed: player.missileSpeed,
        }
      );
    } else {
      // 일반 발사
      state.missiles.push({
        x: player.x,
        y: GAME_HEIGHT - PLAYER_SIZE - 10,
        power: player.missilePower,
        speed: player.missileSpeed,
      });
    }
  }, []);

  // 아이템 효과 적용
  const applyItem = useCallback((item: Item) => {
    const state = gameStateRef.current;
    const { player, effects } = state;
    const duration = 1000 * 10; // 아이템 효과 지속시간 (5초)

    switch (item.type) {
      case 'speed':
        player.missileSpeed = BASE_MISSILE_SPEED * 1.5;
        setTimeout(() => {
          player.missileSpeed = BASE_MISSILE_SPEED;
        }, duration);
        break;
      case 'power':
        player.missilePower = BASE_MISSILE_POWER * 2;
        setTimeout(() => {
          player.missilePower = BASE_MISSILE_POWER;
        }, duration);
        break;
      case 'freeze':
        effects.freeze = true;
        effects.freezeEndTime = Date.now() + duration;
        setTimeout(() => {
          effects.freeze = false;
        }, duration);
        break;
      case 'multishot':
        effects.multishot = true;
        effects.multishotEndTime = Date.now() + duration;
        setTimeout(() => {
          effects.multishot = false;
        }, duration);
        break;
      case 'shield':
        effects.shield = true;
        effects.shieldEndTime = Date.now() + duration;
        setTimeout(() => {
          effects.shield = false;
        }, duration);
        break;
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
            gameType: 'shooter',
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
      const { player, missiles, enemies, items, effects } = state;
      const currentTime = Date.now();

      // 레벨 업데이트
      state.level = Math.floor(state.score / 1000) + 1;

      // 적 생성 (freeze 효과가 없을 때만)
      if (
        !effects.freeze &&
        currentTime - state.lastSpawnTime > state.spawnInterval
      ) {
        // 보스 생성 로직
        const shouldSpawnBoss =
          state.score > 0 && state.score % BOSS_SPAWN_SCORE === 0;

        if (shouldSpawnBoss) {
          const bossHealth = 100 + (state.level - 1) * 50; // 보스 체력
          enemies.push({
            x: Math.random() * (GAME_WIDTH - BOSS_SIZE),
            y: -BOSS_SIZE,
            health: bossHealth,
            maxHealth: bossHealth,
            speed: BASE_ENEMY_SPEED * 0.3, // 보스는 더 천천히 이동
            isBoss: true,
          });
        } else {
          const enemyHealth = 15 + (state.level - 1) * 8; // 일반 적 체력 증가
          enemies.push({
            x: Math.random() * (GAME_WIDTH - ENEMY_SIZE),
            y: -ENEMY_SIZE,
            health: enemyHealth,
            maxHealth: enemyHealth,
            speed: BASE_ENEMY_SPEED * (1 + (state.level - 1) * 0.15), // 레벨당 속도 증가
            isBoss: false,
          });
        }
        state.lastSpawnTime = currentTime;
      }

      // 미사일 업데이트
      for (let i = missiles.length - 1; i >= 0; i--) {
        const missile = missiles[i];
        missile.y -= missile.speed;

        // 화면 밖으로 나간 미사일 제거
        if (missile.y < 0) {
          missiles.splice(i, 1);
          continue;
        }

        // 적과의 충돌 체크
        for (let j = enemies.length - 1; j >= 0; j--) {
          const enemy = enemies[j];
          if (
            missile.x > enemy.x &&
            missile.x < enemy.x + (enemy.isBoss ? BOSS_SIZE : ENEMY_SIZE) &&
            missile.y > enemy.y &&
            missile.y < enemy.y + (enemy.isBoss ? BOSS_SIZE : ENEMY_SIZE)
          ) {
            const damage = missile.power;
            enemy.health -= damage;
            missiles.splice(i, 1);

            // 데미지 효과 추가
            enemy.hitEffect = {
              damage,
              time: Date.now(),
            };

            // 적 처치
            if (enemy.health <= 0) {
              enemies.splice(j, 1);
              state.score += enemy.isBoss ? 50 : 10; // 보스 처치 시 추가 점수

              // 보스 처치 시 아이템 생성 확률 증가
              if (enemy.isBoss || Math.random() < ITEM_SPAWN_CHANCE) {
                const itemTypes: Item['type'][] = [
                  'speed',
                  'power',
                  'freeze',
                  'multishot',
                  'shield',
                ];
                items.push({
                  x: enemy.x + (enemy.isBoss ? BOSS_SIZE : ENEMY_SIZE) / 2,
                  y: enemy.y + (enemy.isBoss ? BOSS_SIZE : ENEMY_SIZE) / 2,
                  type: itemTypes[Math.floor(Math.random() * itemTypes.length)],
                  active: true,
                });
              }
            }
            break;
          }
        }
      }

      // 적 업데이트
      for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (!effects.freeze) {
          enemy.y += enemy.speed;
        }

        // 바닥에 닿은 적 체크
        if (enemy.y + (enemy.isBoss ? BOSS_SIZE : ENEMY_SIZE) > GAME_HEIGHT) {
          if (!effects.shield) {
            handleGameOver();
            return;
          } else {
            enemies.splice(i, 1); // 쉴드가 있으면 적만 제거
            continue;
          }
        }
      }

      // 아이템 업데이트
      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        item.y += 2;

        // 플레이어와의 충돌 체크
        if (
          item.active &&
          item.x > player.x - PLAYER_SIZE &&
          item.x < player.x + PLAYER_SIZE &&
          item.y > GAME_HEIGHT - PLAYER_SIZE - ITEM_SIZE &&
          item.y < GAME_HEIGHT
        ) {
          applyItem(item);
          items.splice(i, 1);
          continue;
        }

        // 화면 밖으로 나간 아이템 제거
        if (item.y > GAME_HEIGHT) {
          items.splice(i, 1);
        }
      }

      // 화면 그리기
      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // 배경
      ctx.fillStyle = '#000033';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // 별 그리기 (배경)
      ctx.fillStyle = 'white';
      for (let i = 0; i < 100; i++) {
        const x = Math.sin(i * 567) * GAME_WIDTH;
        const y = Math.cos(i * 321) * GAME_HEIGHT;
        ctx.fillRect(
          (x + GAME_WIDTH) % GAME_WIDTH,
          (y + GAME_HEIGHT) % GAME_HEIGHT,
          2,
          2
        );
      }

      // 플레이어 그리기
      ctx.font = `${PLAYER_SIZE}px Arial`;
      ctx.save(); // 현재 컨텍스트 상태 저장
      ctx.translate(player.x, GAME_HEIGHT - 10);
      ctx.rotate(-Math.PI / 4); // -90도 회전
      ctx.fillText('🚀', -PLAYER_SIZE / 2, PLAYER_SIZE / 4);
      ctx.restore(); // 컨텍스트 상태 복원

      // 쉴드 효과 표시
      if (effects.shield) {
        ctx.beginPath();
        ctx.arc(
          player.x,
          GAME_HEIGHT - PLAYER_SIZE / 2,
          PLAYER_SIZE,
          0,
          Math.PI * 2
        );
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // 미사일 그리기
      ctx.fillStyle = '#ff0';
      missiles.forEach((missile) => {
        ctx.fillRect(
          missile.x - MISSILE_SIZE / 2,
          missile.y,
          MISSILE_SIZE,
          MISSILE_SIZE * 2
        );
      });

      // 적 그리기
      enemies.forEach((enemy) => {
        const size = enemy.isBoss ? BOSS_SIZE : ENEMY_SIZE;

        // 적 그리기
        ctx.font = `${size}px Arial`;
        ctx.fillText(enemy.isBoss ? '👾' : '👽', enemy.x, enemy.y + size);

        // 체력바 그리기
        const healthBarWidth = size;
        const healthBarHeight = enemy.isBoss ? 8 : 5;
        const healthPercentage = enemy.health / enemy.maxHealth;

        // 체력바 배경
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(
          enemy.x,
          enemy.y - healthBarHeight - 5,
          healthBarWidth,
          healthBarHeight
        );

        // 현재 체력
        ctx.fillStyle = enemy.isBoss ? '#ff00ff' : '#00ff00';
        ctx.fillRect(
          enemy.x,
          enemy.y - healthBarHeight - 5,
          healthBarWidth * healthPercentage,
          healthBarHeight
        );

        // 체력 수치 표시
        ctx.font = enemy.isBoss ? 'bold 16px Arial' : '12px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${Math.ceil(enemy.health)}/${enemy.maxHealth}`,
          enemy.x + size / 2,
          enemy.y - healthBarHeight - 10
        );
        ctx.textAlign = 'left';

        // 데미지 효과 표시
        if (enemy.hitEffect && Date.now() - enemy.hitEffect.time < 500) {
          ctx.font = '20px Arial';
          ctx.fillStyle = '#ff0000';
          ctx.fillText(
            `-${enemy.hitEffect.damage}`,
            enemy.x + size / 2,
            enemy.y - 20
          );
        }
      });

      // 아이템 그리기
      items.forEach((item) => {
        let emoji = '❓';
        switch (item.type) {
          case 'speed':
            emoji = '⚡';
            break;
          case 'power':
            emoji = '💪';
            break;
          case 'freeze':
            emoji = '❄️';
            break;
          case 'multishot':
            emoji = '🎯';
            break;
          case 'shield':
            emoji = '🛡️';
            break;
        }
        ctx.font = `${ITEM_SIZE}px Arial`;
        ctx.fillText(emoji, item.x, item.y + ITEM_SIZE);
      });

      // 점수와 레벨 표시
      ctx.font = 'bold 24px Arial';
      ctx.fillStyle = 'white';
      ctx.fillText(`Score: ${state.score}`, 10, 30);
      ctx.fillText(`Level: ${state.level}`, 10, 60);

      // 효과 지속시간 표시
      let effectY = 90;
      if (effects.freeze) {
        const remaining = Math.ceil(
          (effects.freezeEndTime - Date.now()) / 1000
        );
        ctx.fillText(`Freeze: ${remaining}s`, 10, effectY);
        effectY += 30;
      }
      if (effects.multishot) {
        const remaining = Math.ceil(
          (effects.multishotEndTime - Date.now()) / 1000
        );
        ctx.fillText(`Multishot: ${remaining}s`, 10, effectY);
        effectY += 30;
      }
      if (effects.shield) {
        const remaining = Math.ceil(
          (effects.shieldEndTime - Date.now()) / 1000
        );
        ctx.fillText(`Shield: ${remaining}s`, 10, effectY);
      }
    },
    [handleGameOver, applyItem]
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

  // 마우스/터치 이동 처리
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let isDragging = false;
    let lastTouchX = 0;

    const updatePlayerPosition = (clientX: number) => {
      if (!isPlaying || gameOver) return;

      const rect = canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) * GAME_WIDTH) / rect.width;
      gameStateRef.current.player.x = Math.max(
        PLAYER_SIZE / 2,
        Math.min(GAME_WIDTH - PLAYER_SIZE / 2, x)
      );
    };

    // 마우스 이벤트 핸들러
    const handleMouseMove = (e: MouseEvent) => {
      updatePlayerPosition(e.clientX);
    };

    // 터치 이벤트 핸들러
    const handleTouchStart = (e: TouchEvent) => {
      isDragging = true;
      lastTouchX = e.touches[0].clientX;
      updatePlayerPosition(lastTouchX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault(); // 스크롤 방지
      lastTouchX = e.touches[0].clientX;
      updatePlayerPosition(lastTouchX);
    };

    const handleTouchEnd = () => {
      isDragging = false;
    };

    // 이벤트 리스너 등록
    document.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      // 이벤트 리스너 제거
      document.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isPlaying, gameOver]);

  // 자동 발사
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isPlaying && !gameOver) {
      intervalId = setInterval(fireMissile, 200);
    }

    return () => {
      clearInterval(intervalId);
    };
  }, [isPlaying, gameOver, fireMissile]);

  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4'>
      <div className='w-full max-w-[1024px] bg-white rounded-lg shadow-lg p-4'>
        <div className='flex justify-between items-center mb-4'>
          <h1 className='text-2xl font-bold text-gray-800'>Space Shooter</h1>
          <div className='text-lg font-semibold text-gray-600'>
            Score: {gameStateRef.current.score}
          </div>
        </div>

        <div className='relative'>
          <canvas
            ref={canvasRef}
            width={GAME_WIDTH}
            height={GAME_HEIGHT}
            className='w-full h-auto rounded-lg'
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
                    시작하려면 클릭하세요
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
          <p>마우스로 우주선을 움직이세요!</p>
          <p>아이템 설명:</p>
          <ul className='list-disc list-inside'>
            <li>⚡ - 미사일 속도 증가</li>
            <li>💪 - 미사일 파워 증가</li>
            <li>❄️ - 적 일시 정지</li>
            <li>🎯 - 멀티샷</li>
            <li>🛡️ - 보호막</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
