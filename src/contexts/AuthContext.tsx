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

  useEffect(() => {
    // 초기 세션 확인
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

    getInitialSession()

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 인증 상태 변경:', event, session?.user?.email)
        
        if (session?.user) {
          // bambooty57@gmail.com만 허용
          if (session.user.email?.toLowerCase() === 'bambooty57@gmail.com') {
            console.log('✅ 관리자 인증 성공:', session.user.email)
            setUser(session.user)
            
            if (event === 'SIGNED_IN') {
              router.push('/')
            }
          } else {
            console.log('❌ 권한 없는 사용자, 로그아웃 처리:', session.user.email)
            await supabase.auth.signOut()
            setUser(null)
          }
        } else {
          console.log('🚪 로그아웃 상태')
          setUser(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [router])

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) throw error
  }

  const signInWithEmail = async (email: string, password: string) => {
    // bambooty57@gmail.com이 아니면 바로 차단
    if (email.toLowerCase() !== 'bambooty57@gmail.com') {
      throw new Error('이 시스템은 관리자만 사용할 수 있습니다.')
    }

    try {
      await recordLoginAttempt(email, 'email')
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        await logLoginAttempt(email, 'email', false, error.message)
        throw error
      }

      await logLoginAttempt(email, 'email', true)
      console.log('✅ 관리자 로그인 성공:', email)
    } catch (error) {
      console.error('❌ 로그인 실패:', error)
      throw error
    }
  }

  const signUpWithEmail = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    // bambooty57@gmail.com이 아니면 회원가입 차단
    if (email.toLowerCase() !== 'bambooty57@gmail.com') {
      return {
        success: false,
        message: '이 시스템은 관리자만 사용할 수 있습니다.'
      }
    }

    try {
      console.log('🚀 관리자 회원가입 시작:', email)
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        console.error('❌ 회원가입 오류:', error)
        return { 
          success: false, 
          message: `회원가입 실패: ${error.message}` 
        }
      }

      console.log('✅ 관리자 회원가입 성공')
      return { 
        success: true, 
        message: '관리자 계정 회원가입이 완료되었습니다. 바로 로그인하실 수 있습니다.' 
      }

    } catch (error: any) {
      console.error('💥 회원가입 중 예상치 못한 오류:', error)
      return { 
        success: false, 
        message: `회원가입 중 오류가 발생했습니다: ${error.message}` 
      }
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    
    setUser(null)
    router.push('/login')
  }

  const value = {
    user,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 