import OpenAI from 'openai';
import { GenerateResponse } from './types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

export async function generateContent(topic: string, keywords?: string[]): Promise<GenerateResponse> {
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
  if (!content) {
    throw new Error('AI 응답이 비어있습니다');
  }

  return JSON.parse(content) as GenerateResponse;
}
