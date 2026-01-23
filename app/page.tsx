import { getAllPosts } from '@/lib/posts';
import PostCard from '@/components/PostCard';
import ProfileSidebar from '@/components/ProfileSidebar';
import MobileProfileCard from '@/components/MobileProfileCard';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const posts = await getAllPosts();

  return (
    <div className="flex gap-8">
      {/* 좌측 사이드바 - 데스크톱에서만 표시 */}
      <div className="hidden lg:block w-72 flex-shrink-0">
        <ProfileSidebar />
      </div>
      
      {/* 우측 메인 콘텐츠 */}
      <div className="flex-1 min-w-0">
        {/* 모바일 프로필 카드 */}
        <div className="lg:hidden mb-6">
          <MobileProfileCard />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          전체 글 ({posts.length})
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
    </div>
  );
}
