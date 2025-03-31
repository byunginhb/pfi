import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get('gameType');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    if (!gameType) {
      return NextResponse.json(
        { error: '게임 타입이 필요합니다.' },
        { status: 400 }
      );
    }

    // 전체 개수 조회
    const total = await prisma.score.count({
      where: {
        gameType,
      },
    });

    // 페이지에 해당하는 데이터 조회
    const scores = await prisma.score.findMany({
      where: {
        gameType,
      },
      orderBy: {
        score: gameType === 'reaction' ? 'asc' : 'desc',
      },
      skip,
      take: limit,
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

    return NextResponse.json({
      scores: formattedScores,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: '랭킹을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { gameType, score, nickname } = await request.json();

    if (!gameType || score === undefined || !nickname) {
      return NextResponse.json(
        { error: '게임 타입, 점수, 닉네임이 필요합니다.' },
        { status: 400 }
      );
    }

    // 사용자 찾기 또는 생성
    const user = await prisma.user.upsert({
      where: { nickname },
      create: { nickname },
      update: {},
    });

    const savedScore = await prisma.score.create({
      data: {
        gameType,
        score,
        userId: user.id,
      },
    });

    return NextResponse.json(savedScore);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: '점수를 저장하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
