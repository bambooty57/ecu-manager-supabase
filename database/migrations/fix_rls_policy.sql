-- RLS 정책 수정: file_metadata 테이블 접근 허용
-- 기존 정책 삭제 후 새로 생성

-- 1. 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "file_metadata_insert_policy" ON file_metadata;
DROP POLICY IF EXISTS "file_metadata_select_policy" ON file_metadata;
DROP POLICY IF EXISTS "file_metadata_update_policy" ON file_metadata;
DROP POLICY IF EXISTS "file_metadata_delete_policy" ON file_metadata;

-- 2. 인증된 사용자에게 모든 권한 허용하는 정책 생성
CREATE POLICY "file_metadata_all_access_policy" ON file_metadata
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 3. 익명 사용자도 읽기 허용 (선택사항)
CREATE POLICY "file_metadata_public_read_policy" ON file_metadata
  FOR SELECT
  USING (true);

-- 4. 정책 적용 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'file_metadata'; 