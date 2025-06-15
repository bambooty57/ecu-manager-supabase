// 고객 정보 타입
export interface Customer {
  id: string
  name: string
  phone?: string
  address?: string
  email?: string
  created_at: string
  updated_at: string
}

// 장비 정보 타입
export interface Equipment {
  id: string
  customer_id: string
  equipment_type: string // 트랙터, 콤바인, 지게차, 굴삭기, 스키드로더, 기타
  manufacturer: string // 구보다, 얀마, 존디어, 뉴홀랜드, 대동, 국제, 동양, 기타
  model?: string
  year?: number
  vin?: string
  serial_number?: string
  created_at: string
  updated_at: string
}

// 작업 기록 타입
export interface WorkRecord {
  id: string
  customer_id: string
  equipment_id: string
  work_date: string
  worker_name: string
  ecu_type: string // 엔진ECU, 요소수ACU, 기타
  connection_method: string // OBD, BENCH, BOOT, 기타
  ecu_tool: string // FLEX, KESS, FAD, 기타
  protocol?: string // CAN, K-LINE, 기타
  tuning_works: string[] // 출력향상, DPF, ADBLUE, EGR
  price?: number
  notes?: string
  work_tips?: string
  success_status: boolean
  created_at: string
  updated_at: string
}

// 파일 정보 타입
export interface FileRecord {
  id: string
  work_record_id: string
  file_type: 'original' | 'tuned' | 'photo' | 'video'
  file_name: string
  file_path: string
  file_size?: number
  mime_type?: string
  uploaded_at: string
}

// 장비별 가이드 타입
export interface EquipmentGuide {
  id: string
  manufacturer: string
  equipment_type: string
  model?: string
  ecu_type?: string
  recommended_tool?: string
  recommended_connection?: string
  recommended_protocol?: string
  success_rate?: number
  guide_notes?: string
  created_at: string
  updated_at: string
}

// 작업 등록 폼 타입
export interface WorkRecordForm {
  customer_id: string
  equipment_id: string
  work_date: string
  worker_name: string
  ecu_type: string
  connection_method: string
  ecu_tool: string
  protocol?: string
  tuning_works: string[]
  price?: number
  notes?: string
  work_tips?: string
  success_status: boolean
}

// 고객 등록 폼 타입
export interface CustomerForm {
  name: string
  phone?: string
  address?: string
  email?: string
}

// 장비 등록 폼 타입
export interface EquipmentForm {
  customer_id: string
  equipment_type: string
  manufacturer: string
  model?: string
  year?: number
  vin?: string
  serial_number?: string
} 