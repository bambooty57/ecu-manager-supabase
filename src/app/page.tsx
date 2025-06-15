'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">ECU 관리 시스템</h1>
        <p className="text-gray-600 mb-8">농기계 및 건설기계 ECU 관리 시스템에 오신 것을 환영합니다.</p>
        
        <div className="grid grid-cols-2 gap-4">
          <a 
            href="/customers" 
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            👥 고객 관리
          </a>
          <a 
            href="/equipment" 
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            🚜 장비 관리
          </a>
          <a 
            href="/work" 
            className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors"
          >
            🔧 작업 관리
          </a>
          <a 
            href="/history" 
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
          >
            📋 작업 이력
          </a>
        </div>
        
        <div className="mt-8 text-sm text-gray-500">
          <p>✅ Supabase 데이터베이스 연동</p>
          <p>✅ Excel/CSV 파일 업로드 지원</p>
          <p>✅ 실시간 데이터 관리</p>
        </div>
      </div>
    </div>
  )
}
