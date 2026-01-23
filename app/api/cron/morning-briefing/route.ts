import { NextResponse } from 'next/server';
import { getGlobalEconomyNews, formatNewsForAI } from '@/lib/news';
import { savePosts, getPosts } from '@/lib/storage';
import { saveErrorLog } from '@/lib/error-log';
import { Post, GenerateResponse } from '@/lib/types';

// Vercel Cron 설정 - 한국시간 오전 8시 45분 (국내 장 시작 전)
export const dynamic = 'force-dynamic';

// 모닝 브리핑 전용 Gemini 호출 (Google Search Grounding 포함)
async function generateMorningBriefing(newsText: string): Promise<GenerateResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다');

  const prompt = `당신은 10년차 개인 투자자이자 개발자입니다. 매일 아침 출근 전에 시장 뉴스를 정리해서 블로그에 올리고 있어요.

[이 글의 목적]
바쁜 직장인 투자자들이 출근길 5분 만에 "오늘 뭐가 중요하지?"를 파악할 수 있도록 핵심만 콕콕 짚어드리는 거예요.

[참고할 뉴스 헤드라인]
${newsText}

[작성 가이드]
1. Google 검색으로 최신 정보 확인 후 오늘 가장 중요한 이슈 2-3개 선정
2. 각 이슈가 왜 중요한지, 내 포트폴리오에 어떤 영향이 있을지 분석
3. 관련 섹터나 종목 언급 (구체적으로)

[문체 규칙 - 매우 중요]
- 친근한 구어체 사용 ("오늘 주목할 건요", "솔직히 좀 걱정되네요")
- 개인적인 생각/느낌 포함 ("개인적으로는~", "제 생각엔~")
- 독자에게 말 걸듯이 ("다들 어제 뉴스 보셨나요?")
- 딱딱한 보고서 어투 금지 ("~하였습니다", "~되었습니다" X)
- 이모지 적절히 활용

[구조]
- 도입: 오늘 핵심 한 줄 + 개인 소감
- 본문: 이슈별 분석 (소제목은 [[ ]] 형식)
- 마무리: 오늘 장 전략 + 투자 유의사항
- 최소 1000자 이상

[금지]
- 마크다운 문법 (**, ##, 백틱) 절대 금지
- 타이틀에 [] 문자 금지
- 확인 안 된 정보 작성 금지

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
    const parsed = JSON.parse(jsonText) as GenerateResponse;
    parsed.title = parsed.title.replace(/[\[\]]/g, '').trim();
    return parsed;
  } catch {
    // JSON 파싱 실패 시 필드별 추출 시도
    const titleMatch = jsonText.match(/"title"\s*:\s*"([^"]+)"/);
    const contentMatch = jsonText.match(/"content"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"excerpt|"\s*,\s*"keywords|"\s*})/);
    const excerptMatch = jsonText.match(/"excerpt"\s*:\s*"([^"]+)"/);
    const keywordsMatch = jsonText.match(/"keywords"\s*:\s*\[([\s\S]*?)\]/);
    
    let title = titleMatch?.[1] || '모닝 브리핑';
    title = title.replace(/[\[\]]/g, '').trim();
    let content = contentMatch?.[1] || text;
    content = content.replace(/\\n/g, '\n').replace(/\\"/g, '"');
    const excerpt = excerptMatch?.[1] || content.slice(0, 100);
    const keywords = keywordsMatch?.[1]?.match(/"([^"]+)"/g)?.map((k: string) => k.replace(/"/g, '')) || ['모닝브리핑', '경제뉴스'];
    
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
    // 1. 글로벌 경제 뉴스 수집
    const news = await getGlobalEconomyNews();
    
    if (news.length === 0) {
      return NextResponse.json({ 
        error: '뉴스를 찾을 수 없습니다' 
      }, { status: 500 });
    }
    
    const newsText = formatNewsForAI(news);
    
    // 2. AI로 모닝 브리핑 글 생성
    const aiResponse = await generateMorningBriefing(newsText);
    
    // 3. 날짜 포맷
    const today = new Date().toLocaleDateString('ko-KR', { 
      timeZone: 'Asia/Seoul',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // 4. 포스트 저장
    const slug = `${today.replace(/\s/g, '-')}-모닝브리핑`.replace(/[년월일]/g, '');
    
    const newPost: Post = {
      id: Date.now().toString(),
      title: aiResponse.title || `[${today}] 오늘의 모닝 브리핑`,
      slug,
      content: aiResponse.content,
      excerpt: aiResponse.excerpt,
      keywords: aiResponse.keywords || ['모닝브리핑', '경제뉴스', '투자'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const posts = await getPosts();
    posts.unshift(newPost);
    await savePosts(posts);
    
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
