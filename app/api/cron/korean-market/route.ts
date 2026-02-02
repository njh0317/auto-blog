import { NextResponse } from 'next/server';
import { getKoreanMarketNews, getKoreanMarketData, getKoreanTopStocks, getUsdKrwRate, formatNewsForAI } from '@/lib/news';
import { savePostV2 } from '@/lib/storage';
import { saveErrorLog } from '@/lib/error-log';
import { Post, GenerateResponse, KoreanMarketSnapshot } from '@/lib/types';

// Vercel Cron 설정 - 한국시간 오후 4시 (UTC 07:00)
export const dynamic = 'force-dynamic';

// 한국 증시 마감 시황 전용 Gemini 호출
async function generateKoreanMarketReport(marketSummary: string, newsText: string, todayStr: string): Promise<GenerateResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다');

  const prompt = `당신은 10년차 개발자이자 금융 투자자입니다.
오늘 한국 증시 마감 시황 글을 작성합니다.

[오늘 날짜]
${todayStr}

[글의 목적]
- 퇴근 후 "오늘 장 어땠어?"가 궁금한 직장인 투자자를 위한 요약
- Google 검색 노출과 애드센스 수익을 고려한 콘텐츠

[오늘의 실제 지수 데이터 - 반드시 이 숫자 기준]
${marketSummary}

[참고 뉴스 헤드라인]
${newsText}

[작성 규칙 - 매우 중요]
1. 제공된 지수 숫자만 사용 (임의 수정 금지)
2. 외국인 / 기관 수급 흐름 반드시 언급
3. 업종별 동향 포함 (반도체, 2차전지, 바이오 등)
4. 내일 장 전망 + 체크 포인트 제시
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
    - 코스피
    - 코스닥
    - 한국 증시
    - 증시 마감
    - 주식 시황
  - 날짜 포함 (예: ${todayStr})

[구조]
- 도입: 오늘 장 한 줄 요약 + 개인 코멘트
- 본문:
  [[지수 흐름]]
  [[업종별 동향]]
  [[수급 분석]]
- 마무리: 내일 장 전망 + 투자 유의사항
- 본문 최소 1000자 이상

[금지 사항]
- 마크다운 문법 사용 금지
- 제목에 특수문자 [] 사용 금지

아래 JSON 형식으로만 응답하세요:
{"title": "사람이 읽고 클릭하고 싶은 제목", "seoTitle": "${todayStr} 코스피 코스닥 증시 마감 시황 정리", "content": "본문 전체", "excerpt": "2줄 요약", "keywords": ["코스피", "코스닥", "한국 증시", "증시 마감"]}`;

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
      keywords: parsed.keywords || ['코스피', '코스닥'],
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
    let title = titleMatch?.[1] || '한국 증시 마감 시황';
    title = title.replace(/[\[\]]/g, '').trim();
    let content = contentMatch?.[1] || text;
    content = content.replace(/\\n/g, '\n').replace(/\\"/g, '"');
    const excerpt = excerptMatch?.[1] || content.slice(0, 100);
    const keywords = keywordsMatch?.[1]?.match(/"([^"]+)"/g)?.map((k: string) => k.replace(/"/g, '')) || ['코스피', '코스닥'];
    
    return { title, seoTitle, content, excerpt, keywords };
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
    // 1. 날짜 포맷 (AI 호출 전에 먼저 생성)
    const now = new Date();
    const today = now.toLocaleDateString('ko-KR', { 
      timeZone: 'Asia/Seoul',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // 2. 한국 증시 뉴스 및 실시간 데이터 수집
    const [news, marketData, topStocks, usdKrw] = await Promise.all([
      getKoreanMarketNews(),
      getKoreanMarketData(),
      getKoreanTopStocks(),
      getUsdKrwRate(),
    ]);
    const newsText = formatNewsForAI(news);
    
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
    
    // 3. AI로 글 생성 (날짜 전달)
    const generated = await generateKoreanMarketReport(marketSummary, newsText, today);
    
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
    const yymmdd = now.toISOString().slice(2, 10).replace(/-/g, '').slice(0, 6); // 250129
    const slug = `${yymmdd}-kr-market`;
    
    const newPost: Post = {
      id: Date.now().toString(),
      title: generated.title,
      seoTitle: generated.seoTitle || `${today} 코스피 코스닥 증시 마감 시황 정리`,
      slug,
      content: generated.content,
      excerpt: generated.excerpt,
      keywords: generated.keywords,
      category: 'kr-market', // 한국 증시 카테고리
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      koreanMarketData,
    };
    
    await savePostV2(newPost);
    
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
