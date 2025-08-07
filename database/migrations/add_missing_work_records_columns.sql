-- work_records 테이블에 누락된 컬럼들 추가
-- 이미 존재하는 컬럼이 있다면 에러가 발생할 수 있으므로 조건부로 추가

-- tools_used 컬럼 추가 (문자열 배열)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_records' AND column_name = 'tools_used'
  ) THEN
    ALTER TABLE work_records ADD COLUMN tools_used text[];
  END IF;
END $$;

-- work_description 컬럼 추가 (텍스트)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_records' AND column_name = 'work_description'
  ) THEN
    ALTER TABLE work_records ADD COLUMN work_description text;
  END IF;
END $$;

-- price 컬럼 추가 (숫자)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_records' AND column_name = 'price'
  ) THEN
    ALTER TABLE work_records ADD COLUMN price numeric;
  END IF;
END $$;

-- acu_type 컬럼 확인 및 추가 (이미 있을 수 있음)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_records' AND column_name = 'acu_type'
  ) THEN
    ALTER TABLE work_records ADD COLUMN acu_type text;
  END IF;
END $$;

-- user_id 컬럼 추가 (UUID 타입, 작업자 정보)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_records' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE work_records ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- 기본값 설정 및 인덱스 추가
ALTER TABLE work_records ALTER COLUMN tools_used SET DEFAULT '{}';
ALTER TABLE work_records ALTER COLUMN price SET DEFAULT 0;

-- 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_work_records_tools_used ON work_records USING GIN (tools_used);
CREATE INDEX IF NOT EXISTS idx_work_records_user_id ON work_records (user_id);
CREATE INDEX IF NOT EXISTS idx_work_records_price ON work_records (price);

-- 기존 레코드에 기본값 설정
UPDATE work_records 
SET 
  tools_used = COALESCE(tools_used, '{}'),
  price = COALESCE(price, total_price, 0),
  work_description = COALESCE(work_description, work_type)
WHERE tools_used IS NULL OR price IS NULL OR work_description IS NULL;

-- 코멘트 추가
COMMENT ON COLUMN work_records.tools_used IS '사용된 도구 목록 (KESS, FLEX, KTAG 등)';
COMMENT ON COLUMN work_records.work_description IS '작업 상세 설명';
COMMENT ON COLUMN work_records.price IS '작업 가격 (개별 항목)';
COMMENT ON COLUMN work_records.user_id IS '작업 수행자 ID'; 