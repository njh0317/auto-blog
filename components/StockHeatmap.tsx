'use client';

interface StockData {
  name: string;
  changePercent: number;
  sector?: string;
}

interface StockHeatmapProps {
  stocks: StockData[];
  title?: string;
}

export default function StockHeatmap({ stocks, title = '주요 종목 등락률' }: StockHeatmapProps) {
  const getColor = (change: number): string => {
    if (change >= 3) return 'bg-green-600';
    if (change >= 2) return 'bg-green-500';
    if (change >= 1) return 'bg-green-400';
    if (change >= 0.5) return 'bg-green-300';
    if (change > 0) return 'bg-green-200';
    if (change === 0) return 'bg-gray-200';
    if (change > -0.5) return 'bg-red-200';
    if (change > -1) return 'bg-red-300';
    if (change > -2) return 'bg-red-400';
    if (change > -3) return 'bg-red-500';
    return 'bg-red-600';
  };

  const getTextColor = (change: number): string => {
    if (Math.abs(change) >= 1) return 'text-white';
    return 'text-gray-800';
  };

  return (
    <div className="my-4">
      {title && <h3 className="text-base sm:text-lg font-semibold mb-3 text-gray-900">{title}</h3>}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 sm:gap-2">
        {stocks.map((stock, index) => (
          <div
            key={index}
            className={`${getColor(stock.changePercent)} ${getTextColor(stock.changePercent)} 
              p-2 sm:p-3 rounded-lg text-center transition-transform hover:scale-105`}
          >
            <div className="font-medium text-xs sm:text-sm truncate">{stock.name}</div>
            <div className="text-sm sm:text-lg font-bold">
              {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
            </div>
            {stock.sector && (
              <div className="text-[10px] sm:text-xs opacity-75 truncate">{stock.sector}</div>
            )}
          </div>
        ))}
      </div>
      
      {/* 범례 */}
      <div className="flex justify-center items-center gap-1 mt-4 text-[10px] sm:text-xs">
        <span className="text-gray-500">하락</span>
        <div className="flex gap-0.5">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-600 rounded" />
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-400 rounded" />
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-200 rounded" />
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-200 rounded" />
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-200 rounded" />
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-400 rounded" />
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-600 rounded" />
        </div>
        <span className="text-gray-500">상승</span>
      </div>
    </div>
  );
}
