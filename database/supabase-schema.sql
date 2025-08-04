-- ECU Management System Database Schema
-- Drop existing tables if they exist (order matters due to foreign key constraints)
DROP TABLE IF EXISTS work_records CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- Customers table
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

-- Equipment table
CREATE TABLE equipment (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
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

-- Work records table
CREATE TABLE work_records (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    equipment_id INTEGER REFERENCES equipment(id),
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

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_records ENABLE ROW LEVEL SECURITY;

-- Allow all access policies (for testing purposes)
CREATE POLICY "Allow all access" ON customers FOR ALL USING (true);
CREATE POLICY "Allow all access" ON equipment FOR ALL USING (true);
CREATE POLICY "Allow all access" ON work_records FOR ALL USING (true);

-- Sample data
INSERT INTO customers (name, phone, zip_code, road_address, jibun_address) VALUES
('김농부', '010-1234-5678', '12345', '경기도 안성시 죽산면 중앙로 69', '경기도 안성시 죽산면 죽산리 123'),
('이농장', '010-2345-6789', '54321', '충청남도 당진시 서부대로 1', '충청남도 당진시 서부면 대로 123'),
('박트랙터', '010-3456-7890', '67890', '전라북도 익산시 함라면 농기계로 456', '전라북도 익산시 함라면 함라리 456');

INSERT INTO equipment (customer_id, equipment_type, manufacturer, model, serial_number, engine_type, horsepower) VALUES
(1, '트랙터', '현대', 'HT-2000', 'SN001234', '디젤', 100),
(2, '콤바인', '대동', 'DD-3000', 'SN005678', '디젤', 150),
(3, '이앙기', '동양', 'DY-1500', 'SN009012', '가솔린', 50);

-- Success message
SELECT 'ECU Management System database created successfully!' AS message; 