-- ECU/ACU 제조사 및 모델 컬럼 추가
ALTER TABLE work_records ADD COLUMN IF NOT EXISTS ecu_maker TEXT;
ALTER TABLE work_records ADD COLUMN IF NOT EXISTS acu_manufacturer TEXT;
ALTER TABLE work_records ADD COLUMN IF NOT EXISTS acu_model TEXT;
