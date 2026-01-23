import { NextResponse } from 'next/server';
import { incrementViewCount } from '@/lib/posts';

export const dynamic = 'force-dynamic';

// POST: 조회수 증가
export async function POST(request: Request) {
  try {
    const { slug } = await request.json();
    
    if (!slug) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 });
    }
    
    const viewCount = await incrementViewCount(slug);
    return NextResponse.json({ viewCount });
  } catch (error) {
    console.error('조회수 증가 실패:', error);
    return NextResponse.json({ error: 'Failed to increment view count' }, { status: 500 });
  }
}
