// 실적 발표 캘린더 관련 함수

import fs from 'fs';
import path from 'path';

// Redis 캐싱 (Vercel 환경에서만)
async function getRedis() {
  const hasRedisConfig = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  if (!hasRedisConfig) {
    throw new Error('Redis 환경변수가 설정되지 않았습니다');
  }
  const { Redis } = await import('@upstash/redis');
  return new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
  });
}

export interface EarningsEvent {
  symbol: string;
  name: string;
  reportDate: string;
  fiscalDateEnding: string;
  estimate: string;
  currency: string;
  timeOfTheDay: string;
}

// ⭐ 메가캡 (시총 상위 글로벌 기업)
const CORE_MAJORS = new Set([
  'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'GOOG',
  'META', 'NVDA', 'TSLA',
  'JPM', 'JNJ', 'UNH', 'XOM', 'V', 'MA'
]);

// 💎 섹터 대표 (각 섹터 주요 기업)
const SECTOR_LEADERS = new Set([
  // 반도체
  'AMD', 'AVGO', 'QCOM', 'NXPI', 'INTC',
  // 헬스케어
  'LLY', 'ABBV', 'MRK', 'TMO', 'PFE',
  // 소비
  'WMT', 'COST', 'HD', 'MCD', 'SBUX', 'DIS', 'NKE',
  // 금융
  'BAC', 'GS', 'MS', 'BLK', 'WFC', 'C', 'SCHW',
  // 통신
  'T', 'VZ', 'CMCSA',
  // 기타
  'CRM', 'ORCL', 'ADBE', 'NFLX'
]);

// 🔥 고관심 종목 (최근 시장 주목도 상승)
const HOT_COMPANIES = new Set([
  'PLTR', 'COIN', 'PYPL', 'UBER', 'ABNB',
  'SNOW', 'PANW', 'CRWD', 'NET', 'DDOG'
]);

// 전체 주요 기업 (3단계 통합)
const MAJOR_COMPANIES = new Set([
  ...Array.from(CORE_MAJORS),
  ...Array.from(SECTOR_LEADERS),
  ...Array.from(HOT_COMPANIES)
]);

// S&P 500 티커 리스트 로드
export function loadSP500Tickers(): Set<string> {
  const csvPath = path.join(process.cwd(), 'data', 'sp500.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').slice(1); // 헤더 제외
  
  const tickers = new Set<string>();
  for (const line of lines) {
    const symbol = line.split(',')[0]?.trim();
    if (symbol) {
      tickers.add(symbol);
    }
  }
  
  return tickers;
}

// Alpha Vantage API로 실적 캘린더 조회 (Redis 캐싱 포함)
export async function fetchEarningsCalendar(): Promise<EarningsEvent[]> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    throw new Error('ALPHA_VANTAGE_API_KEY가 설정되지 않았습니다');
  }
  
  const isVercel = process.env.VERCEL === '1';
  
  // Redis 캐시 확인 (Vercel 환경에서만)
  if (isVercel) {
    try {
      const redis = await getRedis();
      const cached = await redis.get<EarningsEvent[]>('earnings:calendar');
      if (cached && Array.isArray(cached) && cached.length > 0) {
        console.log('실적 캘린더 캐시 사용');
        return cached;
      }
    } catch (error) {
      console.error('Redis 캐시 조회 실패:', error);
    }
  }
  
  // API 호출
  const url = `https://www.alphavantage.co/query?function=EARNINGS_CALENDAR&horizon=3month&apikey=${apiKey}`;
  
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Alpha Vantage API 오류: ${res.status}`);
  }
  
  const csvText = await res.text();
  const lines = csvText.split('\n').slice(1); // 헤더 제외
  
  const events: EarningsEvent[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const parts = line.split(',');
    if (parts.length < 7) continue;
    
    events.push({
      symbol: parts[0]?.trim() || '',
      name: parts[1]?.trim() || '',
      reportDate: parts[2]?.trim() || '',
      fiscalDateEnding: parts[3]?.trim() || '',
      estimate: parts[4]?.trim() || '',
      currency: parts[5]?.trim() || '',
      timeOfTheDay: parts[6]?.trim() || '',
    });
  }
  
  // Redis에 캐싱 (30일 TTL)
  if (isVercel && events.length > 0) {
    try {
      const redis = await getRedis();
      await redis.set('earnings:calendar', events, { ex: 30 * 24 * 60 * 60 }); // 30일
      console.log('실적 캘린더 캐시 저장 완료');
    } catch (error) {
      console.error('Redis 캐시 저장 실패:', error);
    }
  }
  
  return events;
}

// 다음 주 월요일~일요일 날짜 계산
export function getNextWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0(일) ~ 6(토)
  
  // 다음 주 월요일까지 남은 일수
  const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilNextMonday);
  nextMonday.setHours(0, 0, 0, 0);
  
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);
  nextSunday.setHours(23, 59, 59, 999);
  
  return { start: nextMonday, end: nextSunday };
}

// 날짜별로 그룹핑
export function groupByDate(events: EarningsEvent[]): Map<string, EarningsEvent[]> {
  const grouped = new Map<string, EarningsEvent[]>();
  
  for (const event of events) {
    const date = event.reportDate;
    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push(event);
  }
  
  return grouped;
}

// 다음 주 실적 발표 필터링 (S&P 500만)
export function filterNextWeekEarnings(
  allEvents: EarningsEvent[],
  sp500Tickers: Set<string>
): EarningsEvent[] {
  const { start, end } = getNextWeekRange();
  
  return allEvents.filter(event => {
    // S&P 500 기업만
    if (!sp500Tickers.has(event.symbol)) return false;
    
    // 다음 주 범위 내
    const reportDate = new Date(event.reportDate);
    return reportDate >= start && reportDate <= end;
  });
}

// 포스트 콘텐츠 생성 (간단한 요약만)
export function generateEarningsContent(events: EarningsEvent[]): string {
  if (events.length === 0) {
    return '다음 주에는 S&P 500 기업의 실적 발표가 예정되어 있지 않습니다.';
  }
  
  const grouped = groupByDate(events);
  const sortedDates = Array.from(grouped.keys()).sort();
  
  // 주요 기업 개수 계산
  const majorCount = events.filter(e => MAJOR_COMPANIES.has(e.symbol)).length;
  
  // 주요 기업 리스트 추출
  const majorCompanies = events
    .filter(e => MAJOR_COMPANIES.has(e.symbol))
    .map(e => e.symbol)
    .filter((v, i, a) => a.indexOf(v) === i) // 중복 제거
    .sort();
  
  let content = `다음 주 S&P 500 기업 중 ${events.length}개 기업의 실적 발표가 예정되어 있습니다.\n\n`;
  
  if (majorCount > 0) {
    content += `[[주요 기업 (${majorCount}개)]]\n\n`;
    content += `${majorCompanies.join(', ')}\n\n`;
  }
  
  content += `[[날짜별 분포]]\n\n`;
  
  for (const date of sortedDates) {
    const dateObj = new Date(date);
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][dateObj.getDay()];
    const formattedDate = `${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일 (${dayOfWeek})`;
    const dayEvents = grouped.get(date)!;
    const dayMajorCount = dayEvents.filter(e => MAJOR_COMPANIES.has(e.symbol)).length;
    
    content += `• ${formattedDate}: ${dayEvents.length}개 기업`;
    if (dayMajorCount > 0) {
      content += ` (주요 기업 ${dayMajorCount}개)`;
    }
    content += `\n`;
  }
  
  content += '\n━━━━━━━━━━━━━━━━━━━━\n\n';
  content += '※ 실적 발표 일정은 변경될 수 있습니다.\n';
  content += '※ 예상 EPS는 애널리스트 컨센서스 기준입니다.\n';
  content += '※ 상세 일정은 위의 실적 캘린더를 참고하세요.';
  
  return content;
}

// 주요 기업 등급 판단
function getMajorTier(symbol: string): 'core' | 'sector' | 'hot' | null {
  if (CORE_MAJORS.has(symbol)) return 'core';
  if (SECTOR_LEADERS.has(symbol)) return 'sector';
  if (HOT_COMPANIES.has(symbol)) return 'hot';
  return null;
}

// 실적 캘린더 데이터 생성 (FE 컴포넌트용)
export function generateEarningsCalendarData(events: EarningsEvent[]): {
  weekStart: string;
  weekEnd: string;
  totalCount: number;
  eventsByDate: Record<string, Array<{
    symbol: string;
    name: string;
    reportDate: string;
    estimate: string;
    timeOfTheDay: string;
    isMajor: boolean;
    tier?: 'core' | 'sector' | 'hot';
  }>>;
} {
  const { start, end } = getNextWeekRange();
  const grouped = groupByDate(events);
  
  const eventsByDate: Record<string, Array<{
    symbol: string;
    name: string;
    reportDate: string;
    estimate: string;
    timeOfTheDay: string;
    isMajor: boolean;
  }>> = {};
  
  // Map을 Array로 변환하여 순회
  Array.from(grouped.entries()).forEach(([date, dayEvents]) => {
    eventsByDate[date] = dayEvents.map(event => {
      const tier = getMajorTier(event.symbol);
      return {
        symbol: event.symbol,
        name: event.name,
        reportDate: event.reportDate,
        estimate: event.estimate,
        timeOfTheDay: event.timeOfTheDay,
        isMajor: tier !== null,
        tier: tier || undefined,
      };
    });
  });
  
  return {
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
    totalCount: events.length,
    eventsByDate,
  };
}
