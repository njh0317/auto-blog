import Link from 'next/link';
import { Post } from '@/lib/types';

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  return (
    <article className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 hover:shadow-md transition-shadow">
      <Link href={`/posts/${post.slug}`}>
        <div className="flex items-start gap-2 mb-2">
          {post.pinned && (
            <span className="text-blue-600 text-lg shrink-0" title="고정된 글">📌</span>
          )}
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 hover:text-blue-600">
            {post.title}
          </h2>
        </div>
      </Link>
      <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4 line-clamp-2">
        {post.excerpt}
      </p>
      {/* 모바일: 세로 배치, 데스크톱: 가로 배치 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-500">
        <time dateTime={post.createdAt} className="text-xs sm:text-sm">
          {new Date(post.createdAt).toLocaleString('ko-KR', { 
            timeZone: 'Asia/Seoul',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </time>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {/* 모바일/데스크톱 모두 3개 */}
          {post.keywords.slice(0, 3).map((keyword) => (
            <span key={keyword} className="bg-gray-100 px-2 py-0.5 sm:py-1 rounded text-xs">
              {keyword}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
