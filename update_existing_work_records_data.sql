-- 기존 작업 기록들에 tools_used 데이터 업데이트
-- ECU/ACU 제조사 정보를 기반으로 사용된 도구 추정

-- 1. ECU 제조사별 도구 매핑 업데이트
UPDATE work_records 
SET tools_used = CASE 
  WHEN ecu_maker ILIKE '%CHRYSLER%' THEN ARRAY['KESS', 'OBD']
  WHEN ecu_maker ILIKE '%BOSCH%' THEN ARRAY['KESS', 'OBD'] 
  WHEN ecu_maker ILIKE '%CONTINENTAL%' THEN ARRAY['KESS', 'OBD']
  WHEN ecu_maker ILIKE '%DELPHI%' THEN ARRAY['KESS', 'OBD']
  WHEN ecu_maker ILIKE '%CATERPILLAR%' THEN ARRAY['FLEX', 'BENCH']
  WHEN ecu_maker ILIKE '%CUMMINS%' THEN ARRAY['FLEX', 'BENCH']
  WHEN ecu_maker ILIKE '%VOLVO%' THEN ARRAY['FLEX', 'BENCH']
  WHEN ecu_maker ILIKE '%SCANIA%' THEN ARRAY['FLEX', 'BENCH']
  WHEN ecu_maker ILIKE '%MAN%' THEN ARRAY['FLEX', 'BENCH']
  WHEN ecu_maker ILIKE '%MERCEDES%' THEN ARRAY['FLEX', 'BENCH']
  WHEN ecu_maker ILIKE '%DAF%' THEN ARRAY['FLEX', 'BENCH']
  WHEN ecu_maker ILIKE '%IVECO%' THEN ARRAY['FLEX', 'BENCH']
  ELSE ARRAY['KESS', 'OBD'] -- 기본값
END
WHERE ecu_maker IS NOT NULL AND (tools_used IS NULL OR tools_used = '{}');

-- 2. ACU가 있는 경우 도구 추가
UPDATE work_records 
SET tools_used = tools_used || CASE 
  WHEN acu_manufacturer ILIKE '%CONTINENTAL%' THEN ARRAY['FLEX', 'BENCH']
  WHEN acu_manufacturer ILIKE '%ZF%' THEN ARRAY['FLEX', 'BENCH']
  WHEN acu_manufacturer ILIKE '%BOSCH%' THEN ARRAY['FLEX', 'BENCH']
  WHEN acu_manufacturer ILIKE '%WABCO%' THEN ARRAY['FLEX', 'BENCH']
  ELSE ARRAY['FLEX', 'BENCH'] -- ACU 기본값
END
WHERE acu_manufacturer IS NOT NULL AND tools_used IS NOT NULL;

-- 3. 중복 제거 (배열에서 중복된 도구 제거)
UPDATE work_records 
SET tools_used = (
  SELECT ARRAY(
    SELECT DISTINCT unnest(tools_used) 
    ORDER BY unnest(tools_used)
  )
)
WHERE tools_used IS NOT NULL AND array_length(tools_used, 1) > 1;

-- 4. work_description 업데이트 (작업 타입 기반)
UPDATE work_records 
SET work_description = CASE 
  WHEN work_type ILIKE '%ECU%' AND work_type ILIKE '%ACU%' THEN 'ECU 및 ACU 통합 튜닝 작업'
  WHEN work_type ILIKE '%ECU%' THEN 'ECU 엔진 튜닝 작업'
  WHEN work_type ILIKE '%ACU%' THEN 'ACU 변속기 튜닝 작업'
  WHEN work_type ILIKE '%튜닝%' THEN work_type || ' 전문 튜닝 작업'
  ELSE work_type || ' 작업'
END
WHERE work_description IS NULL OR work_description = '';

-- 5. acu_type 업데이트 (ACU 모델 기반)
UPDATE work_records 
SET acu_type = CASE 
  WHEN acu_model ILIKE '%SID807%' THEN 'SID807'
  WHEN acu_model ILIKE '%EcoMid%' THEN 'EcoMid'
  WHEN acu_model ILIKE '%AS Tronic%' THEN 'AS Tronic'
  WHEN acu_model ILIKE '%PowerShift%' THEN 'PowerShift'
  WHEN acu_model ILIKE '%ZF%' THEN 'ZF Series'
  WHEN acu_model IS NOT NULL THEN acu_model
  ELSE NULL
END
WHERE acu_model IS NOT NULL AND (acu_type IS NULL OR acu_type = '');

-- 6. price 업데이트 (total_price가 있으면 복사, 없으면 기본값)
UPDATE work_records 
SET price = COALESCE(total_price, 
  CASE 
    WHEN work_type ILIKE '%ECU%' AND work_type ILIKE '%ACU%' THEN 150000 -- ECU+ACU
    WHEN work_type ILIKE '%ECU%' THEN 100000 -- ECU만
    WHEN work_type ILIKE '%ACU%' THEN 80000  -- ACU만
    ELSE 100000 -- 기본값
  END
)
WHERE price IS NULL OR price = 0;

-- 7. connection_method 업데이트 (도구 기반)
UPDATE work_records 
SET connection_method = CASE 
  WHEN 'BENCH' = ANY(tools_used) THEN 'BENCH'
  WHEN 'OBD' = ANY(tools_used) THEN 'OBD'
  WHEN ecu_maker ILIKE '%CATERPILLAR%' OR ecu_maker ILIKE '%CUMMINS%' THEN 'BENCH'
  ELSE 'OBD'
END
WHERE connection_method IS NULL AND tools_used IS NOT NULL;

-- 8. 통계 출력
SELECT 
  'tools_used 업데이트 완료' as status,
  COUNT(*) as total_records,
  COUNT(CASE WHEN tools_used IS NOT NULL AND array_length(tools_used, 1) > 0 THEN 1 END) as records_with_tools,
  COUNT(CASE WHEN work_description IS NOT NULL THEN 1 END) as records_with_description,
  COUNT(CASE WHEN price > 0 THEN 1 END) as records_with_price
FROM work_records; 