-- ===============================================
-- 🚀 work_records 테이블에 is_active 컬럼 추가
-- ===============================================
-- 목적: 작업 기록의 활성/비활성 상태를 관리하기 위한 컬럼 추가

-- 1단계: is_active 컬럼 추가
ALTER TABLE work_records 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 2단계: 성능 최적화를 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_work_records_is_active ON work_records(is_active);

-- 3단계: 컬럼 주석 추가
COMMENT ON COLUMN work_records.is_active IS '작업 기록 활성 상태 여부 (true: 활성, false: 비활성)';

-- 4단계: 기존 데이터에 기본값 설정
UPDATE work_records 
SET is_active = TRUE 
WHERE is_active IS NULL;

-- 5단계: 확인 쿼리 (실행 후 결과 확인)
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_records,
    COUNT(CASE WHEN is_active = FALSE THEN 1 END) as inactive_records
FROM work_records;

-- 6단계: 인덱스 확인
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'work_records' 
AND indexname LIKE '%is_active%';
