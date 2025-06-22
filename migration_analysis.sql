-- ==========================================
-- 📊 마이그레이션 데이터 분석 및 실행 SQL
-- ==========================================

-- 1. 전체 데이터 상태 확인
SELECT 
  '전체 작업 기록 수' as 구분,
  COUNT(*) as 개수
FROM work_records

UNION ALL

SELECT 
  'remapping_works 있는 기록',
  COUNT(*)
FROM work_records 
WHERE remapping_works IS NOT NULL

UNION ALL

SELECT 
  'files 필드 있는 기록',
  COUNT(*)
FROM work_records 
WHERE files IS NOT NULL

UNION ALL

SELECT 
  '마이그레이션된 파일',
  COUNT(*)
FROM file_metadata;

-- 2. 상세 작업 기록 분석 (최근 10개)
SELECT 
  id,
  work_date,
  ecu_maker,
  acu_manufacturer,
  CASE 
    WHEN remapping_works IS NOT NULL THEN '있음'
    ELSE '없음'
  END as remapping_works_상태,
  CASE 
    WHEN files IS NOT NULL THEN '있음'
    ELSE '없음'
  END as files_상태,
  created_at
FROM work_records 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. remapping_works 구조 분석 (첫 5개 기록)
SELECT 
  id,
  work_date,
  LENGTH(remapping_works::text) as json_길이,
  remapping_works
FROM work_records 
WHERE remapping_works IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- 4. 마이그레이션 대상 파일 추출 및 Storage 업로드
-- (이 부분은 실제 파일 데이터가 있는 경우에만 실행)

-- 4-1. 마이그레이션 가능한 기록 확인
WITH migration_candidates AS (
  SELECT 
    id,
    work_date,
    remapping_works,
    files
  FROM work_records 
  WHERE remapping_works IS NOT NULL
    AND remapping_works::text != 'null'
    AND remapping_works::text != '[]'
    AND LENGTH(remapping_works::text) > 10
)
SELECT 
  id,
  work_date,
  '마이그레이션 대상' as 상태
FROM migration_candidates
ORDER BY created_at DESC;

-- 5. 실제 파일 데이터 추출 (Base64 데이터 확인)
-- 주의: 이 쿼리는 실제 데이터 구조에 따라 수정이 필요할 수 있습니다.
WITH file_extraction AS (
  SELECT 
    wr.id as work_record_id,
    wr.work_date,
    wr.remapping_works,
    -- JSON에서 파일 데이터 추출 시도
    CASE 
      WHEN jsonb_typeof(wr.remapping_works) = 'array' THEN
        wr.remapping_works->0->'files'
      ELSE
        wr.remapping_works->'files'
    END as extracted_files
  FROM work_records wr
  WHERE wr.remapping_works IS NOT NULL
    AND wr.remapping_works::text != 'null'
    AND wr.remapping_works::text != '[]'
)
SELECT 
  work_record_id,
  work_date,
  CASE 
    WHEN extracted_files IS NOT NULL THEN '파일 데이터 있음'
    ELSE '파일 데이터 없음'
  END as 파일_상태,
  jsonb_typeof(extracted_files) as 파일_타입
FROM file_extraction
ORDER BY work_record_id DESC
LIMIT 10;

-- 6. 마이그레이션 실행 함수 (PL/pgSQL)
-- 주의: 이 함수는 실제 파일 업로드는 하지 않고, file_metadata 테이블에만 기록합니다.
CREATE OR REPLACE FUNCTION migrate_work_record_files()
RETURNS TABLE(
  work_record_id INTEGER,
  processed_files INTEGER,
  status TEXT
) AS $$
DECLARE
  record_row RECORD;
  file_data JSONB;
  file_item JSONB;
  file_counter INTEGER;
  unique_filename TEXT;
  bucket_name TEXT;
  storage_path TEXT;
BEGIN
  -- 마이그레이션 대상 기록들을 순회
  FOR record_row IN 
    SELECT id, remapping_works, files
    FROM work_records 
    WHERE remapping_works IS NOT NULL 
      AND remapping_works::text != 'null'
      AND remapping_works::text != '[]'
      AND LENGTH(remapping_works::text) > 10
    ORDER BY id
  LOOP
    file_counter := 0;
    
    -- remapping_works에서 파일 데이터 추출
    BEGIN
      -- 배열인 경우 첫 번째 요소에서 files 추출
      IF jsonb_typeof(record_row.remapping_works) = 'array' THEN
        file_data := record_row.remapping_works->0->'files';
      ELSE
        file_data := record_row.remapping_works->'files';
      END IF;
      
      -- files 필드에서도 확인
      IF file_data IS NULL AND record_row.files IS NOT NULL THEN
        file_data := record_row.files;
      END IF;
      
      -- 파일 데이터가 있는 경우 처리
      IF file_data IS NOT NULL AND jsonb_typeof(file_data) = 'array' THEN
        -- 각 파일을 순회하며 file_metadata에 기록
        FOR file_item IN SELECT * FROM jsonb_array_elements(file_data)
        LOOP
          -- 파일에 필요한 정보가 있는지 확인
          IF file_item ? 'name' AND file_item ? 'data' AND LENGTH(file_item->>'data') > 100 THEN
            file_counter := file_counter + 1;
            
            -- 고유 파일명 생성
            unique_filename := EXTRACT(EPOCH FROM NOW())::TEXT || '_' || 
                             substr(md5(random()::text), 1, 8) || '_' || 
                             (file_item->>'name');
            
            -- 버킷 결정 (파일 확장자 기반)
            CASE 
              WHEN LOWER(file_item->>'name') ~ '\.(jpg|jpeg|png|gif|webp|avif)$' THEN
                bucket_name := 'work-media';
              WHEN LOWER(file_item->>'name') ~ '\.(mp4|avi|mov|wmv|flv)$' THEN
                bucket_name := 'work-media';
              ELSE
                bucket_name := 'work-files';
            END CASE;
            
            -- Storage 경로 생성
            storage_path := record_row.id::TEXT || '/' || unique_filename;
            
            -- file_metadata 테이블에 기록
            INSERT INTO file_metadata (
              work_record_id,
              file_name,
              original_name,
              file_size,
              file_type,
              category,
              bucket_name,
              storage_path,
              storage_url,
              created_at
            ) VALUES (
              record_row.id,
              unique_filename,
              file_item->>'name',
              COALESCE((file_item->>'size')::INTEGER, LENGTH(file_item->>'data') * 3 / 4), -- Base64 크기 추정
              COALESCE(file_item->>'type', 'application/octet-stream'),
              COALESCE(file_item->>'category', 'unknown'),
              bucket_name,
              storage_path,
              'https://ewxzampbdpuaawzrvsln.supabase.co/storage/v1/object/public/' || bucket_name || '/' || storage_path,
              NOW()
            );
          END IF;
        END LOOP;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- JSON 파싱 오류 등 무시하고 계속 진행
      CONTINUE;
    END;
    
    -- 결과 반환
    work_record_id := record_row.id;
    processed_files := file_counter;
    status := CASE 
      WHEN file_counter > 0 THEN 'SUCCESS'
      ELSE 'NO_FILES'
    END;
    
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- 7. 마이그레이션 실행
-- 주의: 이 함수를 실행하기 전에 위의 분석 쿼리들을 먼저 실행해서 데이터 상태를 확인하세요.
-- SELECT * FROM migrate_work_record_files();

-- 8. 마이그레이션 결과 확인
SELECT 
  fm.work_record_id,
  wr.work_date,
  wr.ecu_maker,
  COUNT(fm.id) as 마이그레이션된_파일수,
  STRING_AGG(fm.file_name, ', ') as 파일목록
FROM file_metadata fm
JOIN work_records wr ON fm.work_record_id = wr.id
GROUP BY fm.work_record_id, wr.work_date, wr.ecu_maker
ORDER BY fm.work_record_id DESC;

-- 9. Storage 버킷별 파일 수 확인
SELECT 
  bucket_name,
  COUNT(*) as 파일수,
  COUNT(DISTINCT work_record_id) as 작업기록수
FROM file_metadata
GROUP BY bucket_name;

-- 10. 마이그레이션 통계
SELECT 
  '마이그레이션 완료' as 상태,
  COUNT(DISTINCT work_record_id) as 완료된_작업기록,
  COUNT(*) as 총_마이그레이션된_파일,
  ROUND(AVG(file_size)::NUMERIC, 2) as 평균_파일크기_bytes
FROM file_metadata; 