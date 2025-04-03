'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { GAME_TYPES, formatScore } from '@/utils/score';

interface Ranking {
  id: string;
  nickname: string;
  score: number;
  createdAt: string;
}

interface RankingsResponse {
  scores: Ranking[];
  total: number;
  page: number;
  totalPages: number;
}

export default function RankingsPage() {
  const searchParams = useSearchParams();
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [selectedGame, setSelectedGame] = useState(
    searchParams.get('gameType') || 'reaction'
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRankings = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/rankings?gameType=${selectedGame}&page=1&limit=10`
        );
        const data: RankingsResponse = await response.json();
        setRankings(data.scores || []);
      } catch (error) {
        console.error('랭킹을 불러오는데 실패했습니다:', error);
        setRankings([]);
      }
      setLoading(false);
    };

    fetchRankings();
  }, [selectedGame]);

  return (
    <main className='container mx-auto px-4 py-8 mt-16'>
      <div className='min-h-[80vh] flex flex-col items-center py-8 px-4'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className='w-full max-w-4xl'>
          <h1 className='text-4xl font-bold text-center mb-2 bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text'>
            게임 랭킹
          </h1>
          <p className='text-gray-400 text-center mb-8'>
            각 게임의 최고 기록을 확인해보세요!
          </p>

          <div className='flex flex-wrap gap-2 justify-center mb-8'>
            {Object.entries(GAME_TYPES).map(([type, label]) => (
              <button
                key={type}
                onClick={() => setSelectedGame(type)}
                className={`px-4 py-2 rounded-full transition-colors ${
                  selectedGame === type
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                {label}
              </button>
            ))}
          </div>

          <div className='bg-white rounded-xl shadow-lg overflow-hidden'>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='bg-gray-50'>
                    <th className='px-6 py-3 text-left text-sm font-semibold text-gray-600'>
                      순위
                    </th>
                    <th className='px-6 py-3 text-left text-sm font-semibold text-gray-600'>
                      닉네임
                    </th>
                    <th className='px-6 py-3 text-left text-sm font-semibold text-gray-600'>
                      점수
                    </th>
                    <th className='px-6 py-3 text-left text-sm font-semibold text-gray-600'>
                      달성일
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100'>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className='px-6 py-4 text-center text-gray-500'>
                        랭킹을 불러오는 중...
                      </td>
                    </tr>
                  ) : rankings.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className='px-6 py-4 text-center text-gray-500'>
                        아직 기록이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    rankings.map((ranking, index) => (
                      <motion.tr
                        key={ranking.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className='hover:bg-gray-50'>
                        <td className='px-6 py-4'>
                          <div className='flex items-center'>
                            {index + 1 <= 3 ? (
                              <span
                                className={`
                                text-lg font-bold
                                ${index === 0 ? 'text-yellow-500' : ''}
                                ${index === 1 ? 'text-gray-400' : ''}
                                ${index === 2 ? 'text-amber-600' : ''}
                              `}>
                                {index + 1}
                              </span>
                            ) : (
                              <span className='text-gray-600'>{index + 1}</span>
                            )}
                          </div>
                        </td>
                        <td className='px-6 py-4 text-gray-800'>
                          {ranking.nickname}
                        </td>
                        <td className='px-6 py-4 font-medium text-gray-900'>
                          {formatScore(selectedGame, ranking.score)}
                        </td>
                        <td className='px-6 py-4 text-gray-600'>
                          {new Date(ranking.createdAt).toLocaleDateString()}
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
