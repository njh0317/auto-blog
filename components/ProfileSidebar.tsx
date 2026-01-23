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
      
      {/* 방문자 수 */}
      <VisitorCounter />
      
      {/* 구분선 */}
      <hr className="my-4" />
      
      {/* 인기글 */}
      <PopularPosts />
      
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

// 방문자 카운터 클라이언트 컴포넌트
function VisitorCounter() {
  return (
    <div className="text-center">
      <p className="text-xs text-gray-500 mb-2">방문자</p>
      <div className="flex justify-center gap-4 text-sm">
        <div>
          <span className="text-gray-500">오늘</span>
          <span className="ml-1 font-semibold text-blue-600" id="today-visitors">-</span>
        </div>
        <div>
          <span className="text-gray-500">전체</span>
          <span className="ml-1 font-semibold text-gray-900" id="total-visitors">-</span>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{
        __html: `
          (function() {
            var visited = sessionStorage.getItem('visited');
            var method = visited ? 'GET' : 'POST';
            fetch('/api/visitor', { method: method })
              .then(function(r) { return r.json(); })
              .then(function(d) {
                document.getElementById('today-visitors').textContent = d.today.toLocaleString();
                document.getElementById('total-visitors').textContent = d.total.toLocaleString();
                if (!visited) sessionStorage.setItem('visited', '1');
              })
              .catch(function() {});
          })();
        `
      }} />
    </div>
  );
}

// 인기글 컴포넌트
function PopularPosts() {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">인기글</p>
      <div id="popular-posts" className="space-y-2 text-sm">
        <p className="text-gray-400 text-xs">로딩중...</p>
      </div>
      <script dangerouslySetInnerHTML={{
        __html: `
          (function() {
            fetch('/api/posts/popular')
              .then(function(r) { return r.json(); })
              .then(function(posts) {
                var container = document.getElementById('popular-posts');
                if (posts.length === 0) {
                  container.innerHTML = '<p class="text-gray-400 text-xs">아직 데이터가 없습니다</p>';
                  return;
                }
                container.innerHTML = posts.map(function(p, i) {
                  return '<a href="/posts/' + p.slug + '" class="block hover:text-blue-600 truncate">' +
                    '<span class="text-gray-400 mr-1">' + (i + 1) + '.</span>' +
                    '<span class="text-gray-700">' + p.title + '</span>' +
                  '</a>';
                }).join('');
              })
              .catch(function() {
                document.getElementById('popular-posts').innerHTML = '<p class="text-gray-400 text-xs">로드 실패</p>';
              });
          })();
        `
      }} />
    </div>
  );
}
