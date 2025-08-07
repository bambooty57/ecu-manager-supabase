-- ECU/ACU 모델 테이블 생성
-- 기존 equipment_models와는 완전히 다른 개념

-- ECU 모델 테이블
CREATE TABLE IF NOT EXISTS ecu_models (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  category VARCHAR(100), -- 'Denso', 'Bosch', 'Delphi', 'Siemens' 등
  series VARCHAR(100),   -- 'EDC15', 'ME17', 'DCM3', 'SID201' 등
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ACU 모델 테이블
CREATE TABLE IF NOT EXISTS acu_models (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  manufacturer VARCHAR(100), -- 'Bosch', 'Delphi', 'Continental' 등
  series VARCHAR(100),      -- 'SCR', 'DPF', 'EGR' 등
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책 설정
ALTER TABLE ecu_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE acu_models ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자는 모든 작업 가능
CREATE POLICY "Authenticated users can manage ecu_models" ON ecu_models
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage acu_models" ON acu_models
  FOR ALL USING (auth.role() = 'authenticated');

-- 인덱스 생성
CREATE INDEX idx_ecu_models_category ON ecu_models(category);
CREATE INDEX idx_ecu_models_series ON ecu_models(series);
CREATE INDEX idx_acu_models_manufacturer ON acu_models(manufacturer);
CREATE INDEX idx_acu_models_series ON acu_models(series);

-- 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ecu_models_updated_at 
  BEFORE UPDATE ON ecu_models 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_acu_models_updated_at 
  BEFORE UPDATE ON acu_models 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 