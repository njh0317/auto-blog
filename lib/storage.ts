// 스토리지 추상화 - 로컬(파일) / Vercel(Upstash Redis) 자동 전환
import { Post, PostsData } from './types';

const isVercel = process.env.VERCEL === '1';
const hasRedisConfig = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

// Upstash Redis 사용 시
async function getRedis() {
  if (!hasRedisConfig) {
    throw new Error('Redis 환경변수가 설정되지 않았습니다');
  }
  const { Redis } = await import('@upstash/redis');
  return new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
  });
}

// 로컬 파일 시스템 사용 시
function getLocalPath(filename: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('path');
  return path.join(process.cwd(), 'data', filename);
}

function readLocalFile(filename: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs');
  const filePath = getLocalPath(filename);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeLocalFile(filename: string, data: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs');
  const filePath = getLocalPath(filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Posts 관련
export async function getPosts(): Promise<Post[]> {
  if (isVercel) {
    const redis = await getRedis();
    const posts = await redis.get<Post[]>('posts');
    return posts || [];
  }
  const data = readLocalFile('posts.json') as PostsData | null;
  return data?.posts || [];
}

export async function savePosts(posts: Post[]): Promise<void> {
  if (isVercel) {
    const redis = await getRedis();
    await redis.set('posts', posts);
    return;
  }
  writeLocalFile('posts.json', { posts });
}

// Branding 관련
export interface Branding {
  nickname: string;
  greeting: string;
  closing: string;
  style: 'formal' | 'casual';
}

const DEFAULT_BRANDING: Branding = {
  nickname: '코딩하다 주식하는 사람',
  greeting: '안녕하세요 {nickname}입니다.\n오늘 미국증시 마감시황 알려드리겠습니다.',
  closing: '감사합니다.\n\n※ 본 콘텐츠는 투자 참고용이며, 투자 판단의 최종 책임은 투자자 본인에게 있습니다.',
  style: 'casual',
};

export async function getBrandingData(): Promise<Branding> {
  if (isVercel) {
    const redis = await getRedis();
    const branding = await redis.get<Branding>('branding');
    return branding || DEFAULT_BRANDING;
  }
  const data = readLocalFile('branding.json') as Branding | null;
  return data || DEFAULT_BRANDING;
}

export async function saveBrandingData(branding: Branding): Promise<void> {
  if (isVercel) {
    const redis = await getRedis();
    await redis.set('branding', branding);
    return;
  }
  writeLocalFile('branding.json', branding);
}

// 동기 함수들 (로컬 전용, 기존 코드 호환)
export function readPosts(): Post[] {
  const data = readLocalFile('posts.json') as PostsData | null;
  return data?.posts || [];
}

export function addPost(post: Post): void {
  const posts = readPosts();
  posts.unshift(post);
  writeLocalFile('posts.json', { posts });
}

export function deletePost(id: string): boolean {
  const posts = readPosts();
  const index = posts.findIndex(p => p.id === id);
  if (index === -1) return false;
  posts.splice(index, 1);
  writeLocalFile('posts.json', { posts });
  return true;
}

// ===== V2: Redis Sorted Set 기반 (Vercel 전용) =====

// 개별 포스트 저장
export async function savePostV2(post: Post): Promise<void> {
  if (isVercel) {
    const redis = await getRedis();
    const timestamp = new Date(post.createdAt).getTime();
    
    // 전체 개수 증가 (이미 존재하는 경우 중복 증가 방지) - 저장 전에 체크!
    const exists = await redis.exists(`posts:data:${post.id}`);
    
    // Sorted Set에 추가 (score: timestamp, member: id)
    await redis.zadd('posts:sorted', { score: timestamp, member: post.id });
    
    // Hash에 데이터 저장
    await redis.hset(`posts:data:${post.id}`, {
      id: post.id,
      slug: post.slug,
      title: post.title,
      seoTitle: post.seoTitle || '',
      content: post.content,
      excerpt: post.excerpt,
      keywords: JSON.stringify(post.keywords),
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      pinned: post.pinned ? '1' : '0',
      marketData: post.marketData ? JSON.stringify(post.marketData) : '',
      koreanMarketData: post.koreanMarketData ? JSON.stringify(post.koreanMarketData) : '',
      earningsData: post.earningsData ? JSON.stringify(post.earningsData) : '',
    });
    
    // Slug 매핑
    await redis.set(`posts:slug:${post.slug}`, post.id);
    
    // 조회수 초기화
    if (post.viewCount) {
      await redis.set(`posts:views:${post.id}`, post.viewCount);
    }
    
    // 새 글이면 카운트 증가
    if (!exists) {
      await redis.incr('posts:count');
    }
    
    return;
  }
  
  // 로컬은 기존 방식
  addPost(post);
}

// 포스트 업데이트 (기존 글 수정용)
export async function updatePostV2(post: Post): Promise<void> {
  if (isVercel) {
    const redis = await getRedis();
    
    // Hash 데이터만 업데이트 (Sorted Set의 score는 유지)
    await redis.hset(`posts:data:${post.id}`, {
      id: post.id,
      slug: post.slug,
      title: post.title,
      seoTitle: post.seoTitle || '',
      content: post.content,
      excerpt: post.excerpt,
      keywords: JSON.stringify(post.keywords),
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      pinned: post.pinned ? '1' : '0',
      marketData: post.marketData ? JSON.stringify(post.marketData) : '',
      koreanMarketData: post.koreanMarketData ? JSON.stringify(post.koreanMarketData) : '',
      earningsData: post.earningsData ? JSON.stringify(post.earningsData) : '',
    });
    
    return;
  }
  
  // 로컬은 기존 방식
  const posts = readPosts();
  const index = posts.findIndex(p => p.id === post.id);
  if (index !== -1) {
    posts[index] = post;
    writeLocalFile('posts.json', { posts });
  }
}

// Hash 데이터를 Post 객체로 변환
function parsePostFromHash(data: Record<string, unknown>): Post {
  const parseJSON = (value: unknown) => {
    if (!value) return undefined;
    if (typeof value === 'string') {
      if (value === '') return undefined;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  };

  return {
    id: String(data.id),
    slug: String(data.slug),
    title: String(data.title),
    seoTitle: data.seoTitle ? String(data.seoTitle) : undefined,
    content: String(data.content),
    excerpt: String(data.excerpt),
    keywords: parseJSON(data.keywords) || [],
    createdAt: String(data.createdAt),
    updatedAt: String(data.updatedAt),
    pinned: data.pinned === '1' || data.pinned === true || false, // 기본값 false
    viewCount: 0, // 별도로 조회
    marketData: parseJSON(data.marketData),
    koreanMarketData: parseJSON(data.koreanMarketData),
    earningsData: parseJSON(data.earningsData),
  };
}

// 페이지네이션 조회
export async function getPostsPaginatedV2(page: number = 1, limit: number = 20): Promise<{
  posts: Post[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}> {
  if (isVercel) {
    const redis = await getRedis();
    
    // 전체 개수
    const total = await redis.get<number>('posts:count') || 0;
    const totalPages = Math.ceil(total / limit);
    
    // 페이지 범위 계산 (최신순이므로 rev: true)
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    
    // Sorted Set에서 ID 목록 조회 (최신순)
    const ids = await redis.zrange('posts:sorted', start, end, { rev: true });
    
    // 각 포스트 데이터 조회 (병렬)
    const postsData = await Promise.all(
      ids.map(async (id) => {
        const data = await redis.hgetall(`posts:data:${id}`);
        const viewCount = await redis.get<number>(`posts:views:${id}`) || 0;
        const post = parsePostFromHash(data as Record<string, unknown>);
        post.viewCount = viewCount;
        return post;
      })
    );
    
    return {
      posts: postsData,
      total,
      page,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }
  
  // 로컬은 기존 방식
  const allPosts = readPosts().sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const total = allPosts.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const posts = allPosts.slice(start, start + limit);
  
  return {
    posts,
    total,
    page,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

// 전체 조회 (하위 호환)
export async function getPostsV2(): Promise<Post[]> {
  if (isVercel) {
    const redis = await getRedis();
    
    // 모든 ID 조회 (최신순)
    const ids = await redis.zrange('posts:sorted', 0, -1, { rev: true });
    
    // 각 포스트 데이터 조회 (병렬)
    const posts = await Promise.all(
      ids.map(async (id) => {
        const data = await redis.hgetall(`posts:data:${id}`);
        const viewCount = await redis.get<number>(`posts:views:${id}`) || 0;
        const post = parsePostFromHash(data as Record<string, unknown>);
        post.viewCount = viewCount;
        return post;
      })
    );
    
    return posts;
  }
  
  // 로컬은 기존 방식
  return readPosts().sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// Slug로 조회
export async function getPostBySlugV2(slug: string): Promise<Post | null> {
  if (isVercel) {
    const redis = await getRedis();
    
    // Slug → ID 매핑 조회
    const id = await redis.get<string>(`posts:slug:${slug}`);
    if (!id) return null;
    
    // 포스트 데이터 조회
    const data = await redis.hgetall(`posts:data:${id}`);
    if (!data || Object.keys(data).length === 0) return null;
    
    const viewCount = await redis.get<number>(`posts:views:${id}`) || 0;
    const post = parsePostFromHash(data as Record<string, unknown>);
    post.viewCount = viewCount;
    
    return post;
  }
  
  // 로컬은 기존 방식
  const posts = readPosts();
  return posts.find(p => p.slug === slug) || null;
}

// ID로 조회
export async function getPostByIdV2(id: string): Promise<Post | null> {
  if (isVercel) {
    const redis = await getRedis();
    
    const data = await redis.hgetall(`posts:data:${id}`);
    if (!data || Object.keys(data).length === 0) return null;
    
    const viewCount = await redis.get<number>(`posts:views:${id}`) || 0;
    const post = parsePostFromHash(data as Record<string, unknown>);
    post.viewCount = viewCount;
    
    return post;
  }
  
  // 로컬은 기존 방식
  const posts = readPosts();
  return posts.find(p => p.id === id) || null;
}

// 조회수 증가
export async function incrementViewCountV2(id: string): Promise<number> {
  if (isVercel) {
    const redis = await getRedis();
    const newCount = await redis.incr(`posts:views:${id}`);
    return newCount;
  }
  
  // 로컬은 기존 방식
  const posts = readPosts();
  const post = posts.find(p => p.id === id);
  if (!post) return 0;
  
  post.viewCount = (post.viewCount || 0) + 1;
  writeLocalFile('posts.json', { posts });
  return post.viewCount;
}

// 삭제
export async function deletePostV2(id: string): Promise<boolean> {
  if (isVercel) {
    const redis = await getRedis();
    
    // 포스트 데이터 조회 (slug 확인용)
    const data = await redis.hgetall(`posts:data:${id}`);
    if (!data || Object.keys(data).length === 0) return false;
    
    const slug = String((data as Record<string, unknown>).slug);
    
    // 여러 키 삭제
    await Promise.all([
      redis.zrem('posts:sorted', id),
      redis.del(`posts:data:${id}`),
      redis.del(`posts:slug:${slug}`),
      redis.del(`posts:views:${id}`),
    ]);
    
    // 전체 개수 감소
    await redis.decr('posts:count');
    
    return true;
  }
  
  // 로컬은 기존 방식
  return deletePost(id);
}

// 전체 개수
export async function getPostsCountV2(): Promise<number> {
  if (isVercel) {
    const redis = await getRedis();
    return await redis.get<number>('posts:count') || 0;
  }
  
  // 로컬은 기존 방식
  return readPosts().length;
}
