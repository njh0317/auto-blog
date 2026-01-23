'use client';

import { useState, useEffect } from 'react';

export default function MobileProfileSlide() {
  const [isOpen, setIsOpen] = useState(false);

  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* 프로필 아이콘 버튼 - 모바일에서만 표시 */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden p-2 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="프로필 보기"
      >
        <svg className="w-7 h-7 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      </button>

      {/* 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 슬라이드 패널 */}
      <div
        className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* 닫기 버튼 */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700"
          aria-label="닫기"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 프로필 내용 */}
        <div className="p-6 pt-14 h-full overflow-y-auto">
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
          
          <hr className="my-4" />
          
          {/* 소개글 */}
          <div className="text-sm text-gray-700 space-y-3">
            <p>안녕하세요. 10년차 개발자이자 주식 투자자입니다.</p>
            <p>바쁜 직장인들을 위해 매일 아침/저녁 증시 시황을 정리해서 올리고 있어요.</p>
            <p>출퇴근길 5분이면 시장 흐름 파악 끝!</p>
          </div>
          
          <hr className="my-4" />
          
          {/* 방문자 수 */}
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-2">방문자</p>
            <div className="flex justify-center gap-4 text-sm">
              <div>
                <span className="text-gray-500">오늘</span>
                <span className="ml-1 font-semibold text-blue-600" id="slide-today">-</span>
              </div>
              <div>
                <span className="text-gray-500">전체</span>
                <span className="ml-1 font-semibold text-gray-900" id="slide-total">-</span>
              </div>
            </div>
          </div>
          
          <hr className="my-4" />
          
          {/* 인기글 */}
          <div>
            <p className="text-xs text-gray-500 mb-2">인기글</p>
            <div id="slide-popular" className="space-y-2 text-sm">
              <p className="text-gray-400 text-xs">로딩중...</p>
            </div>
          </div>
          
          <hr className="my-4" />
          
          {/* 블로그 정보 */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>매일 업데이트</p>
            <p>한국증시 / 미국증시 / 모닝브리핑</p>
          </div>
        </div>
      </div>

      {/* 데이터 로드 스크립트 */}
      {isOpen && (
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              // 방문자 수
              fetch('/api/visitor')
                .then(function(r) { return r.json(); })
                .then(function(d) {
                  var today = document.getElementById('slide-today');
                  var total = document.getElementById('slide-total');
                  if (today) today.textContent = d.today.toLocaleString();
                  if (total) total.textContent = d.total.toLocaleString();
                })
                .catch(function() {});
              
              // 인기글
              fetch('/api/posts/popular')
                .then(function(r) { return r.json(); })
                .then(function(posts) {
                  var container = document.getElementById('slide-popular');
                  if (!container) return;
                  if (posts.length === 0) {
                    container.innerHTML = '<p class="text-gray-400 text-xs">아직 데이터가 없습니다</p>';
                    return;
                  }
                  container.innerHTML = posts.map(function(p, i) {
                    return '<a href="/posts/' + p.slug + '" class="block hover:text-blue-600 truncate">' +
                      '<span class="text-gray-400 mr-1">' + (i + 1) + '.</span>' +
                      '<span class="text-gray-700">' + p.title + '</span>' +
                    '</a>';
                  }).join('');
                })
                .catch(function() {});
            })();
          `
        }} />
      )}
    </>
  );
}
