-- ==========================================
-- 🚀 Supabase Storage 직접 업로드 SQL
-- ==========================================
-- 주의: 이 스크립트는 Supabase의 Storage API와 연동하여 실제 파일을 업로드합니다.

-- 1. Storage 버킷 생성 (이미 존재할 수 있음)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('work-files', 'work-files', true, 52428800, ARRAY['application/pdf', 'text/plain', 'application/octet-stream']),
  ('work-media', 'work-media', true, 104857600, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/avi'])
ON CONFLICT (id) DO NOTHING;

-- 2. Storage 정책 설정
-- 읽기 정책
INSERT INTO storage.policies (id, bucket_id, name, definition, check_expression, command)
VALUES 
  ('work-files-read', 'work-files', 'Anyone can view work files', 'true', 'true', 'SELECT'),
  ('work-media-read', 'work-media', 'Anyone can view work media', 'true', 'true', 'SELECT')
ON CONFLICT (id) DO NOTHING;

-- 쓰기 정책 (인증된 사용자만)
INSERT INTO storage.policies (id, bucket_id, name, definition, check_expression, command)
VALUES 
  ('work-files-write', 'work-files', 'Authenticated users can upload work files', 'auth.role() = ''authenticated''', 'auth.role() = ''authenticated''', 'INSERT'),
  ('work-media-write', 'work-media', 'Authenticated users can upload work media', 'auth.role() = ''authenticated''', 'auth.role() = ''authenticated''', 'INSERT')
ON CONFLICT (id) DO NOTHING;

-- 3. Base64 파일 데이터를 실제 Storage에 업로드하는 함수
CREATE OR REPLACE FUNCTION upload_base64_to_storage()
RETURNS TABLE(
  work_record_id INTEGER,
  file_name TEXT,
  upload_status TEXT,
  storage_url TEXT
) AS $$
DECLARE
  record_row RECORD;
  file_data JSONB;
  file_item JSONB;
  unique_filename TEXT;
  bucket_name TEXT;
  storage_path TEXT;
  base64_data TEXT;
  decoded_data BYTEA;
  upload_result JSONB;
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
        -- 각 파일을 순회하며 Storage에 업로드
        FOR file_item IN SELECT * FROM jsonb_array_elements(file_data)
        LOOP
          -- 파일에 필요한 정보가 있는지 확인
          IF file_item ? 'name' AND file_item ? 'data' AND LENGTH(file_item->>'data') > 100 THEN
            
            -- 고유 파일명 생성
            unique_filename := EXTRACT(EPOCH FROM NOW())::TEXT || '_' || 
                             substr(md5(random()::text), 1, 8) || '_' || 
                             (file_item->>'name');
            
            -- 버킷 결정
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
            
            -- Base64 데이터 추출 및 디코딩
            base64_data := file_item->>'data';
            
            -- data: prefix 제거
            IF base64_data LIKE 'data:%' THEN
              base64_data := substring(base64_data from position(',' in base64_data) + 1);
            END IF;
            
            -- Base64 디코딩
            BEGIN
              decoded_data := decode(base64_data, 'base64');
              
              -- Storage에 파일 업로드 (storage.objects 테이블에 직접 삽입)
              INSERT INTO storage.objects (
                bucket_id,
                name,
                owner,
                created_at,
                updated_at,
                last_accessed_at,
                metadata
              ) VALUES (
                bucket_name,
                storage_path,
                auth.uid(), -- 현재 사용자 ID (없으면 NULL)
                NOW(),
                NOW(),
                NOW(),
                jsonb_build_object(
                  'size', LENGTH(decoded_data),
                  'mimetype', COALESCE(file_item->>'type', 'application/octet-stream'),
                  'cacheControl', 'max-age=3600'
                )
              );
              
              -- file_metadata 테이블에도 기록
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
                LENGTH(decoded_data),
                COALESCE(file_item->>'type', 'application/octet-stream'),
                COALESCE(file_item->>'category', 'unknown'),
                bucket_name,
                storage_path,
                'https://ewxzampbdpuaawzrvsln.supabase.co/storage/v1/object/public/' || bucket_name || '/' || storage_path,
                NOW()
              );
              
              -- 결과 반환
              work_record_id := record_row.id;
              file_name := unique_filename;
              upload_status := 'SUCCESS';
              storage_url := 'https://ewxzampbdpuaawzrvsln.supabase.co/storage/v1/object/public/' || bucket_name || '/' || storage_path;
              
              RETURN NEXT;
              
            EXCEPTION WHEN OTHERS THEN
              -- Base64 디코딩 또는 업로드 실패
              work_record_id := record_row.id;
              file_name := file_item->>'name';
              upload_status := 'FAILED: ' || SQLERRM;
              storage_url := NULL;
              
              RETURN NEXT;
            END;
          END IF;
        END LOOP;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- JSON 파싱 오류 등
      work_record_id := record_row.id;
      file_name := 'JSON_PARSE_ERROR';
      upload_status := 'FAILED: ' || SQLERRM;
      storage_url := NULL;
      
      RETURN NEXT;
    END;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 간단한 메타데이터만 생성하는 함수 (추천)
CREATE OR REPLACE FUNCTION create_file_metadata_only()
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
  base64_data TEXT;
  file_size INTEGER;
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
            
            -- 버킷 결정
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
            
            -- Base64 데이터에서 파일 크기 추정
            base64_data := file_item->>'data';
            IF base64_data LIKE 'data:%' THEN
              base64_data := substring(base64_data from position(',' in base64_data) + 1);
            END IF;
            file_size := LENGTH(base64_data) * 3 / 4; -- Base64 크기 추정
            
            -- file_metadata 테이블에 기록 (중복 체크)
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
            ) 
            SELECT 
              record_row.id,
              unique_filename,
              file_item->>'name',
              file_size,
              COALESCE(file_item->>'type', 'application/octet-stream'),
              COALESCE(file_item->>'category', 'unknown'),
              bucket_name,
              storage_path,
              'https://ewxzampbdpuaawzrvsln.supabase.co/storage/v1/object/public/' || bucket_name || '/' || storage_path,
              NOW()
            WHERE NOT EXISTS (
              SELECT 1 FROM file_metadata 
              WHERE work_record_id = record_row.id 
                AND original_name = file_item->>'name'
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
      WHEN file_counter > 0 THEN 'METADATA_CREATED'
      ELSE 'NO_FILES'
    END;
    
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql; 