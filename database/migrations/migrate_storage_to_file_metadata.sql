-- Storage의 파일들을 file_metadata 테이블로 마이그레이션
-- 이 스크립트는 Supabase Storage에 있는 파일들을 기반으로 file_metadata 테이블에 메타데이터를 생성합니다.

-- 1. work-files 버킷의 파일들을 file_metadata 테이블에 삽입
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
  created_at,
  uploaded_at
)
SELECT 
  -- 경로에서 work_record_id 추출 (customer_id/equipment_id 형식)
  (SELECT wr.id 
   FROM work_records wr 
   WHERE wr.customer_id = CAST(SPLIT_PART(obj.name, '/', 1) AS INTEGER)
   AND wr.equipment_id = CAST(SPLIT_PART(obj.name, '/', 2) AS INTEGER)
   LIMIT 1) as work_record_id,
  
  -- 파일명 추출
  SPLIT_PART(obj.name, '/', 3) as file_name,
  
  -- 원본 파일명 (타임스탬프 제거)
  CASE 
    WHEN SPLIT_PART(obj.name, '/', 3) LIKE '%_%_%' THEN
      -- ecu_1754520967037_vw6uvj4n9_denso(09338) -> denso(09338)
      SUBSTRING(SPLIT_PART(obj.name, '/', 3) FROM POSITION('_' IN SPLIT_PART(obj.name, '/', 3)) + 1)
    ELSE SPLIT_PART(obj.name, '/', 3)
  END as original_name,
  
  -- 파일 크기
  obj.metadata->>'size' as file_size,
  
  -- 파일 타입
  COALESCE(obj.metadata->>'mimetype', 'application/octet-stream') as file_type,
  
  -- 카테고리 (파일명에서 추출)
  CASE 
    WHEN LOWER(SPLIT_PART(obj.name, '/', 3)) LIKE 'ecu%' THEN 'ecu'
    WHEN LOWER(SPLIT_PART(obj.name, '/', 3)) LIKE 'acu%' THEN 'acu'
    ELSE 'media'
  END as category,
  
  -- 버킷명
  obj.bucket_id as bucket_name,
  
  -- 저장 경로
  obj.name as storage_path,
  
  -- Storage URL 생성
  'https://' || (SELECT project_ref FROM auth.users LIMIT 1) || '.supabase.co/storage/v1/object/public/' || 
  obj.bucket_id || '/' || obj.name as storage_url,
  
  -- 생성 시간
  obj.created_at,
  
  -- 업로드 시간
  obj.created_at as uploaded_at

FROM storage.objects obj
WHERE obj.bucket_id = 'work-files'
AND obj.name LIKE '%/%/%'  -- customer_id/equipment_id/file_name 형식
AND NOT EXISTS (
  -- 이미 file_metadata에 있는 파일은 제외
  SELECT 1 FROM file_metadata fm 
  WHERE fm.storage_path = obj.name
);

-- 2. work-media 버킷의 파일들도 추가
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
  created_at,
  uploaded_at
)
SELECT 
  -- 경로에서 work_record_id 추출
  (SELECT wr.id 
   FROM work_records wr 
   WHERE wr.customer_id = CAST(SPLIT_PART(obj.name, '/', 1) AS INTEGER)
   AND wr.equipment_id = CAST(SPLIT_PART(obj.name, '/', 2) AS INTEGER)
   LIMIT 1) as work_record_id,
  
  SPLIT_PART(obj.name, '/', 3) as file_name,
  
  CASE 
    WHEN SPLIT_PART(obj.name, '/', 3) LIKE '%_%_%' THEN
      SUBSTRING(SPLIT_PART(obj.name, '/', 3) FROM POSITION('_' IN SPLIT_PART(obj.name, '/', 3)) + 1)
    ELSE SPLIT_PART(obj.name, '/', 3)
  END as original_name,
  
  obj.metadata->>'size' as file_size,
  COALESCE(obj.metadata->>'mimetype', 'application/octet-stream') as file_type,
  'media' as category,
  obj.bucket_id as bucket_name,
  obj.name as storage_path,
  'https://' || (SELECT project_ref FROM auth.users LIMIT 1) || '.supabase.co/storage/v1/object/public/' || 
  obj.bucket_id || '/' || obj.name as storage_url,
  obj.created_at,
  obj.created_at as uploaded_at

FROM storage.objects obj
WHERE obj.bucket_id = 'work-media'
AND obj.name LIKE '%/%/%'
AND NOT EXISTS (
  SELECT 1 FROM file_metadata fm 
  WHERE fm.storage_path = obj.name
);

-- 3. work-documents 버킷의 파일들도 추가
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
  created_at,
  uploaded_at
)
SELECT 
  (SELECT wr.id 
   FROM work_records wr 
   WHERE wr.customer_id = CAST(SPLIT_PART(obj.name, '/', 1) AS INTEGER)
   AND wr.equipment_id = CAST(SPLIT_PART(obj.name, '/', 2) AS INTEGER)
   LIMIT 1) as work_record_id,
  
  SPLIT_PART(obj.name, '/', 3) as file_name,
  
  CASE 
    WHEN SPLIT_PART(obj.name, '/', 3) LIKE '%_%_%' THEN
      SUBSTRING(SPLIT_PART(obj.name, '/', 3) FROM POSITION('_' IN SPLIT_PART(obj.name, '/', 3)) + 1)
    ELSE SPLIT_PART(obj.name, '/', 3)
  END as original_name,
  
  obj.metadata->>'size' as file_size,
  COALESCE(obj.metadata->>'mimetype', 'application/octet-stream') as file_type,
  'document' as category,
  obj.bucket_id as bucket_name,
  obj.name as storage_path,
  'https://' || (SELECT project_ref FROM auth.users LIMIT 1) || '.supabase.co/storage/v1/object/public/' || 
  obj.bucket_id || '/' || obj.name as storage_url,
  obj.created_at,
  obj.created_at as uploaded_at

FROM storage.objects obj
WHERE obj.bucket_id = 'work-documents'
AND obj.name LIKE '%/%/%'
AND NOT EXISTS (
  SELECT 1 FROM file_metadata fm 
  WHERE fm.storage_path = obj.name
);

-- 4. 마이그레이션 결과 확인
SELECT 
  'Total files migrated' as status,
  COUNT(*) as count
FROM file_metadata
WHERE created_at >= NOW() - INTERVAL '1 hour';

-- 5. 각 작업 기록별 파일 수 확인
SELECT 
  wr.id as work_record_id,
  wr.work_date,
  COUNT(fm.id) as file_count
FROM work_records wr
LEFT JOIN file_metadata fm ON wr.id = fm.work_record_id
GROUP BY wr.id, wr.work_date
ORDER BY wr.work_date DESC;
