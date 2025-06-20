'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import SimpleNavigation from '@/components/SimpleNavigation'
import AuthGuard from '@/components/AuthGuard'

export default function UserCheckPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // 관리자 권한 확인
  const isAdmin = user?.email === 'admin@company.com' || 
                  user?.email?.includes('admin') || 
                  user?.email === 'bambooty57@gmail.com'

  const checkSupabaseUsers = async () => {
    setLoading(true)
    setMessage('')
    
    try {
      // Supabase Auth에서 사용자 목록 가져오기 (관리자 API 필요)
      const { data, error } = await supabase.auth.admin.listUsers()
      
      if (error) {
        setMessage(`오류: ${error.message}`)
        console.error('사용자 목록 조회 오류:', error)
      } else {
        setUsers(data.users || [])
        setMessage(`총 ${data.users?.length || 0}명의 사용자가 등록되어 있습니다.`)
      }
    } catch (error) {
      console.error('사용자 조회 중 오류:', error)
      setMessage('사용자 조회 중 오류가 발생했습니다. 관리자 권한이 필요할 수 있습니다.')
    } finally {
      setLoading(false)
    }
  }

  const checkCurrentUser = async () => {
    setLoading(true)
    setMessage('')
    
    try {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser()
      
      if (error) {
        setMessage(`현재 사용자 조회 오류: ${error.message}`)
      } else if (currentUser) {
        setMessage(`현재 로그인된 사용자: ${currentUser.email} (ID: ${currentUser.id})`)
        console.log('현재 사용자 정보:', currentUser)
      } else {
        setMessage('로그인된 사용자가 없습니다.')
      }
    } catch (error) {
      console.error('현재 사용자 조회 오류:', error)
      setMessage('현재 사용자 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const checkAdminUser = async () => {
    setLoading(true)
    setMessage('')
    
    try {
      // 특정 이메일 사용자 검색
      const { data, error } = await supabase
        .from('auth.users')
        .select('*')
        .eq('email', 'bambooty57@gmail.com')
      
      if (error) {
        setMessage(`관리자 계정 조회 오류: ${error.message}`)
        console.error('관리자 계정 조회 오류:', error)
      } else {
        if (data && data.length > 0) {
          setMessage(`관리자 계정 확인됨: ${data[0].email}`)
          console.log('관리자 계정 정보:', data[0])
        } else {
          setMessage('관리자 계정이 데이터베이스에서 찾을 수 없습니다.')
        }
      }
    } catch (error) {
      console.error('관리자 계정 조회 중 오류:', error)
      setMessage('관리자 계정 조회 중 오류가 발생했습니다. auth.users 테이블에 직접 접근할 수 없을 수 있습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (!isAdmin) {
    return (
      <AuthGuard>
        <SimpleNavigation />
        <main className="pt-20 pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
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
            <h1 className="text-3xl font-bold text-gray-900">Supabase 사용자 확인</h1>
            <p className="text-gray-600 mt-2">데이터베이스에 저장된 사용자 정보를 확인합니다</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="space-y-4">
              <div className="flex space-x-4">
                <button
                  onClick={checkCurrentUser}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? '확인 중...' : '현재 사용자 확인'}
                </button>
                
                <button
                  onClick={checkSupabaseUsers}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? '확인 중...' : '모든 사용자 목록'}
                </button>
                
                <button
                  onClick={checkAdminUser}
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? '확인 중...' : '관리자 계정 확인'}
                </button>
              </div>

              {message && (
                <div className={`p-4 rounded-md ${
                  message.includes('오류') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
                }`}>
                  {message}
                </div>
              )}

              {users.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">등록된 사용자 목록</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            이메일
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            생성일
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            상태
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                          <tr key={user.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {user.email}
                              {user.email === 'bambooty57@gmail.com' && (
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  관리자
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(user.created_at).toLocaleString('ko-KR')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.email_confirmed_at ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {user.email_confirmed_at ? '확인됨' : '미확인'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 bg-blue-50 rounded-lg p-4">
            <h3 className="text-blue-900 font-medium mb-2">참고사항</h3>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• "현재 사용자 확인": 현재 로그인된 사용자 정보를 확인합니다</li>
              <li>• "모든 사용자 목록": Supabase Auth에 등록된 모든 사용자를 확인합니다 (관리자 권한 필요)</li>
              <li>• "관리자 계정 확인": 특정 관리자 계정이 존재하는지 확인합니다</li>
              <li>• 일부 기능은 Supabase RLS 정책에 따라 제한될 수 있습니다</li>
            </ul>
          </div>
        </div>
      </main>
    </AuthGuard>
  )
} 