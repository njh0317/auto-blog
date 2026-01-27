import { NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/auth';
import { togglePinPost } from '@/lib/posts';

export async function POST(request: Request) {
  // 인증 확인
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !verifyPassword(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await request.json();
    const success = await togglePinPost(id);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Pin toggle error:', error);
    return NextResponse.json(
      { error: 'Failed to toggle pin' },
      { status: 500 }
    );
  }
}
