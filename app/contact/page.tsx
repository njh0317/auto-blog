export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">문의</h1>
      
      <div className="prose prose-gray">
        <p className="mb-6">
          블로그 관련 문의사항이 있으시면 아래 이메일로 연락해 주세요.
        </p>
        
        <div className="bg-gray-100 p-6 rounded-lg">
          <p className="text-lg">
            📧 <a href="mailto:njnjh0317@gmail.com" className="text-blue-600 hover:underline">
              njnjh0317@gmail.com
            </a>
          </p>
        </div>
        
        <p className="mt-6 text-sm text-gray-500">
          문의 주신 내용은 확인 후 빠른 시일 내에 답변 드리겠습니다.
        </p>
      </div>
    </div>
  );
}
