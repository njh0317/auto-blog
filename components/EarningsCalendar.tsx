'use client';

import { EarningsCalendarData } from '@/lib/types';

interface EarningsCalendarProps {
  data: EarningsCalendarData;
}

export default function EarningsCalendar({ data }: EarningsCalendarProps) {
  const sortedDates = Object.keys(data.eventsByDate).sort();
  
  // 주요 기업 개수
  const majorCount = Object.values(data.eventsByDate)
    .flat()
    .filter(e => e.isMajor).length;

  return (
    <div className="earnings-calendar my-8">
      {/* 요약 통계 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-3">📊 이번 주 실적 발표 요약</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">전체 기업</div>
            <div className="text-2xl font-bold text-blue-600">{data.totalCount}개</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">주요 기업</div>
            <div className="text-2xl font-bold text-indigo-600">{majorCount}개</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm col-span-2 md:col-span-1">
            <div className="text-sm text-gray-600 mb-1">기간</div>
            <div className="text-sm font-semibold text-gray-800">
              {new Date(data.weekStart).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} ~ {new Date(data.weekEnd).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          ⭐ 표시는 시가총액 상위 및 주목도 높은 기업입니다
        </div>
      </div>

      {/* 날짜별 실적 발표 */}
      <div className="space-y-6">
        {sortedDates.map(date => {
          const dateObj = new Date(date);
          const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][dateObj.getDay()];
          const formattedDate = `${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일 (${dayOfWeek})`;
          const events = data.eventsByDate[date];
          
          // 주요 기업과 일반 기업 분리
          const majorEvents = events.filter(e => e.isMajor);
          const regularEvents = events.filter(e => !e.isMajor);

          return (
            <div key={date} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* 날짜 헤더 */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                <h4 className="text-lg font-bold text-gray-900">📅 {formattedDate}</h4>
                <div className="text-sm text-gray-600 mt-1">
                  {events.length}개 기업 발표 예정
                  {majorEvents.length > 0 && ` (주요 기업 ${majorEvents.length}개)`}
                </div>
              </div>

              {/* 주요 기업 섹션 */}
              {majorEvents.length > 0 && (
                <div className="bg-amber-50 px-6 py-4 border-b border-amber-100">
                  <h5 className="text-sm font-semibold text-amber-900 mb-3">⭐ 주요 기업</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {majorEvents.map(event => (
                      <div key={event.symbol} className="bg-white rounded-lg p-4 shadow-sm border border-amber-200">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-bold text-gray-900 text-lg">{event.symbol}</div>
                            <div className="text-sm text-gray-600 line-clamp-1">{event.name}</div>
                          </div>
                          {event.timeOfTheDay && (
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              event.timeOfTheDay === 'pre-market' 
                                ? 'bg-blue-100 text-blue-700' 
                                : event.timeOfTheDay === 'post-market'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {event.timeOfTheDay === 'pre-market' ? '장전' : event.timeOfTheDay === 'post-market' ? '장후' : '-'}
                            </span>
                          )}
                        </div>
                        {event.estimate && (
                          <div className="text-sm text-gray-700">
                            <span className="text-gray-500">예상 EPS:</span> <span className="font-semibold">${event.estimate}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 일반 기업 테이블 */}
              {regularEvents.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">티커</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">기업명</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">시간</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">예상 EPS</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {regularEvents.map(event => (
                        <tr key={event.symbol} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-semibold text-gray-900">{event.symbol}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-700 line-clamp-2">{event.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              event.timeOfTheDay === 'pre-market' 
                                ? 'bg-blue-100 text-blue-700' 
                                : event.timeOfTheDay === 'post-market'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {event.timeOfTheDay === 'pre-market' ? '장전' : event.timeOfTheDay === 'post-market' ? '장후' : '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="text-sm font-medium text-gray-900">
                              {event.estimate ? `$${event.estimate}` : '-'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 하단 주의사항 */}
      <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-sm text-gray-600 space-y-1">
          <div>※ 실적 발표 일정은 변경될 수 있습니다.</div>
          <div>※ 예상 EPS는 애널리스트 컨센서스 기준입니다.</div>
          <div>※ 장전: 시장 개장 전, 장후: 시장 마감 후</div>
        </div>
      </div>
    </div>
  );
}
