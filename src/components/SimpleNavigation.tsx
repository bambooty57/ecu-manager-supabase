'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function SimpleNavigation() {
  const [mounted, setMounted] = useState(false)
  const [currentPath, setCurrentPath] = useState('/')
  const { user, loading, signOut } = useAuth()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMounted(true)
      setCurrentPath(window.location.pathname)
    }
  }, [])

  const handleSignOut = async () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      await signOut()
    }
  }

  // 마운트되지 않았으면 null 반환
  if (!mounted) {
    return null
  }

  // 로그인 페이지에서는 네비게이션을 표시하지 않음
  if (currentPath === '/login' || currentPath === '/auth/callback') {
    return null
  }

  return (
    <nav className="nav-modern fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center space-x-2 text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                  E
                </div>
                <span>ECU Manager</span>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-1">
              <Link 
                href="/customers" 
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
                  currentPath === '/customers' 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 hover:shadow-md'
                }`}
              >
                <span className="text-lg">👥</span>
                <span>고객 관리</span>
              </Link>
              <Link 
                href="/equipment" 
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
                  currentPath === '/equipment' 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 hover:shadow-md'
                }`}
              >
                <span className="text-lg">🚜</span>
                <span>장비 관리</span>
              </Link>
              <Link 
                href="/work" 
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
                  currentPath === '/work' 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 hover:shadow-md'
                }`}
              >
                <span className="text-lg">⚙️</span>
                <span>작업 등록</span>
              </Link>
              <Link 
                href="/history" 
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
                  currentPath === '/history' 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 hover:shadow-md'
                }`}
              >
                <span className="text-lg">📋</span>
                <span>작업 이력</span>
              </Link>
              
              {/* 관리자 메뉴 (관리자만 표시) */}
              {(user?.email === 'admin@company.com' || 
                user?.email?.includes('admin') || 
                user?.email === 'bambooty57@gmail.com') && (
                <Link 
                  href="/admin" 
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
                    currentPath === '/admin' 
                      ? 'text-red-600 bg-red-50' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 hover:shadow-md'
                  }`}
                >
                  <span className="text-lg">🔒</span>
                  <span>관리자</span>
                </Link>
              )}
            </div>
          </div>
          
          {/* 우측 메뉴 */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>시스템 정상</span>
            </div>
            
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    {user.user_metadata?.avatar_url ? (
                      <img 
                        src={user.user_metadata.avatar_url} 
                        alt="프로필" 
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <span className="text-blue-600 font-medium">
                        {user.email?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="font-medium">{user.user_metadata?.full_name || user.email}</span>
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={loading}
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-all duration-300 hover:scale-110 disabled:opacity-50"
                  title="로그아웃"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-all duration-300 hover:scale-110"
                title="로그인"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1" />
                </svg>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
} 