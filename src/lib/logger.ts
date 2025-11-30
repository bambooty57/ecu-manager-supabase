/**
 * 환경별 로깅 유틸리티
 * 프로덕션 빌드에서는 자동으로 제거됨
 */

const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * 개발 환경에서만 로그 출력
 */
export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },
  
  error: (...args: any[]) => {
    // 에러는 항상 출력 (프로덕션에서도)
    console.error(...args)
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args)
    }
  },
  
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args)
    }
  },
  
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args)
    }
  },
  
  // 성능 측정용 (프로덕션에서도 필요시 사용)
  time: (label: string) => {
    if (isDevelopment) {
      console.time(label)
    }
  },
  
  timeEnd: (label: string) => {
    if (isDevelopment) {
      console.timeEnd(label)
    }
  },
  
  // 그룹 로깅
  group: (label: string) => {
    if (isDevelopment) {
      console.group(label)
    }
  },
  
  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd()
    }
  }
}

/**
 * 프로덕션에서 완전히 제거되는 로그 (트리 쉐이킹)
 */
export const devLog = isDevelopment
  ? {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      info: console.info.bind(console),
      debug: console.debug.bind(console),
    }
  : {
      log: () => {},
      warn: () => {},
      info: () => {},
      debug: () => {},
    }

