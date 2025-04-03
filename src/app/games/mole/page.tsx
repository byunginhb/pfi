'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { saveScore } from '@/utils/score';
import { SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/outline';

interface Mole {
  id: number;
  isVisible: boolean;
  isGolden: boolean;
  position: {
    top: number;
    left: number;
  };
}

export default function MolePage() {
  const router = useRouter();
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [moles, setMoles] = useState<Mole[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [hitSound] = useState(() =>
    typeof window !== 'undefined' ? new Audio('/sounds/hit.mp3') : null
  );
  const [goldenHitSound] = useState(() =>
    typeof window !== 'undefined' ? new Audio('/sounds/golden-hit.mp3') : null
  );
  const [gameStartSound] = useState(() =>
    typeof window !== 'undefined' ? new Audio('/sounds/game-start.mp3') : null
  );

  // 윈도우 크기 업데이트
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // 초기 크기 설정
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 음소거 상태 변경 시 모든 오디오에 적용
  useEffect(() => {
    if (hitSound) hitSound.muted = isMuted;
    if (goldenHitSound) goldenHitSound.muted = isMuted;
    if (gameStartSound) gameStartSound.muted = isMuted;
  }, [isMuted, hitSound, goldenHitSound, gameStartSound]);

  const handleMoleClick = useCallback(
    (mole: Mole) => {
      if (gameOver) return;

      if (mole.isGolden) {
        setScore((prev) => prev + 5);
        goldenHitSound?.play();
      } else {
        setScore((prev) => prev + 1);
        hitSound?.play();
      }

      setMoles((prev) => prev.filter((m) => m.id !== mole.id));
    },
    [gameOver, hitSound, goldenHitSound]
  );

  const spawnMole = useCallback(() => {
    if (gameOver) return;

    const isGolden = Math.random() < 0.2; // 20% 확률로 황금 두더지 출현
    const padding = 100; // 화면 가장자리 여백

    const newMole: Mole = {
      id: Date.now(),
      isVisible: true,
      isGolden,
      position: {
        top: padding + Math.random() * (windowSize.height - padding * 2 - 100),
        left: padding + Math.random() * (windowSize.width - padding * 2 - 100),
      },
    };

    setMoles((prev) => [...prev, newMole]);

    // 2초 후에 두더지 제거
    setTimeout(() => {
      setMoles((prev) => prev.filter((m) => m.id !== newMole.id));
    }, 2000);
  }, [gameOver, windowSize]);

  useEffect(() => {
    const nickname = localStorage.getItem('nickname');
    if (!nickname) {
      alert('닉네임을 먼저 설정해주세요!');
      router.push('/games');
      return;
    }

    gameStartSound?.play();
    const spawnInterval = setInterval(spawnMole, 500); // 0.5초마다 40% 확률로 생성
    const timeInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(spawnInterval);
          clearInterval(timeInterval);
          setGameOver(true);
          const nickname = localStorage.getItem('nickname');
          if (nickname) {
            saveScore('mole', score);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(spawnInterval);
      clearInterval(timeInterval);
    };
  }, [router, score, spawnMole, gameStartSound]);

  return (
    <div
      className='relative w-full h-screen overflow-hidden'
      style={{
        background: `url('/images/grass-pattern.svg') repeat`,
        backgroundSize: '100px 100px',
      }}>
      <div className='absolute top-20 left-4 text-2xl font-bold text-white drop-shadow-lg'>
        점수: {score}
      </div>
      <div className='absolute top-20 right-4 text-2xl font-bold text-white drop-shadow-lg'>
        시간: {timeLeft}초
      </div>
      <button
        onClick={() => setIsMuted((prev) => !prev)}
        className='absolute top-32 right-4 p-2 rounded-full bg-white/80 hover:bg-white transition-colors'>
        {isMuted ? (
          <SpeakerXMarkIcon className='w-6 h-6 text-gray-800' />
        ) : (
          <SpeakerWaveIcon className='w-6 h-6 text-gray-800' />
        )}
      </button>
      {moles.map((mole) => (
        <div
          key={mole.id}
          className='absolute cursor-pointer transform hover:scale-110 transition-transform'
          style={{
            top: mole.position.top,
            left: mole.position.left,
          }}
          onClick={() => handleMoleClick(mole)}>
          <Image
            src={
              mole.isGolden
                ? '/images/mole-golden.svg'
                : '/images/mole-normal.svg'
            }
            alt='두더지'
            width={96}
            height={96}
            className='drop-shadow-lg'
            priority
          />
        </div>
      ))}
      {gameOver && (
        <div className='absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center'>
          <div className='bg-white p-8 rounded-lg text-center'>
            <h2 className='text-2xl font-bold mb-4'>게임 오버!</h2>
            <p className='text-xl mb-4'>최종 점수: {score}점</p>
            <button
              className='bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600'
              onClick={() => router.push('/games')}>
              게임 목록으로
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
