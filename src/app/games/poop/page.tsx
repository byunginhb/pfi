'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { saveScore } from '@/utils/score';

// 게임 상수
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const PLAYER_SIZE = 30;
const POOP_SIZE = 30;
const INITIAL_SPEED = 7;
const MAX_SPEED = 12;
const SPEED_INCREMENT = 0.002;
const POOP_SPAWN_RATE = 0.15;

// 게임 객체 인터페이스
interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  speed?: number;
}

export default function PoopGamePage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // 게임 상태
  const gameState = useRef({
    player: {
      x: CANVAS_WIDTH / 2 - PLAYER_SIZE / 2,
      y: CANVAS_HEIGHT - PLAYER_SIZE - 10,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
    },
    poops: [] as GameObject[],
    speed: INITIAL_SPEED,
    animationFrame: 0,
    isGameOver: false,
    currentScore: 0,
  });

  useEffect(() => {
    const storedNickname = localStorage.getItem('nickname');

    if (!storedNickname) {
      console.error('닉네임이 없습니다.');
      router.replace('/');
      return;
    }

    const storedHighScore = localStorage.getItem('poop-highscore');
    if (storedHighScore) {
      setHighScore(parseInt(storedHighScore));
    }
  }, [router]);

  // 게임 시작
  const startGame = () => {
    setGameOver(false);
    setScore(0);
    setIsPlaying(true);
    gameState.current = {
      ...gameState.current,
      poops: [],
      speed: INITIAL_SPEED,
      isGameOver: false,
      currentScore: 0,
    };
    gameLoop();
  };

  // 충돌 감지
  const checkCollision = (rect1: GameObject, rect2: GameObject) => {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  };

  // 새로운 똥 생성
  const createPoop = () => {
    const x = Math.random() * (CANVAS_WIDTH - POOP_SIZE);
    gameState.current.poops.push({
      x,
      y: -POOP_SIZE,
      width: POOP_SIZE,
      height: POOP_SIZE,
      speed: gameState.current.speed,
    });
  };

  // 게임 오버 처리
  const handleGameOver = () => {
    // ref를 통해 즉시 게임 상태 업데이트
    gameState.current.isGameOver = true;

    // 애니메이션 프레임 즉시 취소
    if (gameState.current.animationFrame) {
      cancelAnimationFrame(gameState.current.animationFrame);
      gameState.current.animationFrame = 0;
    }

    // React 상태 업데이트
    setGameOver(true);
    setIsPlaying(false);

    const finalScore = gameState.current.currentScore;

    // 하이스코어 업데이트
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('poop-highscore', finalScore.toString());
    }

    // 점수 저장
    const nickname = localStorage.getItem('nickname');
    if (nickname) {
      console.log('Saving score:', finalScore); // 디버깅용 로그
      saveScore('poop', finalScore)
        .then((result) => {
          console.log('Score saved successfully:', result);
        })
        .catch((error) => {
          console.error('Error saving score:', error);
        });
    }
  };

  // 게임 루프
  const gameLoop = () => {
    if (!canvasRef.current || gameState.current.isGameOver) {
      return;
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // 캔버스 클리어
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 플레이어 그리기
    ctx.font = `${PLAYER_SIZE}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      '🏃',
      gameState.current.player.x + PLAYER_SIZE / 2,
      gameState.current.player.y + PLAYER_SIZE / 2
    );

    // 똥 업데이트 및 그리기
    gameState.current.poops = gameState.current.poops.filter((poop) => {
      poop.y += poop.speed || gameState.current.speed;

      // 충돌 체크
      if (checkCollision(gameState.current.player, poop)) {
        handleGameOver();
        return false;
      }

      // 화면 밖으로 나간 똥 제거
      if (poop.y > CANVAS_HEIGHT) {
        gameState.current.currentScore += 1; // ref에서 점수 직접 업데이트
        setScore(gameState.current.currentScore); // React 상태 동기화
        return false;
      }

      // 똥 그리기
      ctx.font = `${POOP_SIZE}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💩', poop.x + POOP_SIZE / 2, poop.y + POOP_SIZE / 2);

      return true;
    });

    // 새로운 똥 생성
    if (!gameState.current.isGameOver && Math.random() < POOP_SPAWN_RATE) {
      createPoop();
    }

    // 속도 증가
    gameState.current.speed = Math.min(
      MAX_SPEED,
      gameState.current.speed + SPEED_INCREMENT
    );

    // 다음 프레임
    if (!gameState.current.isGameOver) {
      gameState.current.animationFrame = requestAnimationFrame(gameLoop);
    }
  };

  const updatePlayerPosition = useCallback((x: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const relativeX = x - rect.left;

    gameState.current.player.x = Math.max(
      0,
      Math.min(CANVAS_WIDTH - PLAYER_SIZE, relativeX)
    );
  }, []);

  // 터치/마우스 이벤트 처리
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isPlaying) return;

    const handleStart = (e: TouchEvent | MouseEvent) => {
      e.preventDefault();
      if (e instanceof TouchEvent) {
        const touch = e.touches[0];
        updatePlayerPosition(touch.clientX);
      } else {
        updatePlayerPosition(e.clientX);
      }
    };

    const handleMove = (e: TouchEvent | MouseEvent) => {
      e.preventDefault();
      if (e instanceof TouchEvent) {
        const touch = e.touches[0];
        updatePlayerPosition(touch.clientX);
      } else {
        updatePlayerPosition(e.clientX);
      }
    };

    const handleEnd = () => {
      // 터치나 마우스 이벤트 종료 시 필요한 처리
    };

    canvas.addEventListener('touchstart', handleStart as EventListener);
    canvas.addEventListener('touchmove', handleMove as EventListener);
    canvas.addEventListener('touchend', handleEnd);
    canvas.addEventListener('mousedown', handleStart as EventListener);
    canvas.addEventListener('mousemove', handleMove as EventListener);
    canvas.addEventListener('mouseup', handleEnd);

    return () => {
      canvas.removeEventListener('touchstart', handleStart as EventListener);
      canvas.removeEventListener('touchmove', handleMove as EventListener);
      canvas.removeEventListener('touchend', handleEnd);
      canvas.removeEventListener('mousedown', handleStart as EventListener);
      canvas.removeEventListener('mousemove', handleMove as EventListener);
      canvas.removeEventListener('mouseup', handleEnd);
    };
  }, [isPlaying, updatePlayerPosition]);

  return (
    <div className='fixed inset-0 flex flex-col items-center justify-center bg-gray-900 overflow-hidden touch-none pt-16 pb-8'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='text-center mb-4'>
        <h1 className='text-3xl font-bold mb-1 bg-gradient-to-r from-amber-500 to-orange-500 text-transparent bg-clip-text'>
          똥피하기
        </h1>
        <p className='text-sm text-gray-400'>
          하늘에서 떨어지는 똥을 피하세요!
        </p>
      </motion.div>

      <div className='relative w-full max-w-[400px] px-4 flex-shrink-0'>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className='w-full h-auto border-2 border-gray-700 rounded-lg bg-gray-800 touch-none'
        />

        {!isPlaying && (
          <div className='absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg'>
            {!gameOver ? (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={startGame}
                className='px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg text-white font-bold text-lg hover:from-amber-600 hover:to-orange-600 transition-colors'>
                게임 시작
              </motion.button>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className='text-center p-4'>
                <h2 className='text-xl font-bold text-white mb-2'>
                  게임 오버!
                </h2>
                <p className='text-lg text-gray-200 mb-1'>점수: {score}</p>
                <p className='text-base text-gray-300 mb-3'>
                  최고 점수: {highScore}
                </p>
                <div className='flex gap-2 justify-center'>
                  <button
                    onClick={startGame}
                    className='px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg text-white font-bold hover:from-amber-600 hover:to-orange-600 transition-colors text-sm'>
                    다시 시작
                  </button>
                  <button
                    onClick={() => router.push('/rankings?game=poop')}
                    className='px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg text-white font-bold hover:from-blue-600 hover:to-purple-600 transition-colors text-sm'>
                    랭킹 보기
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      <div className='mt-4 flex gap-4 text-white'>
        <div className='bg-gray-800 px-4 py-2 rounded-lg'>
          <p className='text-xs text-gray-400'>점수</p>
          <p className='text-lg font-bold'>{score}</p>
        </div>
        <div className='bg-gray-800 px-4 py-2 rounded-lg'>
          <p className='text-xs text-gray-400'>최고 점수</p>
          <p className='text-lg font-bold'>{highScore}</p>
        </div>
      </div>

      <div className='mt-4 text-gray-400 text-center'>
        <h3 className='font-bold mb-1 text-sm'>조작 방법</h3>
        <p className='text-xs'>← → : 좌우 이동</p>
        <p className='text-xs'>터치/마우스 : 드래그로 이동</p>
      </div>
    </div>
  );
}
