import TradingViewWidget from '@/components/TradingViewWidget';
import LiveFearGreedGauge from '@/components/LiveFearGreedGauge';

export const metadata = {
  title: '실시간 시장 현황 | Wisdom\'s Lab',
  description: '미국 증시 실시간 히트맵, 주요 지수, 공포탐욕지수를 한눈에 확인하세요.',
};

export default function MarketLivePage() {
  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">📊 실시간 시장 현황</h1>
      <p className="text-gray-600 mb-8">미국 증시의 실시간 데이터를 확인하세요.</p>

      {/* 주요 지수 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">주요 지수</h2>
        <TradingViewWidget type="ticker" />
      </section>

      {/* Stock Heatmap */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">S&P 500 히트맵</h2>
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden" style={{ height: '600px' }}>
          <iframe
            src="https://www.tradingview-widget.com/embed-widget/stock-heatmap/?locale=kr#%7B%22exchanges%22%3A%5B%22US%22%5D%2C%22dataSource%22%3A%22SPX500%22%2C%22grouping%22%3A%22sector%22%2C%22blockSize%22%3A%22market_cap_basic%22%2C%22blockColor%22%3A%22change%22%2C%22hasTopBar%22%3Atrue%2C%22isDataSetEnabled%22%3Atrue%2C%22isZoomEnabled%22%3Atrue%2C%22hasSymbolTooltip%22%3Atrue%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22colorTheme%22%3A%22light%22%7D"
            title="Stock Heatmap"
            className="w-full h-full"
            frameBorder="0"
            allowTransparency={true}
            scrolling="no"
          />
        </div>
      </section>

      {/* 공포탐욕지수 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">공포탐욕지수</h2>
        <LiveFearGreedGauge />
      </section>

      {/* 안내 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">💡 이 페이지는 실시간으로 업데이트됩니다</p>
        <p>TradingView의 무료 위젯을 사용하여 실시간 시장 데이터를 제공합니다.</p>
      </div>
    </div>
  );
}
