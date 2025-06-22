-- 현재 work_records 테이블의 데이터 상태 확인

-- 1. 전체 컬럼 존재 여부 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'work_records' 
AND column_name IN ('tools_used', 'work_description', 'price', 'acu_type', 'user_id')
ORDER BY column_name;

-- 2. 현재 데이터 샘플 확인 (최근 10개)
SELECT 
  id,
  work_type,
  ecu_maker,
  ecu_model,
  acu_manufacturer,
  acu_model,
  tools_used,
  work_description,
  price,
  acu_type,
  total_price
FROM work_records 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. NULL 값 통계
SELECT 
  COUNT(*) as total_records,
  COUNT(tools_used) as tools_used_not_null,
  COUNT(work_description) as work_description_not_null,
  COUNT(price) as price_not_null,
  COUNT(acu_type) as acu_type_not_null,
  COUNT(CASE WHEN tools_used IS NOT NULL AND array_length(tools_used, 1) > 0 THEN 1 END) as tools_used_with_data,
  COUNT(CASE WHEN ecu_maker IS NOT NULL THEN 1 END) as ecu_maker_not_null,
  COUNT(CASE WHEN acu_manufacturer IS NOT NULL THEN 1 END) as acu_manufacturer_not_null
FROM work_records;

-- 4. ECU/ACU 제조사별 분포
SELECT 
  ecu_maker,
  COUNT(*) as count,
  COUNT(tools_used) as has_tools_used
FROM work_records 
WHERE ecu_maker IS NOT NULL
GROUP BY ecu_maker
ORDER BY count DESC;

-- 5. 빈 tools_used 배열 확인
SELECT 
  id,
  ecu_maker,
  acu_manufacturer,
  tools_used,
  CASE 
    WHEN tools_used IS NULL THEN 'NULL'
    WHEN array_length(tools_used, 1) IS NULL THEN 'EMPTY_ARRAY'
    ELSE 'HAS_DATA'
  END as tools_used_status
FROM work_records 
ORDER BY created_at DESC 
LIMIT 20; 