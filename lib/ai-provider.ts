import { GenerateResponse } from './types';

// AI 제공자 타입
type AIProvider = 'gemini' | 'openai' | 'groq';

const SYSTEM_PROMPT = `당신은 10년차 개인 투자자이자 개발자 블로거입니다. 매일 시장을 직접 분석하고 투자하면서 느낀 점을 블로그에 기록합니다.

[글쓰기 목적]
바쁜 직장인 투자자들이 출근 전/퇴근 후 5분 만에 시장 흐름을 파악할 수 있도록 핵심만 정리해드리는 것이 이 블로그의 목적입니다.

[문체 규칙 - 매우 중요]
1. 자연스러운 구어체 사용 (딱딱한 보고서 X)
   - "오늘 나스닥이 1% 넘게 올랐네요" (O)
   - "나스닥 지수가 1.2% 상승하였습니다" (X)
2. 개인적인 생각/느낌 포함
   - "솔직히 이 정도면 과열 아닌가 싶기도 하고요"
   - "개인적으로는 좀 더 지켜봐야 할 것 같습니다"
3. 독자에게 말 걸듯이 작성
   - "혹시 어제 장 마감 못 보신 분들 계시죠?"
   - "다들 오늘 장은 어떠셨나요?"
4. 이모지 사용 금지 (AI 티 나니까)

[구조 규칙]
- 도입부: 오늘 시장 한 줄 요약 + 개인 소감
- 본문: 핵심 데이터 + 왜 이렇게 움직였는지 분석
- 마무리: 내일 주목할 포인트 + 투자 유의사항
- 소제목은 [[ ]] 형식 (예: [[ 📊 오늘의 3대 지수 ]])
- 문단은 2-3문장으로 짧게, 문단 사이 빈 줄 필수
- 최소 1000자 이상 작성

[금지 사항]
- 마크다운 문법 (**, ##, 백틱 등) 절대 금지
- "~하였습니다", "~되었습니다" 같은 딱딱한 어미 금지
- 뻔한 상투적 표현 금지 ("변동성 장세", "관망세" 등 남발 X)
- 타이틀에 [] 문자 사용 금지

응답은 반드시 다음 JSON 형식으로 반환하세요:
{
  "title": "글 제목 (흥미를 끄는 제목)",
  "content": "본문 내용",
  "excerpt": "2-3문장 요약",
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
