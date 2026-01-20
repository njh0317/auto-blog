'use client';

import { FearGreedHistoryItem } from '@/lib/types';

interface FearGreedGaugeProps {
  score: number;
  rating?: string;
  history?: FearGreedHistoryItem[];
}

export default function FearGreedGauge({ score, rating, history = [] }: FearGreedGaugeProps) {
  // 점수에 따른 색상
  const getColor = (value: number): string => {
    if (value <= 25) return '#dc2626'; // Extreme Fear - red
    if (value <= 45) return '#f97316'; // Fear - orange
    if (value <= 55) return '#eab308'; // Neutral - yellow
    if (value <= 75) return '#84cc16'; // Greed - lime
    return '#22c55e'; // Extreme Greed - green
  };

  // 점수에 따른 라벨
  const getLabel = (value: number): string => {
    if (value <= 25) return 'Extreme Fear';
    if (value <= 45) return 'Fear';
    if (value <= 55) return 'Neutral';
    if (value <= 75) return 'Greed';
    return 'Extreme Greed';
  };

  const currentColor = getColor(score);
  const currentLabel = rating || getLabel(score);
  
  // 게이지 각도 계산 (0-100 -> -90 ~ 90도)
  const angle = (score / 100) * 180 - 90;

  // 히스토리 차트 관련
  const hasHistory = history.length > 0;
  const chartHeight = 80;
  const chartWidth = 280;
  
  // 히스토리 데이터로 SVG path 생성
  const getHistoryPath = () => {
    if (!hasHistory) return '';
    
    const minY = 0;
    const maxY = 100;
    const padding = 10;
    const effectiveWidth = chartWidth - padding * 2;
    const effectiveHeight = chartHeight - padding * 2;
    
    const points = history.map((item, i) => {
      const x = padding + (i / (history.length - 1)) * effectiveWidth;
      const y = padding + effectiveHeight - ((item.y - minY) / (maxY - minY)) * effectiveHeight;
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  };

  // 히스토리 영역 path (그라데이션용)
  const getHistoryAreaPath = () => {
    if (!hasHistory) return '';
    
    const minY = 0;
    const maxY = 100;
    const padding = 10;
    const effectiveWidth = chartWidth - padding * 2;
    const effectiveHeight = chartHeight - padding * 2;
    
    const points = history.map((item, i) => {
      const x = padding + (i / (history.length - 1)) * effectiveWidth;
      const y = padding + effectiveHeight - ((item.y - minY) / (maxY - minY)) * effectiveHeight;
      return `${x},${y}`;
    });
    
    const firstX = padding;
    const lastX = padding + effectiveWidth;
    const bottomY = padding + effectiveHeight;
    
    return `M ${firstX},${bottomY} L ${points.join(' L ')} L ${lastX},${bottomY} Z`;
  };

  return (
    <div className="bg-white border rounded-lg p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-semibold mb-4 text-gray-900">😱 공포탐욕지수 (Fear & Greed Index)</h3>
      
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* 게이지 */}
        <div className="relative w-48 h-28">
          <svg viewBox="0 0 200 110" className="w-full h-full">
            {/* 배경 아크 - 그라데이션 */}
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#dc2626" />
                <stop offset="25%" stopColor="#f97316" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="75%" stopColor="#84cc16" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
            </defs>
            
            {/* 배경 아크 */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="url(#gaugeGradient)"
              strokeWidth="16"
              strokeLinecap="round"
            />
            
            {/* 눈금 표시 */}
            {[0, 25, 50, 75, 100].map((tick) => {
              const tickAngle = (tick / 100) * 180 - 90;
              const rad = (tickAngle * Math.PI) / 180;
              const x1 = 100 + 70 * Math.cos(rad);
              const y1 = 100 + 70 * Math.sin(rad);
              const x2 = 100 + 60 * Math.cos(rad);
              const y2 = 100 + 60 * Math.sin(rad);
              return (
                <line
                  key={tick}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#9ca3af"
                  strokeWidth="2"
                />
              );
            })}
            
            {/* 바늘 */}
            <g transform={`rotate(${angle}, 100, 100)`}>
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="35"
                stroke="#1f2937"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="100" cy="100" r="8" fill="#1f2937" />
            </g>
          </svg>
          
          {/* 점수 표시 */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-center">
            <div className="text-2xl sm:text-3xl font-bold" style={{ color: currentColor }}>
              {score}
            </div>
            <div className="text-xs sm:text-sm font-medium" style={{ color: currentColor }}>
              {currentLabel}
            </div>
          </div>
        </div>
        
        {/* 히스토리 차트 */}
        {hasHistory && (
          <div className="flex-1 w-full md:w-auto">
            <div className="text-xs text-gray-500 mb-1">최근 30일 추이</div>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-20">
              <defs>
                <linearGradient id="historyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={currentColor} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={currentColor} stopOpacity="0.05" />
                </linearGradient>
              </defs>
              
              {/* 기준선 */}
              {[25, 50, 75].map((line) => {
                const y = 10 + 60 - (line / 100) * 60;
                return (
                  <line
                    key={line}
                    x1="10"
                    y1={y}
                    x2={chartWidth - 10}
                    y2={y}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                  />
                );
              })}
              
              {/* 영역 */}
              <path
                d={getHistoryAreaPath()}
                fill="url(#historyGradient)"
              />
              
              {/* 라인 */}
              <path
                d={getHistoryPath()}
                fill="none"
                stroke={currentColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* 현재 점 */}
              {history.length > 0 && (
                <circle
                  cx={chartWidth - 10}
                  cy={10 + 60 - (history[history.length - 1].y / 100) * 60}
                  r="4"
                  fill={currentColor}
                />
              )}
            </svg>
            
            {/* 범례 */}
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>30일 전</span>
              <span>오늘</span>
            </div>
          </div>
        )}
      </div>
      
      {/* 설명 */}
      <div className="mt-4 grid grid-cols-5 gap-1 text-[10px] sm:text-xs text-center">
        <div className="bg-red-100 text-red-700 py-1 rounded">극단적 공포<br/>0-25</div>
        <div className="bg-orange-100 text-orange-700 py-1 rounded">공포<br/>26-45</div>
        <div className="bg-yellow-100 text-yellow-700 py-1 rounded">중립<br/>46-55</div>
        <div className="bg-lime-100 text-lime-700 py-1 rounded">탐욕<br/>56-75</div>
        <div className="bg-green-100 text-green-700 py-1 rounded">극단적 탐욕<br/>76-100</div>
      </div>
    </div>
  );
}
