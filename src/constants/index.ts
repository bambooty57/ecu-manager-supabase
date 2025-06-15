// 농기계 종류
export const EQUIPMENT_TYPES = [
  '트랙터',
  '콤바인',
  '지게차',
  '굴삭기',
  '스키드로더',
  '기타'
] as const

// 제조사
export const MANUFACTURERS = [
  '구보다',
  '얀마',
  '존디어',
  '뉴홀랜드',
  '대동',
  '국제',
  '동양',
  '기타'
] as const

// ECU 종류
export const ECU_TYPES = [
  '엔진ECU',
  '요소수ACU',
  '기타'
] as const

// 연결방법
export const CONNECTION_METHODS = [
  'OBD',
  'BENCH',
  'BOOT',
  '기타'
] as const

// ECU 장비
export const ECU_TOOLS = [
  'FLEX',
  'KESS',
  'FAD',
  '기타'
] as const

// 프로토콜
export const PROTOCOLS = [
  'CAN',
  'K-LINE',
  'ISO',
  'UDS',
  '기타'
] as const

// 튜닝 작업
export const TUNING_WORKS = [
  '출력향상',
  'DPF',
  'ADBLUE',
  'EGR',
  'AdBlue 삭제',
  'DTC 삭제',
  '연비 최적화',
  '기타'
] as const

// 파일 타입
export const FILE_TYPES = [
  'original',
  'tuned',
  'photo',
  'video'
] as const

// 업로드 가능한 파일 확장자
export const ALLOWED_FILE_EXTENSIONS = {
  tuning: ['.bin', '.ori', '.mod', '.mmf', '.kess', '.flex'],
  image: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  video: ['.mp4', '.avi', '.mov', '.wmv', '.flv']
}

// 최대 파일 크기 (바이트)
export const MAX_FILE_SIZE = {
  tuning: 50 * 1024 * 1024, // 50MB
  image: 10 * 1024 * 1024,  // 10MB
  video: 100 * 1024 * 1024  // 100MB
} 