import { Post, MarketSnapshot } from './types';
import { 
  getPostsV2, 
  getPostsPaginatedV2,
  getPostBySlugV2,
  getPostByIdV2,
  savePostV2,
  updatePostV2,
  incrementViewCountV2,
  deletePostV2,
} from './storage';

// 고유 ID 생성
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export async function getAllPosts(): Promise<Post[]> {
  const posts = await getPostsV2();
  // 고정 글을 최상단으로, 나머지는 날짜순
  return posts.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0; // 이미 날짜순 정렬되어 있음
  });
}

export async function getPostsPaginated(page: number = 1, limit: number = 20) {
  const result = await getPostsPaginatedV2(page, limit);
  
  // 첫 페이지에만 고정 글을 최상단에 배치
  if (page === 1) {
    result.posts.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
  }
  
  return result;
}

export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  const post = await getPostBySlugV2(slug);
  return post || undefined;
}

// 조회수 증가
export async function incrementViewCount(slug: string): Promise<number> {
  const post = await getPostBySlugV2(slug);
  if (!post) return 0;
  
  return await incrementViewCountV2(post.id);
}

// 인기글 조회 (최근 10개 글 중 조회수 기준 상위 N개)
export async function getPopularPosts(limit: number = 3): Promise<Post[]> {
  const posts = await getPostsV2();
  const recentPosts = posts.slice(0, 10); // 최근 10개 글만
  return recentPosts
    .filter(p => (p.viewCount || 0) > 0)
    .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
    .slice(0, limit);
}

// 이전글/다음글 조회
export async function getAdjacentPosts(slug: string): Promise<{ prev: Post | null; next: Post | null }> {
  const posts = await getAllPosts(); // 정렬된 상태
  const currentIndex = posts.findIndex(p => p.slug === slug);
  
  if (currentIndex === -1) {
    return { prev: null, next: null };
  }
  
  return {
    prev: currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null, // 이전글 (더 오래된 글)
    next: currentIndex > 0 ? posts[currentIndex - 1] : null, // 다음글 (더 최신 글)
  };
}

export async function createPost(data: {
  title: string;
  content: string;
  excerpt: string;
  keywords: string[];
  marketData?: MarketSnapshot;
}): Promise<Post> {
  const now = new Date();
  const nowISO = now.toISOString();
  
  // AI 생성 글은 날짜 + 랜덤 ID 형식으로 slug 생성
  const yymmdd = nowISO.slice(2, 10).replace(/-/g, '').slice(0, 6); // 250129
  const randomId = Math.random().toString(36).substring(2, 6); // a3f2
  const slug = `${yymmdd}-${randomId}`;
  
  const post: Post = {
    id: generateId(),
    slug,
    title: data.title,
    content: data.content,
    excerpt: data.excerpt,
    keywords: data.keywords,
    createdAt: nowISO,
    updatedAt: nowISO,
    marketData: data.marketData,
  };
  
  await savePostV2(post);
  return post;
}

export async function deletePostById(id: string): Promise<boolean> {
  return await deletePostV2(id);
}

// 글 고정/해제
export async function togglePinPost(id: string): Promise<boolean> {
  const post = await getPostByIdV2(id);
  if (!post) return false;
  
  post.pinned = !post.pinned;
  post.updatedAt = new Date().toISOString();
  await updatePostV2(post);
  
  return true;
}
