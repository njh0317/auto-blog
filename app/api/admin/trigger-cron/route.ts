import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // Admin 인증 확인
  const authHeader = request.headers.get('authorization');
  if (authHeader !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { type } = await request.json();
    
    const cronEndpoints: Record<string, string> = {
      'morning': '/api/cron/morning-briefing',
      'korean': '/api/cron/korean-market',
      'us': '/api/cron/us-market',
      'summary': '/api/cron/market-summary',
    };

    const endpoint = cronEndpoints[type];
    if (!endpoint) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    // 서버에서 CRON_SECRET으로 cron API 호출
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    const res = await fetch(`${baseUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
    });

    if (!res.ok) {
      const data = await res.json();
      return NextResponse.json({ error: data.error || 'Failed' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Trigger cron error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
