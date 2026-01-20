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
