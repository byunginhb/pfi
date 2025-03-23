'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, TrophyIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const [nickname, setNickname] = useState<string>('');

  useEffect(() => {
    const storedNickname = localStorage.getItem('nickname');
    if (storedNickname) {
      setNickname(storedNickname);
    }
  }, []);

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
              <div className='px-3 py-1.5 bg-white/10 rounded-lg'>
                <span className='text-sm font-medium text-gray-300'>
                  {nickname}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
