import { NextRequest, NextResponse } from 'next/server';
import { getAllPosts, createPost, deletePostById } from '@/lib/posts';
import { verifyPassword } from '@/lib/auth';

export async function GET() {
  const posts = await getAllPosts();
  return NextResponse.json(posts);
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get('Authorization');
  if (!auth || !verifyPassword(auth)) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 });
  }

  const body = await request.json();
  
  if (!body.title || !body.content) {
    return NextResponse.json({ error: '제목과 내용이 필요합니다' }, { status: 400 });
  }

  const post = await createPost({
    title: body.title,
    content: body.content,
    excerpt: body.excerpt || body.content.substring(0, 150),
    keywords: body.keywords || [],
  });

  return NextResponse.json(post, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const auth = request.headers.get('Authorization');
  if (!auth || !verifyPassword(auth)) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID가 필요합니다' }, { status: 400 });
  }

  const deleted = await deletePostById(id);
  if (!deleted) {
    return NextResponse.json({ error: '글을 찾을 수 없습니다' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
