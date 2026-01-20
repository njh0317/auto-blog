'use client';

import { useEffect, useRef } from 'react';

interface TradingViewWidgetProps {
  type: 'heatmap' | 'ticker' | 'chart';
  symbol?: string;
  height?: number;
}

export default function TradingViewWidget({ type, symbol = 'SPY', height = 400 }: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 기존 스크립트 제거
    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;

    if (type === 'heatmap') {
      // S&P 500 히트맵
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js';
      script.innerHTML = JSON.stringify({
        exchanges: [],
        dataSource: 'SPX500',
        grouping: 'sector',
        blockSize: 'market_cap_basic',
        blockColor: 'change',
        locale: 'kr',
        symbolUrl: '',
        colorTheme: 'light',
        hasTopBar: false,
        isDataSet498Enabled: false,
        isZoomEnabled: true,
        hasSymbolTooltip: true,
        width: '100%',
        height: height,
      });
    } else if (type === 'ticker') {
      // 티커 테이프
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
      script.innerHTML = JSON.stringify({
        symbols: [
          { proName: 'FOREXCOM:SPXUSD', title: 'S&P 500' },
          { proName: 'FOREXCOM:NSXUSD', title: 'Nasdaq 100' },
          { proName: 'FOREXCOM:DJI', title: 'Dow 30' },
          { proName: 'BITSTAMP:BTCUSD', title: 'Bitcoin' },
          { proName: 'FX:USDKRW', title: 'USD/KRW' },
        ],
        showSymbolLogo: true,
        colorTheme: 'light',
        isTransparent: false,
        displayMode: 'adaptive',
        locale: 'kr',
      });
    } else if (type === 'chart') {
      // 미니 차트
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
      script.innerHTML = JSON.stringify({
        symbol: symbol,
        width: '100%',
        height: height,
        locale: 'kr',
        dateRange: '1D',
        colorTheme: 'light',
        isTransparent: false,
        autosize: false,
        largeChartUrl: '',
      });
    }

    containerRef.current.appendChild(script);
  }, [type, symbol, height]);

  return (
    <div className="tradingview-widget-container my-4">
      <div ref={containerRef} />
      <div className="text-xs text-gray-400 mt-1">
        차트 제공: TradingView
      </div>
    </div>
  );
}
