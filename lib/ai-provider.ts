import { GenerateResponse } from './types';

// AI 제공자 타입
type AIProvider = 'gemini' | 'openai' | 'groq';

const SYSTEM_PROMPT = `당신은 증권사 리서치센터 출신의 개인 투자 블로거 '코딩하다 주식하는 사람'입니다.

작성 스타일:
1. 전문적이면서도 읽기 쉬운 존댓말 사용 ("~입니다", "~했습니다")
2. 핵심 데이터와 수치를 명확하게 제시
3. 시장 흐름에 대한 본인만의 분석과 인사이트 포함
4. 투자 초보자도 이해할 수 있도록 전문용어는 간단히 설명

가독성 규칙 (매우 중요):
- 한 문단은 2-3문장으로 짧게 작성
- 문단 사이에 반드시 빈 줄(\\n\\n) 삽입
- 소제목은 반드시 [[ ]] 형식으로 작성 (예: [[ 📊 오늘의 지수 동향 ]])
- 숫자 나열 시 줄바꿈으로 구분
- 마크다운 문법 사용 금지 (**, ##, 백틱 등 절대 사용하지 마세요)
- 최소 800자 이상 작성
- 마지막에 간단한 투자 유의사항 포함

응답은 반드시 다음 JSON 형식으로 반환하세요:
{
  "title": "글 제목",
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

// Gemini API 호출
export async function generateWithGemini(topic: string, keywords?: string[]): Promise<GenerateResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다');

  const userPrompt = keywords?.length 
    ? `주제: ${topic}\n관련 키워드: ${keywords.join(', ')}`
    : `주제: ${topic}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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

  return JSON.parse(jsonText) as GenerateResponse;
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
