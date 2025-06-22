import { supabase, uploadFileToStorage, getBucketForFileType, generateUniqueFileName } from './supabase'
import { getAllWorkRecords, WorkRecordData } from './work-records'

// Base64 데이터를 File 객체로 변환
export const base64ToFile = (base64Data: string, fileName: string, mimeType: string): File => {
  const byteCharacters = atob(base64Data)
  const byteNumbers = new Array(byteCharacters.length)
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  
  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: mimeType })
  
  return new File([blob], fileName, { type: mimeType })
}

// 단일 파일 마이그레이션
export const migrateFileToStorage = async (
  fileData: any,
  workRecordId: number,
  category: string
): Promise<{ storagePath: string, storageUrl: string, bucketName: string } | null> => {
  try {
    if (!fileData.data || !fileData.name) {
      console.log('❌ 파일 데이터가 없습니다:', fileData)
      return null
    }

    // File 객체 생성
    const file = base64ToFile(fileData.data, fileData.name, fileData.type || 'application/octet-stream')
    
    // 버킷 및 파일명 결정
    const bucketName = getBucketForFileType(file.type, category)
    const uniqueFileName = generateUniqueFileName(file.name, workRecordId)
    
    // Storage에 업로드
    const uploadResult = await uploadFileToStorage(file, bucketName, uniqueFileName)
    
    // 파일 메타데이터 DB에 저장
    const { error: metadataError } = await supabase
      .from('file_metadata')
      .insert({
        work_record_id: workRecordId,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        category: category,
        storage_path: uploadResult.path,
        storage_url: uploadResult.url,
        bucket_name: bucketName,
        description: fileData.description || ''
      })

    if (metadataError) {
      console.error('파일 메타데이터 저장 오류:', metadataError)
    }

    console.log(`✅ 파일 마이그레이션 완료: ${file.name} → ${bucketName}/${uniqueFileName}`)
    
    return {
      storagePath: uploadResult.path,
      storageUrl: uploadResult.url,
      bucketName: bucketName
    }
  } catch (error) {
    console.error('파일 마이그레이션 오류:', error)
    return null
  }
}

// 작업 기록의 모든 파일 마이그레이션
export const migrateWorkRecordFiles = async (workRecord: WorkRecordData): Promise<boolean> => {
  try {
    console.log(`🔄 작업 기록 ${workRecord.id} 파일 마이그레이션 시작...`)
    
    if (!workRecord.remappingWorks || workRecord.remappingWorks.length === 0) {
      console.log('마이그레이션할 파일이 없습니다.')
      return true
    }

    const firstWork = workRecord.remappingWorks[0] as any
    let migratedFiles: any[] = []
    let migrationCount = 0

    // ECU 파일들 마이그레이션
    if (firstWork.files) {
      const ecuCategories = ['original', 'read', 'modified', 'vr', 'stage1', 'stage2', 'stage3']
      
      for (const category of ecuCategories) {
        const fileData = (firstWork.files as any)[category]
        if (fileData && fileData.file) {
          const result = await migrateFileToStorage(fileData.file, workRecord.id, `ecu_${category}`)
          if (result) {
            migratedFiles.push({
              category: `ecu_${category}`,
              originalData: fileData,
              storageInfo: result
            })
            migrationCount++
          }
        }
      }
    }

    // ACU 파일들 마이그레이션
    if (firstWork.acu && firstWork.acu.files) {
      const acuCategories = ['acuOriginal', 'acuStage1', 'acuStage2', 'acuStage3']
      
      for (const category of acuCategories) {
        const fileData = (firstWork.acu.files as any)[category]
        if (fileData && fileData.file) {
          const result = await migrateFileToStorage(fileData.file, workRecord.id, category)
          if (result) {
            migratedFiles.push({
              category: category,
              originalData: fileData,
              storageInfo: result
            })
            migrationCount++
          }
        }
      }
    }

    // 미디어 파일들 마이그레이션
    if (firstWork.media) {
      const mediaCategories = ['before', 'after']
      
      for (const category of mediaCategories) {
        const mediaData = (firstWork.media as any)[category]
        if (mediaData) {
          const result = await migrateFileToStorage(mediaData, workRecord.id, `media_${category}`)
          if (result) {
            migratedFiles.push({
              category: `media_${category}`,
              originalData: mediaData,
              storageInfo: result
            })
            migrationCount++
          }
        }
      }
    }

    // 추가 미디어 파일들 (mediaFile1~5)
    if (firstWork.files) {
      for (let i = 1; i <= 5; i++) {
        const mediaFile = (firstWork.files as any)[`mediaFile${i}`]
        if (mediaFile && mediaFile.file) {
          const result = await migrateFileToStorage(mediaFile.file, workRecord.id, `media_file_${i}`)
          if (result) {
            migratedFiles.push({
              category: `media_file_${i}`,
              originalData: mediaFile,
              storageInfo: result
            })
            migrationCount++
          }
        }
      }
    }

    console.log(`✅ 작업 기록 ${workRecord.id} 마이그레이션 완료: ${migrationCount}개 파일`)
    return true

  } catch (error) {
    console.error(`❌ 작업 기록 ${workRecord.id} 마이그레이션 실패:`, error)
    return false
  }
}

// 전체 데이터베이스 마이그레이션
export const migrateAllFilesToStorage = async (
  onProgress?: (current: number, total: number, recordId: number) => void
): Promise<{ success: number, failed: number, total: number }> => {
  try {
    console.log('🚀 전체 파일 마이그레이션 시작...')
    
    // 모든 작업 기록 조회 (파일 포함)
    const workRecords = await getAllWorkRecords()
    const total = workRecords.length
    let success = 0
    let failed = 0

    console.log(`📊 총 ${total}개 작업 기록 마이그레이션 예정`)

    for (let i = 0; i < workRecords.length; i++) {
      const record = workRecords[i]
      
      // 진행률 콜백 호출
      if (onProgress) {
        onProgress(i + 1, total, record.id)
      }

      // 개별 작업 기록 마이그레이션
      const result = await migrateWorkRecordFiles(record)
      if (result) {
        success++
      } else {
        failed++
      }

      // 과부하 방지를 위한 딜레이
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log(`🎉 전체 마이그레이션 완료! 성공: ${success}, 실패: ${failed}`)
    
    return { success, failed, total }

  } catch (error) {
    console.error('❌ 전체 마이그레이션 실패:', error)
    return { success: 0, failed: 1, total: 1 }
  }
}

// 마이그레이션 상태 확인
export const checkMigrationStatus = async (): Promise<{
  totalRecords: number,
  migratedRecords: number,
  pendingRecords: number,
  migrationProgress: number
}> => {
  try {
    // 전체 작업 기록 수
    const { count: totalRecords } = await supabase
      .from('work_records')
      .select('*', { count: 'exact', head: true })

    // 마이그레이션된 기록 수 (file_metadata가 있는 경우)
    const { count: migratedRecords } = await supabase
      .from('file_metadata')
      .select('work_record_id', { count: 'exact', head: true })

    const uniqueMigratedRecords = await supabase
      .from('file_metadata')
      .select('work_record_id')
      .then(({ data }) => new Set(data?.map(item => item.work_record_id) || []).size)

    const pendingRecords = (totalRecords || 0) - uniqueMigratedRecords
    const migrationProgress = totalRecords ? (uniqueMigratedRecords / totalRecords) * 100 : 0

    return {
      totalRecords: totalRecords || 0,
      migratedRecords: uniqueMigratedRecords,
      pendingRecords: Math.max(0, pendingRecords),
      migrationProgress: Math.round(migrationProgress)
    }
  } catch (error) {
    console.error('마이그레이션 상태 확인 오류:', error)
    return {
      totalRecords: 0,
      migratedRecords: 0,
      pendingRecords: 0,
      migrationProgress: 0
    }
  }
} 