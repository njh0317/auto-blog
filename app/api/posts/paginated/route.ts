import { NextResponse } from 'next/server';
import { getPostsPaginated } from '@/lib/posts';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
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
