-- ECU 관리 시스템을 위한 Supabase 테이블 생성 스크립트

-- 고객 정보 테이블
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 장비 정보 테이블
CREATE TABLE IF NOT EXISTS equipment (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    serial_number VARCHAR(100),
    manufacturer VARCHAR(100),
    purchase_date DATE,
    warranty_period INTEGER, -- 보증 기간 (개월)
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, maintenance
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 작업 기록 테이블
CREATE TABLE IF NOT EXISTS work_records (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    equipment_id INTEGER REFERENCES equipment(id),
    work_type VARCHAR(50) NOT NULL, -- installation, maintenance, repair, inspection
    description TEXT NOT NULL,
    work_date DATE NOT NULL,
    technician VARCHAR(100),
    hours_spent DECIMAL(4,2),
    parts_used TEXT,
    cost DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'completed', -- pending, in_progress, completed, cancelled
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_equipment_name ON equipment(name);
CREATE INDEX IF NOT EXISTS idx_equipment_serial ON equipment(serial_number);
CREATE INDEX IF NOT EXISTS idx_work_records_customer ON work_records(customer_id);
CREATE INDEX IF NOT EXISTS idx_work_records_equipment ON work_records(equipment_id);
CREATE INDEX IF NOT EXISTS idx_work_records_date ON work_records(work_date);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_records ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자만 접근 가능하도록 정책 설정
CREATE POLICY "Enable all operations for authenticated users" ON customers
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON equipment
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON work_records
    FOR ALL USING (auth.role() = 'authenticated');

-- 업데이트 시간 자동 갱신을 위한 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 업데이트 트리거 생성
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_records_updated_at BEFORE UPDATE ON work_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 샘플 데이터 삽입 (선택사항)
INSERT INTO customers (name, phone, email, address) VALUES
('김철수', '010-1234-5678', 'kim@example.com', '서울특별시 강남구'),
('이영희', '010-9876-5432', 'lee@example.com', '부산광역시 해운대구'),
('박민수', '010-5555-1234', 'park@example.com', '대구광역시 중구')
ON CONFLICT DO NOTHING;

INSERT INTO equipment (name, model, serial_number, manufacturer) VALUES
('ECU 분석기 A', 'EA-2000', 'SN001234', '한국전자'),
('진단 스캐너 B', 'DS-3000', 'SN005678', '글로벌테크'),
('오실로스코프 C', 'OS-1500', 'SN009012', '정밀기기')
ON CONFLICT DO NOTHING;

-- 완료 메시지
SELECT 'ECU 관리 시스템 데이터베이스 스키마가 성공적으로 생성되었습니다.' AS message; 