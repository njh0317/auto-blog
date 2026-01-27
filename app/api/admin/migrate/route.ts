import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { migrateToSortedSet, rollbackMigration } from '@/scripts/migrate-to-sorted-set';

export async function POST(request: Request) {
  // 인증 확인
  const authResult = await verifyAuth(request);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { action } = await request.json();

    if (action === 'migrate') {
      const result = await migrateToSortedSet();
      return NextResponse.json(result);
    } else if (action === 'rollback') {
      const result = await rollbackMigration();
      return NextResponse.json(result);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
