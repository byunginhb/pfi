export async function saveScore(gameType: string, score: number) {
  const nickname = localStorage.getItem('nickname');

  if (!nickname) {
    throw new Error('닉네임이 없습니다.');
  }

  const response = await fetch('/api/rankings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      gameType,
      score,
      nickname,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to save score');
  }

  return data;
}

export const GAME_TYPES = {
  memory: '카드 매칭',
  reaction: '반응 속도',
  '2048': '2048',
  poop: '똥피하기',
  mole: '두더지 잡기',
} as const;

export const formatScore = (type: GameType, score: number): string => {
  switch (type) {
    case 'memory':
      return `${score}점`;
    case 'reaction':
      return `${score}ms`;
    case '2048':
      return `${score}점`;
    case 'poop':
      return `${score}점`;
    case 'mole':
      return `${score}점`;
    default:
      return score.toString();
  }
};
