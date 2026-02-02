'use client';

import { useState, useEffect, useRef } from 'react';
import { Post } from '@/lib/types';
import PostCard from './PostCard';

interface InfinitePostListProps {
  initialPosts: Post[];
  initialTotal: number;
  category?: string; // 카테고리 필터 추가
}

export default function InfinitePostList({ initialPosts, initialTotal, category }: InfinitePostListProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length < initialTotal);
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, page]);

  const loadMore = async () => {
    setLoading(true);
    try {
      const nextPage = page + 1;
      const categoryParam = category ? `&category=${category}` : '';
      const res = await fetch(`/api/posts/paginated?page=${nextPage}&limit=20${categoryParam}`);
      const data = await res.json();
      
      if (data.posts && data.posts.length > 0) {
        setPosts((prev) => [...prev, ...data.posts]);
        setPage(nextPage);
        setHasMore(data.hasNext);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to load more posts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {/* 무한 스크롤 트리거 */}
      {hasMore && (
        <div ref={observerRef} className="py-8 text-center">
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
              <span>로딩 중...</span>
            </div>
          ) : (
            <div className="text-gray-400 text-sm">스크롤하여 더 보기</div>
          )}
        </div>
      )}

      {/* 더 이상 글이 없을 때 */}
      {!hasMore && posts.length > 0 && (
        <div className="py-8 text-center text-gray-400 text-sm">
          모든 글을 확인했습니다.
        </div>
      )}
    </>
  );
}
