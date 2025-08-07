-- ===============================================
-- 🔧 ECU/ACU 상태정보 컬럼 중복 정리 스크립트
-- ===============================================
-- 목적: 불필요한 중복 컬럼들을 정리하고 일관된 상태 관리 시스템 구축

-- 1단계: 현재 상태 컬럼 현황 분석
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'work_records' 
  AND column_name LIKE '%status%'
ORDER BY column_name;

-- 2단계: 기존 데이터 백업 (안전을 위해)
CREATE TABLE IF NOT EXISTS work_records_backup AS 
SELECT * FROM work_records;

-- 3단계: 상태 데이터 통합 및 정리
-- 기본 status 컬럼을 메인 상태로 사용하고, ECU/ACU별 세부 상태는 JSONB로 관리

-- 3-1: 새로운 통합 상태 컬럼 추가
ALTER TABLE work_records 
ADD COLUMN IF NOT EXISTS detailed_status JSONB DEFAULT '{}'::jsonb;

-- 3-2: 기존 ECU/ACU 상태 데이터를 JSONB로 마이그레이션
UPDATE work_records 
SET detailed_status = jsonb_build_object(
  'ecu', CASE 
    WHEN ecu_status IS NOT NULL THEN jsonb_build_object('status', ecu_status, 'price', ecu_price)
    ELSE NULL
  END,
  'acu', CASE 
    WHEN acu_status IS NOT NULL THEN jsonb_build_object('status', acu_status, 'price', acu_price)
    ELSE NULL
  END,
  'overall', status
)
WHERE ecu_status IS NOT NULL OR acu_status IS NOT NULL;

-- 3-3: 메인 status 컬럼 정리 (가장 중요한 상태만 유지)
UPDATE work_records 
SET status = CASE 
  WHEN ecu_status = '완료' AND acu_status = '완료' THEN '완료'
  WHEN ecu_status = '완료' OR acu_status = '완료' THEN '부분완료'
  WHEN ecu_status = '진행중' OR acu_status = '진행중' THEN '진행중'
  WHEN ecu_status = '실패' OR acu_status = '실패' THEN '실패'
  ELSE COALESCE(status, '대기')
END
WHERE ecu_status IS NOT NULL OR acu_status IS NOT NULL;

-- 4단계: 불필요한 컬럼 제거 (안전하게 주석 처리)
-- 실제 제거하기 전에 데이터 검증 필요

-- 4-1: ECU/ACU 개별 status 컬럼 제거 (데이터 검증 후)
-- ALTER TABLE work_records DROP COLUMN IF EXISTS ecu_status;
-- ALTER TABLE work_records DROP COLUMN IF EXISTS acu_status;

-- 4-2: 개별 price 컬럼들도 JSONB로 통합 (선택사항)
-- ALTER TABLE work_records DROP COLUMN IF EXISTS ecu_price;
-- ALTER TABLE work_records DROP COLUMN IF EXISTS acu_price;

-- 5단계: 새로운 상태 관리 뷰 생성
CREATE OR REPLACE VIEW v_work_records_status AS
SELECT 
  id,
  customer_id,
  equipment_id,
  work_date,
  work_type,
  status as overall_status,
  detailed_status,
  -- ECU 상태 추출
  (detailed_status->'ecu'->>'status') as ecu_status,
  (detailed_status->'ecu'->>'price')::numeric as ecu_price,
  -- ACU 상태 추출  
  (detailed_status->'acu'->>'status') as acu_status,
  (detailed_status->'acu'->>'price')::numeric as acu_price,
  -- 통합 가격 계산
  COALESCE(
    (detailed_status->'ecu'->>'price')::numeric, 0
  ) + COALESCE(
    (detailed_status->'acu'->>'price')::numeric, 0
  ) as total_calculated_price,
  created_at,
  updated_at
FROM work_records;

-- 6단계: 상태별 통계 뷰 생성
CREATE OR REPLACE VIEW v_status_statistics AS
SELECT 
  '전체' as category,
  status as status_type,
  COUNT(*) as count
FROM work_records
GROUP BY status

UNION ALL

SELECT 
  'ECU' as category,
  (detailed_status->'ecu'->>'status') as status_type,
  COUNT(*) as count
FROM work_records
WHERE detailed_status->'ecu'->>'status' IS NOT NULL

UNION ALL

SELECT 
  'ACU' as category,
  (detailed_status->'acu'->>'status') as status_type,
  COUNT(*) as count
FROM work_records
WHERE detailed_status->'acu'->>'status' IS NOT NULL;

-- 7단계: 상태 업데이트 함수 생성
CREATE OR REPLACE FUNCTION update_work_status(
  p_work_id INTEGER,
  p_ecu_status TEXT DEFAULT NULL,
  p_acu_status TEXT DEFAULT NULL,
  p_overall_status TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE work_records 
  SET 
    detailed_status = jsonb_set(
      COALESCE(detailed_status, '{}'::jsonb),
      '{ecu,status}',
      to_jsonb(COALESCE(p_ecu_status, detailed_status->'ecu'->>'status'))
    ),
    detailed_status = jsonb_set(
      detailed_status,
      '{acu,status}', 
      to_jsonb(COALESCE(p_acu_status, detailed_status->'acu'->>'status'))
    ),
    status = COALESCE(p_overall_status, status),
    updated_at = NOW()
  WHERE id = p_work_id;
END;
$$ LANGUAGE plpgsql;

-- 8단계: 검증 및 테스트
-- 8-1: 데이터 무결성 검증
SELECT 
  '데이터 검증' as check_type,
  COUNT(*) as total_records,
  COUNT(CASE WHEN detailed_status IS NOT NULL THEN 1 END) as with_detailed_status,
  COUNT(CASE WHEN status IS NOT NULL THEN 1 END) as with_overall_status
FROM work_records;

-- 8-2: 상태 분포 확인
SELECT 
  status as overall_status,
  COUNT(*) as count
FROM work_records
GROUP BY status
ORDER BY count DESC;

-- 8-3: ECU/ACU 상태 분포 확인
SELECT 
  'ECU' as component,
  (detailed_status->'ecu'->>'status') as status,
  COUNT(*) as count
FROM work_records
WHERE detailed_status->'ecu'->>'status' IS NOT NULL
GROUP BY (detailed_status->'ecu'->>'status')

UNION ALL

SELECT 
  'ACU' as component,
  (detailed_status->'acu'->>'status') as status,
  COUNT(*) as count
FROM work_records
WHERE detailed_status->'acu'->>'status' IS NOT NULL
GROUP BY (detailed_status->'acu'->>'status');

-- 9단계: 인덱스 최적화
CREATE INDEX IF NOT EXISTS idx_work_records_detailed_status ON work_records USING GIN (detailed_status);
CREATE INDEX IF NOT EXISTS idx_work_records_status ON work_records(status);

-- 10단계: RLS 정책 업데이트 (필요시)
-- 기존 RLS 정책이 있다면 새로운 컬럼 구조에 맞게 업데이트

-- 완료 메시지
SELECT '✅ ECU/ACU 상태정보 컬럼 정리 완료' as result;
