import { GenerateResponse } from './types';

// AI 제공자 타입
type AIProvider = 'gemini' | 'openai' | 'groq';

const SYSTEM_PROMPT = `너는 개인 투자자를 대상으로 글을 쓰는 금융 블로거다.
목표는 검색 유입과 체류시간을 높이는 것이다.

[제목 작성 공식 - 매우 중요]
- 공식: [결과] + [이유] + (핵심 변수)
- 예시:
  "코스피 급락 이유, 외국인 매도와 환율 영향"
  "나스닥 하락 왜 반복될까? 금리와 AI주 영향"
  "환율 상승이 주식에 미치는 진짜 영향"
- 의문형 + 이유 조합은 클릭률이 높음
- 제목에 [] 문자 사용 금지

[본문 상단 5줄 - SEO의 절반]
반드시 첫 5줄 안에 포함할 것:
1. 핵심 키워드
2. 검색자가 궁금해할 질문
3. 오늘 상황 한 줄 요약
예시: "최근 환율이 다시 상승하면서 코스피가 약세를 보이고 있다. 환율이 오르면 왜 주식시장은 흔들릴까? 이 글에서는 환율 상승과 주가의 관계를 과거 사례를 통해 정리해본다."

[오늘 시황 연결 - 차별점]
- 교과서 글이 아닌 "오늘 상황이랑 연결된 설명"
- 예시: "특히 오늘처럼 달러 강세가 나타난 날에는 외국인 매도가 동시에 나오는 경우가 많다."
- 이런 문장이 E-E-A-T를 살림

[글 구성 요구]
- 소제목은 5개 ([[ ]] 형식 사용)
- 글의 흐름: 요약 → 배경 → 시장 반응 → 오해 → 체크 포인트
- 각 소제목은 서로 다른 문장 구조로 자연스럽게 작성
- 정형화된 소제목 표현 금지 ("한 줄 요약", "결론 먼저" 등)
- 독자가 '왜?'라는 질문을 따라가며 읽게 할 것

[글에 포함할 요소]
- 과거 시장 사례 최소 2개
- 개인 투자자가 착각하기 쉬운 지점 명시
- 마지막에는 실전 체크 포인트 정리

[문체 규칙]
- 자연스러운 구어체 ("~해요", "~네요", "~거든요")
- 뉴스 기사체가 아닌 개인 블로그 톤
- 이모지 사용 금지
- 문단은 2-3문장으로 짧게, 문단 사이 빈 줄 필수
- 최소 1500자 이상 작성

[금지 사항]
- 마크다운 문법 (**, ##, 백틱 등) 절대 금지 (단, 소제목은 [[제목]] 형식 사용)
- "~하였습니다", "~되었습니다" 같은 딱딱한 어미 금지
- 과도한 투자 권유나 단정적인 표현 금지

응답은 반드시 다음 JSON 형식으로 반환하세요:
{
  "title": "글 제목 ([결과]+[이유] 공식 적용)",
  "content": "본문 내용",
  "excerpt": "2-3문장 요약 (검색엔진 요약 영역용)",
  "keywords": ["키워드1", "키워드2", "키워드3"]
}`;

// Groq API 호출 (무료)
async function generateWithGroq(topic: string, keywords?: string[]): Promise<GenerateResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY가 설정되지 않았습니다');

  const userPrompt = keywords?.length 
    ? `주제: ${topic}\n관련 키워드: ${keywords.join(', ')}`
    : `주제: ${topic}`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Groq API Error:', response.status, errorData);
    throw new Error(`Groq API 오류: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Groq 응답이 비어있습니다');

  return JSON.parse(content) as GenerateResponse;
}

// Gemini API 호출 (Google Search Grounding 포함)
export async function generateWithGemini(topic: string, keywords?: string[], useGrounding: boolean = true): Promise<GenerateResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다');

  const userPrompt = keywords?.length 
    ? `주제: ${topic}\n관련 키워드: ${keywords.join(', ')}`
    : `주제: ${topic}`;

  // Grounding 설정 - 실시간 웹 검색 결과 기반 응답
  const requestBody: Record<string, unknown> = {
    contents: [{
      parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}\n\nJSON 형식으로만 응답하세요.` }]
    }],
    generationConfig: {
      temperature: 0.7,
    }
  };

  // Google Search Grounding 활성화
  if (useGrounding) {
    requestBody.tools = [{
      googleSearch: {}
    }];
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Gemini API Error:', response.status, errorData);
    if (response.status === 429) {
      throw new Error(`요청 제한: ${JSON.stringify(errorData)}`);
    }
    throw new Error(`Gemini API 오류: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini 응답이 비어있습니다');

  // ```json ... ``` 형식에서 JSON 추출
  let jsonText = text;
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
    // 타이틀에서 불필요한 문자 제거
    parsed.title = parsed.title.replace(/[\[\]]/g, '').trim();
    return parsed;
  } catch {
    // JSON 파싱 실패 시 필드별 추출 시도
    const titleMatch = jsonText.match(/"title"\s*:\s*"([^"]+)"/);
    const contentMatch = jsonText.match(/"content"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"excerpt|"\s*,\s*"keywords|"\s*})/);
    const excerptMatch = jsonText.match(/"excerpt"\s*:\s*"([^"]+)"/);
    const keywordsMatch = jsonText.match(/"keywords"\s*:\s*\[([\s\S]*?)\]/);
    
    let title = titleMatch?.[1] || '시황 분석';
    title = title.replace(/[\[\]]/g, '').trim();
    let content = contentMatch?.[1] || text;
    // 이스케이프된 문자 복원
    content = content.replace(/\\n/g, '\n').replace(/\\"/g, '"');
    const excerpt = excerptMatch?.[1] || content.slice(0, 100);
    const keywords = keywordsMatch?.[1]?.match(/"([^"]+)"/g)?.map((k: string) => k.replace(/"/g, '')) || ['증시', '시황'];
    
    return { title, content, excerpt, keywords };
  }
}

// OpenAI API 호출
async function generateWithOpenAI(topic: string, keywords?: string[]): Promise<GenerateResponse> {
  const OpenAI = (await import('openai')).default;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const userPrompt = keywords?.length 
    ? `주제: ${topic}\n관련 키워드: ${keywords.join(', ')}`
    : `주제: ${topic}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.8,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('OpenAI 응답이 비어있습니다');

  return JSON.parse(content) as GenerateResponse;
}

// 메인 함수 - 환경변수로 제공자 선택 (기본값: gemini)
export async function generateContent(topic: string, keywords?: string[]): Promise<GenerateResponse> {
  const provider = (process.env.AI_PROVIDER || 'gemini') as AIProvider;

  switch (provider) {
    case 'openai':
      return generateWithOpenAI(topic, keywords);
    case 'groq':
      return generateWithGroq(topic, keywords);
    case 'gemini':
    default:
      return generateWithGemini(topic, keywords);
  }
}
