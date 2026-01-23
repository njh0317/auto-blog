// 증시 뉴스 수집 모듈

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
}

// Google News RSS로 뉴스 수집
async function fetchGoogleNews(query: string, lang: string = 'ko'): Promise<NewsItem[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=${lang}&gl=KR&ceid=KR:ko`;
    
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    
    if (!res.ok) return [];
    
    const xml = await res.text();
    const items: NewsItem[] = [];
    
    // 간단한 XML 파싱
    const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
    
    for (const item of itemMatches.slice(0, 5)) {
      const title = item.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '') || '';
      const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '';
      const source = item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || '';
      const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '';
      
      if (title) {
        items.push({ title, link, source, pubDate });
      }
    }
    
    return items;
  } catch (error) {
    console.error('뉴스 수집 실패:', error);
    return [];
  }
}

// 한국 증시 뉴스
export async function getKoreanMarketNews(): Promise<NewsItem[]> {
  return fetchGoogleNews('코스피 코스닥 증시');
}

// 한국 증시 데이터 (코스피, 코스닥)
export async function getKoreanMarketData(): Promise<{
  kospi: { price: number; change: number; changePercent: number };
  kosdaq: { price: number; change: number; changePercent: number };
} | null> {
  try {
    const fetchQuote = async (symbol: string) => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!res.ok) return null;
      const data = await res.json();
      const meta = data.chart?.result?.[0]?.meta;
      if (!meta) return null;
      
      const price = meta.regularMarketPrice || 0;
      const prevClose = meta.chartPreviousClose || meta.previousClose || price;
      const change = price - prevClose;
      const changePercent = prevClose ? (change / prevClose) * 100 : 0;
      
      return {
        price: Math.round(price * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
      };
    };
    
    const [kospi, kosdaq] = await Promise.all([
      fetchQuote('^KS11'),  // 코스피
      fetchQuote('^KQ11'),  // 코스닥
    ]);
    
    if (!kospi || !kosdaq) return null;
    
    return { kospi, kosdaq };
  } catch {
    return null;
  }
}

// 한국 시총 상위 종목 데이터
export interface KoreanStock {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  changePercent: number;
}

// 한국 시총 상위 종목 (Yahoo Finance 심볼)
const KOREAN_TOP_STOCKS = [
  { symbol: '005930.KS', name: '삼성전자', sector: '반도체' },
  { symbol: '000660.KS', name: 'SK하이닉스', sector: '반도체' },
  { symbol: '373220.KS', name: 'LG에너지솔루션', sector: '2차전지' },
  { symbol: '207940.KS', name: '삼성바이오로직스', sector: '바이오' },
  { symbol: '005380.KS', name: '현대차', sector: '자동차' },
  { symbol: '006400.KS', name: '삼성SDI', sector: '2차전지' },
  { symbol: '051910.KS', name: 'LG화학', sector: '2차전지' },
  { symbol: '035420.KS', name: 'NAVER', sector: 'IT' },
  { symbol: '000270.KS', name: '기아', sector: '자동차' },
  { symbol: '105560.KS', name: 'KB금융', sector: '금융' },
];

export async function getKoreanTopStocks(): Promise<KoreanStock[]> {
  const results: KoreanStock[] = [];
  
  for (const stock of KOREAN_TOP_STOCKS) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${stock.symbol}?interval=1d&range=1d`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!res.ok) continue;
      
      const data = await res.json();
      const meta = data.chart?.result?.[0]?.meta;
      if (!meta) continue;
      
      const price = meta.regularMarketPrice || 0;
      const prevClose = meta.chartPreviousClose || meta.previousClose || price;
      const changePercent = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
      
      results.push({
        symbol: stock.symbol,
        name: stock.name,
        sector: stock.sector,
        price: Math.round(price),
        changePercent: Math.round(changePercent * 100) / 100,
      });
    } catch {
      continue;
    }
  }
  
  return results;
}

// 원/달러 환율
export async function getUsdKrwRate(): Promise<{ rate: number; changePercent: number } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/USDKRW=X?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return null;
    
    const data = await res.json();
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta) return null;
    
    const rate = meta.regularMarketPrice || 0;
    const prevClose = meta.chartPreviousClose || meta.previousClose || rate;
    const changePercent = prevClose ? ((rate - prevClose) / prevClose) * 100 : 0;
    
    return {
      rate: Math.round(rate * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
    };
  } catch {
    return null;
  }
}

// 미국 증시 뉴스
export async function getUSMarketNews(): Promise<NewsItem[]> {
  return fetchGoogleNews('나스닥 S&P500 미국증시');
}

// 글로벌 경제 뉴스 (장 시작 전 브리핑용)
export async function getGlobalEconomyNews(): Promise<NewsItem[]> {
  // 일반적인 경제/증시 뉴스 검색
  return fetchGoogleNews('경제 증시 투자');
}

// 뉴스 요약 텍스트 생성
export function formatNewsForAI(news: NewsItem[]): string {
  if (news.length === 0) return '최신 뉴스를 찾을 수 없습니다.';
  
  return news.map((item, i) => 
    `${i + 1}. ${item.title} (${item.source})`
  ).join('\n');
}
