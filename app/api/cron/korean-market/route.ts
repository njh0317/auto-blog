import { NextResponse } from 'next/server';
import { getKoreanMarketNews, getKoreanMarketData, getKoreanTopStocks, getUsdKrwRate, formatNewsForAI } from '@/lib/news';
import { savePosts, getPosts } from '@/lib/storage';
import { saveErrorLog } from '@/lib/error-log';
import { Post, GenerateResponse, KoreanMarketSnapshot } from '@/lib/types';

// Vercel Cron 설정 - 한국시간 오후 4시 (UTC 07:00)
export const dynamic = 'force-dynamic';

// 한국 증시 마감 시황 전용 Gemini 호출
async function generateKoreanMarketReport(marketSummary: string, newsText: string): Promise<GenerateResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다');

  const prompt = `당신은 10년차 개인 투자자이자 개발자입니다. 오늘 장이 끝나고 하루를 정리하는 글을 쓰려고 해요.

[이 글의 목적]
퇴근 후 "오늘 장 어땠어?"라고 궁금해하는 직장인 투자자들에게 핵심만 빠르게 전달하는 거예요.

[오늘의 실제 지수 데이터 - 반드시 이 숫자 기준으로 작성]
${marketSummary}

[참고할 뉴스 헤드라인]
${newsText}

[작성 가이드]
1. 위 지수 데이터를 정확히 반영해서 작성 (숫자 틀리면 안 됨!)
2. Google 검색으로 오늘 장에 영향 준 이슈 확인
3. 외국인/기관 수급 동향 언급
4. 업종별 등락 분석 (반도체, 2차전지, 바이오 등)
5. 내일 장 전망 및 주목할 포인트

[문체 규칙 - 매우 중요]
- 친근한 구어체 ("오늘 코스피 좀 빠졌네요", "역시 외국인이 문제야")
- 개인적인 생각 포함 ("솔직히 좀 아쉬운 장이었어요", "내일은 반등 기대해봐도 될 것 같아요")
- 독자에게 말 걸듯이 ("다들 오늘 장 어떠셨어요?", "혹시 반도체 들고 계신 분?")
- 딱딱한 보고서 어투 금지 ("~하였습니다" X)
- 이모지 사용 금지 (AI 티 나니까)

[구조]
- 도입: 오늘 장 한 줄 요약 + 개인 소감
- 본문: 지수 분석 → 업종별 동향 → 수급 분석 (소제목은 [[ ]] 형식)
- 마무리: 내일 전망 + 투자 유의사항
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
    
    let title = titleMatch?.[1] || '한국 증시 마감 시황';
    title = title.replace(/[\[\]]/g, '').trim();
    let content = contentMatch?.[1] || text;
    content = content.replace(/\\n/g, '\n').replace(/\\"/g, '"');
    const excerpt = excerptMatch?.[1] || content.slice(0, 100);
    const keywords = keywordsMatch?.[1]?.match(/"([^"]+)"/g)?.map((k: string) => k.replace(/"/g, '')) || ['코스피', '코스닥'];
    
    return { title, content, excerpt, keywords };
  }
}

export async function GET(request: Request) {
  // Cron 인증 확인 (로컬에서는 스킵)
  const authHeader = request.headers.get('authorization');
  const isLocal = process.env.NODE_ENV === 'development';
  
  // CRON_SECRET 또는 ADMIN_PASSWORD로 인증
  const isValidCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isValidAdmin = authHeader === `Bearer ${process.env.ADMIN_PASSWORD}`;
  
  if (!isLocal && !isValidCron && !isValidAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. 한국 증시 뉴스 및 실시간 데이터 수집
    const [news, marketData, topStocks, usdKrw] = await Promise.all([
      getKoreanMarketNews(),
      getKoreanMarketData(),
      getKoreanTopStocks(),
      getUsdKrwRate(),
    ]);
    const newsText = formatNewsForAI(news);
    
    // 2. 날짜 포맷
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
      marketSummary = `코스피: ${marketData.kospi.price.toFixed(2)}p (${marketData.kospi.changePercent >= 0 ? '+' : ''}${marketData.kospi.changePercent.toFixed(2)}% ${kospiDir})
코스닥: ${marketData.kosdaq.price.toFixed(2)}p (${marketData.kosdaq.changePercent >= 0 ? '+' : ''}${marketData.kosdaq.changePercent.toFixed(2)}% ${kosdaqDir})`;
      
      if (usdKrw) {
        marketSummary += `\n원/달러 환율: ${usdKrw.rate.toFixed(2)}원 (${usdKrw.changePercent >= 0 ? '+' : ''}${usdKrw.changePercent.toFixed(2)}%)`;
      }
      
      if (topStocks.length > 0) {
        marketSummary += `\n\n시총 상위 종목 등락:`;
        topStocks.forEach(stock => {
          marketSummary += `\n- ${stock.name}(${stock.sector}): ${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%`;
        });
      }
    }
    
    // 3. AI로 글 생성
    const generated = await generateKoreanMarketReport(marketSummary, newsText);
    
    // 4. 한국 시장 데이터 스냅샷 생성
    const koreanMarketData: KoreanMarketSnapshot | undefined = marketData ? {
      indices: {
        kospi: { name: '코스피', price: marketData.kospi.price, changePercent: marketData.kospi.changePercent },
        kosdaq: { name: '코스닥', price: marketData.kosdaq.price, changePercent: marketData.kosdaq.changePercent },
      },
      topStocks: topStocks.map(s => ({ name: s.name, sector: s.sector, changePercent: s.changePercent })),
      usdKrw: usdKrw || { rate: 0, changePercent: 0 },
      fetchedAt: new Date().toISOString(),
    } : undefined;
    
    // 5. 포스트 저장
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
      koreanMarketData,
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
