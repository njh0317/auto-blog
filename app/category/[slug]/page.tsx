import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getPostsPaginatedV2, getCategoryBySlug } from '@/lib/storage';
import ProfileSidebar from '@/components/ProfileSidebar';
import InfinitePostList from '@/components/InfinitePostList';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  
  if (!category) {
    return { title: '카테고리를 찾을 수 없습니다' };
  }
  
  return {
    title: `${category.name} - 코딩하다 주식하는 사람`,
    description: category.description,
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  
  if (!category) {
    notFound();
  }
  
  // 첫 페이지 데이터 가져오기 (20개)
  const { posts: allPosts } = await getPostsPaginatedV2(1, 1000);
  const filteredPosts = allPosts.filter(post => post.category === category.id);
  
  const total = filteredPosts.length;
  const initialPosts = filteredPosts.slice(0, 20);
  
  return (
    <div className="flex gap-8">
      {/* 좌측 사이드바 - 데스크톱에서만 표시 */}
      <div className="hidden lg:block w-72 flex-shrink-0">
        <ProfileSidebar />
      </div>
      
      {/* 우측 메인 콘텐츠 */}
      <div className="flex-1 min-w-0">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {category.name}
          </h1>
          <p className="text-gray-600">{category.description}</p>
          <p className="text-sm text-gray-500 mt-2">총 {total}개의 글</p>
        </div>
        
        {total === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>아직 작성된 글이 없습니다.</p>
          </div>
        ) : (
          <InfinitePostList 
            initialPosts={initialPosts} 
            initialTotal={total}
            category={category.id}
          />
        )}
      </div>
    </div>
  );
}
