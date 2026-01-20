import { Post, MarketSnapshot } from './types';
import { readPosts, addPost as storageAddPost, deletePost as storageDeletePost } from './storage';

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

export function getAllPosts(): Post[] {
  return readPosts().sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getPostBySlug(slug: string): Post | undefined {
  return readPosts().find(p => p.slug === slug);
}

export function createPost(data: {
  title: string;
  content: string;
  excerpt: string;
  keywords: string[];
  marketData?: MarketSnapshot;
}): Post {
  const posts = readPosts();
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
  
  storageAddPost(post);
  return post;
}

export function deletePostById(id: string): boolean {
  return storageDeletePost(id);
}
