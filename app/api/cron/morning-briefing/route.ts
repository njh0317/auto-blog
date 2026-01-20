import { NextResponse } from 'next/server';
import { getGlobalEconomyNews, formatNewsForAI } from '@/lib/news';
import { savePosts, getPosts } from '@/lib/storage';
import { Post, GenerateResponse } from '@/lib/types';

// Vercel Cron 설정 - 한국시간 오전 8시 45분 (국내 장 시작 전)
export const dynamic = 'force-dynamic';

// 모닝 브리핑 전용 Gemini 호출
async function generateMorningBriefing(newsText: string): Promise<GenerateResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다');

  const prompt = "당신은 증권사 리서치센터 출신의 투자 블로거 '코딩하다 주식하는 사람'입니다.\n\n" +
    "아래는 오늘의 최신 경제/증시 뉴스 헤드라인입니다. 이 중에서 투자자들이 주목해야 할 핵심 이슈를 직접 선별하여 \"오늘의 모닝 브리핑\" 글을 작성해주세요.\n\n" +
    "[오늘의 뉴스 헤드라인]\n" + newsText + "\n\n" +
    "작성 가이드:\n" +
    "1. 위 뉴스 중 가장 중요한 이슈 2-3가지를 직접 선정\n" +
    "2. 왜 이 이슈가 중요한지, 국내 증시에 미칠 영향 분석\n" +
    "3. 관련 섹터나 종목군 언급\n" +
    "4. 전문적이면서도 읽기 쉬운 존댓말 사용\n" +
    "5. 문단은 2-3문장으로 짧게\n" +
    "6. 소제목은 반드시 [[ ]] 형식으로 작성 (예: [[ 📊 반도체 업황 점검 ]])\n" +
    "7. 최소 800자 이상 작성\n\n" +
    "중요: 마크다운 문법 절대 사용 금지! 소제목은 반드시 [[ ]] 안에 작성하세요.\n\n" +
    "반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):\n" +
    '{"title": "글 제목", "content": "본문 내용", "excerpt": "2줄 요약", "keywords": ["키워드1", "키워드2"]}';

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8 }
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

  return JSON.parse(jsonText) as GenerateResponse;
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
    return NextResponse.json({ 
      error: '글 생성 실패', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
