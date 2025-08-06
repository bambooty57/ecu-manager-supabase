-- 잘못된 상태 값 수정 마이그레이션
-- maker/type이 빈 값인데 status가 '예약'인 경우를 'N/A'로 수정

-- ECU status 수정 (maker가 빈 값인데 status가 '예약'인 경우)
UPDATE work_records 
SET remapping_works = jsonb_set(
  remapping_works,
  '{0,ecu,status}',
  '"N/A"'
)
WHERE remapping_works->0->'ecu'->>'maker' = '' 
  AND remapping_works->0->'ecu'->>'status' = '예약';

-- ACU status 수정 (manufacturer가 빈 값인데 status가 '예약'인 경우)
UPDATE work_records 
SET remapping_works = jsonb_set(
  remapping_works,
  '{0,acu,status}',
  '"N/A"'
)
WHERE remapping_works->0->'acu'->>'manufacturer' = '' 
  AND remapping_works->0->'acu'->>'status' = '예약';

-- 윤태봉의 ACU status 수정 (특정 고객)
UPDATE work_records 
SET remapping_works = jsonb_set(
  remapping_works,
  '{0,acu,status}',
  '"N/A"'
)
WHERE customer_id = (SELECT id FROM customers WHERE name = '윤태봉')
  AND remapping_works->0->'acu'->>'manufacturer' = '' 
  AND remapping_works->0->'acu'->>'status' = '예약';

-- 수정 결과 확인
SELECT 
  id,
  customer_id,
  remapping_works->0->'ecu'->>'maker' as ecu_maker,
  remapping_works->0->'ecu'->>'status' as ecu_status,
  remapping_works->0->'acu'->>'manufacturer' as acu_manufacturer,
  remapping_works->0->'acu'->>'status' as acu_status
FROM work_records 
WHERE customer_id IN (
  SELECT id FROM customers WHERE name IN ('윤태봉', '최보영')
)
ORDER BY customer_id, id;
