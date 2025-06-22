-- Supabase Storage 버킷 생성 및 정책 설정
-- ECU 관리 시스템에서 사용할 파일 스토리지 구성

-- 1. 작업 파일용 버킷 (ECU/ACU 파일들)
INSERT INTO storage.buckets (id, name, public)
VALUES ('work-files', 'work-files', true);

-- 2. 미디어 파일용 버킷 (이미지/동영상)
INSERT INTO storage.buckets (id, name, public)
VALUES ('work-media', 'work-media', true);

-- 3. 문서 파일용 버킷 (PDF, DOC 등)
INSERT INTO storage.buckets (id, name, public)
VALUES ('work-documents', 'work-documents', true);

-- Storage 정책 설정

-- work-files 버킷 정책
CREATE POLICY "work-files 읽기 허용" ON storage.objects
FOR SELECT USING (bucket_id = 'work-files');

CREATE POLICY "work-files 업로드 허용" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'work-files');

CREATE POLICY "work-files 업데이트 허용" ON storage.objects
FOR UPDATE USING (bucket_id = 'work-files');

CREATE POLICY "work-files 삭제 허용" ON storage.objects
FOR DELETE USING (bucket_id = 'work-files');

-- work-media 버킷 정책
CREATE POLICY "work-media 읽기 허용" ON storage.objects
FOR SELECT USING (bucket_id = 'work-media');

CREATE POLICY "work-media 업로드 허용" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'work-media');

CREATE POLICY "work-media 업데이트 허용" ON storage.objects
FOR UPDATE USING (bucket_id = 'work-media');

CREATE POLICY "work-media 삭제 허용" ON storage.objects
FOR DELETE USING (bucket_id = 'work-media');

-- work-documents 버킷 정책
CREATE POLICY "work-documents 읽기 허용" ON storage.objects
FOR SELECT USING (bucket_id = 'work-documents');

CREATE POLICY "work-documents 업로드 허용" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'work-documents');

CREATE POLICY "work-documents 업데이트 허용" ON storage.objects
FOR UPDATE USING (bucket_id = 'work-documents');

CREATE POLICY "work-documents 삭제 허용" ON storage.objects
FOR DELETE USING (bucket_id = 'work-documents');

-- 파일 메타데이터 저장을 위한 테이블 생성
CREATE TABLE IF NOT EXISTS file_metadata (
  id BIGSERIAL PRIMARY KEY,
  work_record_id BIGINT NOT NULL REFERENCES work_records(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  category TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  bucket_name TEXT NOT NULL,
  description TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_file_metadata_work_record_id ON file_metadata(work_record_id);
CREATE INDEX idx_file_metadata_category ON file_metadata(category);
CREATE INDEX idx_file_metadata_bucket_name ON file_metadata(bucket_name);

-- 업데이트 시간 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_file_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_file_metadata_updated_at
  BEFORE UPDATE ON file_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_file_metadata_updated_at();

-- RLS (Row Level Security) 활성화
ALTER TABLE file_metadata ENABLE ROW LEVEL SECURITY;

-- file_metadata 테이블 정책
CREATE POLICY "file_metadata 읽기 허용" ON file_metadata
FOR SELECT USING (true);

CREATE POLICY "file_metadata 삽입 허용" ON file_metadata
FOR INSERT WITH CHECK (true);

CREATE POLICY "file_metadata 업데이트 허용" ON file_metadata
FOR UPDATE USING (true);

CREATE POLICY "file_metadata 삭제 허용" ON file_metadata
FOR DELETE USING (true); 