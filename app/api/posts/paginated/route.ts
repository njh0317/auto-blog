import { NextResponse } from 'next/server';
import { getPostsPaginated } from '@/lib/posts';
import { getPostsPaginatedV2 } from '@/lib/storage';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const category = searchParams.get('category') || undefined;

  try {
    // 카테고리 필터가 있으면 직접 필터링
    if (category) {
      const { posts: allPosts } = await getPostsPaginatedV2(1, 1000);
      const filteredPosts = allPosts.filter(post => post.category === category);
      
      const total = filteredPosts.length;
      const start = (page - 1) * limit;
      const end = start + limit;
      const posts = filteredPosts.slice(start, end);
      
      return NextResponse.json({
        posts,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        hasNext: end < total,
        hasPrev: page > 1,
      });
    }
    
    // 카테고리 필터 없으면 기존 방식
    const result = await getPostsPaginated(page, limit);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Paginated posts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}
