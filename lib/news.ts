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

// 미국 증시 뉴스
export async function getUSMarketNews(): Promise<NewsItem[]> {
  return fetchGoogleNews('나스닥 S&P500 미국증시');
}

// 뉴스 요약 텍스트 생성
export function formatNewsForAI(news: NewsItem[]): string {
  if (news.length === 0) return '최신 뉴스를 찾을 수 없습니다.';
  
  return news.map((item, i) => 
    `${i + 1}. ${item.title} (${item.source})`
  ).join('\n');
}
