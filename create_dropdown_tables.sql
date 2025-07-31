-- 연결 방법 테이블 생성
CREATE TABLE IF NOT EXISTS connection_methods (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 작업 상태 테이블 생성
CREATE TABLE IF NOT EXISTS work_status (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 기본 연결 방법 데이터 삽입
INSERT INTO connection_methods (name, is_default) VALUES
('OBD', TRUE),
('BENCH', TRUE),
('BOOT', TRUE),
('BDM', TRUE),
('직접입력', TRUE)
ON CONFLICT (name) DO NOTHING;

-- 기본 작업 상태 데이터 삽입
INSERT INTO work_status (name, is_default) VALUES
('예약', TRUE),
('진행중', TRUE),
('완료', TRUE),
('AS', TRUE),
('실패', TRUE),
('직접입력', TRUE)
ON CONFLICT (name) DO NOTHING;

-- 업데이트 시간 자동 갱신 함수들
CREATE OR REPLACE FUNCTION update_connection_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_work_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER trigger_update_connection_methods_updated_at
  BEFORE UPDATE ON connection_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_connection_methods_updated_at();

CREATE TRIGGER trigger_update_work_status_updated_at
  BEFORE UPDATE ON work_status
  FOR EACH ROW
  EXECUTE FUNCTION update_work_status_updated_at();

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_connection_methods_name ON connection_methods(name);
CREATE INDEX IF NOT EXISTS idx_work_status_name ON work_status(name);