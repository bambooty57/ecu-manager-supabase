import { supabase, uploadFileToStorage, getBucketForFileType, generateUniqueFileName } from './supabase'
import { Tables } from './database.types'

type WorkRecordData = Tables<'work_records'>

// 마이그레이션용 작업 기록 조회 (모든 데이터 포함)
const getAllWorkRecordsForMigration = async (): Promise<WorkRecordData[]> => {
  const { data, error } = await supabase
    .from('work_records')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching work records for migration:', error)
    throw error
  }
  
  return data
}

// Base64 데이터를 File 객체로 변환
export const base64ToFile = (base64Data: string, fileName: string, mimeType: string): File => {
  try {
    // base64 데이터에서 data: prefix 제거
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '')
    
    console.log(`🔄 Base64 → File 변환: ${fileName}`)
    console.log(`📊 Base64 길이: ${cleanBase64.length} 문자`)
    
    const byteCharacters = atob(cleanBase64)
    const byteNumbers = new Array(byteCharacters.length)
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: mimeType })
    const file = new File([blob], fileName, { type: mimeType })
    
    console.log(`✅ 파일 변환 완료: ${file.size} bytes`)
    
    return file
  } catch (error) {
    console.error('❌ Base64 → File 변환 실패:', error)
    throw new Error(`Base64 변환 실패: ${fileName}`)
  }
}

// 단일 파일 마이그레이션
export const migrateFileToStorage = async (
  fileData: any,
  workRecordId: number,
  category: string
): Promise<{ storagePath: string, storageUrl: string, bucketName: string } | null> => {
  try {
    console.log(`🔍 파일 데이터 구조 확인:`, {
      hasData: !!fileData.data,
      hasName: !!fileData.name,
      hasType: !!fileData.type,
      dataType: typeof fileData.data,
      dataLength: fileData.data?.length || 0,
      fileName: fileData.name,
      fileType: fileData.type
    })
    
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
    
    // 파일 메타데이터 DB 저장
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
      throw metadataError
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
    
    // remapping_works는 Json 타입이므로 배열로 파싱
    const remappingWorks = Array.isArray(workRecord.remapping_works) 
      ? workRecord.remapping_works 
      : (workRecord.remapping_works ? [workRecord.remapping_works] : [])
    
    if (!remappingWorks || remappingWorks.length === 0) {
      console.log('마이그레이션할 파일이 없습니다.')
      return true
    }

    const firstWork = remappingWorks[0] as any
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
    const workRecords = await getAllWorkRecordsForMigration()
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

    // 마이그레이션된 기록 수 확인
    const { data: migratedData, error: migratedError } = await supabase
      .from('file_metadata')
      .select('work_record_id')
    
    if (migratedError) {
      console.error('마이그레이션 데이터 조회 오류:', migratedError)
    }
    
    // 고유한 work_record_id 개수 계산
    const uniqueWorkRecordIds = new Set(migratedData?.map(item => item.work_record_id) || [])
    const migratedRecords = uniqueWorkRecordIds.size

    const pendingRecords = (totalRecords || 0) - migratedRecords
    const migrationProgress = totalRecords ? (migratedRecords / totalRecords) * 100 : 0

    return {
      totalRecords: totalRecords || 0,
      migratedRecords: migratedRecords,
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

// 데이터 구조 분석을 위한 디버깅 함수
export const analyzeWorkRecordData = async (workRecordId?: number): Promise<void> => {
  try {
    console.log('🔍 작업 기록 데이터 구조 분석 시작...')
    
    // 특정 ID가 주어지면 해당 기록만, 아니면 모든 기록 조회
    const query = workRecordId 
      ? supabase.from('work_records').select('*').eq('id', workRecordId)
      : supabase.from('work_records').select('*').limit(5)
    
    const { data: workRecords, error } = await query
    
    if (error) {
      console.error('❌ 데이터 조회 오류:', error)
      return
    }
    
    if (!workRecords || workRecords.length === 0) {
      console.log('❌ 조회된 작업 기록이 없습니다.')
      return
    }
    
    console.log(`📊 총 ${workRecords.length}개 작업 기록 분석`)
    
    for (const record of workRecords) {
      console.log(`\n🔍 작업 기록 ID: ${record.id}`)
      console.log(`📅 작업 날짜: ${record.work_date}`)
      console.log(`💰 가격: ${record.total_price}`)
      
      // remapping_works 구조 분석
      if (record.remapping_works) {
        console.log('📋 remapping_works 구조:')
        console.log('  - 타입:', typeof record.remapping_works)
        console.log('  - 배열 여부:', Array.isArray(record.remapping_works))
        
        // Json 타입을 배열로 파싱
        const remappingWorks = Array.isArray(record.remapping_works) 
          ? record.remapping_works 
          : (record.remapping_works ? [record.remapping_works] : [])
        
        if (remappingWorks && remappingWorks.length > 0) {
          const firstWork = remappingWorks[0] as any
          console.log('  - 첫 번째 작업 구조:')
          console.log('    - files:', !!firstWork.files)
          console.log('    - acu:', !!firstWork.acu)
          console.log('    - media:', !!firstWork.media)
          
          if (firstWork.files) {
            console.log('    - files 내용:', Object.keys(firstWork.files))
            
            // 각 파일 카테고리 확인
            const categories = ['original', 'read', 'modified', 'vr', 'stage1', 'stage2', 'stage3']
            for (const category of categories) {
              const fileData = firstWork.files[category]
              if (fileData) {
                console.log(`      - ${category}:`, {
                  hasFile: !!fileData.file,
                  hasData: !!(fileData.file && fileData.file.data),
                  hasName: !!(fileData.file && fileData.file.name),
                  dataLength: fileData.file?.data?.length || 0
                })
              }
            }
            
            // 미디어 파일들 확인
            for (let i = 1; i <= 5; i++) {
              const mediaFile = firstWork.files[`mediaFile${i}`]
              if (mediaFile) {
                console.log(`      - mediaFile${i}:`, {
                  hasFile: !!mediaFile.file,
                  hasData: !!(mediaFile.file && mediaFile.file.data),
                  hasName: !!(mediaFile.file && mediaFile.file.name),
                  dataLength: mediaFile.file?.data?.length || 0
                })
              }
            }
          }
          
          if (firstWork.acu && firstWork.acu.files) {
            console.log('    - ACU files 내용:', Object.keys(firstWork.acu.files))
          }
          
          if (firstWork.media) {
            console.log('    - media 내용:', Object.keys(firstWork.media))
          }
        }
      } else {
        console.log('❌ remapping_works가 없습니다.')
      }
      
      // files 필드 직접 확인
      if (record.files) {
        console.log('📁 직접 files 필드:', typeof record.files)
      }
    }
    
  } catch (error) {
    console.error('❌ 데이터 분석 오류:', error)
  }
}

// 특정 work_record의 상세 정보 조회 및 분석
export const analyzeSpecificWorkRecord = async (workRecordId: number): Promise<void> => {
  try {
    console.log(`🔍 작업 기록 ID ${workRecordId} 상세 분석 시작...`)
    
    // 1. 기본 정보 조회
    const { data: record, error } = await supabase
      .from('work_records')
      .select('*')
      .eq('id', workRecordId)
      .single()
    
    if (error) {
      console.error(`❌ 작업 기록 ${workRecordId} 조회 오류:`, error)
      return
    }
    
    if (!record) {
      console.log(`❌ 작업 기록 ${workRecordId}가 존재하지 않습니다.`)
      return
    }
    
    console.log(`✅ 작업 기록 ${workRecordId} 기본 정보:`)
    console.log('  - ID:', record.id)
    console.log('  - 고객 ID:', record.customer_id)
    console.log('  - 장비 ID:', record.equipment_id)
    console.log('  - 작업 날짜:', record.work_date)
    console.log('  - 작업 유형:', record.work_type)
    console.log('  - 총 가격:', record.total_price)
    console.log('  - 상태:', record.status)
    console.log('  - ECU 메이커:', record.ecu_maker)
    console.log('  - ECU 모델:', record.ecu_model)
    console.log('  - ACU 제조사:', record.acu_manufacturer)
    console.log('  - ACU 모델:', record.acu_model)
    console.log('  - 연결 방법:', record.connection_method)
    
    // 2. remapping_works 분석
    if (record.remapping_works) {
      console.log('📋 remapping_works 분석:')
      console.log('  - 타입:', typeof record.remapping_works)
      console.log('  - 원본 데이터:', record.remapping_works)
      
      try {
        const parsedWorks = typeof record.remapping_works === 'string' 
          ? JSON.parse(record.remapping_works)
          : record.remapping_works
        
        console.log('  - 파싱된 데이터:', parsedWorks)
        console.log('  - 배열 여부:', Array.isArray(parsedWorks))
        
        if (Array.isArray(parsedWorks) && parsedWorks.length > 0) {
          const firstWork = parsedWorks[0]
          console.log('  - 첫 번째 작업:', firstWork)
          
          if (firstWork.files) {
            console.log('  - 파일 데이터 존재:', !!firstWork.files)
            console.log('  - 파일 데이터 타입:', typeof firstWork.files)
            console.log('  - 파일 데이터:', firstWork.files)
          }
        }
      } catch (parseError) {
        console.error('  - JSON 파싱 오류:', parseError)
      }
    } else {
      console.log('❌ remapping_works가 없습니다.')
    }
    
    // 3. files 필드 분석
    if (record.files) {
      console.log('📁 files 필드 분석:')
      console.log('  - 타입:', typeof record.files)
      console.log('  - 원본 데이터:', record.files)
      
      try {
        const parsedFiles = typeof record.files === 'string' 
          ? JSON.parse(record.files)
          : record.files
        
        console.log('  - 파싱된 파일 데이터:', parsedFiles)
        
        if (Array.isArray(parsedFiles)) {
          console.log(`  - 파일 개수: ${parsedFiles.length}개`)
          parsedFiles.forEach((file, index) => {
            console.log(`    파일 ${index + 1}:`, {
              name: file.name,
              size: file.size,
              type: file.type,
              category: file.category,
              hasData: !!file.data,
              dataLength: file.data?.length || 0
            })
          })
        }
      } catch (parseError) {
        console.error('  - 파일 JSON 파싱 오류:', parseError)
      }
    } else {
      console.log('❌ files 필드가 없습니다.')
    }
    
    // 4. 마이그레이션 상태 확인
    const { data: migratedFiles, error: migrationError } = await supabase
      .from('file_metadata')
      .select('*')
      .eq('work_record_id', workRecordId)
    
    if (migrationError) {
      console.error('  - 마이그레이션 데이터 조회 오류:', migrationError)
    } else {
      console.log(`📊 마이그레이션 상태: ${migratedFiles?.length || 0}개 파일이 Storage에 저장됨`)
      if (migratedFiles && migratedFiles.length > 0) {
        migratedFiles.forEach((file, index) => {
          console.log(`  마이그레이션된 파일 ${index + 1}:`, {
            fileName: file.file_name,
            category: file.category,
            bucketName: file.bucket_name,
            storageUrl: file.storage_url
          })
        })
      }
    }
    
  } catch (error) {
    console.error(`❌ 작업 기록 ${workRecordId} 분석 오류:`, error)
  }
}

// 전체 데이터베이스 상태 요약
export const getDatabaseSummary = async (): Promise<void> => {
  try {
    console.log('📊 데이터베이스 상태 요약 시작...')
    
    // 1. 전체 작업 기록 수
    const { count: totalRecords } = await supabase
      .from('work_records')
      .select('*', { count: 'exact', head: true })
    
    // 2. remapping_works가 있는 기록 수
    const { count: recordsWithRemapping } = await supabase
      .from('work_records')
      .select('*', { count: 'exact', head: true })
      .not('remapping_works', 'is', null)
    
    // 3. files가 있는 기록 수
    const { count: recordsWithFiles } = await supabase
      .from('work_records')
      .select('*', { count: 'exact', head: true })
      .not('files', 'is', null)
    
    // 4. 마이그레이션된 파일 수
    const { count: migratedFiles } = await supabase
      .from('file_metadata')
      .select('*', { count: 'exact', head: true })
    
    // 5. 고유한 work_record_id 수 (마이그레이션된)
    const { data: uniqueWorkRecords } = await supabase
      .from('file_metadata')
      .select('work_record_id')
    
    const uniqueCount = new Set(uniqueWorkRecords?.map(r => r.work_record_id) || []).size
    
    console.log('📈 데이터베이스 상태 요약:')
    console.log(`  - 전체 작업 기록: ${totalRecords || 0}개`)
    console.log(`  - remapping_works 있는 기록: ${recordsWithRemapping || 0}개`)
    console.log(`  - files 필드 있는 기록: ${recordsWithFiles || 0}개`)
    console.log(`  - 마이그레이션된 파일: ${migratedFiles || 0}개`)
    console.log(`  - 마이그레이션된 작업 기록: ${uniqueCount}개`)
    console.log(`  - 마이그레이션 진행률: ${totalRecords ? (uniqueCount / totalRecords * 100).toFixed(1) : 0}%`)
    
    // 6. 최근 5개 작업 기록 ID 표시
    const { data: recentRecords } = await supabase
      .from('work_records')
      .select('id, work_date, ecu_maker, acu_manufacturer')
      .order('created_at', { ascending: false })
      .limit(5)
    
    console.log('📋 최근 작업 기록 5개:')
    recentRecords?.forEach((record, index) => {
      console.log(`  ${index + 1}. ID: ${record.id}, 날짜: ${record.work_date}, ECU: ${record.ecu_maker || 'N/A'}, ACU: ${record.acu_manufacturer || 'N/A'}`)
    })
    
  } catch (error) {
    console.error('❌ 데이터베이스 상태 요약 오류:', error)
  }
} 