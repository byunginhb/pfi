export const GAME_TYPES = {
  memory: '카드 맞추기',
  reaction: '반응 속도',
  '2048': '2048',
  poop: '똥 피하기',
  mole: '두더지 잡기',
} as const;

type GameType = keyof typeof GAME_TYPES;

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
      return `${score}점`;
  }
};

export const saveScore = async (type: GameType, score: number) => {
  const nickname = localStorage.getItem('nickname');
  if (!nickname) return;

  try {
    const response = await fetch('/api/rankings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nickname,
        type,
        score,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save score');
    }
  } catch (error) {
    console.error('Error saving score:', error);
  }
};
