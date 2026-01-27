'use client';

import { useState, useEffect } from 'react';
import FearGreedGauge from './FearGreedGauge';

export default function LiveFearGreedGauge() {
  const [data, setData] = useState<{ score: number; rating: string; history?: Array<{ x: number; y: number; rating: string }> } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 서버 API를 통해 공포탐욕지수 가져오기
    fetch('/api/fear-greed')
      .then(res => res.json())
      .then(data => {
        if (data.score !== undefined) {
          setData({
            score: data.score,
            rating: data.rating,
            history: data.history,
          });
        } else {
          // 기본값
          setData({ score: 50, rating: 'Neutral' });
        }
      })
      .catch(() => {
        // API 실패 시 기본값
        setData({ score: 50, rating: 'Neutral' });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white border rounded-lg p-6 flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          <span>로딩 중...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white border rounded-lg p-6">
        <FearGreedGauge score={50} rating="Neutral" />
        <p className="text-center text-sm text-gray-500 mt-4">
          * 실시간 데이터를 불러올 수 없어 기본값을 표시합니다.
        </p>
      </div>
    );
  }

  return <FearGreedGauge score={data.score} rating={data.rating} history={data.history} />;
}
