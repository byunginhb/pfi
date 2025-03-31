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
