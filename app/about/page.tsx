export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">소개</h1>
      
      <div className="prose prose-gray">
        <p className="mb-4">
          안녕하세요, <strong>코딩하다 주식하는 사람</strong> 블로그입니다.
        </p>
        
        <p className="mb-4">
          이 블로그는 매일 미국 증시와 한국 증시의 마감 시황을 정리하여 
          투자자분들께 유용한 정보를 제공하기 위해 운영되고 있습니다.
        </p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">제공하는 정보</h2>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>미국 3대 지수 (다우존스, 나스닥, S&P500) 일일 시황</li>
          <li>한국 증시 (코스피, 코스닥) 마감 시황</li>
          <li>환율, 원자재, 채권 동향</li>
          <li>주요 빅테크 기업 주가 변동</li>
          <li>Fear & Greed Index 분석</li>
          <li>모닝 브리핑 - 오늘의 주요 경제 뉴스</li>
        </ul>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">운영 목적</h2>
        <p className="mb-4">
          복잡한 시장 정보를 쉽고 빠르게 파악할 수 있도록 정리하여, 
          바쁜 투자자분들이 효율적으로 시장 동향을 확인할 수 있도록 돕는 것이 목표입니다.
        </p>
        
        <p className="text-sm text-gray-500 mt-8">
          ※ 본 블로그의 정보는 투자 권유가 아니며, 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.
        </p>
      </div>
    </div>
  );
}
