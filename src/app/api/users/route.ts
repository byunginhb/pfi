import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { nickname } = await request.json();

    const existingUser = await prisma.user.findUnique({
      where: { nickname },
    });

    if (existingUser) {
      return NextResponse.json(existingUser);
    }

    const user = await prisma.user.create({
      data: { nickname },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: '사용자 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
