// 에러 로그 관리 모듈
import { promises as fs } from 'fs';
import path from 'path';

export interface ErrorLog {
  id: string;
  timestamp: string;
  source: string; // 'korean-market', 'us-market', 'morning-briefing', 'market-summary'
  error: string;
  details?: string;
}

const LOG_FILE = path.join(process.cwd(), 'data', 'error-logs.json');

export async function getErrorLogs(): Promise<ErrorLog[]> {
  try {
    const data = await fs.readFile(LOG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
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
  
  await fs.writeFile(LOG_FILE, JSON.stringify(logs, null, 2));
}

export async function clearErrorLogs(): Promise<void> {
  await fs.writeFile(LOG_FILE, '[]');
}
