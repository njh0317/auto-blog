import { NextResponse } from 'next/server';
import { getUSMarketNews, formatNewsForAI } from '@/lib/news';
import { getDetailedMarketData } from '@/lib/market-data';
import { savePostV2 } from '@/lib/storage';
import { saveErrorLog } from '@/lib/error-log';
import { Post, GenerateResponse } from '@/lib/types';

// Vercel Cron 설정 - 한국시간 오전 7시 (UTC 22:00 전날)
export const dynamic = 'force-dynamic';

// 미국 증시 마감 시황 전용 Gemini 호출
async function generateUSMarketReport(marketSummary: string, newsText: string, todayStr: string, dayOfWeek: string): Promise<GenerateResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다');

  const isWeekend = dayOfWeek === '토요일';
  const koreanMarketNote = isWeekend 
    ? '(오늘은 토요일이라 한국장 휴장입니다. 한국장 전망은 생략하고 다음 주 월요일 영향 분석으로 대체하세요)'
    : '';

  const prompt = `당신은 10년차 개발자이자 금융 투자자입니다.
오늘 미국 증시 마감 시황 글을 작성합니다.

[오늘 날짜]
${todayStr} (${dayOfWeek})

[글의 목적]
- 아침에 일어나서 "어젯밤 미국장 어땠어?"가 궁금한 한국 투자자에게 핵심 전달
- Google 검색 노출과 애드센스 수익을 고려한 콘텐츠

[오늘의 실제 지수 데이터 - 반드시 이 숫자 기준]
${marketSummary}

[참고 뉴스 헤드라인]
${newsText}

[작성 규칙 - 매우 중요]
1. 제공된 지수 숫자만 사용 (임의 수정 금지)
2. 어젯밤 미국장 주요 이슈와 빅테크(Magnificent 7) 동향 분석
3. 한국 증시에 미칠 영향 분석 ${koreanMarketNote}
4. 오늘 한국장 전망 ${koreanMarketNote}
5. 개인적인 의견과 체감 포함

[문체]
- 친근한 구어체
- 독자에게 말 거는 느낌
- 딱딱한 보고서체 금지
- 이모지, 과한 감정 표현 금지

[SEO 규칙]
- title: 사람이 클릭하고 싶어지는 제목 (30~40자)
- seoTitle: Google 검색 최적화 제목 (45~60자)
  - 반드시 아래 키워드 중 2개 이상 포함:
    - 미국 증시
    - 나스닥
    - 다우존스
    - S&P500
    - 주식 시황
  - 날짜 포함 (예: ${todayStr})

[구조]
- 도입: 어젯밤 미국장 한 줄 요약 + 개인 소감
- 본문:
  [[3대 지수 분석]]
  [[Magnificent 7 동향]]
  [[환율/원자재]]
  [[한국장 영향]]
- 마무리: 오늘 한국장 전망 + 투자 유의사항
- 본문 최소 1000자 이상

[금지 사항]
- 마크다운 문법 사용 금지 (단, 소제목은 [[제목]] 형식 사용)
- 제목에 특수문자 [] 사용 금지

아래 JSON 형식으로만 응답하세요:
{"title": "사람이 읽고 클릭하고 싶은 제목", "seoTitle": "${todayStr} 미국 증시 나스닥 다우존스 시황 정리", "content": "본문 전체", "excerpt": "2줄 요약", "keywords": ["미국 증시", "나스닥", "S&P500", "다우존스"]}`;

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
    const parsed = JSON.parse(jsonText);
    const seoTitle = (parsed.seoTitle || parsed.seo_title || '').replace(/[\[\]]/g, '').trim();
    const displayTitle = (parsed.title || '').replace(/[\[\]]/g, '').trim();
    return {
      title: displayTitle,
      seoTitle: seoTitle,
      content: parsed.content,
      excerpt: parsed.excerpt,
      keywords: parsed.keywords || ['나스닥', 'S&P500'],
    };
  } catch {
    // JSON 파싱 실패 시 필드별 추출 시도
    const seoTitleMatch = jsonText.match(/"seoTitle"\s*:\s*"([^"]+)"/);
    const titleMatch = jsonText.match(/"title"\s*:\s*"([^"]+)"/);
    const contentMatch = jsonText.match(/"content"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"excerpt|"\s*,\s*"keywords|"\s*})/);
    const excerptMatch = jsonText.match(/"excerpt"\s*:\s*"([^"]+)"/);
    const keywordsMatch = jsonText.match(/"keywords"\s*:\s*\[([\s\S]*?)\]/);
    
    let seoTitle = seoTitleMatch?.[1] || '';
    seoTitle = seoTitle.replace(/[\[\]]/g, '').trim();
    let title = titleMatch?.[1] || '미국 증시 마감 시황';
    title = title.replace(/[\[\]]/g, '').trim();
    let content = contentMatch?.[1] || text;
    content = content.replace(/\\n/g, '\n').replace(/\\"/g, '"');
    const excerpt = excerptMatch?.[1] || content.slice(0, 100);
    const keywords = keywordsMatch?.[1]?.match(/"([^"]+)"/g)?.map((k: string) => k.replace(/"/g, '')) || ['나스닥', 'S&P500'];
    
    return { title, seoTitle, content, excerpt, keywords };
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
    // 1. 날짜 포맷 (AI 호출 전에 먼저 생성)
    const now = new Date();
    const today = now.toLocaleDateString('ko-KR', { 
      timeZone: 'Asia/Seoul',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const dayOfWeek = now.toLocaleDateString('ko-KR', { 
      timeZone: 'Asia/Seoul',
      weekday: 'long' 
    });
    
    // 2. 미국 증시 뉴스 수집
    const news = await getUSMarketNews();
    const newsText = formatNewsForAI(news);
    
    // 3. 시장 데이터 수집
    const marketData = await getDetailedMarketData();
    
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
    
    // 4. AI로 글 생성 (날짜, 요일 전달)
    const generated = await generateUSMarketReport(marketSummary, newsText, today, dayOfWeek);
    
    // 5. 포스트 저장
    const yymmdd = now.toISOString().slice(2, 10).replace(/-/g, '').slice(0, 6); // 250129
    const slug = `${yymmdd}-us-market`;
    
    const newPost: Post = {
      id: Date.now().toString(),
      title: generated.title,
      seoTitle: generated.seoTitle || `${today} 미국 증시 나스닥 다우존스 시황 정리`,
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
    
    await savePostV2(newPost);
    
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
