export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">🎉 서버 정상 작동!</h1>
        <p className="text-gray-600 mb-6">Next.js 서버가 정상적으로 실행되고 있습니다.</p>
        <div className="space-y-4">
          <a 
            href="/login" 
            className="block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
          >
            로그인 페이지로 이동
          </a>
          <a 
            href="/" 
            className="block bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700 transition-colors"
          >
            메인 페이지로 이동
          </a>
        </div>
      </div>
    </div>
  )
} 