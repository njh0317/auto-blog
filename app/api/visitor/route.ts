import { NextResponse } from 'next/server';
import { getVisitorStats, incrementVisitor } from '@/lib/visitor';

export const dynamic = 'force-dynamic';

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
