# 🗄️ 데이터베이스 마이그레이션 가이드

## 📋 개요
ECU 관리 시스템에서 `work_records` 테이블에 누락된 컬럼들을 추가하고 기존 데이터를 업데이트하는 가이드입니다.

## 🔧 누락된 컬럼들
- `tools_used` (text[]) - 사용된 도구 목록 (KESS, FLEX 등)
- `work_description` (text) - 작업 상세 설명  
- `price` (numeric) - 개별 작업 가격
- `acu_type` (text) - ACU 타입 정보
- `user_id` (uuid) - 작업 수행자 ID

## 🚀 마이그레이션 실행 방법

### 1단계: 컬럼 추가
Supabase 대시보드 → SQL Editor에서 다음 파일 실행:

```sql
-- 파일: add_missing_work_records_columns.sql
```

### 2단계: 기존 데이터 업데이트  
```sql
-- 파일: update_existing_work_records_data.sql
```

## 📊 마이그레이션 내용

### 🔧 추가되는 컬럼
| 컬럼명 | 타입 | 설명 | 기본값 |
|--------|------|------|--------|
| `tools_used` | text[] | 사용 도구 배열 | `{}` |
| `work_description` | text | 작업 설명 | NULL |
| `price` | numeric | 개별 가격 | 0 |
| `acu_type` | text | ACU 타입 | NULL |
| `user_id` | uuid | 작업자 ID | NULL |

### 🎯 데이터 매핑 로직

**ECU 제조사별 도구 매핑:**
```
CHRYSLER, BOSCH, CONTINENTAL, DELPHI → [KESS, OBD]
CATERPILLAR, CUMMINS, VOLVO, SCANIA → [FLEX, BENCH]
기타 → [KESS, OBD]
```

**ACU 제조사별 도구 매핑:**
```
CONTINENTAL, ZF, BOSCH, WABCO → [FLEX, BENCH]
```

**작업 설명 생성:**
```
ECU+ACU → "ECU 및 ACU 통합 튜닝 작업"
ECU만 → "ECU 엔진 튜닝 작업"  
ACU만 → "ACU 변속기 튜닝 작업"
```

**가격 설정:**
```
ECU+ACU → 150,000원
ECU만 → 100,000원
ACU만 → 80,000원
```

## ✅ 실행 후 확인사항

### 데이터 검증 쿼리
```sql
-- 1. tools_used 확인
SELECT id, ecu_maker, tools_used 
FROM work_records 
WHERE tools_used IS NOT NULL 
ORDER BY id DESC 
LIMIT 10;

-- 2. work_description 확인  
SELECT id, work_type, work_description
FROM work_records
WHERE work_description IS NOT NULL
ORDER BY id DESC
LIMIT 10;

-- 3. 통계 확인
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN tools_used IS NOT NULL AND array_length(tools_used, 1) > 0 THEN 1 END) as with_tools,
  COUNT(CASE WHEN work_description IS NOT NULL THEN 1 END) as with_description,
  COUNT(CASE WHEN price > 0 THEN 1 END) as with_price
FROM work_records;
```

## 🔄 애플리케이션 코드 변경사항

### work-records.ts 업데이트
- `WorkRecordData` 타입에 새 필드 추가
- `getWorkRecordsPaginated`에서 새 컬럼 조회
- 데이터 매핑 로직 추가

### history/page.tsx 업데이트  
- `processRemappingWorks`에서 `tools_used` 우선 사용
- 실제 도구 데이터 기반 카테고리 추출
- 제조사 기반 추정 로직 보완

## 🎯 기대 효과

### Before (마이그레이션 전)
```
ECU/ACU 섹션: N/A - BENCH, N/A - OBD
```

### After (마이그레이션 후)  
```
ECU 섹션: KESS - OBD, FLEX - BENCH
ACU 섹션: FLEX - BENCH
```

## 🚨 주의사항

1. **백업 필수**: 마이그레이션 전 데이터베이스 백업
2. **단계별 실행**: 1단계 완료 후 2단계 진행
3. **검증 필수**: 각 단계 후 데이터 검증
4. **롤백 준비**: 문제 발생 시 롤백 계획

## 📞 문제 해결

### 자주 발생하는 오류
1. **컬럼 이미 존재**: `IF NOT EXISTS` 조건으로 해결
2. **배열 타입 오류**: PostgreSQL 배열 문법 확인
3. **NULL 값 처리**: `COALESCE` 함수 활용

### 롤백 방법
```sql
-- 컬럼 제거 (필요시)
ALTER TABLE work_records DROP COLUMN IF EXISTS tools_used;
ALTER TABLE work_records DROP COLUMN IF EXISTS work_description;
ALTER TABLE work_records DROP COLUMN IF EXISTS price;
ALTER TABLE work_records DROP COLUMN IF EXISTS user_id;
```

---

## 🎉 완료 후 확인

마이그레이션 완료 후 웹 애플리케이션에서:
1. 작업이력 페이지 접속
2. ECU/ACU 섹션에서 "N/A" 대신 실제 도구명 확인
3. 콘솔에서 `tools_used` 데이터 로드 확인

**성공 시**: `KESS - OBD`, `FLEX - BENCH` 등으로 표시
**실패 시**: 여전히 "N/A" 표시 → 마이그레이션 재실행 필요 