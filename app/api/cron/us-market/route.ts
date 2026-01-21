import { NextResponse } from 'next/server';
import { getUSMarketNews, formatNewsForAI } from '@/lib/news';
import { generateContent } from '@/lib/ai-provider';
import { getDetailedMarketData } from '@/lib/market-data';
import { savePosts, getPosts } from '@/lib/storage';
import { Post } from '@/lib/types';

// Vercel Cron 설정 - 한국시간 오전 7시 (UTC 22:00 전날)
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Cron 인증 확인 (로컬에서는 스킵)
  const authHeader = request.headers.get('authorization');
  const isLocal = process.env.NODE_ENV === 'development';
  
  if (!isLocal && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. 미국 증시 뉴스 수집
    const news = await getUSMarketNews();
    const newsText = formatNewsForAI(news);
    
    // 2. 시장 데이터 수집
    const marketData = await getDetailedMarketData();
    
    // 3. AI로 글 생성
    const today = new Date().toLocaleDateString('ko-KR', { 
      timeZone: 'Asia/Seoul',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const dowDir = marketData.indices.dow.changePercent >= 0 ? '상승' : '하락';
    const nasdaqDir = marketData.indices.nasdaq.changePercent >= 0 ? '상승' : '하락';
    const sp500Dir = marketData.indices.sp500.changePercent >= 0 ? '상승' : '하락';
    
    const marketSummary = `
[오늘의 실제 지수 데이터 - 반드시 이 데이터 기준으로 작성하세요]
다우존스: ${marketData.indices.dow.price.toFixed(2)}p (${marketData.indices.dow.changePercent >= 0 ? '+' : ''}${marketData.indices.dow.changePercent.toFixed(2)}% ${dowDir})
나스닥: ${marketData.indices.nasdaq.price.toFixed(2)}p (${marketData.indices.nasdaq.changePercent >= 0 ? '+' : ''}${marketData.indices.nasdaq.changePercent.toFixed(2)}% ${nasdaqDir})
S&P500: ${marketData.indices.sp500.price.toFixed(2)}p (${marketData.indices.sp500.changePercent >= 0 ? '+' : ''}${marketData.indices.sp500.changePercent.toFixed(2)}% ${sp500Dir})

환율: 달러/원 ${marketData.forex.usdKrw.rate.toFixed(2)}원 (${marketData.forex.usdKrw.changePercent >= 0 ? '+' : ''}${marketData.forex.usdKrw.changePercent.toFixed(2)}%)
달러지수: ${marketData.forex.dollarIndex.rate.toFixed(2)} (${marketData.forex.dollarIndex.changePercent >= 0 ? '+' : ''}${marketData.forex.dollarIndex.changePercent.toFixed(2)}%)

원자재:
- 금: ${marketData.commodities.gold.price.toFixed(2)}달러 (${marketData.commodities.gold.changePercent >= 0 ? '+' : ''}${marketData.commodities.gold.changePercent.toFixed(2)}%)
- WTI: ${marketData.commodities.wti.price.toFixed(2)}달러 (${marketData.commodities.wti.changePercent >= 0 ? '+' : ''}${marketData.commodities.wti.changePercent.toFixed(2)}%)

미국채 10년물: ${marketData.bonds.us10y.yield.toFixed(3)}%
공포탐욕지수: ${marketData.fearGreedIndex}

Magnificent 7:
${marketData.topCompanies.map(s => `- ${s.name}: ${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(2)}%`).join('\n')}
`;
    
    const topic = `${today} 미국 증시 마감 시황\n\n${marketSummary}\n오늘의 주요 뉴스:\n${newsText}`;
    
    const generated = await generateContent(topic, ['나스닥', 'S&P500', '미국증시', '다우존스']);
    
    // 4. 포스트 저장
    const slug = `${today.replace(/\s/g, '-')}-미국증시-마감시황`.replace(/[년월일]/g, '');
    
    const newPost: Post = {
      id: Date.now().toString(),
      title: generated.title,
      slug,
      content: generated.content,
      excerpt: generated.excerpt,
      keywords: generated.keywords,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      marketData: {
        indices: marketData.indices,
        stocks: marketData.sectorStocks['Magnificent 7'] || [],
        gainers: marketData.gainers,
        losers: marketData.losers,
        fetchedAt: marketData.fetchedAt,
      },
    };
    
    const posts = await getPosts();
    posts.unshift(newPost);
    await savePosts(posts);
    
    return NextResponse.json({ 
      success: true, 
      message: '미국 증시 글 생성 완료',
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
