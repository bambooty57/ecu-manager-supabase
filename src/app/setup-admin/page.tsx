'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SetupAdminPage() {
  const [formData, setFormData] = useState({
    email: 'bambooty57@gmail.com',
    password: 'chs72197219!'
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password
      })

      if (error) {
        setMessage(`오류: ${error.message}`)
      } else {
        setMessage(`관리자 계정이 생성되었습니다! 이메일: ${formData.email}`)
      }
    } catch (error) {
      setMessage('계정 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">관리자 계정 생성</h1>
          <p className="text-gray-600">개발/테스트용 관리자 계정을 생성합니다</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleCreateAdmin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                관리자 이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="admin@test.com"
              />
              <p className="mt-1 text-xs text-gray-500">
                'admin'이 포함된 이메일이어야 합니다
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                minLength={6}
              />
              <p className="mt-1 text-xs text-gray-500">
                최소 6자 이상
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '생성 중...' : '관리자 계정 생성'}
            </button>

            {message && (
              <div className={`text-center text-sm ${
                message.includes('오류') ? 'text-red-600' : 'text-green-600'
              }`}>
                {message}
              </div>
            )}
          </form>

          <div className="mt-6 border-t border-gray-200 pt-6">
            <div className="text-center">
              <a
                href="/login"
                className="text-blue-600 hover:text-blue-500 text-sm"
              >
                로그인 페이지로 이동
              </a>
            </div>
          </div>

          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="text-yellow-800 text-xs">
              <p className="font-medium mb-1">⚠️ 주의사항:</p>
              <ul className="space-y-1">
                <li>• 이 페이지는 개발/테스트용입니다</li>
                <li>• 운영 환경에서는 삭제하세요</li>
                <li>• 관리자 계정은 신중하게 관리하세요</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 