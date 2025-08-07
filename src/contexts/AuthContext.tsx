'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { recordLoginAttempt, logLoginAttempt } from '@/lib/security'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<{ success: boolean; message: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // ✅ 개발 환경 체크 최적화
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                       (typeof window !== 'undefined' && 
                        (window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1'))

  useEffect(() => {
    console.log('🔍 AuthContext 초기화 시작')
    console.log('🔍 NODE_ENV:', process.env.NODE_ENV)
    console.log('🔍 hostname:', typeof window !== 'undefined' ? window.location.hostname : 'undefined')
    console.log('🔍 isDevelopment:', isDevelopment)
    
    // ✅ 개발 환경에서도 로그인 필요 (자동 로그인 비활성화)
    if (isDevelopment) {
      console.log('🚀 개발 환경: 로그인 필요')
      setLoading(false)
      return
    }

    // ✅ 프로덕션 환경에서만 세션 확인
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('세션 확인 오류:', error)
          setUser(null)
        } else if (session?.user) {
          // bambooty57@gmail.com만 허용
          if (session.user.email?.toLowerCase() === 'bambooty57@gmail.com') {
            console.log('✅ 관리자 로그인 확인:', session.user.email)
            setUser(session.user)
          } else {
            console.log('❌ 권한 없는 사용자:', session.user.email)
            await supabase.auth.signOut()
            setUser(null)
          }
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('초기 세션 확인 실패:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    // ✅ 프로덕션 환경에서만 세션 확인 및 리스너 설정
    if (!isDevelopment) {
      getInitialSession()

      // ✅ 인증 상태 변경 리스너 최적화
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('🔄 인증 상태 변경:', event, session?.user?.email)
          
          if (session?.user) {
            // bambooty57@gmail.com만 허용
            if (session.user.email?.toLowerCase() === 'bambooty57@gmail.com') {
              console.log('✅ 관리자 인증 성공:', session.user.email)
              setUser(session.user)
              
              // 로그인 페이지에서만 홈으로 리다이렉트
              if (event === 'SIGNED_IN' && window.location.pathname === '/login') {
                router.push('/')
              }
            } else {
              console.log('❌ 권한 없는 사용자:', session.user.email)
              await supabase.auth.signOut()
              setUser(null)
            }
          } else {
            setUser(null)
          }
        }
      )

      return () => subscription.unsubscribe()
    }
  }, [isDevelopment, router])

  // ✅ 개발 환경에서도 실제 로그인 처리
  const signInWithGoogle = async () => {
    if (isDevelopment) {
      console.log('🔧 개발 모드: Google 로그인 처리')
      // 개발 환경에서도 실제 로그인 시도
    }
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (error) {
        console.error('Google 로그인 오류:', error)
        throw error
      }
    } catch (error) {
      console.error('Google 로그인 실패:', error)
      throw error
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    if (isDevelopment) {
      console.log('🔧 개발 모드: 이메일 로그인 처리')
      // 개발 환경에서도 실제 로그인 시도
    }
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        console.error('이메일 로그인 오류:', error)
        throw error
      }
    } catch (error) {
      console.error('이메일 로그인 실패:', error)
      throw error
    }
  }

  const signUpWithEmail = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    if (isDevelopment) {
      console.log('🔧 개발 모드: 회원가입 처리')
      // 개발 환경에서도 실제 회원가입 시도
    }
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password
      })
      
      if (error) {
        console.error('회원가입 오류:', error)
        return { success: false, message: error.message }
      }
      
      return { success: true, message: '회원가입이 완료되었습니다. 이메일을 확인해주세요.' }
    } catch (error) {
      console.error('회원가입 실패:', error)
      return { success: false, message: '회원가입 중 오류가 발생했습니다.' }
    }
  }

  const signOut = async () => {
    if (isDevelopment) {
      console.log('🔧 개발 모드: 로그아웃 처리')
      // 개발 환경에서도 실제 로그아웃 처리
    }
    
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('로그아웃 오류:', error)
        throw error
      }
      
      setUser(null)
      router.push('/login')
    } catch (error) {
      console.error('로그아웃 실패:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 