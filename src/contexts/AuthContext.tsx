'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { isEmailAllowed, logLoginAttempt, isLoginRateLimited, recordLoginAttempt } from '@/lib/security'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 초기 세션 확인
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('세션 확인 오류:', error)
        } else {
          setSession(session)
          setUser(session?.user ?? null)
        }
      } catch (error) {
        console.error('세션 확인 중 오류:', error)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session)
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (error) {
        console.error('Google 로그인 오류:', error)
        alert('로그인 중 오류가 발생했습니다: ' + error.message)
      }
    } catch (error) {
      console.error('로그인 처리 오류:', error)
      alert('로그인 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true)
      
      // 이메일 허용 여부 확인
      if (!isEmailAllowed(email)) {
        logLoginAttempt(email, false)
        alert('접근이 허용되지 않은 계정입니다. 관리자에게 문의하세요.')
        return
      }

      // 로그인 시도 제한 확인
      if (isLoginRateLimited(email)) {
        logLoginAttempt(email, false)
        alert('너무 많은 로그인 시도로 인해 15분간 제한됩니다.')
        return
      }
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        console.error('이메일 로그인 오류:', error)
        recordLoginAttempt(email, false)
        logLoginAttempt(email, false)
        alert('로그인 중 오류가 발생했습니다: ' + error.message)
      } else {
        recordLoginAttempt(email, true)
        logLoginAttempt(email, true)
      }
    } catch (error) {
      console.error('로그인 처리 오류:', error)
      recordLoginAttempt(email, false)
      logLoginAttempt(email, false)
      alert('로그인 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }



  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('로그아웃 오류:', error)
        alert('로그아웃 중 오류가 발생했습니다: ' + error.message)
      }
    } catch (error) {
      console.error('로그아웃 처리 오류:', error)
      alert('로그아웃 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    session,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth는 AuthProvider 내부에서 사용되어야 합니다')
  }
  return context
} 