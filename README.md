# ECU 튜닝 파일 관리 프로그램

농기계 ECU 튜닝 파일 및 작업 이력을 체계적으로 관리하는 웹 애플리케이션

## 주요 기능

- 고객 및 장비 정보 관리
- ECU 튜닝 작업 등록 및 이력 관리
- 파일 업로드 및 자동 폴더 구조 생성
- 동일 기종 작업 시 추천 가이드 제공
- 작업 노트 및 팁 관리
- 사진/동영상 첨부 기능

## 기술 스택

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **File Storage**: Supabase Storage
- **Deployment**: Vercel

## 개발 환경 설정

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

## 폴더 구조

- 고객별 → 장비별 → 작업종류별 폴더 자동 생성
- 원본/튜닝 파일 구분 저장
- 사진/동영상 파일 첨부 지원

## 작업 분류

### 농기계 종류
- 트랙터, 콤바인, 지게차, 굴삭기, 스키드로더, 기타

### 제조사
- 구보다, 얀마, 존디어, 뉴홀랜드, 대동, 국제, 동양, 기타

### ECU 종류
- 엔진ECU, 요소수ACU, 기타

### 연결방법
- OBD, BENCH, BOOT, 기타

### ECU 장비
- FLEX, KESS, FAD, 기타

### 튜닝 작업
- 출력향상, DPF, ADBLUE, EGR 