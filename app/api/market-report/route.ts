import { NextResponse } from 'next/server';
import { getDetailedMarketData } from '@/lib/market-data';
import { generateDetailedMarketReport } from '@/lib/detailed-report';
import { createPost } from '@/lib/posts';

// 상세 시황 글 생성 API
export async function POST(request: Request) {
  try {
    // 인증 확인
    const authHeader = request.headers.get('authorization');
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (adminPassword && authHeader !== adminPassword) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // 시장 데이터 수집
    const marketData = await getDetailedMarketData();
    
    // 상세 시황 글 생성
    const report = generateDetailedMarketReport(marketData);
    
    // 글 저장
    const post = await createPost(report);
    
    return NextResponse.json({
      success: true,
      post,
      marketData: {
        indices: marketData.indices,
        fetchedAt: marketData.fetchedAt,
      },
    });
  } catch (error) {
    console.error('상세 시황 생성 실패:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json(
      { error: '상세 시황 생성에 실패했습니다', details: errorMessage },
      { status: 500 }
    );
  }
}

// 현재 시장 데이터 미리보기
export async function GET(request: Request) {
  try {
    // 인증 확인
    const { searchParams } = new URL(request.url);
    const password = searchParams.get('password');
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (adminPassword && password !== adminPassword) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // 시장 데이터 수집
    const marketData = await getDetailedMarketData();
    
    return NextResponse.json({
      success: true,
      data: marketData,
    });
  } catch (error) {
    console.error('시장 데이터 조회 실패:', error);
    return NextResponse.json(
      { error: '시장 데이터 조회에 실패했습니다' },
      { status: 500 }
    );
  }
}
