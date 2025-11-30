'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { testSupabaseConnection } from '@/lib/supabase'

export default function LoginPage() {
  const { signInWithEmail } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      console.log('🔧 로그인 시도:', formData.email)
      await signInWithEmail(formData.email, formData.password)
      console.log('✅ 로그인 성공')
    } catch (error: any) {
      console.error('❌ 로그인 실패:', error)
      
      // 오류 메시지 개선
      let errorMessage = '로그인에 실패했습니다.'
      
      if (error.message) {
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.'
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = '이메일 인증이 필요합니다.'
        } else if (error.message.includes('권한이 없는 사용자')) {
          errorMessage = '권한이 없는 사용자입니다.'
        } else {
          errorMessage = `로그인 실패: ${error.message}`
        }
      }
      
      setMessage(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async () => {
    setMessage('Supabase 연결을 테스트하는 중...')
    const result = await testSupabaseConnection()
    if (result) {
      setMessage('✅ Supabase 연결 성공! 데이터베이스에 정상적으로 접근할 수 있습니다.')
    } else {
      setMessage('❌ Supabase 연결 실패. 브라우저 콘솔에서 자세한 오류를 확인하세요.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-800 mb-2 sm:mb-3">Tuning Box</h1>
          <h2 className="text-xl sm:text-2xl text-slate-600 mb-6 sm:mb-8 md:mb-10">로그인</h2>
        </div>
      </div>

      <div className="mt-4 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/80 backdrop-blur-sm py-6 sm:py-8 md:py-10 px-4 sm:px-6 md:px-8 lg:px-12 shadow-xl rounded-xl sm:rounded-2xl border border-white/20">
          <form onSubmit={handleSignIn} className="space-y-4 sm:space-y-5 md:space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm sm:text-base font-medium text-gray-300 mb-1 sm:mb-2">
                이메일 주소
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-600 bg-gray-700 text-white text-sm sm:text-base rounded-lg sm:rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="bambooty57@gmail.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm sm:text-base font-medium text-gray-300 mb-1 sm:mb-2">
                비밀번호
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 sm:pr-12 border border-gray-600 bg-gray-700 text-white text-sm sm:text-base rounded-lg sm:rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="비밀번호를 입력하세요"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 sm:py-3 px-4 border border-transparent rounded-lg sm:rounded-md shadow-sm text-sm sm:text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? '로그인 중...' : '로그인'}
              </button>
            </div>

            <div>
              <button
                type="button"
                onClick={handleTestConnection}
                className="w-full flex justify-center py-2.5 sm:py-3 px-4 border border-gray-600 rounded-lg sm:rounded-md shadow-sm text-sm sm:text-base font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                🧪 Supabase 연결 테스트
              </button>
            </div>
          </form>

          {message && (
            <div className={`mt-4 p-4 rounded-md text-sm ${
              message.includes('✅') ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 