import Link from 'next/link';
import { Post } from '@/lib/types';

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  return (
    <article className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
      <Link href={`/posts/${post.slug}`}>
        <h2 className="text-xl font-semibold text-gray-900 mb-2 hover:text-blue-600">
          {post.title}
        </h2>
      </Link>
      <p className="text-gray-600 mb-4 line-clamp-2">
        {post.excerpt}
      </p>
      <div className="flex items-center justify-between text-sm text-gray-500">
        <time dateTime={post.createdAt}>
          {new Date(post.createdAt).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}
        </time>
        <div className="flex gap-2">
          {post.keywords.slice(0, 3).map((keyword) => (
            <span key={keyword} className="bg-gray-100 px-2 py-1 rounded text-xs">
              {keyword}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
