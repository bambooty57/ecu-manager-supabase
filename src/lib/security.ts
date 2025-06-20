// 보안 관련 유틸리티 함수들

// 허용된 이메일 도메인 목록 (필요시 수정)
const ALLOWED_EMAIL_DOMAINS = [
  // 예시: 회사 도메인만 허용
  // 'company.com',
  // 'organization.co.kr'
]

// 허용된 이메일 주소 목록 (관리자가 직접 관리)
const ALLOWED_EMAILS = [
  // 예시: 특정 이메일만 허용
  // 'admin@company.com',
  // 'manager@company.com'
]

/**
 * 이메일이 허용된 목록에 있는지 확인
 */
export function isEmailAllowed(email: string): boolean {
  // 관리자 이메일은 항상 허용
  if (email.includes('admin') || 
      email === 'admin@company.com' || 
      email === 'bambooty57@gmail.com') {
    return true
  }

  // 모든 이메일 허용 (개발 환경)
  if (process.env.NODE_ENV === 'development') {
    return true
  }

  // 특정 이메일 주소 확인
  if (ALLOWED_EMAILS.length > 0 && ALLOWED_EMAILS.includes(email.toLowerCase())) {
    return true
  }

  // 허용된 도메인 확인
  if (ALLOWED_EMAIL_DOMAINS.length > 0) {
    const emailDomain = email.split('@')[1]?.toLowerCase()
    return ALLOWED_EMAIL_DOMAINS.includes(emailDomain)
  }

  // 기본적으로 모든 이메일 허용 (허용 목록이 비어있는 경우)
  return ALLOWED_EMAILS.length === 0 && ALLOWED_EMAIL_DOMAINS.length === 0
}

/**
 * 로그인 시도 로그 기록
 */
export function logLoginAttempt(email: string, success: boolean, ip?: string) {
  const timestamp = new Date().toISOString()
  const logData = {
    timestamp,
    email,
    success,
    ip: ip || 'unknown',
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server'
  }

  // 콘솔에 로그 출력 (실제 운영에서는 파일이나 DB에 저장)
  console.log(`[LOGIN_ATTEMPT] ${timestamp} - ${email} - ${success ? 'SUCCESS' : 'FAILED'} - IP: ${ip}`)
  
  // 실제 운영환경에서는 여기에 로그 저장 로직 추가
  // 예: 데이터베이스에 저장, 로그 파일에 기록 등
}

/**
 * 브루트 포스 공격 방지를 위한 로그인 시도 제한
 */
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()

export function isLoginRateLimited(email: string): boolean {
  const now = Date.now()
  const attempts = loginAttempts.get(email)
  
  if (!attempts) {
    return false
  }

  // 15분 후 리셋
  if (now - attempts.lastAttempt > 15 * 60 * 1000) {
    loginAttempts.delete(email)
    return false
  }

  // 5회 시도 후 15분 제한
  return attempts.count >= 5
}

export function recordLoginAttempt(email: string, success: boolean) {
  const now = Date.now()
  
  if (success) {
    // 성공 시 카운터 리셋
    loginAttempts.delete(email)
  } else {
    // 실패 시 카운터 증가
    const attempts = loginAttempts.get(email) || { count: 0, lastAttempt: 0 }
    attempts.count += 1
    attempts.lastAttempt = now
    loginAttempts.set(email, attempts)
  }
} 