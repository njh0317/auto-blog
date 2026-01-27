// 공포탐욕지수 히스토리 아이템
export interface FearGreedHistoryItem {
  x: number; // timestamp
  y: number; // score
  rating: string;
}

// 공포탐욕지수 데이터
export interface FearGreedSnapshot {
  score: number;
  rating: string;
  history?: FearGreedHistoryItem[];
}

// 시장 데이터 스냅샷 (글 작성 시점)
export interface MarketSnapshot {
  indices: {
    dow: { name: string; price: number; changePercent: number };
    nasdaq: { name: string; price: number; changePercent: number };
    sp500: { name: string; price: number; changePercent: number };
  };
  stocks: Array<{
    name: string;
    sector: string;
    changePercent: number;
  }>;
  gainers?: Array<{
    symbol: string;
    name: string;
    changePercent: number;
  }>;
  losers?: Array<{
    symbol: string;
    name: string;
    changePercent: number;
  }>;
  fearGreed?: FearGreedSnapshot;
  fetchedAt: string;
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  seoTitle?: string; // SEO용 제목 (meta title, og:title, RSS용)
  content: string;
  excerpt: string;
  keywords: string[];
  createdAt: string;
  updatedAt: string;
  viewCount?: number; // 조회수
  pinned?: boolean; // 고정 글 여부
  marketData?: MarketSnapshot; // 미국 시황 글일 경우 데이터 포함
  koreanMarketData?: KoreanMarketSnapshot; // 한국 시황 글일 경우 데이터 포함
}

// 한국 시장 데이터 스냅샷
export interface KoreanMarketSnapshot {
  indices: {
    kospi: { name: string; price: number; changePercent: number };
    kosdaq: { name: string; price: number; changePercent: number };
  };
  topStocks: Array<{
    name: string;
    sector: string;
    changePercent: number;
  }>;
  usdKrw: {
    rate: number;
    changePercent: number;
  };
  fetchedAt: string;
}

export interface GenerateRequest {
  topic: string;
  keywords?: string[];
}

export interface GenerateResponse {
  title: string;
  seoTitle?: string; // SEO용 제목
  content: string;
  excerpt: string;
  keywords: string[];
  marketData?: MarketSnapshot;
}

export interface PostsData {
  posts: Post[];
}
