import { NextResponse } from 'next/server';
import { getFearGreedData } from '@/lib/market-data';

export async function GET() {
  try {
    const data = await getFearGreedData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Fear & Greed Index 조회 실패:', error);
    return NextResponse.json(
      { score: 50, rating: 'Neutral', history: [] },
      { status: 200 } // 에러여도 기본값 반환
    );
  }
}
