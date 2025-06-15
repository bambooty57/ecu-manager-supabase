-- ECU 관리 시스템을 위한 Supabase 테이블 생성 스크립트

-- 1. 고객 테이블 생성
CREATE TABLE IF NOT EXISTS customers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    zip_code VARCHAR(10),
    road_address TEXT,
    jibun_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 인덱스 및 제약조건
    CONSTRAINT customers_name_phone_unique UNIQUE (name, phone)
);

-- 2. 장비 테이블 생성
CREATE TABLE IF NOT EXISTS equipment (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    equipment_type VARCHAR(50) NOT NULL,
    manufacturer VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER,
    serial_number VARCHAR(100),
    engine_type VARCHAR(100),
    horsepower INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 작업 기록 테이블 생성
CREATE TABLE IF NOT EXISTS work_records (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    equipment_id BIGINT REFERENCES equipment(id) ON DELETE SET NULL,
    work_type VARCHAR(100) NOT NULL,
    ecu_model VARCHAR(100),
    connection_method VARCHAR(100),
    tools_used TEXT[], -- 배열 타입으로 여러 도구 저장
    work_description TEXT,
    price DECIMAL(10,2),
    status VARCHAR(20) DEFAULT '진행중',
    work_date DATE NOT NULL,
    files JSONB, -- 파일 정보를 JSON으로 저장
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_equipment_customer_id ON equipment(customer_id);
CREATE INDEX IF NOT EXISTS idx_equipment_manufacturer ON equipment(manufacturer);
CREATE INDEX IF NOT EXISTS idx_equipment_model ON equipment(model);
CREATE INDEX IF NOT EXISTS idx_work_records_customer_id ON work_records(customer_id);
CREATE INDEX IF NOT EXISTS idx_work_records_equipment_id ON work_records(equipment_id);
CREATE INDEX IF NOT EXISTS idx_work_records_work_date ON work_records(work_date);
CREATE INDEX IF NOT EXISTS idx_work_records_status ON work_records(status);

-- 5. RLS (Row Level Security) 정책 설정
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_records ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 모든 데이터에 접근 가능하도록 설정 (개발 환경용)
-- 실제 운영 환경에서는 더 세밀한 권한 설정이 필요합니다.
CREATE POLICY "Enable all operations for all users" ON customers FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON equipment FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON work_records FOR ALL USING (true);

-- 6. 트리거 함수 생성 (updated_at 자동 업데이트)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. 트리거 생성
CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at 
    BEFORE UPDATE ON equipment 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_records_updated_at 
    BEFORE UPDATE ON work_records 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 8. 샘플 데이터 삽입 (선택사항)
INSERT INTO customers (name, phone, zip_code, road_address, jibun_address) VALUES
('김농부', '010-1234-5678', '18576', '경기도 화성시 농업로 123', '경기도 화성시 농업동 101-5'),
('이농장', '010-9876-5432', '31116', '충청남도 천안시 동남구 농장길 456', '충청남도 천안시 동남구 농장동 456-2'),
('박트랙터', '010-5555-1234', '54896', '전라북도 전주시 덕진구 기계로 789', '전라북도 전주시 덕진구 기계동 789-10')
ON CONFLICT (name, phone) DO NOTHING;

-- 완료 메시지
SELECT 'ECU 관리 시스템 데이터베이스 스키마가 성공적으로 생성되었습니다.' AS message; 