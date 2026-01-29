import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // 인증 확인
  const authHeader = request.headers.get('authorization');
  const isValidAdmin = authHeader === `Bearer ${process.env.ADMIN_PASSWORD}`;
  
  if (!isValidAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });

    // Redis에서 모든 포스트 가져오기
    const allPostIds = await redis.zrange('posts:sorted', 0, -1);
    
    console.log(`Redis에서 ${allPostIds.length}개의 포스트 ID 발견`);

    // 각 포스트 확인 및 유효하지 않은 것 제거
    let validCount = 0;
    let invalidCount = 0;
    const invalidIds: string[] = [];

    for (const postId of allPostIds) {
      const post = await redis.hgetall(`post:${postId}`);
      
      if (!post || Object.keys(post).length === 0) {
        invalidIds.push(postId as string);
        invalidCount++;
      } else {
        validCount++;
      }
    }

    // 유효하지 않은 포스트 ID 제거
    if (invalidIds.length > 0) {
      for (const invalidId of invalidIds) {
        await redis.zrem('posts:sorted', invalidId);
        console.log(`제거된 유효하지 않은 포스트 ID: ${invalidId}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: '포스트 동기화 완료',
      totalFound: allPostIds.length,
      validPosts: validCount,
      invalidPosts: invalidCount,
      removedIds: invalidIds,
    });
  } catch (error) {
    console.error('포스트 동기화 실패:', error);
    return NextResponse.json({
      error: '동기화 실패',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
