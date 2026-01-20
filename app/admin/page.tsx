'use client';

import { useState, useEffect } from 'react';
import { Post } from '@/lib/types';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState('');

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
        }
      });
    }
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <h1 className="text-2xl font-bold mb-6">관리자 로그인</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          className="w-full p-3 border rounded mb-4"
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        />
        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700"
        >
          로그인
        </button>
        {message && <p className="mt-4 text-red-500">{message}</p>}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">관리자 페이지</h1>
      
      {message && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded mb-6">
          {message}
        </div>
      )}

      <section className="bg-white p-6 rounded-lg shadow-sm border mb-8">
        <h2 className="text-xl font-semibold mb-4">새 글 생성</h2>
        <div className="space-y-4">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="주제 (예: 2024년 주식 투자 전략)"
            className="w-full p-3 border rounded"
          />
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="키워드 (쉼표로 구분, 예: 주식, 투자, ETF)"
            className="w-full p-3 border rounded"
          />
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {isGenerating ? '생성 중...' : 'AI로 글 생성'}
          </button>
        </div>
      </section>

      <section className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">글 목록 ({posts.length}개)</h2>
        {posts.length === 0 ? (
          <p className="text-gray-500">작성된 글이 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {posts.map((post) => (
              <li key={post.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <a href={`/posts/${post.slug}`} className="font-medium hover:text-blue-600">
                    {post.title}
                  </a>
                  <p className="text-sm text-gray-500">
                    {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(post.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
