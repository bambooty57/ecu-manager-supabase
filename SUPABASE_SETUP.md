# Supabase 설정 가이드

## 1. Supabase 프로젝트 생성

### 방법 1: Supabase 웹사이트 이용
1. [Supabase](https://supabase.com)에 접속
2. "Start your project" 클릭
3. GitHub 계정으로 로그인
4. "New project" 클릭
5. 프로젝트 이름: `ecu-manager`
6. 데이터베이스 비밀번호 설정
7. 지역 선택 (Seoul 권장)
8. "Create new project" 클릭

### 방법 2: MCP GitHub 도구 이용 (선택사항)
```bash
# GitHub에서 Supabase 관련 템플릿 검색 및 포크 가능
```

## 2. 환경변수 설정

프로젝트 생성 후 Settings > API에서 다음 정보를 확인:

### .env.local 파일 생성
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 3. 데이터베이스 스키마 설정

### SQL Editor에서 실행
프로젝트의 `supabase-schema.sql` 파일 내용을 Supabase SQL Editor에서 실행:

```sql
-- 고객 테이블
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  postal_code VARCHAR(10),
  road_address TEXT,
  jibun_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, phone)
);

-- 장비 테이블  
CREATE TABLE equipment (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT REFERENCES customers(id) ON DELETE CASCADE,
  equipment_type VARCHAR(50) NOT NULL,
  manufacturer VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INTEGER,
  serial_number VARCHAR(100),
  engine_type VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 작업 기록 테이블
CREATE TABLE work_records (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT REFERENCES customers(id) ON DELETE CASCADE,
  equipment_id BIGINT REFERENCES equipment(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  ecu_type VARCHAR(100),
  connection_method VARCHAR(50),
  tuning_works TEXT[],
  work_details TEXT,
  price DECIMAL(10,2),
  status VARCHAR(20) DEFAULT '예약',
  notes TEXT,
  files JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 인덱스 생성
```sql
CREATE INDEX idx_customers_name_phone ON customers(name, phone);
CREATE INDEX idx_equipment_customer_id ON equipment(customer_id);
CREATE INDEX idx_work_records_customer_id ON work_records(customer_id);
CREATE INDEX idx_work_records_equipment_id ON work_records(equipment_id);
CREATE INDEX idx_work_records_work_date ON work_records(work_date);
```

### RLS (Row Level Security) 정책
```sql
-- RLS 활성화
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_records ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 모든 작업을 수행할 수 있도록 허용 (개발용)
CREATE POLICY "Enable all operations for all users" ON customers FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON equipment FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON work_records FOR ALL USING (true);
```

### 자동 업데이트 트리거
```sql
-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_work_records_updated_at BEFORE UPDATE ON work_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 4. 개발 서버 실행

```bash
npm run dev
```

## 5. 기능 테스트

1. **고객 관리**: http://localhost:3000/customers
   - 개별 고객 등록
   - Excel/CSV 파일 업로드
   - 고객 정보 수정/삭제

2. **장비 관리**: http://localhost:3000/equipment
   - 장비 등록 및 관리

3. **작업 관리**: http://localhost:3000/work
   - 작업 등록 및 관리

4. **작업 이력**: http://localhost:3000/history
   - 작업 이력 조회 및 필터링

## 6. 문제 해결

### xlsx 모듈 오류
```bash
npm install xlsx --save
```

### Supabase 연결 오류
- .env.local 파일의 URL과 키 확인
- Supabase 프로젝트 상태 확인
- RLS 정책 확인

### 개발 서버 포트 충돌
- 다른 포트 사용: `npm run dev -- -p 3001`

## 7. 배포 준비

### Vercel 배포
1. GitHub 저장소에 코드 푸시
2. Vercel에서 프로젝트 import
3. 환경변수 설정
4. 배포 완료

### 환경변수 (배포용)
```env
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
``` 