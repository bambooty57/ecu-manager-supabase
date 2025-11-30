'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import Image from 'next/image'

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
    <nav className="bg-white/90 backdrop-blur-md shadow-xl fixed top-0 left-0 right-0 z-50 border-b-2 border-slate-300">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-24">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-4 hover:opacity-80 transition-opacity duration-200">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <Image
                    src="/track-force-logo.png"
                    alt="Track-Force Logo"
                    fill
                    className="object-contain"
                    priority
                    onError={(e) => {
                      // 이미지 로드 실패 시 숨김 처리
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
                <h1 className="text-4xl font-bold text-slate-800 tracking-tight">Track-Force</h1>
              </Link>
            </div>
            <div className="hidden md:ml-16 md:flex md:space-x-6">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`inline-flex items-center px-5 py-3 border-b-3 text-2xl font-bold transition-all duration-200 ${
                    item.current
                      ? 'border-blue-500 text-slate-800 bg-blue-50 rounded-t-xl'
                      : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-800 hover:bg-slate-50 rounded-xl'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden md:flex md:items-center md:space-x-6">
            <span className="text-xl text-slate-700 font-bold">
              {user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-4 rounded-2xl text-xl font-bold hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
            >
              로그아웃
            </button>
          </div>

          {/* 모바일 메뉴 버튼 */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-3 rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-all duration-200"
            >
              <svg
                className="h-8 w-8"
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
          <div className="px-6 pt-6 pb-8 space-y-3 sm:px-8 bg-white/95 backdrop-blur-md border-t-2 border-slate-300">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`block px-6 py-4 rounded-2xl text-2xl font-bold transition-all duration-200 ${
                  item.current
                    ? 'text-blue-700 bg-blue-100 shadow-lg'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div className="px-6 py-6 border-t-2 border-slate-300 mt-6">
              <div className="text-xl text-slate-600 mb-5 font-bold">{user?.email}</div>
              <button
                onClick={handleSignOut}
                className="w-full text-center bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-4 rounded-2xl text-xl font-bold hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
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