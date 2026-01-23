// 방문자 수 관리 모듈 - Vercel KV 사용

const isVercel = process.env.VERCEL === '1';
const hasRedisConfig = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

async function getRedis() {
  if (!hasRedisConfig) {
    throw new Error('Redis 환경변수가 설정되지 않았습니다');
  }
  const { Redis } = await import('@upstash/redis');
  return new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
  });
}

export interface VisitorStats {
  total: number;
  today: number;
}

// 오늘 날짜 키 (KST 기준)
function getTodayKey(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return `visitors:${kst.toISOString().split('T')[0]}`;
}

// 방문자 수 조회
export async function getVisitorStats(): Promise<VisitorStats> {
  if (!isVercel || !hasRedisConfig) {
    return { total: 0, today: 0 };
  }
  
  try {
    const redis = await getRedis();
    const todayKey = getTodayKey();
    
    const [total, today] = await Promise.all([
      redis.get<number>('visitors:total'),
      redis.get<number>(todayKey),
    ]);
    
    return {
      total: total || 0,
      today: today || 0,
    };
  } catch (e) {
    console.error('방문자 수 조회 실패:', e);
    return { total: 0, today: 0 };
  }
}

// 방문자 수 증가
export async function incrementVisitor(): Promise<VisitorStats> {
  if (!isVercel || !hasRedisConfig) {
    return { total: 0, today: 0 };
  }
  
  try {
    const redis = await getRedis();
    const todayKey = getTodayKey();
    
    const [total, today] = await Promise.all([
      redis.incr('visitors:total'),
      redis.incr(todayKey),
    ]);
    
    // 오늘 키는 48시간 후 자동 삭제 (TTL)
    await redis.expire(todayKey, 48 * 60 * 60);
    
    return { total, today };
  } catch (e) {
    console.error('방문자 수 증가 실패:', e);
    return { total: 0, today: 0 };
  }
}
