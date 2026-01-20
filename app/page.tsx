import { getAllPosts } from '@/lib/posts';
import PostCard from '@/components/PostCard';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const posts = await getAllPosts();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        최신 글
      </h1>
      
      {posts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>아직 작성된 글이 없습니다.</p>
          <p className="text-sm mt-2">관리자 페이지에서 새 글을 작성해보세요.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
