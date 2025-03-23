'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { BoltIcon, PuzzlePieceIcon } from '@heroicons/react/24/outline';

const games = [
  {
    id: 'reaction',
    title: '리액션 테스트',
    description: '당신의 반응 속도를 테스트해보세요!',
    color: 'from-blue-500 to-purple-500',
    icon: BoltIcon,
  },
  {
    id: 'memory',
    title: '카드 매칭',
    description: '짝을 맞춰 최고 점수를 기록하세요!',
    color: 'from-emerald-500 to-teal-500',
    icon: PuzzlePieceIcon,
  },
  // 추후 더 많은 게임들이 추가될 예정
];

export default function GamesPage() {
  return (
    <div className='flex flex-col items-center justify-center min-h-[80vh]'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className='text-center w-full max-w-4xl'>
        <h1 className='text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text'>
          게임을 선택하세요
        </h1>
        <p className='text-gray-400 mb-8'>
          즐겁게 플레이하고 최고 기록을 달성해보세요!
        </p>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 px-4'>
          {games.map((game, index) => (
            <Link href={`/games/${game.id}`} key={game.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { delay: index * 0.1 },
                }}
                whileHover={{
                  scale: 1.02,
                  transition: { duration: 0.2 },
                }}
                whileTap={{ scale: 0.98 }}
                className={`p-6 rounded-2xl bg-gradient-to-r ${game.color} cursor-pointer group relative overflow-hidden`}>
                <div className='absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300' />
                <div className='relative flex items-start'>
                  <div className='flex-1'>
                    <h2 className='text-2xl font-bold mb-2'>{game.title}</h2>
                    <p className='text-white/80'>{game.description}</p>
                  </div>
                  <game.icon className='w-12 h-12 text-white/80 group-hover:text-white transition-colors' />
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
