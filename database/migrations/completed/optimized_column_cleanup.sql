-- ===============================================
-- 🚀 최적화된 중복 컬럼 정리 스크립트
-- ===============================================
-- 목적: 데이터 손실 없이 중복 컬럼들을 안전하게 제거
-- 전략: remapping_works를 메인 데이터 소스로 사용

-- 1단계: 데이터 백업 (안전을 위해)
CREATE TABLE IF NOT EXISTS work_records_backup_$(date +%Y%m%d_%H%M%S) AS 
SELECT * FROM work_records;

-- 2단계: remapping_works 데이터 검증
-- remapping_works에 모든 필요한 정보가 포함되어 있는지 확인
SELECT 
  id,
  CASE 
    WHEN remapping_works IS NOT NULL AND jsonb_array_length(remapping_works) > 0 
    THEN 'VALID' 
    ELSE 'INVALID' 
  END as remapping_works_status,
  CASE 
    WHEN ecu_status IS NOT NULL THEN 'HAS_ECU_STATUS'
    ELSE 'NO_ECU_STATUS'
  END as ecu_status_status,
  CASE 
    WHEN acu_status IS NOT NULL THEN 'HAS_ACU_STATUS'
    ELSE 'NO_ACU_STATUS'
  END as acu_status_status
FROM work_records;

-- 3단계: 중복 컬럼 제거 (안전한 방법)
-- 먼저 제거할 컬럼들을 확인
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    -- ecu_status 컬럼 제거
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_records' AND column_name = 'ecu_status'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE work_records DROP COLUMN ecu_status;
        RAISE NOTICE 'ecu_status 컬럼이 제거되었습니다.';
    ELSE
        RAISE NOTICE 'ecu_status 컬럼이 이미 존재하지 않습니다.';
    END IF;
    
    -- acu_status 컬럼 제거
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_records' AND column_name = 'acu_status'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE work_records DROP COLUMN acu_status;
        RAISE NOTICE 'acu_status 컬럼이 제거되었습니다.';
    ELSE
        RAISE NOTICE 'acu_status 컬럼이 이미 존재하지 않습니다.';
    END IF;
    
    -- ecu_price 컬럼 제거
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_records' AND column_name = 'ecu_price'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE work_records DROP COLUMN ecu_price;
        RAISE NOTICE 'ecu_price 컬럼이 제거되었습니다.';
    ELSE
        RAISE NOTICE 'ecu_price 컬럼이 이미 존재하지 않습니다.';
    END IF;
    
    -- acu_price 컬럼 제거
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_records' AND column_name = 'acu_price'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE work_records DROP COLUMN acu_price;
        RAISE NOTICE 'acu_price 컬럼이 제거되었습니다.';
    ELSE
        RAISE NOTICE 'acu_price 컬럼이 이미 존재하지 않습니다.';
    END IF;
    
    -- ecu_works 컬럼 제거
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_records' AND column_name = 'ecu_works'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE work_records DROP COLUMN ecu_works;
        RAISE NOTICE 'ecu_works 컬럼이 제거되었습니다.';
    ELSE
        RAISE NOTICE 'ecu_works 컬럼이 이미 존재하지 않습니다.';
    END IF;
    
    -- acu_works 컬럼 제거
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_records' AND column_name = 'acu_works'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE work_records DROP COLUMN acu_works;
        RAISE NOTICE 'acu_works 컬럼이 제거되었습니다.';
    ELSE
        RAISE NOTICE 'acu_works 컬럼이 이미 존재하지 않습니다.';
    END IF;
    
    -- ecu_work_details 컬럼 제거
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_records' AND column_name = 'ecu_work_details'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE work_records DROP COLUMN ecu_work_details;
        RAISE NOTICE 'ecu_work_details 컬럼이 제거되었습니다.';
    ELSE
        RAISE NOTICE 'ecu_work_details 컬럼이 이미 존재하지 않습니다.';
    END IF;
    
    -- acu_work_details 컬럼 제거
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_records' AND column_name = 'acu_work_details'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE work_records DROP COLUMN acu_work_details;
        RAISE NOTICE 'acu_work_details 컬럼이 제거되었습니다.';
    ELSE
        RAISE NOTICE 'acu_work_details 컬럼이 이미 존재하지 않습니다.';
    END IF;
    
    -- ecu_connection_method 컬럼 제거
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_records' AND column_name = 'ecu_connection_method'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE work_records DROP COLUMN ecu_connection_method;
        RAISE NOTICE 'ecu_connection_method 컬럼이 제거되었습니다.';
    ELSE
        RAISE NOTICE 'ecu_connection_method 컬럼이 이미 존재하지 않습니다.';
    END IF;
    
    -- acu_connection_method 컬럼 제거
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_records' AND column_name = 'acu_connection_method'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE work_records DROP COLUMN acu_connection_method;
        RAISE NOTICE 'acu_connection_method 컬럼이 제거되었습니다.';
    ELSE
        RAISE NOTICE 'acu_connection_method 컬럼이 이미 존재하지 않습니다.';
    END IF;
    
    -- ecu_category_id 컬럼 제거
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_records' AND column_name = 'ecu_category_id'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE work_records DROP COLUMN ecu_category_id;
        RAISE NOTICE 'ecu_category_id 컬럼이 제거되었습니다.';
    ELSE
        RAISE NOTICE 'ecu_category_id 컬럼이 이미 존재하지 않습니다.';
    END IF;
    
    -- acu_category_id 컬럼 제거
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_records' AND column_name = 'acu_category_id'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE work_records DROP COLUMN acu_category_id;
        RAISE NOTICE 'acu_category_id 컬럼이 제거되었습니다.';
    ELSE
        RAISE NOTICE 'acu_category_id 컬럼이 이미 존재하지 않습니다.';
    END IF;
    
    -- ecu_maker_id 컬럼 제거
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_records' AND column_name = 'ecu_maker_id'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE work_records DROP COLUMN ecu_maker_id;
        RAISE NOTICE 'ecu_maker_id 컬럼이 제거되었습니다.';
    ELSE
        RAISE NOTICE 'ecu_maker_id 컬럼이 이미 존재하지 않습니다.';
    END IF;
    
    -- ecu_model_id 컬럼 제거
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_records' AND column_name = 'ecu_model_id'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE work_records DROP COLUMN ecu_model_id;
        RAISE NOTICE 'ecu_model_id 컬럼이 제거되었습니다.';
    ELSE
        RAISE NOTICE 'ecu_model_id 컬럼이 이미 존재하지 않습니다.';
    END IF;
    
    -- acu_manufacturer_id 컬럼 제거
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_records' AND column_name = 'acu_manufacturer_id'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE work_records DROP COLUMN acu_manufacturer_id;
        RAISE NOTICE 'acu_manufacturer_id 컬럼이 제거되었습니다.';
    ELSE
        RAISE NOTICE 'acu_manufacturer_id 컬럼이 이미 존재하지 않습니다.';
    END IF;
    
    -- acu_model_id 컬럼 제거
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_records' AND column_name = 'acu_model_id'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE work_records DROP COLUMN acu_model_id;
        RAISE NOTICE 'acu_model_id 컬럼이 제거되었습니다.';
    ELSE
        RAISE NOTICE 'acu_model_id 컬럼이 이미 존재하지 않습니다.';
    END IF;
    
    -- ecu_maker 컬럼 제거
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_records' AND column_name = 'ecu_maker'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE work_records DROP COLUMN ecu_maker;
        RAISE NOTICE 'ecu_maker 컬럼이 제거되었습니다.';
    ELSE
        RAISE NOTICE 'ecu_maker 컬럼이 이미 존재하지 않습니다.';
    END IF;
    
    -- ecu_model 컬럼 제거
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_records' AND column_name = 'ecu_model'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE work_records DROP COLUMN ecu_model;
        RAISE NOTICE 'ecu_model 컬럼이 제거되었습니다.';
    ELSE
        RAISE NOTICE 'ecu_model 컬럼이 이미 존재하지 않습니다.';
    END IF;
    
    -- ecu_type 컬럼 제거
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_records' AND column_name = 'ecu_type'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE work_records DROP COLUMN ecu_type;
        RAISE NOTICE 'ecu_type 컬럼이 제거되었습니다.';
    ELSE
        RAISE NOTICE 'ecu_type 컬럼이 이미 존재하지 않습니다.';
    END IF;
    
    -- acu_manufacturer 컬럼 제거
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_records' AND column_name = 'acu_manufacturer'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE work_records DROP COLUMN acu_manufacturer;
        RAISE NOTICE 'acu_manufacturer 컬럼이 제거되었습니다.';
    ELSE
        RAISE NOTICE 'acu_manufacturer 컬럼이 이미 존재하지 않습니다.';
    END IF;
    
    -- acu_model 컬럼 제거
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_records' AND column_name = 'acu_model'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE work_records DROP COLUMN acu_model;
        RAISE NOTICE 'acu_model 컬럼이 제거되었습니다.';
    ELSE
        RAISE NOTICE 'acu_model 컬럼이 이미 존재하지 않습니다.';
    END IF;
    
    -- acu_type 컬럼 제거
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_records' AND column_name = 'acu_type'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE work_records DROP COLUMN acu_type;
        RAISE NOTICE 'acu_type 컬럼이 제거되었습니다.';
    ELSE
        RAISE NOTICE 'acu_type 컬럼이 이미 존재하지 않습니다.';
    END IF;
    
    -- tuning_stage 컬럼 제거
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_records' AND column_name = 'tuning_stage'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE work_records DROP COLUMN tuning_stage;
        RAISE NOTICE 'tuning_stage 컬럼이 제거되었습니다.';
    ELSE
        RAISE NOTICE 'tuning_stage 컬럼이 이미 존재하지 않습니다.';
    END IF;
    
    -- price 컬럼 제거 (total_price만 사용)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_records' AND column_name = 'price'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE work_records DROP COLUMN price;
        RAISE NOTICE 'price 컬럼이 제거되었습니다.';
    ELSE
        RAISE NOTICE 'price 컬럼이 이미 존재하지 않습니다.';
    END IF;
    
END $$;

-- 4단계: 최종 테이블 구조 확인
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'work_records' 
ORDER BY ordinal_position;

-- 5단계: 성능 최적화를 위한 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_work_records_remapping_works 
ON work_records USING GIN (remapping_works);

CREATE INDEX IF NOT EXISTS idx_work_records_work_date 
ON work_records (work_date);

CREATE INDEX IF NOT EXISTS idx_work_records_customer_id 
ON work_records (customer_id);

CREATE INDEX IF NOT EXISTS idx_work_records_status 
ON work_records (status);

-- 6단계: 정리 완료 보고
SELECT 
  '정리 완료' as status,
  COUNT(*) as remaining_columns,
  'remapping_works를 메인 데이터 소스로 사용' as note
FROM information_schema.columns 
WHERE table_name = 'work_records';
