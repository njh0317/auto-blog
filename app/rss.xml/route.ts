import { getPosts } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  const posts = await getPosts();
  const siteUrl = 'https://wisdomslab.com';
  
  const rssItems = posts.slice(0, 20).map(post => `
    <item>
      <title><![CDATA[${post.seoTitle || post.title}]]></title>
      <link>${siteUrl}/posts/${post.slug}</link>
      <guid isPermaLink="true">${siteUrl}/posts/${post.slug}</guid>
      <description><![CDATA[${post.excerpt || post.content.slice(0, 200)}]]></description>
      <pubDate>${new Date(post.createdAt).toUTCString()}</pubDate>
    </item>`).join('');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>코딩하다 주식하는 사람</title>
    <link>${siteUrl}</link>
    <description>매일 미국증시, 한국증시 마감시황을 정리해드립니다.</description>
    <language>ko</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    ${rssItems}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
