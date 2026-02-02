import { NextResponse } from 'next/server';
import { getGlobalEconomyNews, formatNewsForAI } from '@/lib/news';
import { savePostV2 } from '@/lib/storage';
import { saveErrorLog } from '@/lib/error-log';
import { Post, GenerateResponse } from '@/lib/types';

// Vercel Cron 설정 - 한국시간 오전 8시 45분 (국내 장 시작 전)
export const dynamic = 'force-dynamic';

// 모닝 브리핑 전용 Gemini 호출 (Google Search Grounding 포함)
async function generateMorningBriefing(newsText: string, todayStr: string): Promise<GenerateResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다');

  const prompt = `당신은 10년차 개인 투자자이자 개발자입니다. 매일 아침 출근 전에 시장 뉴스를 정리해 개인 투자자 대상 블로그에 글을 올리고 있습니다.

[중요 - 신원 관련 규칙]
- 본인의 이름, 나이, 성별 등 구체적인 신원 정보를 절대 언급하지 마세요
- "안녕하세요, OO입니다" 같은 인사 금지
- "저는", "제가" 같은 1인칭 표현은 사용 가능하지만, 신원을 특정하는 표현은 금지
- 글은 바로 본론으로 시작하세요

[오늘 날짜]
${todayStr}

[이 글의 목적]
- 바쁜 직장인 투자자들이 출근길 5분 만에 "오늘 뭐가 중요하지?"를 파악할 수 있도록 핵심만 콕콕 짚어드리는 거예요.
- 뉴스 요약이 아니라, 투자자 관점의 해석과 판단 제공

[참고할 뉴스 헤드라인]
${newsText}

[작성 가이드]
1. Google 검색을 통해 최신 정보 확인
2. 오늘 가장 중요한 이슈 2~3개만 선정
3. 각 이슈에 대해:
   - 왜 중요한지
   - 시장/섹터/종목에 어떤 영향이 있는지 언급 (구체적으로)
   - 개인 투자자 입장에서 어떻게 바라볼지 설명

[제목 작성 규칙 - 매우 중요]
1. seo_title (검색엔진 최적화용)
   - 반드시 날짜 포함: "${todayStr}"
   - 반드시 "모닝 브리핑" 또는 "증시" 포함
   - 40~60자 이내
   - 감탄사, 이모지, 물음표 사용 금지
   - 과장된 표현 금지
   - 예시:
     "${todayStr} 모닝 브리핑 | 오늘 증시 핵심 이슈 3가지"
     "${todayStr} 증시 전망 | 미국장 영향과 주요 변수"

2. display_title (화면 표시용)
   - seo_title 기반으로 더 자연스럽고 구어체
   - 질문형 허용
   - 투자 권유로 보일 표현 금지

[문체 규칙 - 매우 중요]
- 친근한 구어체 사용
- 독자에게 말 걸듯이 서술
- 개인적인 생각과 고민 포함
- 딱딱한 보고서 문체 금지
- 이모지 사용 금지
- 모든 문장을 완벽하게 정제하지 말고
  생각을 덧붙이는 자연스러운 말투 허용

[AI 티 방지 규칙 - 매우 중요]
- "이게 왜 중요하냐면요", "개인적으로는", "제 생각엔" 같은 표현 반복 금지
- 같은 의미라도 매번 다른 말투로 표현
- 일부 문단은 단정적으로, 일부는 조심스럽게 서술
- 과도하게 정확한 수치 사용 금지
  (정확한 % 대신 "큰 폭", "두 자릿수 수준" 등 범위 표현 우선)
- 출처가 불분명한 구체적 숫자 남발 금지
- 과거 비슷한 상황에서의 개인 판단이나 경험을 최소 1회 포함
  (맞았던 판단이든, 아쉬웠던 판단이든 가능)

[구조]
- 도입: 오늘 시장을 관통하는 핵심 한 줄 + 개인 소감
- 본문: 이슈별 분석 (소제목은 [[ ]] 형식)
- 마무리: 오늘 장에 대한 태도 정리
  (항상 같은 "유의사항" 패턴 금지, 질문/생각 정리 등 다양화)
- 최소 1000자 이상

[금지 사항]
- 마크다운 문법 사용 금지
- 타이틀에 [] 문자 사용 금지
- 확인되지 않은 정보 단정적으로 서술 금지
- 투자 수익 보장, 매수/매도 직접 권유 금지

JSON 형식으로만 응답:
{"seo_title": "검색엔진 최적화용 제목", "display_title": "화면 표시용 제목", "content": "본문", "excerpt": "2줄 요약", "keywords": ["키워드1", "키워드2"]}`;

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

  // JSON 추출 (```json ... ``` 또는 순수 JSON)
  let jsonText = text.trim();
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1];
  }
  
  // JSON 시작/끝 찾기
  const startIdx = jsonText.indexOf('{');
  const endIdx = jsonText.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1) {
    jsonText = jsonText.slice(startIdx, endIdx + 1);
  }

  // JSON 파싱 시도, 실패하면 수동 추출
  try {
    const parsed = JSON.parse(jsonText);
    const seoTitle = (parsed.seo_title || '').replace(/[\[\]]/g, '').trim();
    const displayTitle = (parsed.display_title || parsed.title || '').replace(/[\[\]]/g, '').trim();
    return {
      title: displayTitle,
      seoTitle: seoTitle,
      content: parsed.content,
      excerpt: parsed.excerpt,
      keywords: parsed.keywords || ['모닝브리핑', '경제뉴스'],
    };
  } catch {
    // JSON 파싱 실패 시 필드별 추출 시도
    const seoTitleMatch = jsonText.match(/"seo_title"\s*:\s*"([^"]+)"/);
    const displayTitleMatch = jsonText.match(/"display_title"\s*:\s*"([^"]+)"/);
    const titleMatch = jsonText.match(/"title"\s*:\s*"([^"]+)"/);
    const contentMatch = jsonText.match(/"content"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"excerpt|"\s*,\s*"keywords|"\s*})/);
    const excerptMatch = jsonText.match(/"excerpt"\s*:\s*"([^"]+)"/);
    const keywordsMatch = jsonText.match(/"keywords"\s*:\s*\[([\s\S]*?)\]/);
    
    let seoTitle = seoTitleMatch?.[1] || '';
    seoTitle = seoTitle.replace(/[\[\]]/g, '').trim();
    let displayTitle = displayTitleMatch?.[1] || titleMatch?.[1] || '모닝 브리핑';
    displayTitle = displayTitle.replace(/[\[\]]/g, '').trim();
    let content = contentMatch?.[1] || text;
    content = content.replace(/\\n/g, '\n').replace(/\\"/g, '"');
    const excerpt = excerptMatch?.[1] || content.slice(0, 100);
    const keywords = keywordsMatch?.[1]?.match(/"([^"]+)"/g)?.map((k: string) => k.replace(/"/g, '')) || ['모닝브리핑', '경제뉴스'];
    
    return { title: displayTitle, seoTitle, content, excerpt, keywords };
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
    
    // 2. 글로벌 경제 뉴스 수집
    const news = await getGlobalEconomyNews();
    
    if (news.length === 0) {
      return NextResponse.json({ 
        error: '뉴스를 찾을 수 없습니다' 
      }, { status: 500 });
    }
    
    const newsText = formatNewsForAI(news);
    
    // 3. AI로 모닝 브리핑 글 생성 (날짜 전달)
    const aiResponse = await generateMorningBriefing(newsText, today);
    
    // 4. 포스트 저장
    const yymmdd = now.toISOString().slice(2, 10).replace(/-/g, '').slice(0, 6); // 250129
    const slug = `${yymmdd}-morning`;
    
    const newPost: Post = {
      id: Date.now().toString(),
      title: aiResponse.title || `${today} 오늘의 모닝 브리핑`,
      seoTitle: aiResponse.seoTitle || `${today} 모닝 브리핑 | 오늘 증시 핵심 이슈`,
      slug,
      content: aiResponse.content,
      excerpt: aiResponse.excerpt,
      keywords: aiResponse.keywords || ['모닝브리핑', '경제뉴스', '투자'],
      category: 'morning-brief', // 모닝 브리핑 카테고리
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await savePostV2(newPost);
    
    return NextResponse.json({ 
      success: true, 
      message: '모닝 브리핑 글 생성 완료',
      postId: newPost.id
    });
  } catch (error) {
    console.error('Cron 실행 실패:', error);
    await saveErrorLog('morning-briefing', error instanceof Error ? error : String(error));
    return NextResponse.json({ 
      error: '글 생성 실패', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
