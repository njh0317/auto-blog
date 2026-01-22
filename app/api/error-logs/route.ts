import { NextResponse } from 'next/server';
import { getErrorLogs, clearErrorLogs } from '@/lib/error-log';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const logs = await getErrorLogs();
  return NextResponse.json(logs);
}

export async function DELETE(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await clearErrorLogs();
  return NextResponse.json({ success: true });
}
