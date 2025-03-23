'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

type GameScore = {
  id: string;
  nickname: string;
  score: number;
  createdAt: string;
};

const GAME_TYPES = {
  reaction: '리액션 테스트',
  memory: '카드 매칭',
};

export default function RankingsPage() {
  const [gameType, setGameType] = useState('reaction');
  const [scores, setScores] = useState<GameScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const response = await fetch(`/api/rankings?gameType=${gameType}`);
        if (response.ok) {
          const data = await response.json();
          setScores(data);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchScores();
  }, [gameType]);

  return (
    <div className='flex flex-col items-center justify-center min-h-[80vh] '>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className='w-full max-w-2xl'>
        <h1 className='text-4xl font-bold mb-8 text-center'>게임 랭킹</h1>

        <div className='flex gap-4 mb-8 justify-center'>
          {Object.entries(GAME_TYPES).map(([type, name]) => (
            <button
              key={type}
              onClick={() => setGameType(type)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                gameType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-600 text-white opacity-30'
              }`}>
              {name}
            </button>
          ))}
        </div>

        {loading ? (
          <p className='text-center'>로딩 중...</p>
        ) : (
          <div className='bg-gray-800 rounded-lg overflow-hidden'>
            <table className='w-full'>
              <thead>
                <tr className='bg-gray-700 text-white'>
                  <th className='px-6 py-3 text-left'>순위</th>
                  <th className='px-6 py-3 text-left'>닉네임</th>
                  <th className='px-6 py-3 text-right'>점수</th>
                </tr>
              </thead>
              <tbody className='text-white'>
                {scores.map((score, index) => (
                  <motion.tr
                    key={score.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className='border-t border-gray-700'>
                    <td className='px-6 py-4'>{index + 1}</td>
                    <td className='px-6 py-4'>{score.nickname}</td>
                    <td className='px-6 py-4 text-right'>
                      {gameType === 'reaction'
                        ? `${score.score}ms`
                        : score.score}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
