import { NextResponse } from 'next/server';
import { getPopularPosts } from '@/lib/posts';

export const dynamic = 'force-dynamic';

// GET: 인기글 조회
export async function GET() {
  try {
    const posts = await getPopularPosts(3);
    return NextResponse.json(posts.map(p => ({
      slug: p.slug,
      title: p.title,
      viewCount: p.viewCount || 0,
    })));
  } catch (error) {
    console.error('인기글 조회 실패:', error);
    return NextResponse.json([], { status: 500 });
  }
}
