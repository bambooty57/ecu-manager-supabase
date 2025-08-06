-- work_records 테이블에서 status 컬럼 삭제
-- 이제 ECU와 ACU 각각의 개별 상태만 사용하므로 전체 작업 상태는 불필요

ALTER TABLE public.work_records DROP COLUMN IF EXISTS status;

-- 변경 사항 확인
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'work_records' 
-- AND table_schema = 'public'
-- ORDER BY ordinal_position;
