export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">개인정보처리방침</h1>
      
      <div className="prose prose-gray text-sm">
        <p className="mb-4">
          본 개인정보처리방침은 wisdomslab.com(이하 &quot;사이트&quot;)에서 수집하는 개인정보의 
          처리에 관한 사항을 규정합니다.
        </p>
        
        <h2 className="text-lg font-semibold mt-8 mb-4">1. 수집하는 개인정보</h2>
        <p className="mb-4">
          본 사이트는 서비스 제공을 위해 다음과 같은 정보를 자동으로 수집할 수 있습니다:
        </p>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>방문 기록 (IP 주소, 브라우저 종류, 방문 시간)</li>
          <li>쿠키 정보</li>
        </ul>
        
        <h2 className="text-lg font-semibold mt-8 mb-4">2. 개인정보의 이용 목적</h2>
        <p className="mb-4">수집된 정보는 다음 목적으로 사용됩니다:</p>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>사이트 이용 통계 분석</li>
          <li>서비스 개선</li>
          <li>광고 제공 (Google AdSense)</li>
        </ul>
        
        <h2 className="text-lg font-semibold mt-8 mb-4">3. 쿠키(Cookie) 사용</h2>
        <p className="mb-4">
          본 사이트는 Google AdSense를 통해 광고를 제공하며, 이 과정에서 쿠키가 사용될 수 있습니다.
          Google의 광고 쿠키 사용에 대한 자세한 내용은{' '}
          <a 
            href="https://policies.google.com/technologies/ads" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Google 광고 정책
          </a>
          을 참조하세요.
        </p>
        <p className="mb-4">
          사용자는 브라우저 설정을 통해 쿠키 사용을 거부할 수 있으나, 
          이 경우 일부 서비스 이용에 제한이 있을 수 있습니다.
        </p>
        
        <h2 className="text-lg font-semibold mt-8 mb-4">4. 개인정보의 보관 및 파기</h2>
        <p className="mb-4">
          수집된 개인정보는 수집 목적이 달성된 후 지체 없이 파기됩니다.
        </p>
        
        <h2 className="text-lg font-semibold mt-8 mb-4">5. 제3자 제공</h2>
        <p className="mb-4">
          본 사이트는 사용자의 개인정보를 제3자에게 제공하지 않습니다. 
          단, 법령에 의해 요구되는 경우는 예외로 합니다.
        </p>
        
        <h2 className="text-lg font-semibold mt-8 mb-4">6. 이용자의 권리</h2>
        <p className="mb-4">
          이용자는 언제든지 자신의 개인정보에 대해 열람, 수정, 삭제를 요청할 수 있습니다.
          관련 문의는 <a href="mailto:njnjh0317@gmail.com" className="text-blue-600 hover:underline">njnjh0317@gmail.com</a>으로 연락해 주세요.
        </p>
        
        <h2 className="text-lg font-semibold mt-8 mb-4">7. 개인정보처리방침의 변경</h2>
        <p className="mb-4">
          본 개인정보처리방침은 법령 또는 서비스 변경에 따라 수정될 수 있으며, 
          변경 시 사이트를 통해 공지합니다.
        </p>
        
        <p className="mt-8 text-gray-500">
          시행일: 2026년 1월 23일
        </p>
      </div>
    </div>
  );
}
