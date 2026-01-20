import { NextRequest, NextResponse } from 'next/server';
import { generateContent } from '@/lib/ai-provider';
import { GenerateRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    
    if (!body.topic) {
      return NextResponse.json(
        { error: '주제를 입력해주세요' },
        { status: 400 }
      );
    }

    const result = await generateContent(body.topic, body.keywords);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('콘텐츠 생성 오류:', error);
    return NextResponse.json(
      { error: '콘텐츠 생성에 실패했습니다. 다시 시도해주세요.' },
      { status: 500 }
    );
  }
}
