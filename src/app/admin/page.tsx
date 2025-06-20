'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import SimpleNavigation from '@/components/SimpleNavigation'
import AuthGuard from '@/components/AuthGuard'

export default function AdminPage() {
  const { user } = useAuth()
  const [allowedEmails, setAllowedEmails] = useState<string[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [loginLogs, setLoginLogs] = useState<any[]>([])

  // 관리자 권한 확인 (예시: 특정 이메일만 관리자)
  const isAdmin = user?.email === 'admin@company.com' || 
                  user?.email?.includes('admin') || 
                  user?.email === 'bambooty57@gmail.com'

  useEffect(() => {
    // 허용된 이메일 목록 로드 (실제로는 DB에서 가져와야 함)
    const savedEmails = localStorage.getItem('allowedEmails')
    if (savedEmails) {
      setAllowedEmails(JSON.parse(savedEmails))
    }

    // 로그인 로그 로드 (실제로는 DB에서 가져와야 함)
    const savedLogs = localStorage.getItem('loginLogs')
    if (savedLogs) {
      setLoginLogs(JSON.parse(savedLogs))
    }
  }, [])

  const addAllowedEmail = () => {
    if (newEmail && !allowedEmails.includes(newEmail)) {
      const updated = [...allowedEmails, newEmail]
      setAllowedEmails(updated)
      localStorage.setItem('allowedEmails', JSON.stringify(updated))
      setNewEmail('')
      alert('이메일이 허용 목록에 추가되었습니다.')
    }
  }

  const removeAllowedEmail = (email: string) => {
    if (confirm(`${email}을 허용 목록에서 제거하시겠습니까?`)) {
      const updated = allowedEmails.filter(e => e !== email)
      setAllowedEmails(updated)
      localStorage.setItem('allowedEmails', JSON.stringify(updated))
      alert('이메일이 허용 목록에서 제거되었습니다.')
    }
  }

  if (!isAdmin) {
    return (
      <AuthGuard>
        <SimpleNavigation />
        <main className="pt-20 pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">접근 권한 없음</h1>
              <p className="text-gray-600">관리자 권한이 필요한 페이지입니다.</p>
            </div>
          </div>
        </main>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <SimpleNavigation />
      <main className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">시스템 관리</h1>
            <p className="text-gray-600 mt-2">사용자 권한 및 접근 로그 관리</p>
            
            <div className="mt-4">
              <a
                href="/admin/user-check"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Supabase 사용자 확인
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 허용된 이메일 관리 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">허용된 이메일 관리</h2>
              
              <div className="mb-4">
                <div className="flex space-x-2">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="이메일 주소 입력"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={addAllowedEmail}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    추가
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium text-gray-700">허용된 이메일 목록</h3>
                {allowedEmails.length === 0 ? (
                  <p className="text-gray-500 text-sm">허용된 이메일이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {allowedEmails.map((email) => (
                      <div key={email} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                        <span className="text-sm">{email}</span>
                        <button
                          onClick={() => removeAllowedEmail(email)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          제거
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 접근 로그 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">최근 로그인 시도</h2>
              
              <div className="space-y-2">
                {loginLogs.length === 0 ? (
                  <p className="text-gray-500 text-sm">로그인 기록이 없습니다.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {loginLogs.slice(-10).reverse().map((log, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded text-sm">
                        <div>
                          <span className="font-medium">{log.email}</span>
                          <span className="text-gray-500 ml-2">{log.timestamp}</span>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${
                          log.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {log.success ? '성공' : '실패'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 보안 정책 안내 */}
          <div className="mt-8 bg-blue-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-3">보안 정책</h2>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• 허용되지 않은 이메일은 로그인이 차단됩니다</li>
              <li>• 5회 연속 로그인 실패 시 15분간 계정이 잠깁니다</li>
              <li>• 모든 로그인 시도가 기록됩니다</li>
              <li>• 개발 환경에서는 모든 이메일이 허용됩니다</li>
            </ul>
          </div>
        </div>
      </main>
    </AuthGuard>
  )
} 