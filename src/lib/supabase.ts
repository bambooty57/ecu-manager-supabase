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
    
    // 1. 기본 연결 테스트
    const { data: healthCheck, error: healthError } = await supabase
      .from('customers')
      .select('count', { count: 'exact', head: true })
    
    if (healthError) {
      console.error('❌ Supabase health check failed:', {
        message: healthError.message,
        details: healthError.details,
        hint: healthError.hint,
        code: healthError.code
      })
      
      // 특정 오류 코드에 대한 자세한 정보
      if (healthError.code === '42P01') {
        console.error('❌ 테이블이 존재하지 않습니다. 데이터베이스 스키마를 확인해주세요.')
      } else if (healthError.code === '42501') {
        console.error('❌ 데이터베이스 접근 권한이 없습니다. RLS 정책을 확인해주세요.')
      }
      
      return false
    }
    
    console.log('✅ Supabase connection successful')
    console.log('📊 Customers table count:', healthCheck)
    
    // 2. 테이블 구조 확인
    const { data: sampleData, error: sampleError } = await supabase
      .from('customers')
      .select('*')
      .limit(1)
    
    if (sampleError) {
      console.error('❌ Sample data fetch failed:', sampleError)
    } else {
      console.log('📋 Sample customer data structure:', sampleData)
    }
    
    return true
  } catch (err) {
    console.error('❌ Supabase connection error:', err)
    return false
  }
}

export default supabase

// Supabase Storage 유틸리티 함수들

// 파일 업로드 (최적화된 버전)
export const uploadFileToStorage = async (file: File, bucketName: string, fileName: string): Promise<{ path: string, url: string }> => {
  try {
    console.log(`📤 파일 업로드 시작: ${file.name} → ${bucketName}/${fileName}`)
    console.log(`📊 파일 크기: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('❌ 파일 업로드 오류:', {
        message: error.message,
        error: error
      })
      throw error
    }

    // 공개 URL 생성
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path)

    console.log(`✅ 파일 업로드 성공: ${data.path}`)
    console.log(`🔗 공개 URL: ${publicUrl}`)

    return {
      path: data.path,
      url: publicUrl
    }
  } catch (error) {
    console.error('❌ 파일 업로드 실패:', error)
    throw error
  }
}

// 파일 삭제
export const deleteFileFromStorage = async (bucketName: string, filePath: string): Promise<void> => {
  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath])

    if (error) {
      console.error('파일 삭제 오류:', error)
      throw error
    }
  } catch (error) {
    console.error('파일 삭제 실패:', error)
    throw error
  }
}

// 파일 다운로드 URL 생성
export const getFileDownloadUrl = async (bucketName: string, filePath: string): Promise<string> => {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 60) // 60초 유효

    if (error) {
      console.error('다운로드 URL 생성 오류:', error)
      throw error
    }

    return data.signedUrl
  } catch (error) {
    console.error('다운로드 URL 생성 실패:', error)
    throw error
  }
}

// 고유한 파일명 생성
export const generateUniqueFileName = (originalName: string, workRecordId?: number): string => {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 15)
  const extension = originalName.split('.').pop()
  const baseName = originalName.replace(/\.[^/.]+$/, "")
  
  return workRecordId 
    ? `work_${workRecordId}/${timestamp}_${randomString}_${baseName}.${extension}`
    : `${timestamp}_${randomString}_${baseName}.${extension}`
}

// 파일 타입별 버킷 결정
export const getBucketForFileType = (fileType: string, category: string): string => {
  if (fileType.startsWith('image/') || fileType.startsWith('video/')) {
    return 'work-media'
  } else if (category.includes('ecu') || category.includes('acu')) {
    return 'work-files'
  } else {
    return 'work-documents'
  }
} 