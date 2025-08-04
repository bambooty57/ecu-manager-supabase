'use client'

import { useState, useEffect } from 'react'

interface DarkModeToggleProps {
  className?: string
}

export default function DarkModeToggle({ className = '' }: DarkModeToggleProps) {
  const [darkMode, setDarkMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // 로컬 스토리지에서 다크 모드 설정 확인
    const savedDarkMode = localStorage.getItem('darkMode')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    const isDarkMode = savedDarkMode !== null 
      ? JSON.parse(savedDarkMode) 
      : prefersDark
    
    setDarkMode(isDarkMode)
    
    // 다크 모드 클래스 적용
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    
    // 로컬 스토리지에 설정 저장
    localStorage.setItem('darkMode', JSON.stringify(newDarkMode))
    
    // 다크 모드 클래스 토글
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // SSR을 위한 마운트 확인
  if (!mounted) {
    return (
      <div className={`w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 ${className}`} />
    )
  }

  return (
    <button
      onClick={toggleDarkMode}
      className={`
        fixed bottom-4 right-4 p-2 rounded-full 
        bg-white dark:bg-gray-800 
        shadow-lg hover:shadow-xl
        border border-gray-200 dark:border-gray-600
        transition-all duration-300 ease-in-out
        hover:scale-110 focus:scale-110
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        dark:focus:ring-offset-gray-800
        z-50
        ${className}
      `}
      aria-label="다크 모드 전환"
      title={darkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
    >
      {darkMode ? (
        // 라이트 모드 아이콘 (태양)
        <svg 
          className="w-6 h-6 text-yellow-500" 
          fill="currentColor" 
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path 
            fillRule="evenodd" 
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" 
            clipRule="evenodd" 
          />
        </svg>
      ) : (
        // 다크 모드 아이콘 (달)
        <svg 
          className="w-6 h-6 text-gray-700" 
          fill="currentColor" 
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
    </button>
  )
} 