import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key'

// 환경변수가 설정되지 않은 경우 경고 출력
if (supabaseUrl === 'https://placeholder.supabase.co' || supabaseAnonKey === 'placeholder_anon_key') {
  console.warn('⚠️ Supabase 환경변수가 설정되지 않았습니다. .env.local 파일을 생성하고 실제 Supabase 프로젝트 정보를 입력하세요.')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

export default supabase 