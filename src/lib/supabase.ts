import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

// 환경변수 우선, fallback으로 하드코딩 값 사용
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ewxzampbdpuaawzrvsln.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3eHphbXBiZHB1YWF3enJ2c2xuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5OTc1OTcsImV4cCI6MjA2NTU3MzU5N30.j0qjJNe7lQju4-pqYGvNtHjiigV7D5JSqtVzHh5RAQY'

// 디버깅용 로그
console.log('🔧 Supabase Config:')
console.log('URL:', supabaseUrl)
console.log('Key (first 20 chars):', supabaseAnonKey.substring(0, 20) + '...')
console.log('Key length:', supabaseAnonKey.length)
console.log('Using env vars:', !!process.env.NEXT_PUBLIC_SUPABASE_URL, !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Supabase 연결 테스트
export const testSupabaseConnection = async () => {
  try {
    console.log('🧪 Testing Supabase connection...')
    const { data, error } = await supabase.from('customers').select('count', { count: 'exact', head: true })
    if (error) {
      console.error('❌ Supabase connection failed:', error.message)
      return false
    }
    console.log('✅ Supabase connection successful')
    return true
  } catch (err) {
    console.error('❌ Supabase connection error:', err)
    return false
  }
}

export default supabase 