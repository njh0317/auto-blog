// 확장된 시장 데이터 수집 모듈
// Yahoo Finance API를 활용한 시장 데이터 수집

export interface IndexData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface StockData {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface ForexData {
  pair: string;
  name: string;
  rate: number;
  change: number;
  changePercent: number;
}

export interface CommodityData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  unit: string;
}

export interface BondData {
  name: string;
  yield: number;
  change: number;
}

export interface DetailedMarketData {
  indices: {
    dow: IndexData;
    nasdaq: IndexData;
    sp500: IndexData;
  };
  europe: {
    stoxx600: IndexData;
  };
  topCompanies: StockData[];
  sectorStocks: Record<string, StockData[]>;
  gainers: StockData[];
  losers: StockData[];
  forex: {
    usdKrw: ForexData;
    dollarIndex: ForexData;
    usdCny: ForexData;
  };
  commodities: {
    gold: CommodityData;
    copper: CommodityData;
    wti: CommodityData;
  };
  bonds: {
    us10y: BondData;
  };
  fearGreedIndex: number;
  fetchedAt: string;
}

// Yahoo Finance에서 시세 조회
async function fetchYahooQuote(symbol: string): Promise<{
  price: number;
  change: number;
  changePercent: number;
  name?: string;
} | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 300 }
    });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const price = meta.regularMarketPrice || 0;
    const prevClose = meta.chartPreviousClose || meta.previousClose || price;
    const change = price - prevClose;
    const changePercent = prevClose ? (change / prevClose) * 100 : 0;

    return {
      price: Math.round(price * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      name: meta.shortName || meta.symbol,
    };
  } catch {
    return null;
  }
}

// Yahoo Finance Screener API로 상승/하락 종목 조회
async function fetchMarketMovers(type: 'gainers' | 'losers'): Promise<StockData[]> {
  try {
    const screenerType = type === 'gainers' ? 'day_gainers' : 'day_losers';
    const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=${screenerType}&count=10`;
    
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 300 }
    });
    
    if (!res.ok) return [];
    
    const data = await res.json();
    const quotes = data?.finance?.result?.[0]?.quotes || [];
    
    return quotes.slice(0, 10).map((q: {
      symbol: string;
      shortName?: string;
      longName?: string;
      regularMarketPrice?: number;
      regularMarketChange?: number;
      regularMarketChangePercent?: number;
    }) => ({
      symbol: q.symbol,
      name: q.shortName || q.longName || q.symbol,
      sector: type === 'gainers' ? '상승' : '하락',
      price: q.regularMarketPrice || 0,
      change: q.regularMarketChange || 0,
      changePercent: q.regularMarketChangePercent || 0,
    }));
  } catch {
    return [];
  }
}

// 심볼 매핑
const SYMBOLS = {
  indices: {
    dow: '^DJI',
    nasdaq: '^IXIC',
    sp500: '^GSPC',
  },
  europe: {
    stoxx600: '^STOXX',
  },
  forex: {
    usdKrw: 'USDKRW=X',
    dollarIndex: 'DX-Y.NYB',
    usdCny: 'USDCNY=X',
  },
  commodities: {
    gold: 'GC=F',
    copper: 'HG=F',
    wti: 'CL=F',
  },
  bonds: {
    us10y: '^TNX',
  },
  // 빅테크 7 (Magnificent 7)
  mag7: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA'],
};


// 3대 지수 데이터 조회
async function fetchIndices(): Promise<DetailedMarketData['indices']> {
  const [dow, nasdaq, sp500] = await Promise.all([
    fetchYahooQuote(SYMBOLS.indices.dow),
    fetchYahooQuote(SYMBOLS.indices.nasdaq),
    fetchYahooQuote(SYMBOLS.indices.sp500),
  ]);

  return {
    dow: {
      symbol: 'DJI',
      name: 'Dow Jones',
      price: dow?.price || 0,
      change: dow?.change || 0,
      changePercent: dow?.changePercent || 0,
    },
    nasdaq: {
      symbol: 'IXIC',
      name: 'Nasdaq',
      price: nasdaq?.price || 0,
      change: nasdaq?.change || 0,
      changePercent: nasdaq?.changePercent || 0,
    },
    sp500: {
      symbol: 'GSPC',
      name: 'S&P 500',
      price: sp500?.price || 0,
      change: sp500?.change || 0,
      changePercent: sp500?.changePercent || 0,
    },
  };
}

// 유럽증시 데이터 조회
async function fetchEurope(): Promise<DetailedMarketData['europe']> {
  const stoxx = await fetchYahooQuote(SYMBOLS.europe.stoxx600);
  
  return {
    stoxx600: {
      symbol: 'STOXX600',
      name: 'STOXX 600',
      price: stoxx?.price || 0,
      change: stoxx?.change || 0,
      changePercent: stoxx?.changePercent || 0,
    },
  };
}

// 환율 데이터 조회
async function fetchForex(): Promise<DetailedMarketData['forex']> {
  const [usdKrw, dollarIndex, usdCny] = await Promise.all([
    fetchYahooQuote(SYMBOLS.forex.usdKrw),
    fetchYahooQuote(SYMBOLS.forex.dollarIndex),
    fetchYahooQuote(SYMBOLS.forex.usdCny),
  ]);

  return {
    usdKrw: {
      pair: 'USD/KRW',
      name: '달러/원',
      rate: usdKrw?.price || 0,
      change: usdKrw?.change || 0,
      changePercent: usdKrw?.changePercent || 0,
    },
    dollarIndex: {
      pair: 'DXY',
      name: '달러지수',
      rate: dollarIndex?.price || 0,
      change: dollarIndex?.change || 0,
      changePercent: dollarIndex?.changePercent || 0,
    },
    usdCny: {
      pair: 'USD/CNY',
      name: '달러/위안',
      rate: usdCny?.price || 0,
      change: usdCny?.change || 0,
      changePercent: usdCny?.changePercent || 0,
    },
  };
}

// 원자재 데이터 조회
async function fetchCommodities(): Promise<DetailedMarketData['commodities']> {
  const [gold, copper, wti] = await Promise.all([
    fetchYahooQuote(SYMBOLS.commodities.gold),
    fetchYahooQuote(SYMBOLS.commodities.copper),
    fetchYahooQuote(SYMBOLS.commodities.wti),
  ]);

  return {
    gold: {
      symbol: 'GC',
      name: '금',
      price: gold?.price || 0,
      change: gold?.change || 0,
      changePercent: gold?.changePercent || 0,
      unit: '달러/온스',
    },
    copper: {
      symbol: 'HG',
      name: '구리',
      price: copper?.price || 0,
      change: copper?.change || 0,
      changePercent: copper?.changePercent || 0,
      unit: '달러/파운드',
    },
    wti: {
      symbol: 'CL',
      name: 'WTI',
      price: wti?.price || 0,
      change: wti?.change || 0,
      changePercent: wti?.changePercent || 0,
      unit: '달러/배럴',
    },
  };
}

// 채권 데이터 조회
async function fetchBonds(): Promise<DetailedMarketData['bonds']> {
  const us10y = await fetchYahooQuote(SYMBOLS.bonds.us10y);
  
  return {
    us10y: {
      name: '미국채 10년물',
      yield: us10y?.price || 0,
      change: us10y?.change || 0,
    },
  };
}

// Magnificent 7 종목 데이터 조회
async function fetchMag7Stocks(): Promise<StockData[]> {
  const mag7Info: Record<string, string> = {
    'AAPL': 'Apple',
    'MSFT': 'Microsoft',
    'GOOGL': 'Google',
    'AMZN': 'Amazon',
    'NVDA': 'Nvidia',
    'META': 'Meta',
    'TSLA': 'Tesla',
  };

  const results: StockData[] = [];
  
  for (const symbol of SYMBOLS.mag7) {
    const quote = await fetchYahooQuote(symbol);
    if (quote) {
      results.push({
        symbol,
        name: mag7Info[symbol] || symbol,
        sector: 'Magnificent 7',
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
      });
    }
  }

  return results;
}

// CNN Fear & Greed Index 조회
async function fetchFearGreedIndex(): Promise<number> {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
  ];
  const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
  
  try {
    // CNN Fear & Greed API
    const res = await fetch('https://production.dataviz.cnn.io/index/fearandgreed/graphdata', {
      headers: { 
        'User-Agent': randomUA,
        'Accept': 'application/json',
        'Referer': 'https://edition.cnn.com/',
      },
      next: { revalidate: 3600 }
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data?.fear_and_greed?.score) {
        return Math.round(data.fear_and_greed.score);
      }
    }
  } catch {
    // API 실패 시 VIX 기반 추정
  }
  
  // 폴백: VIX 기반 추정
  try {
    const vix = await fetchYahooQuote('^VIX');
    if (vix) {
      // VIX가 낮으면 Greed, 높으면 Fear
      // VIX 12-15: Extreme Greed (80-100)
      // VIX 15-20: Greed (60-80)
      // VIX 20-25: Neutral (40-60)
      // VIX 25-30: Fear (20-40)
      // VIX 30+: Extreme Fear (0-20)
      if (vix.price <= 15) return 85;
      if (vix.price <= 20) return 65;
      if (vix.price <= 25) return 50;
      if (vix.price <= 30) return 35;
      return 15;
    }
  } catch {
    // 무시
  }
  
  return 50; // 기본값: Neutral
}

// 전체 시장 데이터 조회
export async function getDetailedMarketData(): Promise<DetailedMarketData> {
  const [indices, europe, forex, commodities, bonds, mag7, gainers, losers, fearGreed] = await Promise.all([
    fetchIndices(),
    fetchEurope(),
    fetchForex(),
    fetchCommodities(),
    fetchBonds(),
    fetchMag7Stocks(),
    fetchMarketMovers('gainers'),
    fetchMarketMovers('losers'),
    fetchFearGreedIndex(),
  ]);

  return {
    indices,
    europe,
    topCompanies: mag7.slice(0, 5), // 상위 5개 (시총 기준)
    sectorStocks: { 'Magnificent 7': mag7 },
    gainers,
    losers,
    forex,
    commodities,
    bonds,
    fearGreedIndex: fearGreed,
    fetchedAt: new Date().toISOString(),
  };
}

// 포맷팅 유틸리티
export const formatUtils = {
  formatChange: (percent: number): string => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  },
  
  formatPrice: (price: number, decimals = 2): string => {
    return price.toLocaleString('ko-KR', { 
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals 
    });
  },
  
  getChangeEmoji: (percent: number): string => {
    if (percent > 0) return '📈';
    if (percent < 0) return '📉';
    return '➡️';
  },
  
  getToday: (): string => {
    return new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  },
  
  getFearGreedLabel: (index: number): string => {
    if (index <= 25) return 'Extreme Fear';
    if (index <= 45) return 'Fear';
    if (index <= 55) return 'Neutral';
    if (index <= 75) return 'Greed';
    return 'Extreme Greed';
  },
};
