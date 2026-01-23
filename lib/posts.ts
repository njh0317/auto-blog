import { Post, MarketSnapshot } from './types';
import { getPosts, savePosts } from './storage';

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
  const posts = await getPosts();
  return posts.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  const posts = await getPosts();
  return posts.find(p => p.slug === slug);
}

// 조회수 증가
export async function incrementViewCount(slug: string): Promise<number> {
  const posts = await getPosts();
  const post = posts.find(p => p.slug === slug);
  
  if (!post) return 0;
  
  post.viewCount = (post.viewCount || 0) + 1;
  await savePosts(posts);
  
  return post.viewCount;
}

// 인기글 조회 (조회수 기준 상위 N개)
export async function getPopularPosts(limit: number = 3): Promise<Post[]> {
  const posts = await getPosts();
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
  const posts = await getPosts();
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
  
  posts.unshift(post);
  await savePosts(posts);
  return post;
}

export async function deletePostById(id: string): Promise<boolean> {
  const posts = await getPosts();
  const index = posts.findIndex(p => p.id === id);
  if (index === -1) return false;
  posts.splice(index, 1);
  await savePosts(posts);
  return true;
}
