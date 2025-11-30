'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'

export default function Navigation() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('로그아웃 오류:', error)
    }
  }

  const navigation = [
    { name: '홈', href: '/', current: pathname === '/' },
    { name: '고객 관리', href: '/customers', current: pathname === '/customers' },
    { name: '장비 관리', href: '/equipment', current: pathname === '/equipment' },
    { name: '작업 등록', href: '/work', current: pathname === '/work' },
    { name: '작업 이력', href: '/history', current: pathname === '/history' },
  ]

  return (
    <nav className="bg-white/90 backdrop-blur-md shadow-xl fixed top-0 left-0 right-0 z-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-slate-700 tracking-tight">Tuning Box</h1>
            </div>
            <div className="hidden md:ml-12 md:flex md:space-x-10">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`inline-flex items-center px-3 py-2 border-b-3 text-lg font-semibold transition-all duration-200 ${
                    item.current
                      ? 'border-sky-500 text-slate-800 bg-sky-50 rounded-t-lg'
                      : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-800 hover:bg-slate-50 rounded-lg'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden md:flex md:items-center md:space-x-6">
            <span className="text-lg text-slate-700 font-medium">
              {user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl text-lg font-semibold hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              로그아웃
            </button>
          </div>

          {/* 모바일 메뉴 버튼 */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <svg
                className="h-6 w-6"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 24 24"
              >
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-4 pt-4 pb-6 space-y-2 sm:px-6 bg-white/95 backdrop-blur-md border-t border-slate-200">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`block px-4 py-3 rounded-xl text-lg font-semibold transition-all duration-200 ${
                  item.current
                    ? 'text-sky-700 bg-sky-100 shadow-md'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div className="px-4 py-4 border-t border-slate-200 mt-4">
              <div className="text-lg text-slate-600 mb-4 font-medium">{user?.email}</div>
              <button
                onClick={handleSignOut}
                className="w-full text-center bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-3 rounded-xl text-lg font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-200"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
} 