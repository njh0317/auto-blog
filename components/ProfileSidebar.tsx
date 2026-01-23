export default function ProfileSidebar() {
  return (
    <aside className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
      {/* 프로필 이미지 */}
      <div className="flex justify-center mb-4">
        <img 
          src="/icon.png" 
          alt="프로필" 
          className="w-24 h-24 rounded-full border-2 border-gray-200"
        />
      </div>
      
      {/* 닉네임 */}
      <h2 className="text-lg font-bold text-center text-gray-900 mb-2">
        코딩하다 주식하는 사람
      </h2>
      
      {/* 한 줄 소개 */}
      <p className="text-sm text-gray-600 text-center mb-4">
        개발자 출신 개인 투자자
      </p>
      
      {/* 구분선 */}
      <hr className="my-4" />
      
      {/* 소개글 */}
      <div className="text-sm text-gray-700 space-y-3">
        <p>
          안녕하세요. 10년차 개발자이자 주식 투자자입니다.
        </p>
        <p>
          바쁜 직장인들을 위해 매일 아침/저녁 증시 시황을 정리해서 올리고 있어요.
        </p>
        <p>
          출퇴근길 5분이면 시장 흐름 파악 끝!
        </p>
      </div>
      
      {/* 구분선 */}
      <hr className="my-4" />
      
      {/* 블로그 정보 */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>매일 업데이트</p>
        <p>한국증시 / 미국증시 / 모닝브리핑</p>
      </div>
    </aside>
  );
}
