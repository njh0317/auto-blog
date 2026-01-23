import { NextResponse } from 'next/server';
import { getUSMarketNews, formatNewsForAI } from '@/lib/news';
import { getDetailedMarketData } from '@/lib/market-data';
import { savePosts, getPosts } from '@/lib/storage';
import { saveErrorLog } from '@/lib/error-log';
import { Post, GenerateResponse } from '@/lib/types';

// Vercel Cron 설정 - 한국시간 오전 7시 (UTC 22:00 전날)
export const dynamic = 'force-dynamic';

// 미국 증시 마감 시황 전용 Gemini 호출
async function generateUSMarketReport(marketSummary: string, newsText: string): Promise<GenerateResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다');

  const prompt = `당신은 10년차 개인 투자자이자 개발자입니다. 미국 장이 끝나고 한국 투자자들을 위해 시황을 정리하려고 해요.

[이 글의 목적]
아침에 일어나서 "어젯밤 미국장 어땠어?"라고 궁금해하는 한국 투자자들에게 핵심을 빠르게 전달하는 거예요.

[오늘의 실제 지수 데이터 - 반드시 이 숫자 기준으로 작성]
${marketSummary}

[참고할 뉴스 헤드라인]
${newsText}

[작성 가이드]
1. 위 지수 데이터를 정확히 반영해서 작성 (숫자 틀리면 안 됨!)
2. Google 검색으로 어젯밤 미국장 주요 이슈 확인
3. 빅테크 동향 분석 (Magnificent 7 중심)
4. 한국 증시에 미칠 영향 분석
5. 오늘 한국장 전망

[문체 규칙 - 매우 중요]
- 친근한 구어체 ("어젯밤 나스닥 좀 올랐네요", "테슬라가 또 날뛰었어요")
- 개인적인 생각 포함 ("솔직히 이 정도면 과열 아닌가 싶기도 하고요", "오늘 코스피는 갭업 예상해봅니다")
- 독자에게 말 걸듯이 ("미국주식 들고 계신 분들 기분 좋으시겠네요", "오늘 장 어떻게 대응하실 건가요?")
- 딱딱한 보고서 어투 금지 ("~하였습니다" X)
- 이모지 사용 금지 (AI 티 나니까)

[구조]
- 도입: 어젯밤 미국장 한 줄 요약 + 개인 소감
- 본문: 3대 지수 분석 → 빅테크 동향 → 환율/원자재 → 한국장 영향 (소제목은 [[ ]] 형식)
- 마무리: 오늘 한국장 전망 + 투자 유의사항
- 최소 1000자 이상

[금지]
- 마크다운 문법 (**, ##, 백틱) 절대 금지
- 타이틀에 [] 문자 금지
- 제공된 지수 데이터와 다른 숫자 사용 금지

JSON 형식으로만 응답:
{"title": "흥미로운 제목", "content": "본문", "excerpt": "2줄 요약", "keywords": ["키워드1", "키워드2"]}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7 },
        tools: [{ googleSearch: {} }]
      })
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Gemini API 오류: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini 응답이 비어있습니다');

  // JSON 추출
  let jsonText = text.trim();
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1];
  }
  
  const startIdx = jsonText.indexOf('{');
  const endIdx = jsonText.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1) {
    jsonText = jsonText.slice(startIdx, endIdx + 1);
  }

  // JSON 파싱 시도, 실패하면 수동 추출
  try {
    const parsed = JSON.parse(jsonText) as GenerateResponse;
    parsed.title = parsed.title.replace(/[\[\]]/g, '').trim();
    return parsed;
  } catch {
    // JSON 파싱 실패 시 필드별 추출 시도
    const titleMatch = jsonText.match(/"title"\s*:\s*"([^"]+)"/);
    const contentMatch = jsonText.match(/"content"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"excerpt|"\s*,\s*"keywords|"\s*})/);
    const excerptMatch = jsonText.match(/"excerpt"\s*:\s*"([^"]+)"/);
    const keywordsMatch = jsonText.match(/"keywords"\s*:\s*\[([\s\S]*?)\]/);
    
    let title = titleMatch?.[1] || '미국 증시 마감 시황';
    title = title.replace(/[\[\]]/g, '').trim();
    let content = contentMatch?.[1] || text;
    content = content.replace(/\\n/g, '\n').replace(/\\"/g, '"');
    const excerpt = excerptMatch?.[1] || content.slice(0, 100);
    const keywords = keywordsMatch?.[1]?.match(/"([^"]+)"/g)?.map((k: string) => k.replace(/"/g, '')) || ['나스닥', 'S&P500'];
    
    return { title, content, excerpt, keywords };
  }
}

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
    
    // 3. 날짜 포맷
    const today = new Date().toLocaleDateString('ko-KR', { 
      timeZone: 'Asia/Seoul',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const dowDir = marketData.indices.dow.changePercent >= 0 ? '상승' : '하락';
    const nasdaqDir = marketData.indices.nasdaq.changePercent >= 0 ? '상승' : '하락';
    const sp500Dir = marketData.indices.sp500.changePercent >= 0 ? '상승' : '하락';
    
    const marketSummary = `다우존스: ${marketData.indices.dow.price.toFixed(2)}p (${marketData.indices.dow.changePercent >= 0 ? '+' : ''}${marketData.indices.dow.changePercent.toFixed(2)}% ${dowDir})
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
${marketData.topCompanies.map(s => `- ${s.name}: ${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(2)}%`).join('\n')}`;
    
    // 4. AI로 글 생성
    const generated = await generateUSMarketReport(marketSummary, newsText);
    
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
    await saveErrorLog('us-market', error instanceof Error ? error : String(error));
    return NextResponse.json({ 
      error: '글 생성 실패', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
