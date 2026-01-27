'use client';

import { useEffect } from 'react';

export default function ProfileSidebar() {
  return (
    <aside className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
      {/* 프로필 이미지 */}
      <div className="flex justify-center mb-4">
        <img 
          src="/icon.png" 
          alt="프로필" 
          className="w-24 h-24 rounded-full border-2 border-gray-200"
        />
      </div>
      
      {/* 닉네임 */}
      <h2 className="text-lg font-bold text-center text-gray-900 mb-2">
        코딩하다 주식하는 사람
      </h2>
      
      {/* 한 줄 소개 */}
      <p className="text-sm text-gray-600 text-center mb-4">
        개발자 출신 개인 투자자
      </p>
      
      {/* 구분선 */}
      <hr className="my-4" />
      
      {/* 소개글 */}
      <div className="text-sm text-gray-700 space-y-3">
        <p>
          안녕하세요. 10년차 개발자이자 주식 투자자입니다.
        </p>
        <p>
          바쁜 직장인들을 위해 매일 아침/저녁 증시 시황을 정리해서 올리고 있어요.
        </p>
        <p>
          출퇴근길 5분이면 시장 흐름 파악 끝!
        </p>
      </div>
      
      {/* 구분선 */}
      <hr className="my-4" />
      
      {/* 방문자 수 */}
      <VisitorCounter />
      
      {/* 구분선 */}
      <hr className="my-4" />
      
      {/* 인기글 */}
      <PopularPosts />
      
      {/* 구분선 */}
      <hr className="my-4" />
      
      {/* 실시간 시장 현황 버튼 */}
      <a 
        href="/market-live"
        className="block w-full bg-gradient-to-r from-gray-100 to-gray-50 hover:from-gray-200 hover:to-gray-100 border border-gray-200 text-gray-800 font-medium py-3 px-4 rounded-lg transition-all duration-300 text-center mb-4 relative overflow-hidden shadow-sm"
      >
        {/* 반짝임 효과 */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent animate-shimmer w-1/3"></div>
        
        <div className="relative flex items-center justify-center gap-2">
          <span className="text-lg">📊</span>
          <span>실시간 시장 현황</span>
        </div>
        <div className="relative text-xs text-gray-600 mt-1">
          S&P 500 히트맵 · 공포탐욕지수
        </div>
      </a>
      
      {/* 블로그 정보 */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>매일 업데이트</p>
        <p>한국증시 / 미국증시 / 모닝브리핑</p>
      </div>
    </aside>
  );
}

// 방문자 카운터 클라이언트 컴포넌트
function VisitorCounter() {
  useEffect(() => {
    const visited = sessionStorage.getItem('visited');
    const method = visited ? 'GET' : 'POST';
    
    fetch('/api/visitor', { method })
      .then(r => r.json())
      .then(d => {
        const todayEl = document.getElementById('today-visitors');
        const totalEl = document.getElementById('total-visitors');
        if (todayEl) todayEl.textContent = d.today.toLocaleString();
        if (totalEl) totalEl.textContent = d.total.toLocaleString();
        if (!visited) sessionStorage.setItem('visited', '1');
      })
      .catch(() => {});
  }, []);

  return (
    <div className="text-center">
      <p className="text-xs text-gray-500 mb-2">방문자</p>
      <div className="flex justify-center gap-4 text-sm">
        <div>
          <span className="text-gray-500">오늘</span>
          <span className="ml-1 font-semibold text-blue-600" id="today-visitors" suppressHydrationWarning>-</span>
        </div>
        <div>
          <span className="text-gray-500">전체</span>
          <span className="ml-1 font-semibold text-gray-900" id="total-visitors" suppressHydrationWarning>-</span>
        </div>
      </div>
    </div>
  );
}

// 인기글 컴포넌트
function PopularPosts() {
  useEffect(() => {
    fetch('/api/posts/popular')
      .then(r => r.json())
      .then(posts => {
        const container = document.getElementById('popular-posts');
        if (!container) return;
        
        if (posts.length === 0) {
          container.innerHTML = '<p class="text-gray-400 text-xs">아직 데이터가 없습니다</p>';
          return;
        }
        
        container.innerHTML = posts.map((p: { slug: string; title: string }, i: number) => 
          `<a href="/posts/${p.slug}" class="block hover:text-blue-600 truncate">` +
          `<span class="text-gray-400 mr-1">${i + 1}.</span>` +
          `<span class="text-gray-700">${p.title}</span>` +
          `</a>`
        ).join('');
      })
      .catch(() => {
        const container = document.getElementById('popular-posts');
        if (container) container.innerHTML = '<p class="text-gray-400 text-xs">로드 실패</p>';
      });
  }, []);

  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">인기글</p>
      <div id="popular-posts" className="space-y-2 text-sm">
        <p className="text-gray-400 text-xs">로딩중...</p>
      </div>
    </div>
  );
}
