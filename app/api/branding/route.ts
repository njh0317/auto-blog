import { NextResponse } from 'next/server';
import { getBranding, saveBranding } from '@/lib/branding';

// 브랜딩 설정 조회
export async function GET() {
  try {
    const branding = getBranding();
    return NextResponse.json(branding);
  } catch (error) {
    console.error('브랜딩 조회 실패:', error);
    return NextResponse.json(
      { error: '브랜딩 조회에 실패했습니다' },
      { status: 500 }
    );
  }
}

// 브랜딩 설정 저장
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

    const body = await request.json();
    const updated = saveBranding(body);
    
    return NextResponse.json(updated);
  } catch (error) {
    console.error('브랜딩 저장 실패:', error);
    return NextResponse.json(
      { error: '브랜딩 저장에 실패했습니다' },
      { status: 500 }
    );
  }
}
