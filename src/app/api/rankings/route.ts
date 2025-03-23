import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get('gameType');

    if (!gameType) {
      return NextResponse.json(
        { error: '게임 타입이 필요합니다.' },
        { status: 400 }
      );
    }

    const scores = await prisma.score.findMany({
      where: {
        gameType,
      },
      orderBy: {
        score: gameType === 'reaction' ? 'asc' : 'desc',
      },
      take: 100,
      include: {
        user: {
          select: {
            nickname: true,
          },
        },
      },
    });

    const formattedScores = scores.map((score) => ({
      id: score.id,
      nickname: score.user.nickname,
      score: score.score,
      createdAt: score.createdAt.toISOString(),
    }));

    return NextResponse.json(formattedScores);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: '랭킹을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
