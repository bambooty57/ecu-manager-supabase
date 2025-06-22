-- ECU/ACU 장비 카테고리 테이블 생성
CREATE TABLE IF NOT EXISTS equipment_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('ECU', 'ACU', 'BOTH')),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 기본 카테고리 데이터 삽입
INSERT INTO equipment_categories (name, type, is_default) VALUES
('FLEX 시리즈', 'BOTH', TRUE),
('PAD Flash 시리즈', 'BOTH', TRUE),
('KESS 시리즈', 'BOTH', TRUE),
('직접입력', 'BOTH', TRUE)
ON CONFLICT (name) DO NOTHING;

-- RLS (Row Level Security) 정책 설정
ALTER TABLE equipment_categories ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽을 수 있도록 설정
CREATE POLICY "Anyone can view equipment categories" ON equipment_categories FOR SELECT USING (true);

-- 인증된 사용자만 삽입/수정/삭제 가능
CREATE POLICY "Authenticated users can insert equipment categories" ON equipment_categories FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update equipment categories" ON equipment_categories FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete equipment categories" ON equipment_categories FOR DELETE USING (auth.role() = 'authenticated');

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_equipment_categories_type ON equipment_categories(type);
CREATE INDEX IF NOT EXISTS idx_equipment_categories_name ON equipment_categories(name);

-- 업데이트 시간 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_equipment_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER equipment_categories_updated_at
  BEFORE UPDATE ON equipment_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_equipment_categories_updated_at(); 