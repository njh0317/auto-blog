import { NextResponse } from 'next/server';
import { getDetailedMarketData, getFearGreedData } from '@/lib/market-data';
import { generateDetailedMarketReport } from '@/lib/detailed-report';
import { savePosts, getPosts } from '@/lib/storage';
import { saveErrorLog } from '@/lib/error-log';
import { Post } from '@/lib/types';
import { postTweet, createBlogTweet } from '@/lib/twitter';

// Vercel Cron 설정 - 한국시간 오전 6시 30분 (미장 마감 30분 후)
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Cron 인증 확인 (로컬에서는 스킵)
  const authHeader = request.headers.get('authorization');
  const isLocal = process.env.NODE_ENV === 'development';
  
  if (!isLocal && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. 시장 데이터 수집
    const [marketData, fearGreedData] = await Promise.all([
      getDetailedMarketData(),
      getFearGreedData()
    ]);
    
    // 2. 상세 리포트 생성
    const reportData = generateDetailedMarketReport(marketData);
    
    // 3. 날짜 포맷
    const today = new Date().toLocaleDateString('ko-KR', { 
      timeZone: 'Asia/Seoul',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // 4. 포스트 저장
    const slug = `${today.replace(/\s/g, '-')}-미국증시-마감시황-3대지수`.replace(/[년월일]/g, '');
    
    const newPost: Post = {
      id: Date.now().toString(),
      title: reportData.title,
      seoTitle: reportData.seoTitle || `${today} 미국 증시 나스닥 다우존스 S&P500 시황 정리`,
      slug,
      content: reportData.content,
      excerpt: reportData.excerpt,
      keywords: reportData.keywords,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      marketData: {
        indices: marketData.indices,
        stocks: marketData.sectorStocks['Magnificent 7'] || [],
        gainers: marketData.gainers,
        losers: marketData.losers,
        fearGreed: {
          score: fearGreedData.score,
          rating: fearGreedData.rating,
          history: fearGreedData.history,
        },
        fetchedAt: marketData.fetchedAt,
      },
    };
    
    const posts = await getPosts();
    posts.unshift(newPost);
    await savePosts(posts);
    
    // 5. 트위터에 자동 포스팅
    const postUrl = `https://wisdomslab.com/posts/${slug}`;
    const tweetText = createBlogTweet(newPost.title, newPost.excerpt, postUrl);
    const tweetResult = await postTweet(tweetText);
    
    return NextResponse.json({ 
      success: true, 
      message: '증시요약 글 생성 완료',
      postId: newPost.id,
      tweet: tweetResult.success ? { id: tweetResult.tweetId } : { error: tweetResult.error }
    });
  } catch (error) {
    console.error('Cron 실행 실패:', error);
    await saveErrorLog('market-summary', error instanceof Error ? error : String(error));
    return NextResponse.json({ 
      error: '글 생성 실패', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
