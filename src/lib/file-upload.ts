import { supabase } from '@/lib/supabase'

// 파일 업로드 결과 타입
export interface FileUploadResult {
  success: boolean
  url?: string
  path?: string
  bucket?: string
  error?: string
}

// 파일을 Supabase Storage에 업로드
export const uploadFileToStorage = async (
  file: File,
  workRecordId: number,
  fileId: string,
  category: 'original' | 'stage1' | 'stage2' | 'stage3' | 'acu-original' | 'acu-stage1' | 'acu-stage2' | 'acu-stage3' | 'media' = 'original'
): Promise<FileUploadResult> => {
  try {
    console.log(`📤 파일 업로드 시작: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
    
    // 파일 확장자 추출
    const fileExtension = file.name.split('.').pop() || 'bin'
    
    // 파일 타입에 따른 버킷 선택
    let bucketName = 'work-files' // 기본값
    
    if (category === 'media' || file.type.startsWith('image/') || file.type.startsWith('video/')) {
      bucketName = 'work-media'
      console.log(`📷 미디어 파일 감지: ${file.name} → work-media 버킷`)
    } else if (file.type.includes('pdf') || file.type.includes('document') || file.type.includes('text')) {
      bucketName = 'work-documents'
      console.log(`📄 문서 파일 감지: ${file.name} → work-documents 버킷`)
    } else if (fileExtension.toLowerCase() === 'zip' || file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
      bucketName = 'work-files'
      console.log(`📦 ZIP 파일 감지: ${file.name} (${file.type}) → work-files 버킷`)
    } else {
      bucketName = 'work-files'
      console.log(`🔧 ECU/ACU 파일 감지: ${file.name} → work-files 버킷`)
    }
    
    // Storage 경로 생성: {bucketName}/{workRecordId}/{category}_{fileId}_{originalName}
    const storagePath = `${workRecordId}/${category}_${fileId}_${file.name}`
    
    console.log(`📂 업로드 경로: ${storagePath}`)
    console.log(`📦 선택된 버킷: ${bucketName}`)
    
    // Supabase Storage에 업로드
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: true, // 같은 경로에 파일이 있으면 덮어쓰기
        contentType: file.type
      })
    
    if (error) {
      console.error(`❌ 파일 업로드 실패: ${file.name}`, error)
      return {
        success: false,
        error: error.message
      }
    }
    
    console.log(`✅ 파일 업로드 성공: ${file.name}`)
    console.log(`📍 Storage 경로: ${data.path}`)
    console.log(`📦 저장된 버킷: ${bucketName}`)
    
    // 공개 URL 생성
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path)
    
    return {
      success: true,
      url: urlData.publicUrl,
      path: data.path,
      bucket: bucketName
    }
    
  } catch (error) {
    console.error(`❌ 파일 업로드 중 예외 발생: ${file.name}`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }
  }
}

// 여러 파일 일괄 업로드
export const uploadMultipleFiles = async (
  files: Array<{
    file: File
    fileId: string
    category: 'original' | 'stage1' | 'stage2' | 'stage3' | 'acu-original' | 'acu-stage1' | 'acu-stage2' | 'acu-stage3' | 'media'
    description?: string
  }>,
  workRecordId: number
): Promise<Array<FileUploadResult & { fileId: string; category: string; description?: string }>> => {
  console.log(`📦 일괄 파일 업로드 시작: ${files.length}개 파일`)
  
  const results = []
  
  for (const fileInfo of files) {
    const result = await uploadFileToStorage(
      fileInfo.file,
      workRecordId,
      fileInfo.fileId,
      fileInfo.category
    )
    
    results.push({
      ...result,
      fileId: fileInfo.fileId,
      category: fileInfo.category,
      description: fileInfo.description
    })
  }
  
  const successCount = results.filter(r => r.success).length
  const failCount = results.filter(r => !r.success).length
  
  console.log(`📊 업로드 결과: 성공 ${successCount}개, 실패 ${failCount}개`)
  
  return results
}

// 작업 기록 삭제 시 관련 파일들도 삭제
export const deleteWorkRecordFiles = async (workRecordId: number): Promise<boolean> => {
  try {
    console.log(`🗑️ 작업 기록 ${workRecordId}의 파일들 삭제 시작`)
    
    // 모든 버킷에서 파일 삭제
    const buckets = ['work-files', 'work-media', 'work-documents']
    let totalDeletedFiles = 0
    
    for (const bucketName of buckets) {
      try {
        console.log(`🔍 ${bucketName} 버킷에서 파일 검색 중...`)
        
        // 해당 작업 기록의 모든 파일 목록 조회
        const { data: files, error: listError } = await supabase.storage
          .from(bucketName)
          .list(`${workRecordId}/`)
        
        if (listError) {
          console.error(`❌ ${bucketName} 버킷 파일 목록 조회 실패:`, listError)
          continue // 다음 버킷으로 진행
        }
        
        if (!files || files.length === 0) {
          console.log(`📂 ${bucketName} 버킷에 삭제할 파일이 없습니다.`)
          continue
        }
        
        // 파일 경로들 생성
        const filePaths = files.map(file => `${workRecordId}/${file.name}`)
        
        console.log(`🗑️ ${bucketName} 버킷에서 ${files.length}개 파일 삭제 중...`)
        
        // 파일들 삭제
        const { error: deleteError } = await supabase.storage
          .from(bucketName)
          .remove(filePaths)
        
        if (deleteError) {
          console.error(`❌ ${bucketName} 버킷 파일 삭제 실패:`, deleteError)
        } else {
          console.log(`✅ ${bucketName} 버킷에서 ${files.length}개 파일 삭제 완료`)
          totalDeletedFiles += files.length
        }
        
      } catch (error) {
        console.error(`❌ ${bucketName} 버킷 처리 중 오류:`, error)
      }
    }
    
    console.log(`✅ 총 ${totalDeletedFiles}개 파일 삭제 완료`)
    return true
    
  } catch (error) {
    console.error('❌ 파일 삭제 중 예외 발생:', error)
    return false
  }
}