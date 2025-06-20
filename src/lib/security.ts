// 보안 관련 유틸리티 함수들

// 허용된 이메일 도메인 목록 (필요시 수정)
const ALLOWED_EMAIL_DOMAINS: string[] = [
  // 예시: 회사 도메인만 허용
  // 'company.com',
  // 'organization.co.kr'
]

// 허용된 이메일 주소 목록 (관리자가 직접 관리)
const ALLOWED_EMAILS: string[] = [
  // 예시: 특정 이메일만 허용
  // 'admin@company.com',
  // 'manager@company.com'
]

// 시스템 관리자 이메일 (관리자 페이지 접근 권한)
const ADMIN_EMAILS: string[] = [
  'bambooty57@gmail.com'
]

/**
 * 관리자 권한 확인
 */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

/**
 * 승인된 사용자인지 확인
 */
export function isApprovedUser(email: string): boolean {
  // 관리자는 항상 승인됨
  if (isAdmin(email)) {
    return true
  }

  // localStorage에서 승인된 사용자 목록 확인
  if (typeof window !== 'undefined') {
    const approvedUsers = localStorage.getItem('approvedUsers')
    if (approvedUsers) {
      const approvedList = JSON.parse(approvedUsers)
      return approvedList.includes(email.toLowerCase())
    }
  }

  return false
}

/**
 * 승인 대기 중인 사용자 목록 가져오기
 */
export function getPendingUsers(): string[] {
  if (typeof window !== 'undefined') {
    const pendingUsers = localStorage.getItem('pendingUsers')
    return pendingUsers ? JSON.parse(pendingUsers) : []
  }
  return []
}

/**
 * 승인 대기 목록에 사용자 추가
 */
export function addToPendingUsers(email: string): void {
  try {
    if (typeof window !== 'undefined') {
      // 관리자는 승인 대기 목록에 추가하지 않음
      if (isAdmin(email)) {
        return
      }
      
      const pendingUsers = getPendingUsers()
      const emailLower = email.toLowerCase()
      
      // 이미 승인 대기 목록에 있으면 추가하지 않음
      if (!pendingUsers.includes(emailLower)) {
        pendingUsers.push(emailLower)
        localStorage.setItem('pendingUsers', JSON.stringify(pendingUsers))
      }
    }
  } catch (error) {
    console.error('승인 대기 목록 추가 중 오류:', error)
    throw error
  }
}

/**
 * 사용자 승인
 */
export function approveUser(email: string): void {
  if (typeof window !== 'undefined') {
    // 승인된 사용자 목록에 추가
    const approvedUsers = localStorage.getItem('approvedUsers')
    const approvedList = approvedUsers ? JSON.parse(approvedUsers) : []
    if (!approvedList.includes(email.toLowerCase())) {
      approvedList.push(email.toLowerCase())
      localStorage.setItem('approvedUsers', JSON.stringify(approvedList))
    }

    // 승인 대기 목록에서 제거
    const pendingUsers = getPendingUsers()
    const updatedPending = pendingUsers.filter(user => user !== email.toLowerCase())
    localStorage.setItem('pendingUsers', JSON.stringify(updatedPending))
  }
}

/**
 * 사용자 승인 거부
 */
export function rejectUser(email: string): void {
  if (typeof window !== 'undefined') {
    // 승인 대기 목록에서 제거
    const pendingUsers = getPendingUsers()
    const updatedPending = pendingUsers.filter(user => user !== email.toLowerCase())
    localStorage.setItem('pendingUsers', JSON.stringify(updatedPending))
  }
}

/**
 * 이메일이 허용된 목록에 있는지 확인 (기존 로직 + 승인 시스템)
 */
export function isEmailAllowed(email: string): boolean {
  // 관리자 이메일은 항상 허용
  if (isAdmin(email)) {
    return true
  }

  // 승인된 사용자 확인
  if (isApprovedUser(email)) {
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