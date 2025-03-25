'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  TrophyIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const [nickname, setNickname] = useState<string>('');
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');

  useEffect(() => {
    const storedNickname = localStorage.getItem('nickname');
    if (storedNickname) {
      setNickname(storedNickname);
    }
  }, []);

  const handleUpdateNickname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNickname || newNickname === nickname) {
      setIsEditingNickname(false);
      return;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nickname: newNickname }),
      });

      if (response.ok) {
        localStorage.setItem('nickname', newNickname);
        setNickname(newNickname);
        setIsEditingNickname(false);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (pathname === '/') return null;

  return (
    <nav className='fixed top-0 left-0 right-0 bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-md shadow-lg z-50'>
      <div className='container mx-auto px-4 py-3'>
        <div className='flex justify-between items-center'>
          <div className='flex items-center gap-6'>
            <Link
              href='/games'
              className='text-gray-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10'>
              <HomeIcon className='w-6 h-6' />
            </Link>
            <Link
              href='/rankings'
              className='flex items-center gap-2 text-gray-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10'>
              <TrophyIcon className='w-6 h-6' />
            </Link>
          </div>
          {nickname && (
            <div className='flex items-center gap-2'>
              <UserCircleIcon className='w-5 h-5 text-gray-400' />
              {isEditingNickname ? (
                <form
                  onSubmit={handleUpdateNickname}
                  className='flex items-center gap-2'>
                  <input
                    type='text'
                    value={newNickname}
                    onChange={(e) => setNewNickname(e.target.value)}
                    placeholder='새 닉네임'
                    className='text-white px-3 py-1 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all'
                    maxLength={20}
                    required
                    autoFocus
                  />
                  <button
                    type='submit'
                    className='px-3 py-1 bg-blue-500 rounded-lg text-sm hover:bg-blue-600 transition-colors'>
                    변경
                  </button>
                  <button
                    type='button'
                    onClick={() => setIsEditingNickname(false)}
                    className='px-3 py-1 bg-gray-500 rounded-lg text-sm hover:bg-gray-600 transition-colors'>
                    취소
                  </button>
                </form>
              ) : (
                <div className='flex items-center gap-2'>
                  <div className='px-3 py-1.5 bg-white/10 rounded-lg'>
                    <span className='text-sm font-medium text-gray-300'>
                      {nickname}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setNewNickname(nickname);
                      setIsEditingNickname(true);
                    }}
                    className='px-2 py-1 text-sm text-gray-400 hover:text-white transition-colors'>
                    수정
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
