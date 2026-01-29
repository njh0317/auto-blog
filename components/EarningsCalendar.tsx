'use client';

import { EarningsCalendarData } from '@/lib/types';
import { useState } from 'react';

interface EarningsCalendarProps {
  data: EarningsCalendarData;
}

export default function EarningsCalendar({ data }: EarningsCalendarProps) {
  const sortedDates = Object.keys(data.eventsByDate).sort();
  
  // 주요 기업 개수
  const majorCount = Object.values(data.eventsByDate)
    .flat()
    .filter(e => e.isMajor).length;

  // 각 날짜별 펼침/접힘 상태
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  
  // 전체 펼치기/접기
  const [isAllExpanded, setIsAllExpanded] = useState(false);
  
  const toggleDate = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };
  
  const toggleAll = () => {
    if (isAllExpanded) {
      setExpandedDates(new Set());
    } else {
      setExpandedDates(new Set(sortedDates));
    }
    setIsAllExpanded(!isAllExpanded);
  };

  return (
    <div className="earnings-calendar my-8">
      {/* 요약 통계 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-900">📊 이번 주 실적 발표 요약</h3>
          <button
            onClick={toggleAll}
            className="px-4 py-2 bg-white border border-blue-300 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors"
          >
            {isAllExpanded ? '기타 기업 전체 접기 ▲' : '기타 기업 전체 펼치기 ▼'}
          </button>
        </div>
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
            <div className="text-2xl font-bold text-gray-600">
              {new Date(data.weekStart).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} ~ {new Date(data.weekEnd).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          ⭐ 메가캡 | 💎 섹터 대표 | 🔥 고관심 종목
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
          
          const isExpanded = expandedDates.has(date);

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

              {/* 주요 기업 섹션 (항상 표시) */}
              {majorEvents.length > 0 && (
                <div className="bg-amber-50 px-6 py-4 border-b border-amber-100">
                  <h5 className="text-sm font-semibold text-amber-900 mb-3">주요 기업</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {majorEvents.map(event => {
                      // 티어별 이모티콘
                      const tierIcon = event.tier === 'core' ? '⭐' : 
                                      event.tier === 'sector' ? '💎' : 
                                      event.tier === 'hot' ? '🔥' : '⭐';
                      
                      return (
                      <div key={event.symbol} className="bg-white rounded-lg p-4 shadow-sm border border-amber-200">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-bold text-gray-900 text-lg">
                              {tierIcon} {event.symbol}
                            </div>
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
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 일반 기업 테이블 (아코디언) */}
              {regularEvents.length > 0 && (
                <>
                  {/* 일반 기업 헤더 (클릭 가능) */}
                  <button
                    onClick={() => toggleDate(date)}
                    className="w-full bg-gray-50 px-6 py-3 border-b border-gray-200 hover:bg-gray-100 transition-colors text-left flex items-center justify-between"
                  >
                    <span className="text-sm font-semibold text-gray-700">
                      기타 기업 ({regularEvents.length}개)
                    </span>
                    <div className="text-xl text-gray-400">
                      {isExpanded ? '▲' : '▼'}
                    </div>
                  </button>

                  {/* 일반 기업 테이블 내용 */}
                  {isExpanded && (
                <div className="overflow-x-auto">
                  {/* 데스크탑: 2열 그리드 */}
                  <div className="hidden md:block p-4">
                    <div className="grid grid-cols-2 gap-4 auto-rows-fr">
                      {regularEvents.map((event) => (
                        <div key={event.symbol} className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="grid grid-cols-[80px_1fr_60px_80px] bg-white hover:bg-gray-50 transition-colors">
                            <div className="px-4 py-3 border-r border-gray-100">
                              <div className="font-semibold text-gray-900 text-sm">{event.symbol}</div>
                            </div>
                            <div className="px-4 py-3 border-r border-gray-100">
                              <div className="text-xs text-gray-700 line-clamp-1">{event.name}</div>
                            </div>
                            <div className="px-4 py-3 border-r border-gray-100 flex items-center justify-center">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                                event.timeOfTheDay === 'pre-market' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : event.timeOfTheDay === 'post-market'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {event.timeOfTheDay === 'pre-market' ? '장전' : event.timeOfTheDay === 'post-market' ? '장후' : '-'}
                              </span>
                            </div>
                            <div className="px-4 py-3 flex items-center justify-end">
                              <div className="text-sm font-medium text-gray-900">
                                {event.estimate ? `$${event.estimate}` : '-'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 모바일: 1열 테이블 */}
                  <table className="w-full md:hidden">
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
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* 하단 주의사항 */}
      <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-sm text-gray-600 space-y-1 mb-4">
          <div>※ 실적 발표 일정은 변경될 수 있습니다.</div>
          <div>※ 예상 EPS는 애널리스트 컨센서스 기준입니다.</div>
          <div>※ 장전: 시장 개장 전, 장후: 시장 마감 후</div>
        </div>
        
        <div className="border-t border-gray-300 pt-4 mt-4">
          <div className="text-sm font-semibold text-gray-700 mb-2">주요 기업 분류 기준</div>
          <div className="text-xs text-gray-600 space-y-2">
            <div>
              <span className="font-medium">⭐ 메가캡:</span> 시가총액 상위 글로벌 기업 (애플, 마이크로소프트, 아마존 등)
            </div>
            <div>
              <span className="font-medium">💎 섹터 대표:</span> 각 산업 섹터의 주요 기업 (반도체, 헬스케어, 금융, 소비재 등)
            </div>
            <div>
              <span className="font-medium">🔥 고관심 종목:</span> 최근 시장 주목도가 높은 기업 (높은 거래량, 변동성, 성장성)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
