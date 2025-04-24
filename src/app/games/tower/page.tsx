'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface Tower {
  id: number;
  type: 'normal' | 'rapid' | 'splash';
  x: number;
  y: number;
  level: number;
  damage: number;
  range: number;
  attackSpeed: number;
  lastShot: number;
  cost: number;
  kills?: number;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  angle: number;
  health: number;
  type: 'normal' | 'fast' | 'tank' | 'boss';
  size: number;
  speed: number;
  color: string;
}

const TOWER_TYPES = {
  normal: {
    name: '기본 타워',
    description: '기본적인 공격 타워',
    baseDamage: 20,
    baseRange: 120,
    baseAttackSpeed: 1000,
    baseCost: 50,
    color: '#00ff00',
    upgrades: {
      damage: { label: '공격력', increase: 1.5, cost: 0.8 },
      range: { label: '사거리', increase: 1.2, cost: 0.7 },
      speed: { label: '공격속도', increase: 0.8, cost: 0.9 },
    },
  },
  rapid: {
    name: '고속 타워',
    description: '빠른 공격 속도의 타워',
    baseDamage: 10,
    baseRange: 100,
    baseAttackSpeed: 500,
    baseCost: 75,
    color: '#00ffff',
    upgrades: {
      damage: { label: '공격력', increase: 1.3, cost: 0.9 },
      range: { label: '사거리', increase: 1.1, cost: 0.8 },
      speed: { label: '공격속도', increase: 0.7, cost: 1.0 },
    },
  },
  splash: {
    name: '광역 타워',
    description: '범위 공격 타워',
    baseDamage: 15,
    baseRange: 150,
    baseAttackSpeed: 1500,
    baseCost: 100,
    color: '#ff00ff',
    upgrades: {
      damage: { label: '공격력', increase: 1.4, cost: 0.9 },
      range: { label: '사거리', increase: 1.3, cost: 0.8 },
      speed: { label: '공격속도', increase: 0.9, cost: 0.7 },
    },
  },
};

// 웨이브별 적 타입 설정
const ENEMY_TYPES = {
  normal: {
    size: 20,
    speed: 0.02,
    color: '#ff0000',
    baseHealth: 100,
    shape: 'circle',
  },
  fast: {
    size: 15,
    speed: 0.04,
    color: '#00ff00',
    baseHealth: 70,
    shape: 'triangle',
  },
  tank: {
    size: 25,
    speed: 0.01,
    color: '#0000ff',
    baseHealth: 200,
    shape: 'square',
  },
  boss: {
    size: 35,
    speed: 0.015,
    color: '#ff00ff',
    baseHealth: 500,
    shape: 'star',
  },
};

// 랭킹 저장 함수 수정
async function saveScore(nickname: string, score: number) {
  try {
    console.log('Saving score:', { nickname, type: 'tower', score }); // 디버깅용 로그
    const response = await fetch('/api/rankings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nickname,
        gameType: 'tower', // 'type' 대신 'gameType' 사용
        score: Math.floor(score), // 점수를 정수로 변환
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '랭킹 저장에 실패했습니다.');
    }
  } catch (error) {
    console.error('랭킹 저장 중 오류 발생:', error);
    alert('랭킹 저장에 실패했습니다. 다시 시도해주세요.');
  }
}

export default function TowerDefensePage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [showTutorial, setShowTutorial] = useState(true);
  const [selectedTowerType, setSelectedTowerType] =
    useState<keyof typeof TOWER_TYPES>('normal');
  const [gold, setGold] = useState(150);
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [selectedTower, setSelectedTower] = useState<Tower | null>(null);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);

  const gameStateRef = useRef({
    enemies: [] as Enemy[],
    towers: [] as Tower[],
    enemyCount: 0,
    gameOver: false,
    centerX: 0,
    centerY: 0,
    pathRadius: 150,
    waveProgress: 0,
    maxWaveEnemies: 15,
    scaleFactor: 1,
  });

  // createEnemy 함수를 useEffect 밖으로 이동
  const createEnemy = () => {
    const startAngle = Math.random() * Math.PI * 2;
    let enemyType: 'normal' | 'fast' | 'tank' | 'boss' = 'normal';

    // 웨이브에 따른 적 타입 결정
    if (wave % 10 === 0) {
      enemyType = 'boss';
    } else if (wave % 3 === 0) {
      enemyType = 'tank';
    } else if (wave % 2 === 0) {
      enemyType = 'fast';
    }

    const typeConfig = ENEMY_TYPES[enemyType];

    return {
      id: gameStateRef.current.enemyCount++,
      x:
        gameStateRef.current.centerX +
        Math.cos(startAngle) * gameStateRef.current.pathRadius,
      y:
        gameStateRef.current.centerY +
        Math.sin(startAngle) * gameStateRef.current.pathRadius,
      angle: startAngle,
      health: typeConfig.baseHealth + (wave - 1) * 50,
      type: enemyType,
      size: typeConfig.size,
      speed: typeConfig.speed,
      color: typeConfig.color,
    };
  };

  useEffect(() => {
    const storedNickname = localStorage.getItem('nickname');
    if (!storedNickname) {
      router.replace('/');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    contextRef.current = ctx;

    // 화면 크기에 따른 캔버스 크기 조정
    const updateCanvasSize = () => {
      const isMobile = window.innerWidth < 768;
      const width = isMobile ? Math.min(window.innerWidth - 32, 600) : 800;
      const height = width * 0.75; // 4:3 비율 유지

      canvas.width = width;
      canvas.height = height;
      gameStateRef.current.centerX = width / 2;
      gameStateRef.current.centerY = height / 2;
      gameStateRef.current.pathRadius = Math.min(width, height) * 0.25;
      gameStateRef.current.scaleFactor = width / 800;

      // 기존 타워들의 범위 조정
      gameStateRef.current.towers.forEach((tower) => {
        const baseRange = TOWER_TYPES[tower.type].baseRange;
        const rangeIncrease = TOWER_TYPES[tower.type].upgrades.range.increase;
        tower.range = Math.floor(
          baseRange *
            gameStateRef.current.scaleFactor *
            Math.pow(rangeIncrease, tower.level - 1)
        );
      });
    };

    // 초기 크기 설정
    updateCanvasSize();

    // 화면 크기 변경 시 캔버스 크기 업데이트
    window.addEventListener('resize', updateCanvasSize);

    // cleanup 함수에서 사용할 변수들을 ref로 저장
    const currentCanvas = canvas;

    function handleTowerInteraction(e: MouseEvent | TouchEvent) {
      if (gameStateRef.current.gameOver) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      let x: number, y: number;

      if (e instanceof MouseEvent) {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
      } else {
        // TouchEvent
        e.preventDefault(); // 스크롤 방지
        const touch = e.touches[0];
        x = touch.clientX - rect.left;
        y = touch.clientY - rect.top;
      }

      // 타워 클릭 체크
      const clickedTower = gameStateRef.current.towers.find((t) => {
        const dx = t.x - x;
        const dy = t.y - y;
        return Math.sqrt(dx * dx + dy * dy) < 20;
      });

      if (clickedTower) {
        e.stopPropagation(); // 이벤트 전파 중단
        setSelectedTower(clickedTower);
        return;
      }

      // 새 타워 설치 (업그레이드 창이 열려있지 않을 때만)
      if (!selectedTower) {
        const towerType = TOWER_TYPES[selectedTowerType];
        const currentGold = gold;

        if (currentGold >= towerType.baseCost) {
          const newTower: Tower = {
            id: Date.now(),
            type: selectedTowerType,
            x,
            y,
            level: 1,
            damage: towerType.baseDamage,
            range: Math.floor(
              towerType.baseRange * gameStateRef.current.scaleFactor
            ),
            attackSpeed: towerType.baseAttackSpeed,
            lastShot: 0,
            cost: towerType.baseCost,
            kills: 0,
          };

          setGold(currentGold - towerType.baseCost);
          gameStateRef.current.towers.push(newTower);
        }
      }
    }

    // 마우스 이벤트
    canvas.addEventListener('click', handleTowerInteraction);

    // 터치 이벤트
    canvas.addEventListener('touchstart', handleTowerInteraction);

    function drawPath() {
      const ctx = contextRef.current;
      if (!ctx) return;

      ctx.beginPath();
      ctx.arc(
        gameStateRef.current.centerX,
        gameStateRef.current.centerY,
        gameStateRef.current.pathRadius,
        0,
        Math.PI * 2
      );
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    function drawTower(tower: Tower) {
      const ctx = contextRef.current;
      if (!ctx) return;

      // 타워 본체
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, 20, 0, Math.PI * 2);
      ctx.fillStyle = TOWER_TYPES[tower.type].color;
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.stroke();

      // 레벨 표시
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tower.level.toString(), tower.x, tower.y);

      // 공격 범위
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
      ctx.strokeStyle = `${TOWER_TYPES[tower.type].color}40`;
      ctx.stroke();
    }

    function drawEnemy(enemy: Enemy) {
      const ctx = contextRef.current;
      if (!ctx) return;

      ctx.save();
      ctx.translate(enemy.x, enemy.y);

      // 적 타입별 모양 그리기
      switch (enemy.type) {
        case 'normal':
          // 원형
          ctx.beginPath();
          ctx.arc(0, 0, enemy.size, 0, Math.PI * 2);
          ctx.fillStyle = enemy.color;
          ctx.fill();
          break;

        case 'fast':
          // 삼각형
          ctx.beginPath();
          ctx.moveTo(0, -enemy.size);
          ctx.lineTo(enemy.size, enemy.size);
          ctx.lineTo(-enemy.size, enemy.size);
          ctx.closePath();
          ctx.fillStyle = enemy.color;
          ctx.fill();
          break;

        case 'tank':
          // 사각형
          ctx.fillStyle = enemy.color;
          ctx.fillRect(
            -enemy.size,
            -enemy.size,
            enemy.size * 2,
            enemy.size * 2
          );
          break;

        case 'boss':
          // 별모양
          const spikes = 5;
          const outerRadius = enemy.size;
          const innerRadius = enemy.size * 0.4;

          ctx.beginPath();
          for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (Math.PI * i) / spikes;
            if (i === 0) {
              ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
            } else {
              ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
            }
          }
          ctx.closePath();
          ctx.fillStyle = enemy.color;
          ctx.fill();
          break;
      }

      // 체력바
      const healthBarWidth = enemy.size * 2;
      const healthPercentage =
        enemy.health / (ENEMY_TYPES[enemy.type].baseHealth + (wave - 1) * 50);

      ctx.fillStyle = '#00ff00';
      ctx.fillRect(
        -healthBarWidth / 2,
        -enemy.size - 10,
        healthBarWidth * healthPercentage,
        5
      );
      ctx.strokeStyle = '#000';
      ctx.strokeRect(-healthBarWidth / 2, -enemy.size - 10, healthBarWidth, 5);

      ctx.restore();
    }

    function updateAndDrawTowers(now: number) {
      gameStateRef.current.towers.forEach((tower) => {
        drawTower(tower);

        if (now - tower.lastShot > tower.attackSpeed) {
          // 공격 대상 찾기
          const targets = gameStateRef.current.enemies.filter((enemy) => {
            const dx = enemy.x - tower.x;
            const dy = enemy.y - tower.y;
            return Math.sqrt(dx * dx + dy * dy) <= tower.range;
          });

          if (targets.length > 0) {
            const ctx = contextRef.current;
            if (!ctx) return;

            if (tower.type === 'splash') {
              // 광역 공격
              targets.forEach((target) => {
                target.health -= tower.damage;

                // 공격 이펙트
                ctx.beginPath();
                ctx.arc(target.x, target.y, 30, 0, Math.PI * 2);
                ctx.fillStyle = `${TOWER_TYPES[tower.type].color}40`;
                ctx.fill();
              });
            } else {
              // 단일 공격
              const target = targets[0];
              target.health -= tower.damage;

              // 공격 이펙트
              ctx.beginPath();
              ctx.moveTo(tower.x, tower.y);
              ctx.lineTo(target.x, target.y);
              ctx.strokeStyle = TOWER_TYPES[tower.type].color;
              ctx.lineWidth = 2;
              ctx.stroke();
              ctx.lineWidth = 1;
            }

            // 처치 점수 및 골드 획득
            targets.forEach((target) => {
              if (target.health <= 0) {
                gameStateRef.current.enemies =
                  gameStateRef.current.enemies.filter(
                    (e) => e.id !== target.id
                  );
                setScore((prev) => prev + 10);
                setGold((prev) => prev + 20);
              }
            });

            tower.lastShot = now;
          }
        }
      });
    }

    let animationFrameId: number;

    function gameLoop() {
      if (gameStateRef.current.gameOver) {
        cancelAnimationFrame(animationFrameId);
        return;
      }

      const ctx = contextRef.current;
      if (!ctx || !canvasRef.current) return;

      const now = Date.now();

      // 화면 클리어
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      // 경로 그리기
      drawPath();

      // 웨이브 진행 상황 표시
      ctx.fillStyle = '#fff';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`웨이브 ${wave}`, gameStateRef.current.centerX, 30);
      ctx.fillText(
        `진행도: ${Math.floor(
          (gameStateRef.current.waveProgress /
            gameStateRef.current.maxWaveEnemies) *
            100
        )}%`,
        gameStateRef.current.centerX,
        60
      );

      // 적 업데이트 및 생성
      if (gameStateRef.current.enemies.length < 100) {
        if (
          gameStateRef.current.waveProgress <
            gameStateRef.current.maxWaveEnemies &&
          Math.random() < 0.02
        ) {
          gameStateRef.current.enemies.push(createEnemy());
          gameStateRef.current.waveProgress++;
        }

        // 웨이브 완료 체크
        if (
          gameStateRef.current.waveProgress >=
            gameStateRef.current.maxWaveEnemies &&
          gameStateRef.current.enemies.length === 0
        ) {
          setWave((prev) => prev + 1);
          gameStateRef.current.waveProgress = 0;
          // 적의 수는 고정된 값 유지
          gameStateRef.current.maxWaveEnemies = 15;
          setGold((prev) => prev + wave * 50); // 웨이브 클리어 보상
        }
      }

      // 적 업데이트 및 그리기
      gameStateRef.current.enemies.forEach((enemy) => {
        updateEnemy(enemy);
        drawEnemy(enemy);
      });

      // 타워 업데이트 및 그리기
      updateAndDrawTowers(now);

      // 게임 오버 체크
      if (gameStateRef.current.enemies.length >= 100) {
        gameStateRef.current.gameOver = true;
        return;
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    }

    // 적 움직임 업데이트
    function updateEnemy(enemy: Enemy) {
      enemy.angle += enemy.speed;
      enemy.x =
        gameStateRef.current.centerX +
        Math.cos(enemy.angle) * gameStateRef.current.pathRadius;
      enemy.y =
        gameStateRef.current.centerY +
        Math.sin(enemy.angle) * gameStateRef.current.pathRadius;
    }

    gameLoop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', updateCanvasSize);
      if (currentCanvas) {
        currentCanvas.removeEventListener('click', handleTowerInteraction);
        currentCanvas.removeEventListener('touchstart', handleTowerInteraction);
      }
    };
  }, [router, gold, selectedTowerType, selectedTower, wave, createEnemy]);

  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4'>
      <div className='w-full max-w-full overflow-x-auto mb-4'>
        <div className='flex flex-wrap gap-2 items-center justify-center md:flex-nowrap'>
          <div className='flex items-center gap-2 text-white text-sm md:text-base'>
            <span>웨이브: {wave}</span>
            <span>적 수: {gameStateRef.current.enemies.length}/100</span>
            <span>점수: {score}</span>
            <span>골드: {gold}</span>
          </div>
          <select
            value={selectedTowerType}
            onChange={(e) =>
              setSelectedTowerType(e.target.value as keyof typeof TOWER_TYPES)
            }
            className='px-2 py-1 rounded bg-gray-700 text-white text-sm md:text-base'>
            {Object.entries(TOWER_TYPES).map(([key, value]) => (
              <option key={key} value={key}>
                {value.name} ({value.baseCost} 골드)
              </option>
            ))}
          </select>
        </div>

        {/* 웨이브 진행 상태 및 스킵 버튼 */}
        <div className='flex flex-wrap items-center justify-center gap-3 mt-3'>
          <div className='flex items-center gap-2'>
            <div className='h-2 w-32 bg-gray-700 rounded-full overflow-hidden'>
              <div
                className='h-full bg-blue-500 transition-all duration-300'
                style={{
                  width: `${
                    (gameStateRef.current.waveProgress /
                      gameStateRef.current.maxWaveEnemies) *
                    100
                  }%`,
                }}
              />
            </div>
            <span className='text-white text-sm'>
              {Math.floor(
                (gameStateRef.current.waveProgress /
                  gameStateRef.current.maxWaveEnemies) *
                  100
              )}
              %
            </span>
          </div>

          <button
            onClick={() => {
              // 현재 웨이브의 남은 적을 모두 생성
              const remainingEnemies =
                gameStateRef.current.maxWaveEnemies -
                gameStateRef.current.waveProgress;
              for (let i = 0; i < remainingEnemies; i++) {
                const newEnemy = createEnemy();
                gameStateRef.current.enemies.push(newEnemy);
              }
              gameStateRef.current.waveProgress =
                gameStateRef.current.maxWaveEnemies;

              // 웨이브 보상 지급 및 다음 웨이브로 진행
              setWave((prev) => prev + 1);
              setGold((prev) => prev + wave * 50);

              // 다음 웨이브 준비
              gameStateRef.current.waveProgress = 0;
              gameStateRef.current.maxWaveEnemies = 15; // 고정된 적의 수로 변경
            }}
            className='px-3 py-1.5 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors flex items-center gap-1.5 text-sm md:text-base'>
            <ArrowPathIcon className='w-4 h-4 md:w-5 md:h-5' />
            다음 웨이브
          </button>
        </div>
      </div>

      <div className='relative'>
        <canvas
          ref={canvasRef}
          className='border border-gray-600 rounded-lg cursor-pointer max-w-full'
          style={{ touchAction: 'none' }}
        />

        {selectedTower && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50'>
            <div
              onClick={(e) => e.stopPropagation()}
              className='bg-white p-4 md:p-6 rounded-lg shadow-xl w-[300px] max-h-[80vh]'>
              <div className='flex justify-between items-center mb-4'>
                <h3 className='text-xl font-bold'>
                  {TOWER_TYPES[selectedTower.type].name} (레벨{' '}
                  {selectedTower.level})
                </h3>
                <button
                  onClick={() => setSelectedTower(null)}
                  className='text-gray-500 hover:text-gray-700'>
                  ✕
                </button>
              </div>

              <div className='space-y-4'>
                {/* 현재 스탯 */}
                <div className='bg-gray-50 p-3 rounded'>
                  <h4 className='font-semibold mb-2'>현재 스탯</h4>
                  <div className='grid grid-cols-2 gap-2 text-sm'>
                    <div>데미지: {selectedTower.damage}</div>
                    <div>공격 범위: {selectedTower.range}</div>
                    <div>
                      공격 속도: {(1000 / selectedTower.attackSpeed).toFixed(1)}
                      회/초
                    </div>
                    <div>총 처치: {selectedTower.kills || 0}마리</div>
                  </div>
                </div>

                {/* 업그레이드 옵션 */}
                <div className='space-y-2'>
                  <h4 className='font-semibold'>업그레이드</h4>
                  {Object.entries(TOWER_TYPES[selectedTower.type].upgrades).map(
                    ([key, upgrade]) => {
                      const cost = Math.floor(
                        selectedTower.cost * upgrade.cost
                      );
                      return (
                        <button
                          key={key}
                          onClick={() => {
                            if (gold >= cost) {
                              setGold(gold - cost);
                              const tower = selectedTower;
                              const towerType = TOWER_TYPES[tower.type];
                              tower.level += 1;

                              switch (key) {
                                case 'damage':
                                  tower.damage = Math.floor(
                                    towerType.baseDamage *
                                      Math.pow(
                                        upgrade.increase,
                                        tower.level - 1
                                      )
                                  );
                                  break;
                                case 'range':
                                  tower.range = Math.floor(
                                    towerType.baseRange *
                                      gameStateRef.current.scaleFactor *
                                      Math.pow(
                                        upgrade.increase,
                                        tower.level - 1
                                      )
                                  );
                                  break;
                                case 'speed':
                                  tower.attackSpeed = Math.floor(
                                    towerType.baseAttackSpeed *
                                      Math.pow(
                                        upgrade.increase,
                                        tower.level - 1
                                      )
                                  );
                                  break;
                              }
                              tower.cost = Math.floor(tower.cost * 1.2);
                            }
                          }}
                          disabled={gold < cost}
                          className={`w-full p-2 rounded flex justify-between items-center ${
                            gold >= cost
                              ? 'bg-blue-500 hover:bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          }`}>
                          <span>
                            {upgrade.label} 강화 (Lv.{selectedTower.level})
                          </span>
                          <span>{cost} 골드</span>
                        </button>
                      );
                    }
                  )}
                </div>

                {/* 판매 옵션 */}
                <div className='mt-4 pt-4 border-t'>
                  <button
                    onClick={() => {
                      const sellPrice = Math.floor(selectedTower.cost * 0.7);
                      setGold((prev) => prev + sellPrice);
                      gameStateRef.current.towers =
                        gameStateRef.current.towers.filter(
                          (t) => t.id !== selectedTower.id
                        );
                      setSelectedTower(null);
                    }}
                    className='w-full p-2 bg-red-500 hover:bg-red-600 text-white rounded'>
                    타워 판매 ({Math.floor(selectedTower.cost * 0.7)} 골드)
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {gameStateRef.current.gameOver && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className='fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4'>
          <div className='bg-white p-4 md:p-8 rounded-lg text-center w-full max-w-sm mx-4'>
            <h2 className='text-2xl font-bold mb-4'>게임 오버!</h2>
            <div className='space-y-4 mb-6'>
              <p className='text-lg'>최종 점수: {score}점</p>
              <p className='text-gray-600'>웨이브 {wave}까지 버티셨습니다!</p>
              <p className='text-gray-600'>
                처치한 적: {gameStateRef.current.enemyCount}마리
              </p>
            </div>
            <div className='space-y-3'>
              {!isSubmittingScore ? (
                <>
                  <button
                    onClick={async () => {
                      const nickname = localStorage.getItem('nickname');
                      if (!nickname) {
                        alert('닉네임이 설정되지 않았습니다.');
                        router.push('/');
                        return;
                      }
                      setIsSubmittingScore(true);
                      try {
                        await saveScore(nickname, score);
                        router.push('/rankings?gameType=tower');
                      } catch {
                        setIsSubmittingScore(false);
                      }
                    }}
                    className='w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors'>
                    랭킹에 기록하고 확인하기
                  </button>
                  <button
                    onClick={() => router.push('/games')}
                    className='w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors'>
                    게임 목록으로
                  </button>
                </>
              ) : (
                <div className='text-gray-600'>랭킹 저장 중...</div>
              )}
            </div>
          </div>
        </motion.div>
      )}
      {showTutorial && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className='fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4'>
          <div className='bg-white p-4 md:p-8 rounded-lg text-center w-full max-w-lg mx-4 overflow-y-auto max-h-[90vh]'>
            <h2 className='text-2xl font-bold mb-4'>게임 설명서</h2>
            <div className='text-left space-y-3 mb-6'>
              <p className='font-semibold text-lg mb-2'>🎮 기본 규칙</p>
              <p>- 적 100마리가 쌓이면 게임이 종료됩니다</p>
              <p>- 적을 처치하면 골드와 점수를 획득합니다</p>
              <p>- 웨이브가 올라갈수록 적의 체력이 증가합니다</p>

              <p className='font-semibold text-lg mt-4 mb-2'>🏰 타워 설치</p>
              <p>1. 원하는 타워 유형을 선택합니다</p>
              <p>2. 화면을 클릭하여 타워를 설치합니다</p>

              <p className='font-semibold text-lg mt-4 mb-2'>⚔️ 타워 종류</p>
              <ul className='list-disc pl-6 space-y-2'>
                {Object.entries(TOWER_TYPES).map(([key, value]) => (
                  <li key={key} className='flex items-center justify-between'>
                    <span>
                      {value.name} - {value.description}
                    </span>
                    <span className='text-gray-600'>{value.baseCost} 골드</span>
                  </li>
                ))}
              </ul>

              <p className='font-semibold text-lg mt-4 mb-2'>
                🔧 타워 업그레이드
              </p>
              <p>1. 설치된 타워를 클릭하면 업그레이드 창이 열립니다</p>
              <p>
                2. 원하는 능력치(공격력/사거리/공격속도)를 강화할 수 있습니다
              </p>
              <p>3. 불필요한 타워는 판매할 수 있습니다</p>
            </div>
            <button
              onClick={() => setShowTutorial(false)}
              className='px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold'>
              게임 시작
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
