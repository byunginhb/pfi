'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

type GameScore = {
  id: string;
  nickname: string;
  score: number;
  createdAt: string;
};

interface RankingsResponse {
  scores: GameScore[];
  total: number;
  page: number;
  totalPages: number;
}

const GAME_TYPES = {
  reaction: '리액션 테스트',
  memory: '카드 매칭',
  '2048': '2048',
  poop: '똥피하기',
};

const ITEMS_PER_PAGE = 10;

export default function RankingsPage() {
  const [gameType, setGameType] = useState('reaction');
  const [scores, setScores] = useState<GameScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/rankings?gameType=${gameType}&page=${currentPage}&limit=${ITEMS_PER_PAGE}`
        );
        if (!response.ok) {
          throw new Error('랭킹을 불러오는데 실패했습니다.');
        }
        const data: RankingsResponse = await response.json();
        setScores(data.scores);
        setTotalPages(data.totalPages);
      } catch (error) {
        console.error('Error:', error);
        setError(
          error instanceof Error
            ? error.message
            : '알 수 없는 오류가 발생했습니다.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchScores();
  }, [gameType, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const formatScore = (score: number, type: string) => {
    switch (type) {
      case 'reaction':
        return `${score}ms`;
      case '2048':
        return score.toLocaleString();
      case 'poop':
        return score.toLocaleString() + '점';
      default:
        return score;
    }
  };

  return (
    <div className='flex flex-col items-center justify-center min-h-[80vh] '>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className='w-full max-w-2xl'>
        <h1 className='text-4xl font-bold mb-8 text-center'>게임 랭킹</h1>

        <div className='flex gap-4 mb-8 justify-center flex-wrap'>
          {Object.entries(GAME_TYPES).map(([type, name]) => (
            <button
              key={type}
              onClick={() => {
                setGameType(type);
                setCurrentPage(1);
              }}
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
          <div className='flex justify-center items-center h-64'>
            <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500'></div>
          </div>
        ) : error ? (
          <div className='text-center text-red-500 p-4 bg-red-100 rounded-lg'>
            {error}
          </div>
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
                {scores && scores.length > 0 ? (
                  scores.map((score, index) => (
                    <motion.tr
                      key={score.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className='border-t border-gray-700'>
                      <td className='px-6 py-4'>
                        {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                      </td>
                      <td className='px-6 py-4'>{score.nickname}</td>
                      <td className='px-6 py-4 text-right'>
                        {formatScore(score.score, gameType)}
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className='px-6 py-4 text-center'>
                      아직 기록이 없습니다
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className='flex justify-center gap-2 p-4 bg-gray-700'>
                {currentPage > 1 && (
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    className='px-3 py-1 rounded bg-gray-600 text-white hover:bg-gray-500 transition-colors'>
                    이전
                  </button>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1 rounded ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-600 text-white hover:bg-gray-500'
                      } transition-colors`}>
                      {page}
                    </button>
                  )
                )}
                {currentPage < totalPages && (
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    className='px-3 py-1 rounded bg-gray-600 text-white hover:bg-gray-500 transition-colors'>
                    다음
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
