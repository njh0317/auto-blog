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
  fetchedAt: string;
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  keywords: string[];
  createdAt: string;
  updatedAt: string;
  marketData?: MarketSnapshot; // 시황 글일 경우 데이터 포함
}

export interface GenerateRequest {
  topic: string;
  keywords?: string[];
}

export interface GenerateResponse {
  title: string;
  content: string;
  excerpt: string;
  keywords: string[];
  marketData?: MarketSnapshot;
}

export interface PostsData {
  posts: Post[];
}
