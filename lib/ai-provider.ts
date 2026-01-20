import { GenerateResponse } from './types';

// AI 제공자 타입
type AIProvider = 'gemini' | 'openai';

const SYSTEM_PROMPT = `당신은 투자/주식 전문 블로그 작가입니다. 
다음 규칙을 따라 글을 작성하세요:

1. 자연스럽고 읽기 쉬운 한국어로 작성
2. 전문적이지만 초보자도 이해할 수 있게 설명
3. 구체적인 예시와 데이터를 포함
4. 독자에게 실질적인 도움이 되는 정보 제공
5. 마크다운 형식으로 작성 (제목, 소제목, 목록 활용)
6. 최소 1000자 이상 작성
7. AI가 작성한 것처럼 보이지 않도록 자연스럽게 작성

응답은 반드시 다음 JSON 형식으로 반환하세요:
{
  "title": "글 제목",
  "content": "마크다운 본문 (1000자 이상)",
  "excerpt": "2-3문장 요약 (메타 설명용)",
  "keywords": ["키워드1", "키워드2", "키워드3"]
}`;

// Gemini API 호출
async function generateWithGemini(topic: string, keywords?: string[]): Promise<GenerateResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다');

  const userPrompt = keywords?.length 
    ? `주제: ${topic}\n관련 키워드: ${keywords.join(', ')}`
    : `주제: ${topic}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}\n\nJSON 형식으로만 응답하세요.` }]
        }],
        generationConfig: {
          temperature: 0.8,
        }
      })
    }
  );

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('요청 제한에 걸렸습니다. 1분 후 다시 시도해주세요.');
    }
    throw new Error(`Gemini API 오류: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini 응답이 비어있습니다');

  return JSON.parse(text) as GenerateResponse;
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

// 메인 함수 - 환경변수로 제공자 선택
export async function generateContent(topic: string, keywords?: string[]): Promise<GenerateResponse> {
  const provider = (process.env.AI_PROVIDER || 'gemini') as AIProvider;

  switch (provider) {
    case 'openai':
      return generateWithOpenAI(topic, keywords);
    case 'gemini':
    default:
      return generateWithGemini(topic, keywords);
  }
}
