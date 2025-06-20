-- ECU 관리 시스템을 위한 Supabase 테이블 생성 스크립트
-- 기존 테이블이 있다면 삭제하고 새로 생성

-- 기존 테이블 삭제 (순서 중요: 외래키 참조 테이블부터)
DROP TABLE IF EXISTS work_records CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- 고객 정보 테이블
CREATE TABLE customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 장비 정보 테이블
CREATE TABLE equipment (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    model TEXT,
    serial_number TEXT,
    manufacturer TEXT,
    purchase_date DATE,
    warranty_period INTEGER,
    status TEXT DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 작업 기록 테이블
CREATE TABLE work_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES customers(id),
    equipment_id UUID REFERENCES equipment(id),
    work_type TEXT NOT NULL,
    description TEXT NOT NULL,
    work_date DATE NOT NULL,
    technician TEXT,
    hours_spent DECIMAL(4,2),
    parts_used TEXT,
    cost DECIMAL(10,2),
    status TEXT DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책 설정
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_records ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 접근 가능하도록 정책 설정 (테스트용)
CREATE POLICY "Allow all access" ON customers FOR ALL USING (true);
CREATE POLICY "Allow all access" ON equipment FOR ALL USING (true);
CREATE POLICY "Allow all access" ON work_records FOR ALL USING (true);

-- 샘플 데이터 삽입
INSERT INTO customers (name, phone, email, address) VALUES
('김철수', '010-1234-5678', 'kim@example.com', '서울특별시 강남구'),
('이영희', '010-9876-5432', 'lee@example.com', '부산광역시 해운대구'),
('박민수', '010-5555-1234', 'park@example.com', '대구광역시 중구');

INSERT INTO equipment (name, model, serial_number, manufacturer) VALUES
('ECU 분석기 A', 'EA-2000', 'SN001234', '한국전자'),
('진단 스캐너 B', 'DS-3000', 'SN005678', '글로벌테크'),
('오실로스코프 C', 'OS-1500', 'SN009012', '정밀기기');

-- 완료 메시지
SELECT 'ECU 관리 시스템 데이터베이스가 성공적으로 생성되었습니다!' AS message; 