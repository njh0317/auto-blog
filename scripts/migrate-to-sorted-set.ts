// Redis 배열 → Sorted Set 마이그레이션 스크립트
import { Redis } from '@upstash/redis';
import { Post } from '../lib/types';

export async function migrateToSortedSet() {
  const redis = new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
  });

  console.log('🚀 마이그레이션 시작...');

  // 1. 기존 데이터 읽기
  const oldPosts = await redis.get<Post[]>('posts');
  
  if (!oldPosts || oldPosts.length === 0) {
    console.log('⚠️  마이그레이션할 데이터가 없습니다.');
    return { success: false, message: '데이터 없음' };
  }

  console.log(`📦 ${oldPosts.length}개 포스트 발견`);

  // 2. 새 구조로 변환
  let successCount = 0;
  let errorCount = 0;

  for (const post of oldPosts) {
    try {
      const timestamp = new Date(post.createdAt).getTime();
      
      // Sorted Set에 추가
      await redis.zadd('posts:sorted', { score: timestamp, member: post.id });
      
      // Hash에 데이터 저장
      await redis.hset(`posts:data:${post.id}`, {
        id: post.id,
        slug: post.slug,
        title: post.title,
        seoTitle: post.seoTitle || '',
        content: post.content,
        excerpt: post.excerpt,
        keywords: JSON.stringify(post.keywords),
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        pinned: post.pinned ? '1' : '0',
        marketData: post.marketData ? JSON.stringify(post.marketData) : '',
        koreanMarketData: post.koreanMarketData ? JSON.stringify(post.koreanMarketData) : '',
      });
      
      // Slug 매핑
      await redis.set(`posts:slug:${post.slug}`, post.id);
      
      // 조회수
      if (post.viewCount) {
        await redis.set(`posts:views:${post.id}`, post.viewCount);
      }
      
      successCount++;
      console.log(`✅ [${successCount}/${oldPosts.length}] ${post.title}`);
    } catch (error) {
      errorCount++;
      console.error(`❌ 실패: ${post.title}`, error);
    }
  }

  // 3. 전체 개수 저장
  await redis.set('posts:count', successCount);

  // 4. 기존 데이터 백업
  await redis.rename('posts', 'posts:backup');
  console.log('💾 기존 데이터를 posts:backup으로 백업');

  console.log(`\n✨ 마이그레이션 완료!`);
  console.log(`   성공: ${successCount}개`);
  console.log(`   실패: ${errorCount}개`);

  return {
    success: true,
    total: oldPosts.length,
    successCount,
    errorCount,
  };
}

// 롤백 함수
export async function rollbackMigration() {
  const redis = new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
  });

  console.log('🔄 롤백 시작...');

  // 백업 데이터 확인
  const backup = await redis.get<Post[]>('posts:backup');
  if (!backup) {
    console.log('⚠️  백업 데이터가 없습니다.');
    return { success: false, message: '백업 없음' };
  }

  // 1. 새 키들 삭제
  const ids = await redis.zrange('posts:sorted', 0, -1);
  
  for (const id of ids) {
    const data = await redis.hgetall(`posts:data:${id}`);
    const slug = (data as Record<string, string>)?.slug;
    
    await Promise.all([
      redis.del(`posts:data:${id}`),
      redis.del(`posts:views:${id}`),
      slug ? redis.del(`posts:slug:${slug}`) : Promise.resolve(),
    ]);
  }
  
  await redis.del('posts:sorted');
  await redis.del('posts:count');

  // 2. 백업 복구
  await redis.rename('posts:backup', 'posts');

  console.log('✅ 롤백 완료!');
  return { success: true, message: '롤백 완료' };
}
