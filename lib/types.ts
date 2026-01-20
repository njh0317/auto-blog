export interface Post {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  keywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GenerateRequest {
  topic: string;
  keywords?: string[];
}

export interface GenerateResponse {
  title: string;
  content: string;
  excerpt: string;
  keywords: string[];
}

export interface PostsData {
  posts: Post[];
}
