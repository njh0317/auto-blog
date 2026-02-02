import { NextResponse } from 'next/server';
import { loadSP500Tickers, fetchEarningsCalendar, filterNextWeekEarnings, generateEarningsContent, generateEarningsCalendarData, getNextWeekRange } from '@/lib/earnings';
import { savePostV2 } from '@/lib/storage';
import { saveErrorLog } from '@/lib/error-log';
import { Post } from '@/lib/types';

// Vercel Cron 설정 - 일요일 낮 12시 KST (UTC 03:00)
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Cron 인증 확인 (로컬에서는 스킵)
  const authHeader = request.headers.get('authorization');
  const isLocal = process.env.NODE_ENV === 'development';
  
  // CRON_SECRET 또는 ADMIN_PASSWORD로 인증
  const isValidCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isValidAdmin = authHeader === `Bearer ${process.env.ADMIN_PASSWORD}`;
  
  if (!isLocal && !isValidCron && !isValidAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. S&P 500 티커 로드
    const sp500Tickers = loadSP500Tickers();
    console.log(`S&P 500 티커 ${sp500Tickers.size}개 로드 완료`);
    
    // 2. 실적 캘린더 조회 (캐시 또는 API)
    const allEvents = await fetchEarningsCalendar();
    console.log(`전체 실적 이벤트 ${allEvents.length}개 조회 완료`);
    
    // 3. 다음 주 S&P 500 기업만 필터링
    const nextWeekEvents = filterNextWeekEarnings(allEvents, sp500Tickers);
    console.log(`다음 주 S&P 500 실적 발표 ${nextWeekEvents.length}개`);
    
    // 4. 포스트 콘텐츠 생성
    const content = generateEarningsContent(nextWeekEvents);
    
    // 4-1. 실적 캘린더 데이터 생성 (FE 컴포넌트용)
    const earningsData = generateEarningsCalendarData(nextWeekEvents);
    
    // 5. 날짜 정보
    const { start, end } = getNextWeekRange();
    const startDate = start.toLocaleDateString('ko-KR', { 
      timeZone: 'Asia/Seoul',
      month: 'long', 
      day: 'numeric' 
    });
    const endDate = end.toLocaleDateString('ko-KR', { 
      timeZone: 'Asia/Seoul',
      month: 'long', 
      day: 'numeric' 
    });
    
    // 6. 포스트 저장
    const now = new Date();
    const yymmdd = now.toISOString().slice(2, 10).replace(/-/g, '').slice(0, 6); // 250202
    const slug = `${yymmdd}-earnings`;
    
    const title = `다음 주 주요 기업 실적 발표 일정 (${startDate} ~ ${endDate})`;
    const seoTitle = `${startDate} ~ ${endDate} S&P 500 주요 기업 실적 발표 일정 정리`;
    const excerpt = `다음 주 S&P 500 기업 중 ${nextWeekEvents.length}개 기업의 실적 발표가 예정되어 있습니다.`;
    
    const newPost: Post = {
      id: Date.now().toString(),
      title,
      seoTitle,
      slug,
      content,
      excerpt,
      keywords: ['실적 발표', 'S&P 500', '어닝 시즌', '주식', '투자'],
      category: 'earnings', // 실적 발표 카테고리
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      earningsData, // 실적 캘린더 데이터 추가
    };
    
    await savePostV2(newPost);
    
    return NextResponse.json({ 
      success: true, 
      message: '실적 캘린더 글 생성 완료',
      postId: newPost.id,
      eventsCount: nextWeekEvents.length
    });
  } catch (error) {
    console.error('Cron 실행 실패:', error);
    await saveErrorLog('earnings-calendar', error instanceof Error ? error : String(error));
    return NextResponse.json({ 
      error: '글 생성 실패', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
