import { NextResponse } from 'next/server';
import { getVisitorStats, incrementVisitor } from '@/lib/visitor';

export const revalidate = 300; // 5분 캐싱

// GET: 방문자 수 조회
export async function GET() {
  const stats = await getVisitorStats();
  return NextResponse.json(stats);
}

// POST: 방문자 수 증가
export async function POST() {
  const stats = await incrementVisitor();
  return NextResponse.json(stats);
}
