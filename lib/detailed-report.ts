// 상세 시황 블로그 글 생성 모듈
import { DetailedMarketData, formatUtils } from './market-data';
import { getBranding, applyBranding } from './branding';
import { GenerateResponse, MarketSnapshot } from './types';

const { formatChange, formatPrice, getToday, getFearGreedLabel } = formatUtils;

export function generateDetailedMarketReport(data: DetailedMarketData): GenerateResponse {
  const branding = getBranding();
  const today = getToday();
  
  // 시장 분위기 판단
  const sp500Change = data.indices.sp500.changePercent;
  const marketMood = sp500Change >= 1 ? '강세' : sp500Change <= -1 ? '약세' : '보합';
  
  const title = `[${today}] 미국증시 마감시황 - 3대지수 ${marketMood}`;
  
  let content = '';
  
  // 인사말
  content += applyBranding(branding.greeting, branding) + '\n\n';
  
  // 3대 지수
  content += `★ 3대지수\n`;
  content += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  content += `Dow ${formatChange(data.indices.dow.changePercent)}, `;
  content += `Nasdaq ${formatChange(data.indices.nasdaq.changePercent)}, `;
  content += `S&P500 ${formatChange(data.indices.sp500.changePercent)}\n\n`;
  
  // 지수 해설
  if (sp500Change >= 0) {
    content += `3대지수는 모두 상승 마감.\n`;
  } else {
    content += `3대지수는 모두 하락 마감.\n`;
  }
  content += `\n`;
  
  // 시총 5대장
  content += `★ Magnificent 7\n`;
  content += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  const gainersTop = data.topCompanies.filter(s => s.changePercent > 0).map(s => s.name);
  const losersTop = data.topCompanies.filter(s => s.changePercent < 0).map(s => s.name);
  if (gainersTop.length > 0 && losersTop.length > 0) {
    content += `Magnificent 7 중 ${gainersTop.join(', ')}만 상승\n\n`;
  } else if (gainersTop.length === data.topCompanies.length) {
    content += `Magnificent 7 모두 상승\n\n`;
  } else {
    content += `Magnificent 7 모두 하락\n\n`;
  }
  
  // 주요 종목
  content += `★ 주요 종목\n`;
  content += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Magnificent 7 상세
  data.topCompanies.forEach(stock => {
    content += `${stock.name} ${formatChange(stock.changePercent)}, `;
  });
  content = content.slice(0, -2) + '\n\n';
  
  // 오늘의 상승 종목
  if (data.gainers && data.gainers.length > 0) {
    content += `★ 오늘의 상승 종목 TOP 10\n`;
    content += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    data.gainers.slice(0, 10).forEach((stock, i) => {
      content += `${i + 1}. ${stock.name} (${stock.symbol}) ${formatChange(stock.changePercent)}\n`;
    });
    content += '\n';
  }
  
  // 오늘의 하락 종목
  if (data.losers && data.losers.length > 0) {
    content += `★ 오늘의 하락 종목 TOP 10\n`;
    content += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    data.losers.slice(0, 10).forEach((stock, i) => {
      content += `${i + 1}. ${stock.name} (${stock.symbol}) ${formatChange(stock.changePercent)}\n`;
    });
    content += '\n';
  }
  
  // 유럽증시
  content += `★ 유럽증시\n`;
  content += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  content += `유럽 STOXX 600은 ${formatChange(data.europe.stoxx600.changePercent)} `;
  content += data.europe.stoxx600.changePercent >= 0 ? '상승\n\n' : '하락\n\n';
  
  // 환율
  content += `★ 환율\n`;
  content += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  content += `오늘 달러/원 환율은 ${formatChange(data.forex.usdKrw.changePercent)} `;
  content += `${data.forex.usdKrw.changePercent >= 0 ? '상승' : '하락'}한 ${formatPrice(data.forex.usdKrw.rate)} 이고\n`;
  content += `미국 달러지수 ${formatChange(data.forex.dollarIndex.changePercent)} `;
  content += `${data.forex.dollarIndex.changePercent >= 0 ? '상승' : '하락'}한 ${formatPrice(data.forex.dollarIndex.rate)}\n`;
  content += `달러/위안화 환율은 ${formatPrice(data.forex.usdCny.rate, 4)}입니다.\n\n`;

  // 금, 구리, 유가
  content += `★ 금, 구리, 유가\n`;
  content += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  content += `금은 ${formatChange(data.commodities.gold.changePercent)} `;
  content += `${data.commodities.gold.changePercent >= 0 ? '상승' : '하락'}한 ${formatPrice(data.commodities.gold.price)}달러\n`;
  content += `Dr. Copper라 불리는 구리는 ${formatChange(data.commodities.copper.changePercent)} `;
  content += `${data.commodities.copper.changePercent >= 0 ? '상승' : '하락'}\n`;
  content += `WTI는 ${formatChange(data.commodities.wti.changePercent)} `;
  content += `${data.commodities.wti.changePercent >= 0 ? '상승' : '하락'}한 ${formatPrice(data.commodities.wti.price)}달러\n\n`;
  
  // 채권
  content += `★ 채권\n`;
  content += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  const bpChange = Math.round(data.bonds.us10y.change * 100);
  content += `미국채10년물 금리는 ${bpChange >= 0 ? '+' : ''}${bpChange}bp `;
  content += `${bpChange >= 0 ? '상승' : '하락'}한 ${data.bonds.us10y.yield.toFixed(3)}%\n\n`;
  
  // Fear & Greed Index
  content += `★ Fear & Greed Index\n`;
  content += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  content += `CNN Fear & Greed Index는 ${data.fearGreedIndex} ${getFearGreedLabel(data.fearGreedIndex)} 수준\n\n`;
  
  // 지수 마감가
  content += `★ 지수 마감가\n`;
  content += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  content += `S&P500는 ${formatPrice(data.indices.sp500.price)}p\n`;
  content += `Nasdaq은 ${formatPrice(data.indices.nasdaq.price)}p로 마감\n\n`;
  
  // 마무리
  content += applyBranding(branding.closing, branding);
  
  // 키워드 생성
  const keywords = [
    '미국증시',
    '나스닥',
    'S&P500',
    '다우존스',
    today.replace(/\s/g, ''),
    '증시마감',
    '시황',
  ];
  
  // 요약 생성
  const excerpt = `${today} 미국증시 마감시황 - S&P500 ${formatChange(data.indices.sp500.changePercent)}, 나스닥 ${formatChange(data.indices.nasdaq.changePercent)}, 다우 ${formatChange(data.indices.dow.changePercent)}`;
  
  // 시장 데이터 스냅샷 생성
  const allStocks = [
    ...data.topCompanies.map(s => ({ name: s.name, sector: 'Magnificent 7', changePercent: s.changePercent })),
  ];

  const marketData: MarketSnapshot = {
    indices: {
      dow: { name: 'Dow Jones', price: data.indices.dow.price, changePercent: data.indices.dow.changePercent },
      nasdaq: { name: 'Nasdaq', price: data.indices.nasdaq.price, changePercent: data.indices.nasdaq.changePercent },
      sp500: { name: 'S&P 500', price: data.indices.sp500.price, changePercent: data.indices.sp500.changePercent },
    },
    stocks: allStocks,
    gainers: data.gainers?.slice(0, 10).map(s => ({ symbol: s.symbol, name: s.name, changePercent: s.changePercent })),
    losers: data.losers?.slice(0, 10).map(s => ({ symbol: s.symbol, name: s.name, changePercent: s.changePercent })),
    fearGreed: {
      score: data.fearGreedIndex,
      rating: getFearGreedLabel(data.fearGreedIndex),
    },
    fetchedAt: data.fetchedAt,
  };

  return {
    title,
    content,
    excerpt,
    keywords,
    marketData,
  };
}

// AI를 활용한 뉴스 코멘트 생성 (OpenAI 연동)
export async function generateNewsCommentary(
  data: DetailedMarketData,
  generateContent: (topic: string, keywords?: string[]) => Promise<{ content: string }>
): Promise<string> {
  const topic = `오늘 미국 증시 주요 이슈 분석:
- S&P500: ${formatChange(data.indices.sp500.changePercent)}
- 나스닥: ${formatChange(data.indices.nasdaq.changePercent)}
- 다우: ${formatChange(data.indices.dow.changePercent)}

위 시장 상황을 바탕으로 2-3문장으로 간단한 시장 코멘트를 작성해주세요.`;

  try {
    const response = await generateContent(topic, ['시황분석', '투자']);
    return response.content;
  } catch {
    return '오늘 시장은 전반적으로 혼조세를 보였습니다.';
  }
}
