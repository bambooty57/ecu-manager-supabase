# Google 인증 설정 가이드

## 1. Supabase 프로젝트 설정

### 환경 변수 설정
`.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase에서 Google OAuth 활성화
1. Supabase 대시보드 접속
2. Authentication > Providers 메뉴로 이동
3. Google 프로바이더 활성화
4. Google OAuth 설정 필요

## 2. Google Cloud Console 설정

### OAuth 2.0 클라이언트 ID 생성
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택 또는 새 프로젝트 생성
3. APIs & Services > Credentials 메뉴로 이동
4. "Create Credentials" > "OAuth 2.0 Client IDs" 선택
5. Application type: "Web application" 선택
6. Name: "ECU Manager" 입력

### 승인된 리디렉션 URI 설정
다음 URI들을 추가하세요:
- `https://your-project-id.supabase.co/auth/v1/callback`
- `http://localhost:3000/auth/callback` (개발용)

### 클라이언트 ID와 Secret 복사
생성된 클라이언트 ID와 클라이언트 Secret을 복사하여 Supabase 설정에 입력

## 3. Supabase에 Google OAuth 정보 입력

1. Supabase 대시보드 > Authentication > Providers > Google
2. Enable Google provider 체크
3. Client ID와 Client Secret 입력
4. Save 버튼 클릭

## 4. 승인된 사용자 설정 (선택사항)

특정 이메일만 로그인을 허용하려면:
1. Supabase 대시보드 > Authentication > Settings
2. "Site URL" 설정
3. "Additional URLs" 에 허용할 도메인 추가

## 5. 테스트

1. 개발 서버 실행: `npm run dev`
2. `http://localhost:3000/login` 접속
3. Google 로그인 버튼 클릭
4. bambooty57@gmail.com 계정으로 로그인 테스트

## 문제 해결

### 일반적인 오류들:
- **Invalid redirect URI**: Google Cloud Console의 리디렉션 URI 설정 확인
- **Access denied**: Google OAuth 동의 화면 설정 필요
- **Invalid client**: Client ID/Secret 정확성 확인

### 로그 확인:
- 브라우저 개발자 도구 Console 탭
- Supabase 대시보드 > Logs 메뉴
- Next.js 개발 서버 터미널 로그

## 보안 고려사항

1. `.env.local` 파일은 절대 Git에 커밋하지 마세요
2. 프로덕션 환경에서는 HTTPS 필수
3. 클라이언트 Secret은 안전하게 보관
4. 정기적으로 OAuth 키 갱신 권장 