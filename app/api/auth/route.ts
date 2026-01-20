import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  
  if (verifyPassword(password)) {
    return NextResponse.json({ success: true });
  }
  
  return NextResponse.json({ error: '인증 실패' }, { status: 401 });
}
