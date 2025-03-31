'use client';

import { useEffect, useRef, useState } from 'react';
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
const POOP_SPAWN_RATE = 0.03;

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

  // 키보드 이벤트 처리
  useEffect(() => {
    if (!isPlaying) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const player = gameState.current.player;
      const moveAmount = 20;

      switch (e.key) {
        case 'ArrowLeft':
          player.x = Math.max(0, player.x - moveAmount);
          break;
        case 'ArrowRight':
          player.x = Math.min(
            CANVAS_WIDTH - PLAYER_SIZE,
            player.x + moveAmount
          );
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  // 터치/마우스 이벤트 처리
  useEffect(() => {
    if (!isPlaying || !canvasRef.current) return;

    const canvas = canvasRef.current;
    let isDragging = false;
    let lastX = 0;

    const handleStart = (x: number) => {
      isDragging = true;
      lastX = x;
    };

    const handleMove = (x: number) => {
      if (!isDragging) return;

      const deltaX = x - lastX;
      const player = gameState.current.player;
      player.x = Math.max(
        0,
        Math.min(CANVAS_WIDTH - PLAYER_SIZE, player.x + deltaX)
      );
      lastX = x;
    };

    const handleEnd = () => {
      isDragging = false;
    };

    // 터치 이벤트
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleStart(touch.clientX);
    });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleMove(touch.clientX);
    });

    canvas.addEventListener('touchend', handleEnd);

    // 마우스 이벤트
    canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      handleStart(e.clientX);
    });

    canvas.addEventListener('mousemove', (e) => {
      e.preventDefault();
      handleMove(e.clientX);
    });

    canvas.addEventListener('mouseup', handleEnd);
    canvas.addEventListener('mouseleave', handleEnd);

    return () => {
      canvas.removeEventListener('touchstart', handleStart);
      canvas.removeEventListener('touchmove', handleMove);
      canvas.removeEventListener('touchend', handleEnd);
      canvas.removeEventListener('mousedown', handleStart);
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('mouseup', handleEnd);
      canvas.removeEventListener('mouseleave', handleEnd);
    };
  }, [isPlaying]);

  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='text-center mb-8'>
        <h1 className='text-4xl font-bold mb-2 bg-gradient-to-r from-amber-500 to-orange-500 text-transparent bg-clip-text'>
          똥피하기
        </h1>
        <p className='text-gray-400'>하늘에서 떨어지는 똥을 피하세요!</p>
      </motion.div>

      <div className='relative'>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className='border-2 border-gray-700 rounded-lg bg-gray-800'
        />

        {!isPlaying && (
          <div className='absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg'>
            {!gameOver ? (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={startGame}
                className='px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg text-white font-bold text-lg hover:from-amber-600 hover:to-orange-600 transition-colors'>
                게임 시작
              </motion.button>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className='text-center'>
                <h2 className='text-2xl font-bold text-white mb-4'>
                  게임 오버!
                </h2>
                <p className='text-xl text-gray-200 mb-2'>점수: {score}</p>
                <p className='text-lg text-gray-300 mb-4'>
                  최고 점수: {highScore}
                </p>
                <div className='flex gap-4 justify-center'>
                  <button
                    onClick={startGame}
                    className='px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg text-white font-bold hover:from-amber-600 hover:to-orange-600 transition-colors'>
                    다시 시작
                  </button>
                  <button
                    onClick={() => router.push('/rankings?game=poop')}
                    className='px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg text-white font-bold hover:from-blue-600 hover:to-purple-600 transition-colors'>
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
          <p className='text-sm text-gray-400'>점수</p>
          <p className='text-xl font-bold'>{score}</p>
        </div>
        <div className='bg-gray-800 px-4 py-2 rounded-lg'>
          <p className='text-sm text-gray-400'>최고 점수</p>
          <p className='text-xl font-bold'>{highScore}</p>
        </div>
      </div>

      <div className='mt-8 text-gray-400 text-center'>
        <h3 className='font-bold mb-2'>조작 방법</h3>
        <p>← → : 좌우 이동</p>
        <p>터치/마우스 : 드래그로 이동</p>
      </div>
    </div>
  );
}
