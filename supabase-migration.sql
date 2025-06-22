-- ===============================================
-- TracForce Supabase Database Migration
-- 실행 방법: Supabase Dashboard > SQL Editor에서 실행
-- ===============================================

-- 1단계: 기존 테이블 삭제 (순서 중요: 외래키 참조 테이블부터)
DROP TABLE IF EXISTS work_records CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- 2단계: customers 테이블 생성
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    zip_code TEXT,
    road_address TEXT,
    jibun_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3단계: equipment 테이블 생성
CREATE TABLE equipment (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    equipment_type TEXT NOT NULL,
    manufacturer TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER,
    serial_number TEXT,
    engine_type TEXT,
    horsepower INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4단계: work_records 테이블 생성
CREATE TABLE work_records (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    equipment_id INTEGER REFERENCES equipment(id) ON DELETE SET NULL,
    work_type TEXT NOT NULL,
    ecu_model TEXT,
    connection_method TEXT,
    tools_used TEXT[],
    work_description TEXT,
    price DECIMAL(10,2),
    status TEXT DEFAULT 'pending',
    work_date DATE NOT NULL,
    files JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5단계: 인덱스 생성 (성능 최적화)
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_equipment_customer_id ON equipment(customer_id);
CREATE INDEX idx_equipment_type ON equipment(equipment_type);
CREATE INDEX idx_work_records_customer_id ON work_records(customer_id);
CREATE INDEX idx_work_records_equipment_id ON work_records(equipment_id);
CREATE INDEX idx_work_records_work_date ON work_records(work_date);
CREATE INDEX idx_work_records_status ON work_records(status);

-- 6단계: RLS (Row Level Security) 설정
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_records ENABLE ROW LEVEL SECURITY;

-- 7단계: 접근 정책 생성 (모든 사용자 접근 허용 - 개발/테스트용)
CREATE POLICY "Allow all operations on customers" ON customers FOR ALL USING (true);
CREATE POLICY "Allow all operations on equipment" ON equipment FOR ALL USING (true);
CREATE POLICY "Allow all operations on work_records" ON work_records FOR ALL USING (true);

-- 8단계: 트리거 함수 생성 (updated_at 자동 업데이트)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 9단계: 트리거 적용
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_records_updated_at BEFORE UPDATE ON work_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10단계: 샘플 데이터 삽입
INSERT INTO customers (name, phone, zip_code, road_address, jibun_address) VALUES
('김농부', '010-1234-5678', '12345', '경기도 안성시 죽산면 중앙로 69', '경기도 안성시 죽산면 죽산리 123'),
('이농장', '010-2345-6789', '54321', '충청남도 당진시 서부대로 1', '충청남도 당진시 서부면 대로 123'),
('박트랙터', '010-3456-7890', '67890', '전라북도 익산시 함라면 농기계로 456', '전라북도 익산시 함라면 함라리 456'),
('최콤바인', '010-4567-8901', '11111', '전라남도 나주시 농업로 789', '전라남도 나주시 농업동 789-1'),
('정기계', '010-5678-9012', '22222', '경상북도 구미시 산업로 321', '경상북도 구미시 산업동 321-2');

INSERT INTO equipment (customer_id, equipment_type, manufacturer, model, serial_number, engine_type, horsepower, notes) VALUES
(1, '트랙터', '현대', 'HT-2000', 'HT001234', '디젤', 100, '2020년 구매'),
(1, '로터리', '대동', 'DD-RT150', 'DD005678', '유압', NULL, '트랙터 부착용'),
(2, '콤바인', '동양', 'DY-3000', 'DY009012', '디젤', 150, '2019년 구매'),
(3, '이앙기', '클라스', 'CL-1500', 'CL012345', '가솔린', 50, '2021년 구매'),
(4, '예초기', '혼다', 'HD-GX35', 'HD067890', '가솔린', 35, '휴대용'),
(5, '분무기', '경농', 'KN-400', 'KN098765', '전기', NULL, '배터리 타입');

INSERT INTO work_records (customer_id, equipment_id, work_type, ecu_model, connection_method, work_description, price, status, work_date) VALUES
(1, 1, 'ECU 진단', 'Bosch EDC17', 'OBD-II', '엔진 출력 저하 문제 진단 및 해결', 150000, 'completed', '2024-01-15'),
(2, 3, 'ECU 튜닝', 'Delphi DCM3.7', 'JTAG', '연료 효율성 개선을 위한 ECU 맵핑', 250000, 'completed', '2024-02-20'),
(3, 4, 'ECU 수리', 'Denso 275800', 'BDM', 'ECU 메모리 복구 작업', 200000, 'completed', '2024-03-10'),
(1, 2, 'ECU 점검', 'Continental EMS3120', 'OBD-II', '정기 점검 및 오류 코드 삭제', 80000, 'pending', '2024-04-01'),
(4, 5, 'ECU 업그레이드', 'Siemens SID807', 'KLINE', '최신 펌웨어 업데이트', 120000, 'in_progress', '2024-04-05');

-- 11단계: 완료 확인
SELECT 
    'customers' as table_name, 
    count(*) as record_count 
FROM customers
UNION ALL
SELECT 
    'equipment' as table_name, 
    count(*) as record_count 
FROM equipment
UNION ALL
SELECT 
    'work_records' as table_name, 
    count(*) as record_count 
FROM work_records;

-- 완료 메시지
SELECT 'TracForce 데이터베이스 마이그레이션이 성공적으로 완료되었습니다!' as message;
