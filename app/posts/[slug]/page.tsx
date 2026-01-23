import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getPostBySlug, getAdjacentPosts } from '@/lib/posts';
import StockHeatmap from '@/components/StockHeatmap';
import TradingViewWidget from '@/components/TradingViewWidget';
import AdBanner from '@/components/AdBanner';
import FearGreedGauge from '@/components/FearGreedGauge';
import Link from 'next/link';

// 동적 렌더링으로 변경
export const dynamic = 'force-dynamic';

// 본문 포맷팅 - [[ ]] 패턴을 소제목으로 스타일링
function formatContent(content: string): string {
  return content
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      
      // [[ 소제목 ]] 패턴
      const headingMatch = trimmed.match(/^\[\[\s*(.+?)\s*\]\]$/);
      if (headingMatch) {
        return `<h3 class="text-lg font-bold text-gray-900 mt-6 mb-3">${headingMatch[1]}</h3>`;
      }
      // ★로 시작하는 줄 (기존 시황 글 형식)
      if (trimmed.startsWith('★')) {
        return `<h3 class="text-lg font-bold text-gray-900 mt-6 mb-3">${trimmed}</h3>`;
      }
      // 구분선
      if (trimmed.startsWith('━')) {
        return '<hr class="my-2 border-gray-200" />';
      }
      // 빈 줄
      if (!trimmed) {
        return '<br />';
      }
      // 일반 텍스트
      return `<p class="mb-2">${line}</p>`;
    })
    .join('');
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(decodeURIComponent(slug));
  
  if (!post) {
    return { title: '글을 찾을 수 없습니다' };
  }

  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.keywords,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.createdAt,
    },
  };
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(decodeURIComponent(slug));

  if (!post) {
    notFound();
  }

  const { prev, next } = await getAdjacentPosts(decodeURIComponent(slug));
  const hasMarketData = !!post.marketData;

  return (
    <article className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 md:p-8">
      {/* 뒤로가기 버튼 */}
      <div className="mb-4">
        <Link 
          href="/" 
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          목록으로
        </Link>
      </div>

      {/* 조회수 증가 스크립트 */}
      <script dangerouslySetInnerHTML={{
        __html: `
          (function() {
            var key = 'viewed:${post.slug}';
            if (!sessionStorage.getItem(key)) {
              fetch('/api/posts/view', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug: '${post.slug}' })
              });
              sessionStorage.setItem(key, '1');
            }
          })();
        `
      }} />

      <header className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
          {post.title}
        </h1>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
          <time dateTime={post.createdAt}>
            {new Date(post.createdAt).toLocaleString('ko-KR', { 
              timeZone: 'Asia/Seoul',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </time>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {post.keywords.slice(0, 4).map((keyword) => (
              <span key={keyword} className="bg-gray-100 px-2 py-0.5 sm:py-1 rounded text-xs">
                {keyword}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* 상단 광고 */}
      <AdBanner slot={process.env.NEXT_PUBLIC_AD_SLOT_TOP || ''} className="mb-6" />

      {/* 저장된 시장 데이터로 히트맵 표시 */}
      {hasMarketData && post.marketData && (
        <div className="mb-6 sm:mb-8">
          {/* 3대 지수 카드 */}
          <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4 text-gray-900">📊 3대 지수</h2>
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
            {Object.values(post.marketData.indices).map((index) => (
              <div 
                key={index.name}
                className={`p-2 sm:p-4 rounded-lg text-center ${
                  index.changePercent >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}
              >
                <div className="text-[10px] sm:text-sm text-gray-600 truncate">{index.name}</div>
                <div className="text-xs sm:text-lg font-bold">
                  {index.price.toLocaleString()}
                </div>
                <div className={`text-xs sm:text-sm font-medium ${
                  index.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {index.changePercent >= 0 ? '+' : ''}{index.changePercent.toFixed(2)}%
                </div>
              </div>
            ))}
          </div>

          {/* 종목 히트맵 */}
          <StockHeatmap 
            stocks={post.marketData.stocks} 
            title="📈 Magnificent 7 등락률 (글 작성 시점)"
          />
          
          {/* 공포탐욕지수 */}
          {post.marketData.fearGreed && (
            <div className="mt-4 sm:mt-6">
              <FearGreedGauge 
                score={post.marketData.fearGreed.score}
                rating={post.marketData.fearGreed.rating}
                history={post.marketData.fearGreed.history}
              />
            </div>
          )}
          
          {/* 상승/하락 종목 */}
          {(post.marketData.gainers?.length || post.marketData.losers?.length) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {post.marketData.gainers && post.marketData.gainers.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                  <h3 className="text-sm sm:text-base font-semibold text-green-700 mb-2">🚀 오늘의 상승 TOP 10</h3>
                  <div className="space-y-1">
                    {post.marketData.gainers.map((stock, i) => (
                      <div key={stock.symbol} className="flex justify-between text-xs sm:text-sm">
                        <span className="text-gray-700">{i + 1}. {stock.name}</span>
                        <span className="text-green-600 font-medium">+{stock.changePercent.toFixed(2)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {post.marketData.losers && post.marketData.losers.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                  <h3 className="text-sm sm:text-base font-semibold text-red-700 mb-2">📉 오늘의 하락 TOP 10</h3>
                  <div className="space-y-1">
                    {post.marketData.losers.map((stock, i) => (
                      <div key={stock.symbol} className="flex justify-between text-xs sm:text-sm">
                        <span className="text-gray-700">{i + 1}. {stock.name}</span>
                        <span className="text-red-600 font-medium">{stock.changePercent.toFixed(2)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <p className="text-[10px] sm:text-xs text-gray-400 mt-2">
            데이터 수집 시간: {new Date(post.marketData.fetchedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
          </p>
        </div>
      )}
      
      <div 
        className="prose prose-sm sm:prose-base md:prose-lg max-w-none text-gray-900 [&_p]:text-gray-900 [&_strong]:text-gray-900 [&_li]:text-gray-900 [&_span]:text-gray-900"
        dangerouslySetInnerHTML={{ __html: formatContent(post.content) }}
      />

      {/* 본문 하단 광고 */}
      <AdBanner slot={process.env.NEXT_PUBLIC_AD_SLOT_BOTTOM || ''} className="my-6" />

      {/* 하단 실시간 시세 (TradingView) */}
      {hasMarketData && (
        <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4 text-gray-900">📈 실시간 시세</h2>
          <TradingViewWidget type="ticker" />
        </div>
      )}

      {/* 이전글/다음글 네비게이션 */}
      <nav className="mt-8 pt-6 border-t">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 이전글 */}
          <div>
            {prev ? (
              <Link 
                href={`/posts/${prev.slug}`}
                className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-xs text-gray-500 mb-1 block">← 이전글</span>
                <span className="text-sm font-medium text-gray-900 line-clamp-2">{prev.title}</span>
              </Link>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg opacity-50">
                <span className="text-xs text-gray-500 mb-1 block">← 이전글</span>
                <span className="text-sm text-gray-400">이전글이 없습니다</span>
              </div>
            )}
          </div>
          
          {/* 다음글 */}
          <div>
            {next ? (
              <Link 
                href={`/posts/${next.slug}`}
                className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-right"
              >
                <span className="text-xs text-gray-500 mb-1 block">다음글 →</span>
                <span className="text-sm font-medium text-gray-900 line-clamp-2">{next.title}</span>
              </Link>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg opacity-50 text-right">
                <span className="text-xs text-gray-500 mb-1 block">다음글 →</span>
                <span className="text-sm text-gray-400">다음글이 없습니다</span>
              </div>
            )}
          </div>
        </div>
      </nav>
    </article>
  );
}
