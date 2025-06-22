import { supabase, uploadFileToStorage, getBucketForFileType, generateUniqueFileName } from './supabase'
import { Tables } from './database.types'

type WorkRecordData = Tables<'work_records'>

const BUCKET_CONFIG: { [key: string]: { name: string; extensions: string[] } } = {
  media: {
    name: 'work-media',
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'mp4', 'avi', 'mov', 'wmv', 'flv'],
  },
  docs: {
    name: 'work-documents',
    extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'mmf'],
  },
  misc: {
    name: 'work-files',
    extensions: [], // for any other type
  }
};

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

// Base64를 파일 객체로 변환
export const base64ToFile = (base64: string, filename: string, mimeType: string): File => {
  console.log(`  [base64ToFile] Converting for "${filename}"`);
  console.log(`  [base64ToFile] Input data (first 80 chars): ${base64.substring(0, 80)}...`);

  let cleanBase64 = base64;
  const match = base64.match(/^data:.*?;base64,(.*)$/);
  if (match) {
    console.log("  [base64ToFile] Data URL format detected. Extracting base64 content.");
    cleanBase64 = match[1];
  }

  // Handle non-standard base64 characters and padding
  console.log("  [base64ToFile] Cleaning base64 string for atob compatibility...");
  cleanBase64 = cleanBase64.replace(/-/g, '+').replace(/_/g, '/');
  cleanBase64 = cleanBase64.replace(/\s/g, '');
  const padding = '='.repeat((4 - cleanBase64.length % 4) % 4);
  cleanBase64 += padding;

  try {
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    console.log(`  [base64ToFile] Created blob with size: ${blob.size} for file: ${filename}`);
    return new File([blob], filename, { type: mimeType });
  } catch (e: any) {
    console.error(`  [base64ToFile] 🔴 Failed to decode base64 for "${filename}". Error: ${e.message}`);
    console.error(`  [base64ToFile] Faulty data (first 80 chars): ${cleanBase64.substring(0, 80)}...`);
    throw e; // re-throw the error to be caught by the calling function
  }
};

// 단일 파일 마이그레이션
const migrateSingleFile = async (
  base64Data: string,
  fileName: string,
  mimeType: string,
  workRecordId: number | string,
  category: string
): Promise<any> => {
  console.log(`  [migrateSingleFile] Migrating "${fileName}" for record ${workRecordId}`);
  const file = base64ToFile(base64Data, fileName, mimeType);
  const bucket = getBucketForFileType(fileName);
  const uniqueName = generateUniqueFileName(fileName);
  const storagePath = `${workRecordId}/${uniqueName}`;

  // 1. Upload to Storage
  console.log(`  [migrateSingleFile] Uploading to bucket: "${bucket}", path: "${storagePath}"`);
  const { data: uploadData, error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, file);

  if (error) {
    console.error(`  [migrateSingleFile] 🔴 Storage upload failed for "${fileName}":`, error);
    throw new Error(`Storage 업로드 실패: ${error.message}`);
  }

  // 2. Get public URL
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  
  // 3. Insert metadata
  const metadata = {
    work_record_id: typeof workRecordId === 'string' ? parseInt(workRecordId, 10) : workRecordId,
    file_name: uniqueName,
    original_name: fileName,
    file_size: file.size,
    file_type: file.type,
    category: category,
    bucket_name: bucket,
    storage_path: uploadData.path,
    storage_url: urlData.publicUrl,
  };

  const { data: insertData, error: insertError } = await supabase
    .from('file_metadata')
    .insert(metadata)
    .select()
    .single();

  if (insertError) {
    console.error(`  [migrateSingleFile] 🔴 Metadata insert failed for "${fileName}":`, insertError);
    // TODO: Consider deleting the uploaded file from storage to avoid orphans
    throw new Error(`메타데이터 저장 실패: ${insertError.message}`);
  }

  console.log(`  [migrateSingleFile] ✅ Successfully migrated "${fileName}"`);
  return insertData;
};

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
    const bucketName = getBucketForFileType(file.name)
    const uniqueFileName = generateUniqueFileName(file.name)
    
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

// 데이터 마이그레이션 메인 함수
export const migrateAllFilesToStorage = async (
  onProgress: (current: number, total: number, recordId: number | string) => void
): Promise<{ success: number; failed: number }> => {
  const stats = { succeeded: 0, failed: 0, skipped: 0, totalFiles: 0 };
  console.log('🚀 [MIGRATION START] 전체 파일 마이그레이션을 시작합니다.');

  const recordsToProcess = await getAllWorkRecordsForMigration();

  if (recordsToProcess.length === 0) {
    console.log('🏁 [MIGRATION END] 처리할 레코드가 없습니다.');
    return { success: 0, failed: 0 };
  }

  for (const [index, record] of recordsToProcess.entries()) {
    onProgress(index + 1, recordsToProcess.length, record.id);
    console.log(`\n--- [Processing Record ${index + 1}/${recordsToProcess.length}] ID: ${record.id} ---`);

    // Check if already migrated by looking at file_metadata table
    const { count: existingFiles } = await supabase
      .from('file_metadata')
      .select('*', { count: 'exact', head: true })
      .eq('work_record_id', record.id);
    
    if (existingFiles && existingFiles > 0) {
      console.log(`  > 🟢 [ALREADY MIGRATED] ID ${record.id}는 이미 마이그레이션되었습니다. (${existingFiles}개 파일)`);
      stats.skipped++;
      continue;
    }
    
    console.log(`  [step 2.1] ID ${record.id}의 파일 데이터 추출을 시작합니다.`);
    let filesToMigrate: any[] = [];
    let rawFilesData: any = null;

    const recordFromDb = record as any;
    const potentialFields = ['remappingWorks', 'remapping_works', 'files'];

    for (const field of potentialFields) {
      console.log(`    - ${field} 필드에서 데이터를 찾습니다.`);
      const data = recordFromDb[field];
      
      if (data) {
        let parsedData: any = null;
        if (typeof data === 'string') {
          console.log(`      - ${field}가 문자열입니다. 파싱을 시도합니다.`);
          try {
            parsedData = JSON.parse(data);
          } catch (e) {
            console.error(`      - 🔴 ${field} 1차 JSON 파싱 실패:`, e);
            parsedData = null;
          }
        } else {
          parsedData = data;
        }

        // Handle double-stringified JSON
        if (typeof parsedData === 'string') {
            console.log(`      - 데이터가 이중으로 문자열화되어 있습니다. 추가 파싱을 시도합니다.`);
            try {
                rawFilesData = JSON.parse(parsedData);
            } catch (e) {
                console.error(`      - 🔴 ${field} 2차 JSON 파싱 실패:`, e);
                rawFilesData = null;
            }
        } else {
            rawFilesData = parsedData;
        }

        if (rawFilesData && Array.isArray(rawFilesData)) {
            filesToMigrate = rawFilesData.filter(file => file && (file.file_base64 || file.base64 || file.data));
            if (filesToMigrate.length > 0) {
              console.log(`      - ✅ ${field}에서 ${filesToMigrate.length}개의 유효한 파일을 찾았습니다.`);
              break; 
            }
        }
      }
    }

    if (filesToMigrate.length === 0) {
      console.log('    - 🟡 마이그레이션할 파일 데이터를 찾지 못했습니다.');
      const debugData = {
        id: record.id,
        created_at: record.created_at,
        remappingWorks: recordFromDb.remappingWorks ? 'Found' : 'Not Found',
        remapping_works: recordFromDb.remapping_works ? 'Found' : 'Not Found',
        files: recordFromDb.files ? 'Found' : 'Not Found',
      }
      console.log('    - [DEBUG] Record relevant fields status:', JSON.stringify(debugData, null, 2));
    }

    // If no files found, skip
    if (filesToMigrate.length === 0) {
      console.log(`  > 🟡 [SKIPPED] ID ${record.id} 마이그레이션 대상 파일 없음.`);
      stats.skipped++;
      continue;
    }

    console.log(`  [step 2.2] ID ${record.id}에 대해 총 ${filesToMigrate.length}개의 파일을 마이그레이션합니다.`);
    stats.totalFiles += filesToMigrate.length;

    let successInRecord = true;
    let migratedCountInRecord = 0;
    for (const [fileIndex, file] of filesToMigrate.entries()) {
      try {
        // Adapt to possible variations in property names (file_base64 or base64 or data)
        const base64Data = file.file_base64 || file.base64 || file.data;
        const fileName = file.file_name || file.name || 'unknown_file';

        if (!base64Data) {
          console.log(`      - 🟡 파일에 Base64 데이터가 없어 건너뜁니다: ${fileName}`);
          continue;
        }
        
        console.log(`    [step 2.2.${fileIndex + 1}] "${fileName}" 파일 마이그레이션 중...`);

        const newFileMetadata = await migrateSingleFile(
          base64Data,
          fileName,
          file.type || 'application/octet-stream',
          record.id,
          file.category || 'unknown'
        );

        if (newFileMetadata) {
          migratedCountInRecord++;
        } else {
          successInRecord = false;
        }
      } catch (e: any) {
        successInRecord = false;
        console.error(`  > 🔴 [ERROR] 파일 마이그레이션 중 오류 발생 (File: ${file.file_name || file.name}, Record ID: ${record.id}):`, e);
      }
    }

    // After processing all files for a record, update stats
    if (successInRecord) {
      console.log(`  > ✅ [SUCCESS] ID ${record.id}의 모든 파일 (${migratedCountInRecord}개) 마이그레이션 성공.`);
      stats.succeeded++;
    } else {
      console.log(`  > 🔴 [FAILED] ID ${record.id}의 파일 중 일부 또는 전체 마이그레이션 실패.`);
      stats.failed++;
    }
  }

  console.log('\n🏁 [MIGRATION END] 마이그레이션 작업이 완료되었습니다.');
  console.log(`   - 성공: ${stats.succeeded}건`);
  console.log(`   - 실패: ${stats.failed}건`);
  console.log(`   - 스킵: ${stats.skipped}건`);
  console.log(`   - 총 처리된 파일: ${stats.totalFiles}개`);

  return { success: stats.succeeded, failed: stats.failed };
}

// 마이그레이션 상태 확인 (대시보드용)
export const checkMigrationStatus = async () => {
  try {
    console.log('📊 마이그레이션 상태 확인 중...');
    
    // 1. 전체 작업 기록 수
    const { count: totalRecords, error: totalError } = await supabase
      .from('work_records')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      console.error('❌ 전체 작업 기록 수 조회 실패:', totalError);
      throw totalError;
    }

    // 2. 마이그레이션된 파일 수
    const { count: migratedFiles, error: migratedError } = await supabase
      .from('file_metadata')
      .select('*', { count: 'exact', head: true });

    if (migratedError) {
      console.error('❌ 마이그레이션된 파일 수 조회 실패:', migratedError);
      throw migratedError;
    }

    // 3. 마이그레이션된 레코드 수 (고유한 work_record_id)
    const { data: distinctRecords, error: distinctError } = await supabase
      .from('file_metadata')
      .select('work_record_id')
      .not('work_record_id', 'is', null);

    if (distinctError) {
      console.error('❌ 고유 레코드 조회 실패:', distinctError);
      throw distinctError;
    }

    const uniqueRecordIds = new Set(distinctRecords?.map(r => r.work_record_id) || []);
    const migratedRecords = uniqueRecordIds.size;

    console.log('✅ 마이그레이션 상태 조회 완료:', {
      totalRecords,
      migratedFiles,
      migratedRecords
    });

    return {
      totalRecords: totalRecords || 0,
      migratedFiles: migratedFiles || 0,
      migratedRecords,
      migrationProgress: totalRecords ? Math.round((migratedRecords / totalRecords) * 100) : 0
    };
  } catch (error) {
    console.error('❌ 마이그레이션 상태 확인 실패:', error);
    throw error;
  }
};

// 마이그레이션 상태 확인
export const getMigrationStatus = async (): Promise<{ total: number; migrated: number }> => {
  const { count: total, error: totalError } = await supabase
    .from('work_records')
    .select('*', { count: 'exact', head: true });

  if (totalError) {
    console.error('🔴 전체 작업 기록 수 조회 실패:', totalError);
    return { total: 0, migrated: 0 };
  }

  // Count distinct work_record_id from file_metadata table
  const { data: migratedRecords, error: migratedError } = await supabase
    .from('file_metadata')
    .select('work_record_id')
    .not('work_record_id', 'is', null);

  if (migratedError) {
    console.error('🔴 마이그레이션된 레코드 조회 실패:', migratedError);
    return { total: total || 0, migrated: 0 };
  }

  // Get unique work_record_ids
  const uniqueRecordIds = new Set(migratedRecords?.map(r => r.work_record_id) || []);
  
  return {
    total: total || 0,
    migrated: uniqueRecordIds.size,
  };
};

// 데이터 구조 분석을 위한 디버깅 함수
export const analyzeWorkRecordData = async (recordId: number) => {
  console.log(`🔍 Record ID ${recordId} 데이터 분석 시작...`);
  const { data, error } = await supabase
    .from('work_records')
    .select('*')
    .eq('id', recordId)
    .single();

  if (error) {
    console.error('  🔴 레코드 조회 실패:', error);
    return;
  }

  if (!data) {
    console.log('  🟡 레코드를 찾을 수 없습니다.');
    return;
  }

  console.log('  ✅ 레코드 조회 성공. 필드 분석:');
  
  for (const key in data) {
    const value = (data as any)[key];
    console.log(`    - 필드명: ${key}`);
    console.log(`      - 타입: ${typeof value}`);
    if (typeof value === 'string') {
      console.log(`      - 길이: ${value.length}`);
      console.log(`      - 내용 (앞 100자): ${value.substring(0, 100)}...`);
      try {
        JSON.parse(value);
        console.log(`      - ✅ JSON 파싱 가능`);
      } catch (e) {
        console.log(`      - ❌ JSON 파싱 불가능`);
      }
    } else if (value && typeof value === 'object') {
      console.log(`      - 내용: ${JSON.stringify(value, null, 2)}`);
    } else {
      console.log(`      - 값: ${value}`);
    }
  }
};

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

// 마이그레이션 대상인 가장 최신 작업 기록을 자동으로 찾아 분석하는 함수
export const analyzeLatestWorkRecordWithFiles = async (): Promise<void> => {
  try {
    console.log('🔄 마이그레이션 대상 최신 작업 기록 분석 시작...');

    const { data: latestRecord, error } = await supabase
      .from('work_records')
      .select('id')
      .not('remapping_works', 'is', null)
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (error || !latestRecord) {
      console.log('🟡 마이그레이션할 파일이 포함된 작업 기록을 찾을 수 없습니다.');
      if (error && error.code !== 'PGRST116') { // 'PGRST116' (no rows) is an expected outcome here.
         console.error('최신 기록 조회 오류:', error);
      }
      return;
    }

    console.log(`✅ 최신 작업 기록 ID ${latestRecord.id}를 찾았습니다. 상세 분석을 시작합니다.`);
    await analyzeSpecificWorkRecord(latestRecord.id);

  } catch (err) {
    console.error('💥 최신 작업 기록 분석 중 예외 발생:', err);
  }
};

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