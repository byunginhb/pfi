'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BoltIcon, ClockIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

const MIN_DELAY = 1000; // 1초
const MAX_DELAY = 5000; // 5초

export default function ReactionGame() {
  const router = useRouter();
  const [gameState, setGameState] = useState<
    'waiting' | 'ready' | 'clicked' | 'failed'
  >('waiting');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [nickname, setNickname] = useState<string>('');

  // 닉네임 로드
  useEffect(() => {
    const storedNickname = localStorage.getItem('nickname');
    if (!storedNickname) {
      router.replace('/');
      return;
    }
    setNickname(storedNickname);
  }, [router]);

  // 점수 저장
  const saveScore = useCallback(
    async (time: number) => {
      try {
        const response = await fetch('/api/scores', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nickname,
            gameType: 'reaction',
            score: time, // 반응 시간이 짧을수록 좋은 점수
          }),
        });

        if (!response.ok) {
          console.error('점수 저장 실패');
        }
      } catch (error) {
        console.error('점수 저장 중 오류:', error);
      }
    },
    [nickname]
  );

  const startGame = useCallback(() => {
    setGameState('waiting');
    const delay = Math.random() * (MAX_DELAY - MIN_DELAY) + MIN_DELAY;

    setTimeout(() => {
      setStartTime(Date.now());
      setGameState('ready');
    }, delay);
  }, []);

  const handleClick = () => {
    if (gameState === 'waiting') {
      // 대기 중에 클릭하면 실패
      setGameState('failed');
      // 진동 효과 (모바일) - 실패시 더 길게
      if (navigator.vibrate) {
        navigator.vibrate(400);
      }
    } else if (gameState === 'ready') {
      const endTime = Date.now();
      const time = startTime ? endTime - startTime : 0;
      setReactionTime(time);
      setBestTime((prev) => (prev === null ? time : Math.min(prev, time)));
      setGameState('clicked');
      saveScore(time);

      // 진동 효과 (모바일)
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }
    } else if (gameState === 'clicked' || gameState === 'failed') {
      startGame();
    }
  };

  useEffect(() => {
    startGame();
  }, [startGame]);

  const getBackgroundColor = () => {
    switch (gameState) {
      case 'waiting':
        return 'from-red-500 to-orange-500';
      case 'ready':
        return 'from-emerald-500 to-green-500';
      case 'clicked':
        return 'from-blue-500 to-purple-500';
      case 'failed':
        return 'from-rose-600 to-red-700';
    }
  };

  const getMessage = () => {
    switch (gameState) {
      case 'waiting':
        return '초록색으로 변할 때 클릭하세요!';
      case 'ready':
        return '지금 클릭하세요!';
      case 'clicked':
        return `반응 시간: ${reactionTime}ms`;
      case 'failed':
        return '너무 일찍 클릭했습니다!';
    }
  };

  return (
    <div className='flex flex-col items-center justify-center min-h-[80vh] select-none'>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`w-full max-w-md aspect-square rounded-2xl bg-gradient-to-r ${getBackgroundColor()} cursor-pointer flex flex-col items-center justify-center p-8 text-center transition-all duration-300 relative overflow-hidden group shadow-lg`}
        onClick={handleClick}>
        <div className='absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300' />
        <div className='relative'>
          {gameState === 'failed' ? (
            <XMarkIcon className='w-16 h-16 mb-6 text-white/80' />
          ) : (
            <BoltIcon className='w-16 h-16 mb-6 text-white/80' />
          )}
          <h2 className='text-2xl font-bold mb-4'>{getMessage()}</h2>
          {(gameState === 'clicked' || gameState === 'failed') && (
            <p className='text-lg text-white/80'>다시 시도하려면 클릭하세요</p>
          )}
          {bestTime && (
            <div className='mt-6 flex items-center justify-center gap-2 text-white/80'>
              <ClockIcon className='w-5 h-5' />
              <p className='text-lg'>최고 기록: {bestTime}ms</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
