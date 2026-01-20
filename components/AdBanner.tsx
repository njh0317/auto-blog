'use client';

import { useEffect } from 'react';

interface AdBannerProps {
  slot: string;
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export default function AdBanner({ slot, format = 'auto', className = '' }: AdBannerProps) {
  const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID;

  useEffect(() => {
    if (!adsenseId || adsenseId === 'your_adsense_id_here') return;
    
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      console.error('AdSense error');
    }
  }, [adsenseId]);

  // 애드센스 ID가 없으면 렌더링하지 않음
  if (!adsenseId || adsenseId === 'your_adsense_id_here') {
    return null;
  }

  return (
    <div className={`ad-container ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={adsenseId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
