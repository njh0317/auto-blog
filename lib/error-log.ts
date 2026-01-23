// 에러 로그 관리 모듈 - Vercel KV 지원
export interface ErrorLog {
  id: string;
  timestamp: string;
  source: string; // 'korean-market', 'us-market', 'morning-briefing', 'market-summary'
  error: string;
  details?: string;
}

const isVercel = process.env.VERCEL === '1';
const hasRedisConfig = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

// Upstash Redis 사용 시
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

// 로컬 파일 시스템 사용 시
function getLocalPath() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('path');
  return path.join(process.cwd(), 'data', 'error-logs.json');
}

function readLocalFile(): ErrorLog[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs');
  const filePath = getLocalPath();
  if (!fs.existsSync(filePath)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeLocalFile(data: ErrorLog[]) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs');
  const filePath = getLocalPath();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export async function getErrorLogs(): Promise<ErrorLog[]> {
  if (isVercel && hasRedisConfig) {
    try {
      const redis = await getRedis();
      const logs = await redis.get<ErrorLog[]>('error-logs');
      return logs || [];
    } catch (e) {
      console.error('Redis 에러 로그 조회 실패:', e);
      return [];
    }
  }
  return readLocalFile();
}

export async function saveErrorLog(source: string, error: Error | string, details?: string): Promise<void> {
  const logs = await getErrorLogs();
  
  const newLog: ErrorLog = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    source,
    error: error instanceof Error ? error.message : error,
    details,
  };
  
  // 최근 100개만 유지
  logs.unshift(newLog);
  if (logs.length > 100) {
    logs.splice(100);
  }
  
  if (isVercel && hasRedisConfig) {
    try {
      const redis = await getRedis();
      await redis.set('error-logs', logs);
    } catch (e) {
      console.error('Redis 에러 로그 저장 실패:', e);
    }
    return;
  }
  writeLocalFile(logs);
}

export async function clearErrorLogs(): Promise<void> {
  if (isVercel && hasRedisConfig) {
    try {
      const redis = await getRedis();
      await redis.set('error-logs', []);
    } catch (e) {
      console.error('Redis 에러 로그 삭제 실패:', e);
    }
    return;
  }
  writeLocalFile([]);
}
