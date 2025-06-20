'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function DirectTestPage() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testDirectConnection = async () => {
    setLoading(true)
    setResult('테스트 중...')

    try {
      // 환경변수 직접 확인
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      console.log('Environment check:', { url: !!url, key: !!key })
      setResult(`환경변수 체크: URL=${!!url}, KEY=${!!key}\n`)

      if (!url || !key) {
        setResult(prev => prev + '❌ 환경변수가 설정되지 않았습니다.')
        return
      }

      // Supabase 클라이언트 생성
      const supabase = createClient(url, key)
      setResult(prev => prev + '✅ Supabase 클라이언트 생성 완료\n')

      // 1. 간단한 SQL 쿼리 테스트 (RLS 우회)
      const { data: testData, error: testError } = await supabase
        .from('customers')
        .select('count', { count: 'exact', head: true })

      if (testError) {
        console.error('Count 테스트 오류:', testError)
        setResult(prev => prev + `❌ Count 테스트 실패: ${testError.message}\n`)
      } else {
        setResult(prev => prev + `✅ Count 테스트 성공: ${testData} 개의 고객\n`)
      }

      // 2. 실제 데이터 조회 테스트
      const { data: customers, error: selectError } = await supabase
        .from('customers')
        .select('*')
        .limit(1)

      if (selectError) {
        console.error('Select 테스트 오류:', selectError)
        setResult(prev => prev + `❌ Select 테스트 실패: ${selectError.message}\n`)
      } else {
        setResult(prev => prev + `✅ Select 테스트 성공: ${customers?.length || 0}개 데이터 조회\n`)
        if (customers && customers.length > 0) {
          setResult(prev => prev + `첫 번째 고객: ${JSON.stringify(customers[0], null, 2)}\n`)
        }
      }

      // 3. Auth 상태 확인
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      if (authError) {
        console.error('Auth 테스트 오류:', authError)
        setResult(prev => prev + `❌ Auth 테스트 실패: ${authError.message}\n`)
      } else {
        setResult(prev => prev + `✅ Auth 상태: ${session ? '로그인됨' : '비로그인'}\n`)
      }

    } catch (error: any) {
      console.error('전체 테스트 오류:', error)
      setResult(prev => prev + `❌ 전체 테스트 실패: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Supabase 직접 연결 테스트</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <button
            onClick={testDirectConnection}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '테스트 중...' : '🔧 직접 연결 테스트'}
          </button>
        </div>

        {result && (
          <div className="bg-gray-900 text-green-400 p-6 rounded-lg font-mono text-sm whitespace-pre-wrap">
            {result}
          </div>
        )}

        <div className="mt-6">
          <a href="/login" className="text-blue-600 hover:underline">
            ← 로그인 페이지로 돌아가기
          </a>
        </div>
      </div>
    </div>
  )
} 