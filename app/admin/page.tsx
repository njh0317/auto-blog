'use client';

import { useState, useEffect } from 'react';
import { Post } from '@/lib/types';

interface Branding {
  nickname: string;
  greeting: string;
  closing: string;
  style: 'formal' | 'casual';
}

interface ErrorLog {
  id: string;
  timestamp: string;
  source: string;
  error: string;
  details?: string;
}

interface MarketPreview {
  indices: {
    dow: { changePercent: number };
    nasdaq: { changePercent: number };
    sp500: { changePercent: number };
  };
  fetchedAt: string;
}

interface Toast {
  id: number;
  type: 'success' | 'error' | 'loading';
  message: string;
}

// 토스트 컴포넌트
function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[280px] max-w-[400px] animate-slide-in ${
            toast.type === 'success' ? 'bg-green-500 text-white' :
            toast.type === 'error' ? 'bg-red-500 text-white' :
            'bg-gray-800 text-white'
          }`}
        >
          {toast.type === 'loading' && (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {toast.type === 'success' && <span>✓</span>}
          {toast.type === 'error' && <span>✕</span>}
          <span className="flex-1 text-sm">{toast.message}</span>
          {toast.type !== 'loading' && (
            <button onClick={() => onRemove(toast.id)} className="text-white/70 hover:text-white">
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingType, setGeneratingType] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'posts' | 'branding' | 'logs'>('posts');
  const [branding, setBranding] = useState<Branding>({
    nickname: '투자하는 개발자',
    greeting: '안녕하세요 {nickname}입니다.\n오늘 미국증시 마감시황 알려드리겠습니다.',
    closing: '감사합니다.',
    style: 'casual',
  });
  const [marketPreview, setMarketPreview] = useState<MarketPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // 토스트 추가
  const addToast = (type: Toast['type'], message: string): number => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    if (type !== 'loading') {
      setTimeout(() => removeToast(id), 5000);
    }
    return id;
  };

  // 토스트 제거
  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // 토스트 업데이트 (로딩 → 성공/실패)
  const updateToast = (id: number, type: Toast['type'], message: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, type, message } : t));
    if (type !== 'loading') {
      setTimeout(() => removeToast(id), 5000);
    }
  };

  const handleLogin = async () => {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setIsAuthenticated(true);
      localStorage.setItem('adminAuth', password);
      loadPosts();
    } else {
      setMessage('비밀번호가 틀렸습니다');
    }
  };

  const loadPosts = async () => {
    const res = await fetch('/api/posts');
    if (res.ok) {
      const data = await res.json();
      setPosts(data);
    }
  };

  const handleGenerate = async () => {
    if (!topic) {
      setMessage('주제를 입력해주세요');
      return;
    }
    
    setIsGenerating(true);
    setMessage('AI가 글을 생성 중입니다...');
    
    try {
      const keywordList = keywords.split(',').map(k => k.trim()).filter(Boolean);
      
      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, keywords: keywordList }),
      });
      
      if (!genRes.ok) throw new Error('생성 실패');
      const generated = await genRes.json();
      
      const saveRes = await fetch('/api/posts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('adminAuth') || '',
        },
        body: JSON.stringify(generated),
      });
      
      if (!saveRes.ok) throw new Error('저장 실패');
      
      setMessage('글이 생성되었습니다!');
      setTopic('');
      setKeywords('');
      loadPosts();
    } catch {
      setMessage('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    const res = await fetch(`/api/posts?id=${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': localStorage.getItem('adminAuth') || '' },
    });
    
    if (res.ok) {
      setMessage('삭제되었습니다');
      loadPosts();
    }
  };

  // 상세 시황 글 생성
  const handleDetailedReport = async () => {
    setIsGenerating(true);
    setMessage('상세 시황 데이터를 수집하고 글을 생성 중입니다...');
    
    try {
      const res = await fetch('/api/market-report', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminAuth') || ''}`,
        },
      });
      
      if (!res.ok) throw new Error('생성 실패');
      
      setMessage('상세 시황 글이 생성되었습니다!');
      loadPosts();
    } catch {
      setMessage('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 시장 데이터 미리보기
  const loadMarketPreview = async () => {
    setIsLoadingPreview(true);
    try {
      const res = await fetch(`/api/market-report?password=${localStorage.getItem('adminAuth') || ''}`);
      if (res.ok) {
        const data = await res.json();
        setMarketPreview(data.data);
      }
    } catch {
      console.error('미리보기 로드 실패');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // 브랜딩 저장
  const saveBranding = async () => {
    try {
      const res = await fetch('/api/branding', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('adminAuth') || '',
        },
        body: JSON.stringify(branding),
      });
      
      if (res.ok) {
        setMessage('브랜딩 설정이 저장되었습니다!');
      }
    } catch {
      setMessage('브랜딩 저장에 실패했습니다.');
    }
  };

  // 브랜딩 로드
  const loadBranding = async () => {
    try {
      const res = await fetch('/api/branding');
      if (res.ok) {
        const data = await res.json();
        setBranding(data);
      }
    } catch {
      console.error('브랜딩 로드 실패');
    }
  };

  // 에러 로그 로드
  const loadErrorLogs = async () => {
    try {
      const res = await fetch('/api/error-logs', {
        headers: { 'Authorization': localStorage.getItem('adminAuth') || '' },
      });
      if (res.ok) {
        const data = await res.json();
        setErrorLogs(data);
      }
    } catch {
      console.error('에러 로그 로드 실패');
    }
  };

  // 에러 로그 삭제
  const clearLogs = async () => {
    if (!confirm('모든 에러 로그를 삭제하시겠습니까?')) return;
    try {
      const res = await fetch('/api/error-logs', {
        method: 'DELETE',
        headers: { 'Authorization': localStorage.getItem('adminAuth') || '' },
      });
      if (res.ok) {
        setErrorLogs([]);
        setMessage('에러 로그가 삭제되었습니다');
      }
    } catch {
      setMessage('삭제 실패');
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('adminAuth');
    if (saved) {
      fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: saved }),
      }).then(res => {
        if (res.ok) {
          setIsAuthenticated(true);
          loadPosts();
          loadBranding();
          loadErrorLogs();
        }
      });
    }
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-10 sm:mt-20 px-4">
        <h1 className="text-xl sm:text-2xl font-bold mb-6">관리자 로그인</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          className="w-full p-3 border rounded mb-4 text-base"
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        />
        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700"
        >
          로그인
        </button>
        {message && <p className="mt-4 text-red-500 text-sm">{message}</p>}
      </div>
    );
  }

  return (
    <div className="px-2 sm:px-0">
      {/* 토스트 메시지 */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">관리자 페이지</h1>
      
      {message && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 p-3 sm:p-4 rounded mb-4 sm:mb-6 text-sm">
          {message}
        </div>
      )}

      {/* 탭 네비게이션 */}
      <div className="flex border-b mb-4 sm:mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-3 sm:px-4 py-2 font-medium text-sm sm:text-base whitespace-nowrap ${activeTab === 'posts' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
        >
          📝 글 관리
        </button>
        <button
          onClick={() => setActiveTab('branding')}
          className={`px-3 sm:px-4 py-2 font-medium text-sm sm:text-base whitespace-nowrap ${activeTab === 'branding' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
        >
          🎨 브랜딩
        </button>
        <button
          onClick={() => { setActiveTab('logs'); loadErrorLogs(); }}
          className={`px-3 sm:px-4 py-2 font-medium text-sm sm:text-base whitespace-nowrap ${activeTab === 'logs' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
        >
          🚨 에러 로그 {errorLogs.length > 0 && <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{errorLogs.length}</span>}
        </button>
      </div>

      {activeTab === 'posts' && (
        <>
          {/* 상세 시황 글 생성 */}
          <section className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 sm:p-6 rounded-lg shadow-sm border border-purple-200 mb-6 sm:mb-8">
            <h2 className="text-base sm:text-xl font-semibold mb-3 sm:mb-4">📊 시황 글 생성</h2>
            <p className="text-gray-600 mb-3 sm:mb-4 text-sm">
              각 시황 글을 수동으로 생성합니다. (자동화된 cron job과 동일)
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <button
                onClick={async () => {
                  setIsGenerating(true);
                  setGeneratingType('morning');
                  const toastId = addToast('loading', '모닝 브리핑 생성 중...');
                  try {
                    const res = await fetch('/api/cron/morning-briefing');
                    if (res.ok) {
                      updateToast(toastId, 'success', '모닝 브리핑이 생성되었습니다!');
                      loadPosts();
                    } else {
                      const data = await res.json();
                      updateToast(toastId, 'error', `오류: ${data.error || '생성 실패'}`);
                    }
                  } catch {
                    updateToast(toastId, 'error', '네트워크 오류가 발생했습니다.');
                  } finally {
                    setIsGenerating(false);
                    setGeneratingType(null);
                  }
                }}
                disabled={isGenerating}
                className={`relative text-white px-3 py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                  generatingType === 'morning' ? 'bg-yellow-400' : 'bg-yellow-500 hover:bg-yellow-600'
                } disabled:opacity-70`}
              >
                {generatingType === 'morning' && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </span>
                )}
                <span className={generatingType === 'morning' ? 'invisible' : ''}>☀️ 모닝브리핑</span>
              </button>
              
              <button
                onClick={async () => {
                  setIsGenerating(true);
                  setGeneratingType('korean');
                  const toastId = addToast('loading', '한국 증시 글 생성 중...');
                  try {
                    const res = await fetch('/api/cron/korean-market');
                    if (res.ok) {
                      updateToast(toastId, 'success', '한국 증시 글이 생성되었습니다!');
                      loadPosts();
                    } else {
                      const data = await res.json();
                      updateToast(toastId, 'error', `오류: ${data.error || '생성 실패'}`);
                    }
                  } catch {
                    updateToast(toastId, 'error', '네트워크 오류가 발생했습니다.');
                  } finally {
                    setIsGenerating(false);
                    setGeneratingType(null);
                  }
                }}
                disabled={isGenerating}
                className={`relative text-white px-3 py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                  generatingType === 'korean' ? 'bg-blue-400' : 'bg-blue-500 hover:bg-blue-600'
                } disabled:opacity-70`}
              >
                {generatingType === 'korean' && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </span>
                )}
                <span className={generatingType === 'korean' ? 'invisible' : ''}>🇰🇷 한국증시</span>
              </button>
              
              <button
                onClick={async () => {
                  setIsGenerating(true);
                  setGeneratingType('us');
                  const toastId = addToast('loading', '미국 증시 글 생성 중...');
                  try {
                    const res = await fetch('/api/cron/us-market');
                    if (res.ok) {
                      updateToast(toastId, 'success', '미국 증시 글이 생성되었습니다!');
                      loadPosts();
                    } else {
                      const data = await res.json();
                      updateToast(toastId, 'error', `오류: ${data.error || '생성 실패'}`);
                    }
                  } catch {
                    updateToast(toastId, 'error', '네트워크 오류가 발생했습니다.');
                  } finally {
                    setIsGenerating(false);
                    setGeneratingType(null);
                  }
                }}
                disabled={isGenerating}
                className={`relative text-white px-3 py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                  generatingType === 'us' ? 'bg-red-400' : 'bg-red-500 hover:bg-red-600'
                } disabled:opacity-70`}
              >
                {generatingType === 'us' && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </span>
                )}
                <span className={generatingType === 'us' ? 'invisible' : ''}>🇺🇸 미국증시</span>
              </button>
              
              <button
                onClick={async () => {
                  setIsGenerating(true);
                  setGeneratingType('summary');
                  const toastId = addToast('loading', '마감 요약 글 생성 중...');
                  try {
                    const res = await fetch('/api/cron/market-summary');
                    if (res.ok) {
                      updateToast(toastId, 'success', '마감 요약 글이 생성되었습니다!');
                      loadPosts();
                    } else {
                      const data = await res.json();
                      updateToast(toastId, 'error', `오류: ${data.error || '생성 실패'}`);
                    }
                  } catch {
                    updateToast(toastId, 'error', '네트워크 오류가 발생했습니다.');
                  } finally {
                    setIsGenerating(false);
                    setGeneratingType(null);
                  }
                }}
                disabled={isGenerating}
                className={`relative text-white px-3 py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                  generatingType === 'summary' ? 'bg-purple-400' : 'bg-purple-500 hover:bg-purple-600'
                } disabled:opacity-70`}
              >
                {generatingType === 'summary' && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </span>
                )}
                <span className={generatingType === 'summary' ? 'invisible' : ''}>📈 마감요약</span>
              </button>
            </div>
          </section>

          {/* 상세 시황 글 생성 (기존) */}
          <section className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border mb-6 sm:mb-8">
            <h2 className="text-base sm:text-xl font-semibold mb-3 sm:mb-4">📊 상세 시황 글 생성 (레거시)</h2>
            <p className="text-gray-600 mb-3 sm:mb-4 text-sm">
              3대 지수, 섹터별 종목, 환율, 원자재 등 상세 시황 분석 글을 자동 생성합니다.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <button
                onClick={handleDetailedReport}
                disabled={isGenerating}
                className="bg-gray-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:bg-gray-700 disabled:bg-gray-400 font-medium text-sm sm:text-base"
              >
                {isGenerating ? '생성 중...' : '🚀 상세 시황 글 생성'}
              </button>
              
              <button
                onClick={loadMarketPreview}
                disabled={isLoadingPreview}
                className="bg-white text-gray-600 border border-gray-300 px-4 py-2.5 sm:py-3 rounded-lg hover:bg-gray-50 text-sm sm:text-base"
              >
                {isLoadingPreview ? '로딩...' : '👁️ 미리보기'}
              </button>
            </div>
            
            {marketPreview && (
              <div className="mt-4 p-3 sm:p-4 bg-white rounded-lg border">
                <h3 className="font-medium mb-2 text-sm sm:text-base">현재 시장 데이터</h3>
                <div className="grid grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
                  <div>
                    <span className="text-gray-500">Dow:</span>{' '}
                    <span className={marketPreview.indices.dow.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {marketPreview.indices.dow.changePercent >= 0 ? '+' : ''}{marketPreview.indices.dow.changePercent.toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Nasdaq:</span>{' '}
                    <span className={marketPreview.indices.nasdaq.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {marketPreview.indices.nasdaq.changePercent >= 0 ? '+' : ''}{marketPreview.indices.nasdaq.changePercent.toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">S&P:</span>{' '}
                    <span className={marketPreview.indices.sp500.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {marketPreview.indices.sp500.changePercent >= 0 ? '+' : ''}{marketPreview.indices.sp500.changePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-2">
                  업데이트: {new Date(marketPreview.fetchedAt).toLocaleString('ko-KR')}
                </p>
              </div>
            )}
          </section>

          <section className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border mb-6 sm:mb-8">
            <h2 className="text-base sm:text-xl font-semibold mb-3 sm:mb-4">✍️ AI 글 생성</h2>
            <div className="space-y-3 sm:space-y-4">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="주제 입력"
                className="w-full p-2.5 sm:p-3 border rounded text-sm sm:text-base"
              />
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="키워드 (쉼표로 구분)"
                className="w-full p-2.5 sm:p-3 border rounded text-sm sm:text-base"
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full sm:w-auto bg-green-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded hover:bg-green-700 disabled:bg-gray-400 text-sm sm:text-base"
              >
                {isGenerating ? '생성 중...' : 'AI로 글 생성'}
              </button>
            </div>
          </section>

          <section className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
            <h2 className="text-base sm:text-xl font-semibold mb-3 sm:mb-4">글 목록 ({posts.length}개)</h2>
            {posts.length === 0 ? (
              <p className="text-gray-500 text-sm">작성된 글이 없습니다.</p>
            ) : (
              <ul className="space-y-2 sm:space-y-3">
                {posts.map((post) => (
                  <li key={post.id} className="flex items-start sm:items-center justify-between p-2.5 sm:p-3 bg-gray-50 rounded gap-2">
                    <div className="min-w-0 flex-1">
                      <a href={`/posts/${post.slug}`} className="font-medium hover:text-blue-600 text-sm sm:text-base line-clamp-2 sm:line-clamp-1">
                        {post.title}
                      </a>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="text-red-500 hover:text-red-700 text-xs sm:text-sm shrink-0"
                    >
                      삭제
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {activeTab === 'branding' && (
        <section className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
          <h2 className="text-base sm:text-xl font-semibold mb-3 sm:mb-4">🎨 블로그 브랜딩 설정</h2>
          <p className="text-gray-600 mb-4 sm:mb-6 text-sm">자동 생성 글에 적용될 스타일을 설정하세요.</p>
          
          <div className="space-y-4 sm:space-y-6">
            <div>
              <label className="block font-medium mb-2 text-sm sm:text-base">닉네임</label>
              <input
                type="text"
                value={branding.nickname}
                onChange={(e) => setBranding({ ...branding, nickname: e.target.value })}
                placeholder="예: 호빵먹는 부자"
                className="w-full p-2.5 sm:p-3 border rounded text-sm sm:text-base"
              />
            </div>
            
            <div>
              <label className="block font-medium mb-2 text-sm sm:text-base">인사말</label>
              <textarea
                value={branding.greeting}
                onChange={(e) => setBranding({ ...branding, greeting: e.target.value })}
                placeholder="안녕하세요 {nickname}입니다."
                className="w-full p-2.5 sm:p-3 border rounded h-20 sm:h-24 text-sm sm:text-base"
              />
              <p className="text-xs text-gray-500 mt-1">{'{nickname}'} → 닉네임으로 대체</p>
            </div>
            
            <div>
              <label className="block font-medium mb-2 text-sm sm:text-base">마무리 인사</label>
              <textarea
                value={branding.closing}
                onChange={(e) => setBranding({ ...branding, closing: e.target.value })}
                placeholder="감사합니다."
                className="w-full p-2.5 sm:p-3 border rounded h-20 sm:h-24 text-sm sm:text-base"
              />
            </div>
            
            <div>
              <label className="block font-medium mb-2 text-sm sm:text-base">문체</label>
              <select
                value={branding.style}
                onChange={(e) => setBranding({ ...branding, style: e.target.value as 'formal' | 'casual' })}
                className="w-full p-2.5 sm:p-3 border rounded text-sm sm:text-base"
              >
                <option value="casual">캐주얼</option>
                <option value="formal">포멀</option>
              </select>
            </div>
            
            <button
              onClick={saveBranding}
              className="w-full sm:w-auto bg-blue-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded hover:bg-blue-700 text-sm sm:text-base"
            >
              💾 저장
            </button>
          </div>
        </section>
      )}

      {activeTab === 'logs' && (
        <section className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base sm:text-xl font-semibold">🚨 에러 로그 ({errorLogs.length}개)</h2>
            {errorLogs.length > 0 && (
              <button
                onClick={clearLogs}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                전체 삭제
              </button>
            )}
          </div>
          
          {errorLogs.length === 0 ? (
            <p className="text-gray-500 text-sm">에러 로그가 없습니다. 🎉</p>
          ) : (
            <ul className="space-y-3">
              {errorLogs.map((log) => (
                <li key={log.id} className="p-3 bg-red-50 border border-red-200 rounded">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded">
                      {log.source}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                    </span>
                  </div>
                  <p className="text-sm text-red-800 font-medium">{log.error}</p>
                  {log.details && (
                    <p className="text-xs text-gray-600 mt-1 break-all">{log.details}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
