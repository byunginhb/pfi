import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { nickname, gameType, score } = await request.json();

    if (!nickname || !gameType || score === undefined) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 닉네임으로 사용자 찾기 또는 생성
    const user = await prisma.user.upsert({
      where: { nickname },
      update: {},
      create: { nickname },
    });

    // 점수 저장
    const newScore = await prisma.score.create({
      data: {
        userId: user.id,
        gameType,
        score,
      },
      include: {
        user: {
          select: {
            nickname: true,
          },
        },
      },
    });

    return NextResponse.json(newScore);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: '점수 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
