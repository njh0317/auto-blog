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

// 주요 기업 리스트 (시가총액 상위 + 주목도 높은 기업)
const MAJOR_COMPANIES = new Set([
  // 빅테크
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'META', 'NVDA', 'TSLA',
  // 반도체
  'AMD', 'INTC', 'QCOM', 'AVGO', 'NXPI',
  // 금융
  'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'BLK', 'SCHW',
  // 헬스케어
  'JNJ', 'UNH', 'PFE', 'ABBV', 'MRK', 'LLY', 'TMO',
  // 소비재
  'WMT', 'HD', 'COST', 'NKE', 'MCD', 'SBUX', 'DIS',
  // 에너지
  'XOM', 'CVX',
  // 통신
  'T', 'VZ', 'CMCSA',
  // 기타 주요 기업
  'V', 'MA', 'PYPL', 'CRM', 'ORCL', 'ADBE', 'NFLX', 'COIN',
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

// 포스트 콘텐츠 생성 (테이블 형식)
export function generateEarningsContent(events: EarningsEvent[]): string {
  if (events.length === 0) {
    return '다음 주에는 S&P 500 기업의 실적 발표가 예정되어 있지 않습니다.';
  }
  
  const grouped = groupByDate(events);
  const sortedDates = Array.from(grouped.keys()).sort();
  
  // 주요 기업 개수 계산
  const majorCount = events.filter(e => MAJOR_COMPANIES.has(e.symbol)).length;
  
  let content = `다음 주 S&P 500 기업 중 ${events.length}개 기업의 실적 발표가 예정되어 있습니다.\n`;
  content += `이 중 주요 기업은 ${majorCount}개입니다.\n\n`;
  content += `⭐ 표시는 시가총액 상위 및 주목도 높은 기업입니다.\n\n`;
  
  for (const date of sortedDates) {
    const dateObj = new Date(date);
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][dateObj.getDay()];
    const formattedDate = `${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일 (${dayOfWeek})`;
    
    const dayEvents = grouped.get(date)!;
    
    content += `\n## 📅 ${formattedDate}\n\n`;
    content += `| 티커 | 기업명 | 시간 | 예상 EPS |\n`;
    content += `|------|--------|------|----------|\n`;
    
    for (const event of dayEvents) {
      const isMajor = MAJOR_COMPANIES.has(event.symbol);
      const ticker = isMajor ? `⭐ ${event.symbol}` : event.symbol;
      const name = event.name.length > 30 ? event.name.substring(0, 30) + '...' : event.name;
      const timing = event.timeOfTheDay === 'pre-market' ? '장전' : 
                     event.timeOfTheDay === 'post-market' ? '장후' : '-';
      const estimate = event.estimate || '-';
      
      content += `| ${ticker} | ${name} | ${timing} | ${estimate} |\n`;
    }
    
    content += '\n';
  }
  
  content += '\n---\n\n';
  content += '※ 실적 발표 일정은 변경될 수 있습니다.\n';
  content += '※ 예상 EPS는 애널리스트 컨센서스 기준입니다.';
  
  return content;
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
    eventsByDate[date] = dayEvents.map(event => ({
      symbol: event.symbol,
      name: event.name,
      reportDate: event.reportDate,
      estimate: event.estimate,
      timeOfTheDay: event.timeOfTheDay,
      isMajor: MAJOR_COMPANIES.has(event.symbol),
    }));
  });
  
  return {
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
    totalCount: events.length,
    eventsByDate,
  };
}
