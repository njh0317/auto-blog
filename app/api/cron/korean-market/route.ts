import { NextResponse } from 'next/server';
import { getKoreanMarketNews, formatNewsForAI } from '@/lib/news';
import { generateContent } from '@/lib/ai-provider';
import { savePosts, getPosts } from '@/lib/storage';
import { Post } from '@/lib/types';

// Vercel Cron 설정 - 한국시간 오후 4시 (UTC 07:00)
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Cron 인증 확인 (로컬에서는 스킵)
  const authHeader = request.headers.get('authorization');
  const isLocal = process.env.NODE_ENV === 'development';
  
  if (!isLocal && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. 한국 증시 뉴스 수집
    const news = await getKoreanMarketNews();
    const newsText = formatNewsForAI(news);
    
    // 2. AI로 글 생성
    const today = new Date().toLocaleDateString('ko-KR', { 
      timeZone: 'Asia/Seoul',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const topic = `${today} 한국 증시 마감 시황\n\n오늘의 주요 뉴스:\n${newsText}`;
    
    const generated = await generateContent(topic, ['코스피', '코스닥', '한국증시']);
    
    // 3. 포스트 저장
    const slug = `${today.replace(/\s/g, '-')}-한국증시-마감시황`.replace(/[년월일]/g, '');
    
    const newPost: Post = {
      id: Date.now().toString(),
      title: generated.title,
      slug,
      content: generated.content,
      excerpt: generated.excerpt,
      keywords: generated.keywords,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const posts = await getPosts();
    posts.unshift(newPost);
    await savePosts(posts);
    
    return NextResponse.json({ 
      success: true, 
      message: '한국 증시 글 생성 완료',
      postId: newPost.id 
    });
  } catch (error) {
    console.error('Cron 실행 실패:', error);
    return NextResponse.json({ 
      error: '글 생성 실패', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
