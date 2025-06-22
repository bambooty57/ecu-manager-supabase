-- 기존 work_records 데이터에 누락된 값들 채워넣기
-- ECU/ACU 제조사 정보를 기반으로 tools_used, work_description, price 등 업데이트

-- 1. tools_used 배열 업데이트 (ECU 제조사 기반)
UPDATE work_records 
SET tools_used = CASE 
  -- 승용차 ECU (KESS + OBD)
  WHEN ecu_maker ILIKE '%CHRYSLER%' THEN ARRAY['KESS', 'OBD']
  WHEN ecu_maker ILIKE '%BOSCH%' THEN ARRAY['KESS', 'OBD'] 
  WHEN ecu_maker ILIKE '%CONTINENTAL%' THEN ARRAY['KESS', 'OBD']
  WHEN ecu_maker ILIKE '%DELPHI%' THEN ARRAY['KESS', 'OBD']
  WHEN ecu_maker ILIKE '%SIEMENS%' THEN ARRAY['KESS', 'OBD']
  WHEN ecu_maker ILIKE '%MAGNETI%' THEN ARRAY['KESS', 'OBD']
  
  -- 상용차 ECU (FLEX + BENCH)  
  WHEN ecu_maker ILIKE '%CATERPILLAR%' THEN ARRAY['FLEX', 'BENCH']
  WHEN ecu_maker ILIKE '%CUMMINS%' THEN ARRAY['FLEX', 'BENCH']
  WHEN ecu_maker ILIKE '%VOLVO%' THEN ARRAY['FLEX', 'BENCH']
  WHEN ecu_maker ILIKE '%SCANIA%' THEN ARRAY['FLEX', 'BENCH']
  WHEN ecu_maker ILIKE '%MAN%' THEN ARRAY['FLEX', 'BENCH']
  WHEN ecu_maker ILIKE '%MERCEDES%' THEN ARRAY['FLEX', 'BENCH']
  WHEN ecu_maker ILIKE '%DAF%' THEN ARRAY['FLEX', 'BENCH']
  WHEN ecu_maker ILIKE '%IVECO%' THEN ARRAY['FLEX', 'BENCH']
  WHEN ecu_maker ILIKE '%DEUTZ%' THEN ARRAY['FLEX', 'BENCH']
  
  -- 기본값 (승용차로 가정)
  ELSE ARRAY['KESS', 'OBD']
END
WHERE ecu_maker IS NOT NULL 
AND (tools_used IS NULL OR array_length(tools_used, 1) IS NULL OR array_length(tools_used, 1) = 0);

-- 2. ACU가 있는 경우 tools_used에 FLEX, BENCH 추가
UPDATE work_records 
SET tools_used = CASE 
  WHEN tools_used IS NULL THEN ARRAY['FLEX', 'BENCH']
  ELSE array_cat(tools_used, ARRAY['FLEX', 'BENCH'])
END
WHERE acu_manufacturer IS NOT NULL 
AND (tools_used IS NULL OR NOT ('FLEX' = ANY(tools_used)));

-- 3. tools_used 배열에서 중복 제거
UPDATE work_records 
SET tools_used = (
  SELECT ARRAY(
    SELECT DISTINCT unnest(tools_used) 
    ORDER BY unnest(tools_used)
  )
)
WHERE tools_used IS NOT NULL AND array_length(tools_used, 1) > 1;

-- 4. work_description 업데이트
UPDATE work_records 
SET work_description = CASE 
  WHEN ecu_maker IS NOT NULL AND acu_manufacturer IS NOT NULL THEN 
    'ECU(' || ecu_maker || '-' || COALESCE(ecu_model, 'Unknown') || ') 및 ACU(' || acu_manufacturer || '-' || COALESCE(acu_model, 'Unknown') || ') 통합 튜닝'
  WHEN ecu_maker IS NOT NULL THEN 
    'ECU(' || ecu_maker || '-' || COALESCE(ecu_model, 'Unknown') || ') 엔진 튜닝'
  WHEN acu_manufacturer IS NOT NULL THEN 
    'ACU(' || acu_manufacturer || '-' || COALESCE(acu_model, 'Unknown') || ') 변속기 튜닝'
  ELSE 
    work_type || ' 작업'
END
WHERE work_description IS NULL OR work_description = '' OR work_description = work_type;

-- 5. acu_type 업데이트 (ACU 모델 기반)
UPDATE work_records 
SET acu_type = CASE 
  WHEN acu_model ILIKE '%SID807%' THEN 'SID807'
  WHEN acu_model ILIKE '%EcoMid%' THEN 'EcoMid'  
  WHEN acu_model ILIKE '%AS Tronic%' THEN 'AS Tronic'
  WHEN acu_model ILIKE '%PowerShift%' THEN 'PowerShift'
  WHEN acu_model ILIKE '%ZF%' THEN 'ZF Series'
  WHEN acu_model ILIKE '%CVT%' THEN 'CVT'
  WHEN acu_model ILIKE '%DSG%' THEN 'DSG'
  WHEN acu_model IS NOT NULL AND acu_model != '' THEN acu_model
  WHEN acu_manufacturer IS NOT NULL THEN acu_manufacturer || ' Standard'
  ELSE NULL
END
WHERE (acu_type IS NULL OR acu_type = '') AND acu_manufacturer IS NOT NULL;

-- 6. price 업데이트 (작업 복잡도 기반)
UPDATE work_records 
SET price = CASE 
  -- ECU + ACU 둘 다 있는 경우
  WHEN ecu_maker IS NOT NULL AND acu_manufacturer IS NOT NULL THEN 
    COALESCE(total_price, 180000)
  -- ECU만 있는 경우  
  WHEN ecu_maker IS NOT NULL THEN 
    COALESCE(total_price, 120000)
  -- ACU만 있는 경우
  WHEN acu_manufacturer IS NOT NULL THEN 
    COALESCE(total_price, 100000)
  -- 기본값
  ELSE 
    COALESCE(total_price, 100000)
END
WHERE price IS NULL OR price = 0;

-- 7. connection_method 업데이트 (tools_used 기반)
UPDATE work_records 
SET connection_method = CASE 
  WHEN 'BENCH' = ANY(tools_used) THEN 'BENCH'
  WHEN 'OBD' = ANY(tools_used) THEN 'OBD'
  -- ECU 제조사 기반 추정
  WHEN ecu_maker ILIKE '%CATERPILLAR%' OR ecu_maker ILIKE '%CUMMINS%' OR ecu_maker ILIKE '%VOLVO%' THEN 'BENCH'
  ELSE 'OBD'
END
WHERE (connection_method IS NULL OR connection_method = '') AND tools_used IS NOT NULL;

-- 8. 업데이트 결과 확인
SELECT 
  'UPDATE 완료' as status,
  COUNT(*) as total_records,
  COUNT(CASE WHEN tools_used IS NOT NULL AND array_length(tools_used, 1) > 0 THEN 1 END) as records_with_tools,
  COUNT(CASE WHEN work_description IS NOT NULL AND work_description != '' THEN 1 END) as records_with_description,
  COUNT(CASE WHEN price > 0 THEN 1 END) as records_with_price,
  COUNT(CASE WHEN acu_type IS NOT NULL AND acu_type != '' THEN 1 END) as records_with_acu_type
FROM work_records;

-- 9. 샘플 데이터 확인 (업데이트 후)
SELECT 
  id,
  ecu_maker,
  acu_manufacturer,
  tools_used,
  work_description,
  price,
  acu_type,
  connection_method
FROM work_records 
WHERE ecu_maker IS NOT NULL OR acu_manufacturer IS NOT NULL
ORDER BY created_at DESC 
LIMIT 10; 