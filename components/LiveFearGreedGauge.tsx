'use client';

import { useState, useEffect } from 'react';
import FearGreedGauge from './FearGreedGauge';

export default function LiveFearGreedGauge() {
  const [data, setData] = useState<{ score: number; rating: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // CNN Fear & Greed Index API (무료)
    fetch('https://fear-and-greed-index.p.rapidapi.com/v1/fgi', {
      headers: {
        'X-RapidAPI-Key': process.env.NEXT_PUBLIC_RAPIDAPI_KEY || '',
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.fgi) {
          setData({
            score: data.fgi.now.value,
            rating: data.fgi.now.valueText,
          });
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
      <div className="bg-white border rounded-lg p-6 text-center text-gray-500">
        데이터를 불러올 수 없습니다.
      </div>
    );
  }

  return <FearGreedGauge score={data.score} rating={data.rating} />;
}
