export default function MobileProfileCard() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center gap-4">
        {/* 프로필 이미지 */}
        <img 
          src="/icon.png" 
          alt="프로필" 
          className="w-16 h-16 rounded-full border-2 border-gray-200 flex-shrink-0"
        />
        
        {/* 프로필 정보 */}
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-gray-900">
            코딩하다 주식하는 사람
          </h2>
          <p className="text-sm text-gray-600">
            개발자 출신 개인 투자자
          </p>
          <p className="text-xs text-gray-500 mt-1">
            매일 아침/저녁 증시 시황 업데이트
          </p>
        </div>
      </div>
      
      {/* 방문자 수 & 인기글 - 한 줄로 */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs">
        <div className="flex gap-3">
          <span className="text-gray-500">
            오늘 <span className="font-semibold text-blue-600" id="mobile-today">-</span>
          </span>
          <span className="text-gray-500">
            전체 <span className="font-semibold text-gray-900" id="mobile-total">-</span>
          </span>
        </div>
        <a href="#popular" className="text-blue-600 hover:underline">인기글 보기</a>
      </div>
      
      <script dangerouslySetInnerHTML={{
        __html: `
          (function() {
            var visited = sessionStorage.getItem('visited');
            var method = visited ? 'GET' : 'POST';
            fetch('/api/visitor', { method: method })
              .then(function(r) { return r.json(); })
              .then(function(d) {
                var today = document.getElementById('mobile-today');
                var total = document.getElementById('mobile-total');
                if (today) today.textContent = d.today.toLocaleString();
                if (total) total.textContent = d.total.toLocaleString();
                if (!visited) sessionStorage.setItem('visited', '1');
              })
              .catch(function() {});
          })();
        `
      }} />
    </div>
  );
}
