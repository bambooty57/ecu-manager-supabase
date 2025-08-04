-- ECU/ACU 장비 카테고리 테이블 생성
CREATE TABLE IF NOT EXISTS equipment_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('ECU', 'ACU')),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, type) -- 같은 타입 내에서만 이름이 유일해야 함
);

-- 기존 데이터 삭제 (재생성을 위해)
DELETE FROM equipment_categories;

-- ECU 전용 카테고리 데이터 삽입
INSERT INTO equipment_categories (name, type, is_default) VALUES
('FLEX 시리즈', 'ECU', TRUE),
('PAD Flash 시리즈', 'ECU', TRUE),
('KESS 시리즈', 'ECU', TRUE),
('KTAG 시리즈', 'ECU', TRUE),
('CMD Flash 시리즈', 'ECU', TRUE),
('BDM 시리즈', 'ECU', TRUE),
('FGTECH 시리즈', 'ECU', TRUE),
('Chiptuning Pro', 'ECU', TRUE),
('직접입력', 'ECU', TRUE);

-- ACU 전용 카테고리 데이터 삽입
INSERT INTO equipment_categories (name, type, is_default) VALUES
('FLEX 시리즈', 'ACU', TRUE),
('PAD Flash 시리즈', 'ACU', TRUE),
('ACU Programmer', 'ACU', TRUE),
('ACU Diagnostic Tool', 'ACU', TRUE),
('TEXA Navigator', 'ACU', TRUE),
('Bosch KTS', 'ACU', TRUE),
('Launch X431', 'ACU', TRUE),
('직접입력', 'ACU', TRUE);

-- 제조사 테이블 생성
CREATE TABLE IF NOT EXISTS manufacturers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('ECU', 'ACU')),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, type) -- 같은 타입 내에서만 이름이 유일해야 함
);

-- ECU 제조사 데이터 삽입
INSERT INTO manufacturers (name, type, is_default) VALUES
('BOSCH', 'ECU', TRUE),
('CONTINENTAL', 'ECU', TRUE),
('DELPHI', 'ECU', TRUE),
('SIEMENS', 'ECU', TRUE),
('MAGNETI MARELLI', 'ECU', TRUE),
('DENSO', 'ECU', TRUE),
('VISTEON', 'ECU', TRUE),
('CATERPILLAR', 'ECU', TRUE),
('CUMMINS', 'ECU', TRUE),
('JOHN DEERE', 'ECU', TRUE),
('NEW HOLLAND', 'ECU', TRUE),
('CASE IH', 'ECU', TRUE),
('기타', 'ECU', TRUE);

-- ACU 제조사 데이터 삽입
INSERT INTO manufacturers (name, type, is_default) VALUES
('BOSCH', 'ACU', TRUE),
('CONTINENTAL', 'ACU', TRUE),
('DELPHI', 'ACU', TRUE),
('DINEX', 'ACU', TRUE),
('EBERSPACHER', 'ACU', TRUE),
('EMITEC', 'ACU', TRUE),
('FAURECIA', 'ACU', TRUE),
('TENNECO', 'ACU', TRUE),
('JOHN DEERE', 'ACU', TRUE),
('CATERPILLAR', 'ACU', TRUE),
('CUMMINS', 'ACU', TRUE),
('기타', 'ACU', TRUE);

-- 모델 테이블 생성
CREATE TABLE IF NOT EXISTS equipment_models (
  id SERIAL PRIMARY KEY,
  manufacturer_id INTEGER REFERENCES manufacturers(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('ECU', 'ACU')),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ECU 모델 데이터 삽입 (주요 제조사별)
INSERT INTO equipment_models (manufacturer_id, name, type, is_default) 
SELECT m.id, model_name, 'ECU', TRUE
FROM manufacturers m
CROSS JOIN (
  VALUES 
    ('EDC16'),
    ('EDC17'),
    ('EDC7'),
    ('MED17'),
    ('ME17'),
    ('PCR2.1'),
    ('DCM3.7'),
    ('DCM6.2'),
    ('Common Rail'),
    ('PDE'),
    ('기타')
) AS models(model_name)
WHERE m.type = 'ECU' AND m.name IN ('BOSCH', 'CONTINENTAL', 'DELPHI');

-- ACU 모델 데이터 삽입 (주요 제조사별)
INSERT INTO equipment_models (manufacturer_id, name, type, is_default)
SELECT m.id, model_name, 'ACU', TRUE
FROM manufacturers m
CROSS JOIN (
  VALUES 
    ('DCU-200'),
    ('DCU-300'),
    ('ACU-Gen4'),
    ('ACU-Gen5'),
    ('DeNOx'),
    ('SCR-System'),
    ('DPF-Controller'),
    ('기타')
) AS models(model_name)
WHERE m.type = 'ACU' AND m.name IN ('BOSCH', 'CONTINENTAL', 'DELPHI');

-- RLS (Row Level Security) 정책 설정
ALTER TABLE equipment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_models ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽을 수 있도록 설정
CREATE POLICY "Anyone can view equipment categories" ON equipment_categories FOR SELECT USING (true);
CREATE POLICY "Anyone can view manufacturers" ON manufacturers FOR SELECT USING (true);
CREATE POLICY "Anyone can view equipment models" ON equipment_models FOR SELECT USING (true);

-- 인증된 사용자만 삽입/수정/삭제 가능
CREATE POLICY "Authenticated users can insert equipment categories" ON equipment_categories FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update equipment categories" ON equipment_categories FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete equipment categories" ON equipment_categories FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert manufacturers" ON manufacturers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update manufacturers" ON manufacturers FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete manufacturers" ON manufacturers FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert equipment models" ON equipment_models FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update equipment models" ON equipment_models FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete equipment models" ON equipment_models FOR DELETE USING (auth.role() = 'authenticated');

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_equipment_categories_type ON equipment_categories(type);
CREATE INDEX IF NOT EXISTS idx_equipment_categories_name ON equipment_categories(name);
CREATE INDEX IF NOT EXISTS idx_manufacturers_type ON manufacturers(type);
CREATE INDEX IF NOT EXISTS idx_manufacturers_name ON manufacturers(name);
CREATE INDEX IF NOT EXISTS idx_equipment_models_type ON equipment_models(type);
CREATE INDEX IF NOT EXISTS idx_equipment_models_manufacturer_id ON equipment_models(manufacturer_id);

-- 업데이트 시간 자동 갱신 함수들
CREATE OR REPLACE FUNCTION update_equipment_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_manufacturers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_equipment_models_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER trigger_update_equipment_categories_updated_at
  BEFORE UPDATE ON equipment_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_equipment_categories_updated_at();

CREATE TRIGGER trigger_update_manufacturers_updated_at
  BEFORE UPDATE ON manufacturers
  FOR EACH ROW
  EXECUTE FUNCTION update_manufacturers_updated_at();

CREATE TRIGGER trigger_update_equipment_models_updated_at
  BEFORE UPDATE ON equipment_models
  FOR EACH ROW
  EXECUTE FUNCTION update_equipment_models_updated_at();

-- 데이터 조회를 위한 뷰 생성
CREATE OR REPLACE VIEW v_equipment_data AS
SELECT 
  ec.name AS category_name,
  ec.type AS equipment_type,
  m.name AS manufacturer_name,
  em.name AS model_name,
  ec.id AS category_id,
  m.id AS manufacturer_id,
  em.id AS model_id
FROM equipment_categories ec
LEFT JOIN manufacturers m ON ec.type = m.type
LEFT JOIN equipment_models em ON m.id = em.manufacturer_id
ORDER BY ec.type, ec.name, m.name, em.name;

-- 통계 출력
SELECT 
  'ECU 카테고리' as type,
  COUNT(*) as count
FROM equipment_categories 
WHERE type = 'ECU'

UNION ALL

SELECT 
  'ACU 카테고리' as type,
  COUNT(*) as count
FROM equipment_categories 
WHERE type = 'ACU'

UNION ALL

SELECT 
  'ECU 제조사' as type,
  COUNT(*) as count
FROM manufacturers 
WHERE type = 'ECU'

UNION ALL

SELECT 
  'ACU 제조사' as type,
  COUNT(*) as count
FROM manufacturers 
WHERE type = 'ACU'

UNION ALL

SELECT 
  'ECU 모델' as type,
  COUNT(*) as count
FROM equipment_models 
WHERE type = 'ECU'

UNION ALL

SELECT 
  'ACU 모델' as type,
  COUNT(*) as count
FROM equipment_models 
WHERE type = 'ACU'; 