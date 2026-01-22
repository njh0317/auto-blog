import { NextResponse } from 'next/server';
import { getKoreanMarketNews, getKoreanMarketData, formatNewsForAI } from '@/lib/news';
import { generateContent } from '@/lib/ai-provider';
import { savePosts, getPosts } from '@/lib/storage';
import { saveErrorLog } from '@/lib/error-log';
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
    // 1. 한국 증시 뉴스 및 실시간 데이터 수집
    const [news, marketData] = await Promise.all([
      getKoreanMarketNews(),
      getKoreanMarketData(),
    ]);
    const newsText = formatNewsForAI(news);
    
    // 2. AI로 글 생성
    const today = new Date().toLocaleDateString('ko-KR', { 
      timeZone: 'Asia/Seoul',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // 실제 시장 데이터를 포함
    let marketSummary = '';
    if (marketData) {
      const kospiDir = marketData.kospi.changePercent >= 0 ? '상승' : '하락';
      const kosdaqDir = marketData.kosdaq.changePercent >= 0 ? '상승' : '하락';
      marketSummary = `
[오늘의 실제 지수 데이터 - 반드시 이 데이터 기준으로 작성하세요]
코스피: ${marketData.kospi.price.toFixed(2)}p (${marketData.kospi.changePercent >= 0 ? '+' : ''}${marketData.kospi.changePercent.toFixed(2)}% ${kospiDir})
코스닥: ${marketData.kosdaq.price.toFixed(2)}p (${marketData.kosdaq.changePercent >= 0 ? '+' : ''}${marketData.kosdaq.changePercent.toFixed(2)}% ${kosdaqDir})
`;
    }
    
    const topic = `${today} 한국 증시 마감 시황\n${marketSummary}\n오늘의 주요 뉴스:\n${newsText}`;
    
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
    await saveErrorLog('korean-market', error instanceof Error ? error : String(error));
    return NextResponse.json({ 
      error: '글 생성 실패', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
