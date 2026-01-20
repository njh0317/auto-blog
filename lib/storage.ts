import fs from 'fs';
import path from 'path';
import { Post, PostsData } from './types';

const DATA_FILE = path.join(process.cwd(), 'data', 'posts.json');

export function readPosts(): Post[] {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed: PostsData = JSON.parse(data);
    return parsed.posts || [];
  } catch {
    return [];
  }
}

export function writePosts(posts: Post[]): void {
  const data: PostsData = { posts };
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function addPost(post: Post): void {
  const posts = readPosts();
  posts.push(post);
  writePosts(posts);
}

export function deletePost(id: string): boolean {
  const posts = readPosts();
  const filtered = posts.filter(p => p.id !== id);
  if (filtered.length === posts.length) return false;
  writePosts(filtered);
  return true;
}
