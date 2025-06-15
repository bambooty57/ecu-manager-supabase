import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ECU 튜닝 파일 관리 시스템",
  description: "농기계 ECU 튜닝 파일을 체계적으로 관리하는 시스템",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <div className="min-h-screen">
          {/* 네비게이션 */}
          <nav className="nav-modern fixed top-0 left-0 right-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex">
                  <div className="flex-shrink-0 flex items-center">
                    <Link href="/customers" className="flex items-center space-x-2 text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                        E
                      </div>
                      <span>ECU Manager</span>
                    </Link>
                  </div>
                  <div className="hidden sm:ml-6 sm:flex sm:space-x-1">
                    <Link
                      href="/customers"
                      className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 text-gray-600 hover:text-gray-900 hover:bg-white/50 hover:shadow-md"
                    >
                      <span className="text-lg">👥</span>
                      <span>고객 관리</span>
                    </Link>
                    <Link
                      href="/equipment"
                      className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 text-gray-600 hover:text-gray-900 hover:bg-white/50 hover:shadow-md"
                    >
                      <span className="text-lg">🚜</span>
                      <span>장비 관리</span>
                    </Link>
                    <Link
                      href="/work"
                      className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 text-gray-600 hover:text-gray-900 hover:bg-white/50 hover:shadow-md"
                    >
                      <span className="text-lg">⚙️</span>
                      <span>작업 등록</span>
                    </Link>
                    <Link
                      href="/history"
                      className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 text-gray-600 hover:text-gray-900 hover:bg-white/50 hover:shadow-md"
                    >
                      <span className="text-lg">📋</span>
                      <span>작업 이력</span>
                    </Link>
                  </div>
                </div>
                
                {/* 우측 메뉴 */}
                <div className="flex items-center space-x-4">
                  <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>시스템 정상</span>
                  </div>
                  <button className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-all duration-300 hover:scale-110">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </nav>
          
          {/* 메인 컨텐츠 */}
          <main className="pt-20 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="animate-fadeIn">
                {children}
              </div>
            </div>
          </main>
          
          {/* 푸터 */}
          <footer className="glass mt-auto py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  © 2024 ECU Manager. 농기계 전문 튜닝 시스템
                </div>
                <div className="flex space-x-4 text-sm text-gray-600">
                  <span>버전 1.0.0</span>
                  <span>•</span>
                  <span>Supabase 연동</span>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
