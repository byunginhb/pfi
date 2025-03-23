'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ClockIcon, TrophyIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

type Card = {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
};

const EMOJIS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'];
const INITIAL_TIME = 60; // 60초

export default function MemoryGame() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [gameOver, setGameOver] = useState(false);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
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
    async (finalScore: number) => {
      try {
        const response = await fetch('/api/scores', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nickname,
            gameType: 'memory',
            score: finalScore,
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

  // 게임 클리어 체크
  const checkGameClear = useCallback(
    (updatedCards: Card[]) => {
      const allMatched = updatedCards.every((card) => card.isMatched);
      if (allMatched) {
        const finalScore = score + 10; // 마지막 매칭의 점수를 포함
        setGameOver(true);
        if (bestScore === null || finalScore > bestScore) {
          setBestScore(finalScore);
        }
        saveScore(finalScore);
      }
    },
    [score, bestScore, saveScore]
  );

  // 게임 초기화
  const initializeGame = useCallback(() => {
    const shuffledEmojis = [...EMOJIS, ...EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false,
      }));
    setCards(shuffledEmojis);
    setFlippedCards([]);
    setScore(0);
    setTimeLeft(INITIAL_TIME);
    setGameOver(false);
    setIsProcessing(false);
  }, []);

  // 카드 뒤집기 처리
  const flipCard = useCallback((cardId: number, isFlipped: boolean) => {
    setCards((prev) =>
      prev.map((card) => (card.id === cardId ? { ...card, isFlipped } : card))
    );
  }, []);

  // 카드 매칭 처리
  const handleMatch = useCallback(
    (firstCardId: number, secondCardId: number) => {
      setCards((prev) => {
        const updatedCards = prev.map((card) =>
          card.id === firstCardId || card.id === secondCardId
            ? { ...card, isFlipped: true, isMatched: true }
            : card
        );
        // 게임 클리어 체크
        checkGameClear(updatedCards);
        return updatedCards;
      });
      setScore((prev) => prev + 10);
      setFlippedCards([]);
      setIsProcessing(false);
    },
    [checkGameClear]
  );

  // 카드 클릭 처리
  const handleCardClick = useCallback(
    (cardId: number) => {
      if (
        gameOver ||
        isProcessing ||
        cards[cardId].isFlipped ||
        cards[cardId].isMatched
      ) {
        return;
      }

      // 진동 효과 (모바일)
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      flipCard(cardId, true);

      if (flippedCards.length === 0) {
        setFlippedCards([cardId]);
      } else {
        setIsProcessing(true);
        const firstCardId = flippedCards[0];

        if (cards[firstCardId].emoji === cards[cardId].emoji) {
          // 매치 성공

          handleMatch(firstCardId, cardId);
        } else {
          // 매치 실패
          setTimeout(() => {
            flipCard(firstCardId, false);
            flipCard(cardId, false);
            setFlippedCards([]);
            setIsProcessing(false);
          }, 500); // 시간 단축
        }
      }
    },
    [cards, flippedCards, gameOver, isProcessing, flipCard, handleMatch]
  );

  // 타이머 처리
  useEffect(() => {
    if (timeLeft > 0 && !gameOver) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0) {
      setGameOver(true);
      if (bestScore === null || score > bestScore) {
        setBestScore(score);
      }
      saveScore(score);
    }
  }, [timeLeft, gameOver, score, bestScore, saveScore]);

  // 게임 시작시 초기화
  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  return (
    <div className='flex flex-col items-center justify-center min-h-[80vh] py-8'>
      <div className='w-full max-w-2xl'>
        <div className='bg-gray-800/80 rounded-2xl p-6 mb-8 backdrop-blur-sm border border-white/10 shadow-lg'>
          <h2 className='text-2xl font-bold mb-4 text-center bg-gradient-to-r from-emerald-400 to-teal-500 text-transparent bg-clip-text'>
            카드 매칭 게임
          </h2>
          <div className='flex justify-center gap-8'>
            <div className='flex items-center gap-2'>
              <TrophyIcon className='w-5 h-5 text-emerald-400' />
              <p className='font-medium text-white'>점수: {score}</p>
            </div>
            <div className='flex items-center gap-2'>
              <ClockIcon className='w-5 h-5 text-emerald-400' />
              <p className='font-medium text-white'>시간: {timeLeft}초</p>
            </div>
            {bestScore !== null && (
              <div className='flex items-center gap-2'>
                <TrophyIcon className='w-5 h-5 text-yellow-400' />
                <p className='font-medium text-white'>최고 점수: {bestScore}</p>
              </div>
            )}
          </div>
        </div>

        <div className='grid grid-cols-4 gap-4 px-4'>
          {cards.map((card) => (
            <motion.div
              key={card.id}
              whileHover={!gameOver ? { scale: 1.05 } : {}}
              whileTap={!gameOver ? { scale: 0.95 } : {}}
              className='aspect-square'>
              <motion.div
                initial={false}
                animate={{
                  rotateY: card.isFlipped || card.isMatched ? 180 : 0,
                }}
                transition={{ duration: 0.2 }}
                className={`w-full h-full rounded-xl cursor-pointer transition-all duration-200 relative preserve-3d  ${
                  gameOver ? 'cursor-default' : ''
                }`}
                onClick={() => !gameOver && handleCardClick(card.id)}>
                <div className='absolute inset-0 backface-hidden bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg' />
                <div className='absolute inset-0 backface-hidden rotate-y-180 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center text-4xl'>
                  {(card.isFlipped || card.isMatched) && (
                    <span className='text-white'>{card.emoji}</span>
                  )}
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {gameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='mt-8 text-center'>
            <p className='text-xl font-medium text-white mb-4'>
              {timeLeft > 0
                ? '축하합니다! 모든 카드를 맞추셨습니다!'
                : '시간이 초과되었습니다!'}
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className='px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl font-semibold shadow-lg text-white'
              onClick={initializeGame}>
              다시 시작
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
