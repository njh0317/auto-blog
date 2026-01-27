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

// 한글을 영문 slug로 변환 (간단 버전)
function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

// 고유 ID 생성
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// 고유 slug 생성
function generateUniqueSlug(title: string, existingPosts: Post[]): string {
  const baseSlug = toSlug(title) || 'post';
  let slug = baseSlug;
  let counter = 1;
  
  while (existingPosts.some(p => p.slug === slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
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

// 인기글 조회 (조회수 기준 상위 N개)
export async function getPopularPosts(limit: number = 3): Promise<Post[]> {
  const posts = await getPostsV2();
  return posts
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
  const posts = await getPostsV2();
  const now = new Date().toISOString();
  
  const post: Post = {
    id: generateId(),
    slug: generateUniqueSlug(data.title, posts),
    title: data.title,
    content: data.content,
    excerpt: data.excerpt,
    keywords: data.keywords,
    createdAt: now,
    updatedAt: now,
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
