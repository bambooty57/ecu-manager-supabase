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
  category: 'original' | 'stage1' | 'stage2' | 'stage3' | 'acu-original' | 'acu-stage1' | 'acu-stage2' | 'acu-stage3' | 'media' = 'original',
  description?: string
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
    
    // 파일명을 안전하게 처리 (한글, 특수문자 제거)
    const safeFileName = file.name
      .replace(/[^\w\-_.]/g, '_') // 한글, 특수문자를 언더스코어로 변경
      .replace(/_+/g, '_') // 연속된 언더스코어를 하나로
      .replace(/^_|_$/g, '') // 앞뒤 언더스코어 제거
    
    // Storage 경로 생성: {bucketName}/{workRecordId}/{category}_{fileId}_{safeFileName}
    const storagePath = `${workRecordId}/${category}_${fileId}_${safeFileName}`
    
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
    
    // file_metadata 테이블에 파일 정보 저장
    try {
      console.log(`📝 메타데이터 저장 - 파일명: ${file.name}, 카테고리: ${category}, 설명: "${description}"`)
      
      const { error: metadataError } = await supabase
        .from('file_metadata')
        .insert({
          work_record_id: workRecordId,
          file_name: data.path.split('/').pop() || file.name,
          original_name: file.name,
          file_size: file.size,
          file_type: file.type,
          category: category,
          bucket_name: bucketName,
          storage_path: data.path,
          storage_url: urlData.publicUrl,
          description: description || null,
          is_migrated: true,
          migrated_at: new Date().toISOString()
        })
      
      if (metadataError) {
        console.warn(`⚠️ 파일 메타데이터 저장 실패: ${file.name}`, metadataError)
      } else {
        console.log(`✅ 파일 메타데이터 저장 완료: ${file.name}`)
      }
    } catch (error) {
      console.warn(`⚠️ 파일 메타데이터 저장 중 오류: ${file.name}`, error)
    }
    
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
      fileInfo.category,
      fileInfo.description
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
    
    // 1. 먼저 file_metadata 테이블에서 해당 작업 기록의 파일 정보 조회
    const { data: fileMetadata, error: metadataError } = await supabase
      .from('file_metadata')
      .select('*')
      .eq('work_record_id', workRecordId)
    
    if (metadataError) {
      console.error(`❌ 파일 메타데이터 조회 실패:`, metadataError)
    }
    
    let totalDeletedFiles = 0
    let hasErrors = false
    
    // 2. file_metadata가 있으면 정확한 파일 경로로 삭제
    if (fileMetadata && fileMetadata.length > 0) {
      console.log(`📋 메타데이터에서 ${fileMetadata.length}개 파일 정보 조회`)
      
      // 버킷별로 파일 그룹화
      const filesByBucket = fileMetadata.reduce((acc, file) => {
        const bucket = file.bucket_name || 'work-files'
        if (!acc[bucket]) acc[bucket] = []
        acc[bucket].push(file)
        return acc
      }, {} as Record<string, any[]>)
      
      // 각 버킷에서 파일 삭제
      for (const [bucketName, files] of Object.entries(filesByBucket)) {
        try {
          const filePaths = files.map(file => file.storage_path)
          console.log(`🗑️ ${bucketName} 버킷에서 ${filePaths.length}개 파일 삭제 중...`)
          console.log(`📁 삭제할 파일 경로들:`, filePaths)
          
          const { error: deleteError } = await supabase.storage
            .from(bucketName)
            .remove(filePaths)
          
          if (deleteError) {
            console.error(`❌ ${bucketName} 버킷 파일 삭제 실패:`, deleteError)
            hasErrors = true
          } else {
            console.log(`✅ ${bucketName} 버킷에서 ${filePaths.length}개 파일 삭제 완료`)
            totalDeletedFiles += filePaths.length
          }
        } catch (error) {
          console.error(`❌ ${bucketName} 버킷 처리 중 오류:`, error)
          hasErrors = true
        }
      }
      
      // 3. file_metadata 테이블에서도 삭제
      const { error: deleteMetadataError } = await supabase
        .from('file_metadata')
        .delete()
        .eq('work_record_id', workRecordId)
      
      if (deleteMetadataError) {
        console.error(`❌ 파일 메타데이터 삭제 실패:`, deleteMetadataError)
        hasErrors = true
      } else {
        console.log(`✅ 파일 메타데이터 삭제 완료`)
      }
    } else {
      // 4. file_metadata가 없으면 기존 방식으로 삭제 (하위 호환성)
      console.log(`📋 메타데이터가 없어 기존 방식으로 삭제 시도`)
      
      const { data: workRecord, error: recordError } = await supabase
        .from('work_records')
        .select('customer_id, equipment_id')
        .eq('id', workRecordId)
        .single()
      
      if (recordError) {
        console.error(`❌ 작업 기록 ${workRecordId} 정보 조회 실패:`, recordError)
        return false
      }
      
      const customerId = workRecord.customer_id
      const equipmentId = workRecord.equipment_id
      
      console.log(`📋 작업 기록 정보: customerId=${customerId}, equipmentId=${equipmentId}`)
      
      // 모든 버킷에서 파일 삭제
      const buckets = ['work-files', 'work-media', 'work-documents']
      
      for (const bucketName of buckets) {
        try {
          // 실제 파일 경로: {customerId}/{equipmentId}/...
          const searchPath = `${customerId}/${equipmentId}/`
          console.log(`🔍 ${bucketName} 버킷에서 파일 검색 중... (경로: ${searchPath})`)
          
          // 해당 작업 기록의 모든 파일 목록 조회
          const { data: files, error: listError } = await supabase.storage
            .from(bucketName)
            .list(searchPath)
          
          if (listError) {
            console.error(`❌ ${bucketName} 버킷 파일 목록 조회 실패:`, listError)
            hasErrors = true
            continue
          }
          
          if (!files || files.length === 0) {
            console.log(`📂 ${bucketName} 버킷에 삭제할 파일이 없습니다.`)
            continue
          }
          
          // 모든 파일을 삭제 대상으로 함 (기존 방식)
          console.log(`📋 ${bucketName} 버킷에서 발견된 파일들:`, files.map(f => f.name))
          
          // 파일 경로들 생성
          const filePaths = files.map(file => `${searchPath}${file.name}`)
          
          console.log(`🗑️ ${bucketName} 버킷에서 ${files.length}개 파일 삭제 중...`)
          console.log(`📁 삭제할 파일 경로들:`, filePaths)
          
          // 파일들 삭제
          const { error: deleteError } = await supabase.storage
            .from(bucketName)
            .remove(filePaths)
          
          if (deleteError) {
            console.error(`❌ ${bucketName} 버킷 파일 삭제 실패:`, deleteError)
            hasErrors = true
          } else {
            console.log(`✅ ${bucketName} 버킷에서 ${files.length}개 파일 삭제 완료`)
            totalDeletedFiles += files.length
          }
          
        } catch (error) {
          console.error(`❌ ${bucketName} 버킷 처리 중 오류:`, error)
          hasErrors = true
        }
      }
    }
    
    console.log(`✅ 총 ${totalDeletedFiles}개 파일 삭제 완료`)
    return !hasErrors
    
  } catch (error) {
    console.error('❌ 파일 삭제 중 예외 발생:', error)
    return false
  }
}

// 기존 파일들에 대한 file_metadata 마이그레이션
export const migrateExistingFilesToMetadata = async (): Promise<boolean> => {
  try {
    console.log(`🔄 기존 파일들 file_metadata 마이그레이션 시작`)
    
    // 모든 작업 기록 조회
    const { data: workRecords, error: workRecordsError } = await supabase
      .from('work_records')
      .select('id, customer_id, equipment_id, created_at')
      .order('created_at', { ascending: false })
    
    if (workRecordsError) {
      console.error(`❌ 작업 기록 조회 실패:`, workRecordsError)
      return false
    }
    
    if (!workRecords || workRecords.length === 0) {
      console.log(`📂 마이그레이션할 작업 기록이 없습니다.`)
      return true
    }
    
    console.log(`📋 ${workRecords.length}개 작업 기록 마이그레이션 시작`)
    
    let totalMigratedFiles = 0
    let hasErrors = false
    
    // 모든 버킷에서 파일 조회
    const buckets = ['work-files', 'work-media', 'work-documents']
    
    for (const workRecord of workRecords) {
      const { id: workRecordId, customer_id, equipment_id } = workRecord
      
      for (const bucketName of buckets) {
        try {
          const searchPath = `${customer_id}/${equipment_id}/`
          console.log(`🔍 ${bucketName} 버킷에서 파일 검색 중... (경로: ${searchPath})`)
          
          const { data: files, error: listError } = await supabase.storage
            .from(bucketName)
            .list(searchPath)
          
          if (listError) {
            console.warn(`⚠️ ${bucketName} 버킷 파일 목록 조회 실패:`, listError)
            continue
          }
          
          if (!files || files.length === 0) {
            continue
          }
          
          // 파일 메타데이터 생성
          const fileMetadataList = files.map((file, index) => {
            // 파일명에서 카테고리 추출
            let category = 'media'
            if (bucketName === 'work-files') {
              if (file.name.startsWith('ecu_')) {
                category = 'ecu'
              } else if (file.name.startsWith('acu_')) {
                category = 'acu'
              } else {
                category = 'ecu' // 기본값
              }
            } else if (bucketName === 'work-media') {
              category = 'media'
            } else if (bucketName === 'work-documents') {
              category = 'document'
            }
            
            return {
              work_record_id: workRecordId,
              file_name: file.name,
              original_name: file.name.replace(/^(ecu_|media_)\d+_[a-zA-Z0-9]+_/, ''), // 타임스탬프와 랜덤ID 제거
              file_size: file.metadata?.size || 0,
              file_type: file.metadata?.mimetype || 'application/octet-stream',
              category: category,
              bucket_name: bucketName,
              storage_path: `${searchPath}${file.name}`,
              storage_url: `https://ewxzampbdpuaawzrvsln.supabase.co/storage/v1/object/public/${bucketName}/${searchPath}${file.name}`,
              is_migrated: true,
              migrated_at: new Date().toISOString()
            }
          })
          
          // file_metadata 테이블에 일괄 삽입
          const { error: insertError } = await supabase
            .from('file_metadata')
            .insert(fileMetadataList)
          
          if (insertError) {
            console.error(`❌ ${bucketName} 버킷 파일 메타데이터 저장 실패:`, insertError)
            hasErrors = true
          } else {
            console.log(`✅ ${bucketName} 버킷에서 ${fileMetadataList.length}개 파일 메타데이터 저장 완료`)
            totalMigratedFiles += fileMetadataList.length
          }
          
        } catch (error) {
          console.error(`❌ ${bucketName} 버킷 처리 중 오류:`, error)
          hasErrors = true
        }
      }
    }
    
    console.log(`✅ 총 ${totalMigratedFiles}개 파일 메타데이터 마이그레이션 완료`)
    return !hasErrors
    
  } catch (error) {
    console.error('❌ 파일 메타데이터 마이그레이션 중 예외 발생:', error)
    return false
  }
}