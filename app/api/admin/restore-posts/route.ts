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

    // Redis에서 모든 posts:data:* 키 스캔
    let cursor: number | string = 0;
    const allDataKeys: string[] = [];
    
    do {
      const result: [number | string, string[]] = await redis.scan(cursor, {
        match: 'posts:data:*',
        count: 100,
      });
      
      cursor = typeof result[0] === 'string' ? parseInt(result[0], 10) : result[0];
      const keys = result[1];
      allDataKeys.push(...keys);
    } while (cursor !== 0);

    console.log(`발견된 posts:data 키: ${allDataKeys.length}개`);

    // 각 포스트 데이터를 읽고 posts:sorted에 다시 추가
    let restoredCount = 0;
    const restoredPosts: Array<{ id: string; title: string; createdAt: string }> = [];

    for (const key of allDataKeys) {
      // posts:data:abc123 -> abc123
      const postId = key.replace('posts:data:', '');
      
      // 포스트 데이터 가져오기
      const postData = await redis.hgetall(key);
      
      if (postData && Object.keys(postData).length > 0) {
        const createdAt = String(postData.createdAt || new Date().toISOString());
        const timestamp = new Date(createdAt).getTime();
        
        // posts:sorted에 추가 (timestamp를 score로 사용)
        await redis.zadd('posts:sorted', {
          score: timestamp,
          member: postId,
        });
        
        restoredCount++;
        restoredPosts.push({
          id: postId,
          title: String(postData.title || 'Untitled'),
          createdAt: createdAt,
        });
        
        console.log(`복구됨: ${postId} - ${postData.title}`);
      }
    }

    // posts:count 업데이트
    await redis.set('posts:count', restoredCount);

    return NextResponse.json({
      success: true,
      message: '포스트 복구 완료',
      totalDataKeys: allDataKeys.length,
      restoredCount: restoredCount,
      restoredPosts: restoredPosts,
    });
  } catch (error) {
    console.error('포스트 복구 실패:', error);
    return NextResponse.json({
      error: '복구 실패',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
