'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  // ✅ 개발 환경 체크 최적화
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                       (typeof window !== 'undefined' && 
                        (window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1'))
  
  useEffect(() => {
    // ✅ 개발 환경에서는 인증 우회
    if (isDevelopment) {
      console.log('🔧 개발 모드: 인증 우회 활성화됨')
      return
    }
    
    // ✅ 프로덕션 환경에서만 인증 체크
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router, isDevelopment])

  // ✅ 개발 환경에서는 즉시 렌더링
  if (isDevelopment) {
    return <>{children}</>
  }

  // ✅ 로딩 중일 때만 로딩 화면 표시
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">인증 상태 확인 중...</p>
        </div>
      </div>
    )
  }

  // ✅ 사용자가 없으면 null 반환
  if (!user) {
    return null
  }

  // ✅ bambooty57@gmail.com만 허용 (프로덕션 환경에서만)
  if (user.email?.toLowerCase() !== 'bambooty57@gmail.com') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">접근 권한 없음</h1>
          <p className="text-gray-600">이 시스템은 관리자만 사용할 수 있습니다.</p>
          <button
            onClick={() => router.push('/login')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            로그인 페이지로 이동
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
} 