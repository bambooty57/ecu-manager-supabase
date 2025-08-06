'use client'

import { supabase } from './supabase'
import type { Database } from './database.types'

export type WorkRecord = Database['public']['Tables']['work_records']['Row']

// 최적화된 상태 관리 타입
export interface RemappingWork {
  id: number
  ecu: {
    toolCategory: string
    toolCategoryCustom?: string
    connectionMethod: string
    connectionMethodCustom?: string
    maker: string
    makerCustom?: string
    type: string
    typeCustom: string
    selectedWorks: string[]
    workDetails: string
    price: string
    status: string
    statusCustom?: string
  }
  acu: {
    toolCategory: string
    toolCategoryCustom?: string
    connectionMethod: string
    connectionMethodCustom?: string
    manufacturer: string
    manufacturerCustom?: string
    model: string
    modelCustom: string
    selectedWorks: string[]
    workDetails: string
    price: string
    status: string
    statusCustom?: string
  }
  notes: string
  files: {
    originalFile?: any
    originalFileDescription?: string
    stage1File?: any
    stage1FileDescription?: string
    stage2File?: any
    stage2FileDescription?: string
    stage3File?: any
    stage3FileDescription?: string
    acuOriginalFile?: any
    acuOriginalFileDescription?: string
    acuStage1File?: any
    acuStage1FileDescription?: string
    acuStage2File?: any
    acuStage2FileDescription?: string
    acuStage3File?: any
    acuStage3FileDescription?: string
    mediaFile1?: any
    mediaFile1Description?: string
    mediaFile2?: any
    mediaFile2Description?: string
    mediaFile3?: any
    mediaFile3Description?: string
    mediaFile4?: any
    mediaFile4Description?: string
    mediaFile5?: any
    mediaFile5Description?: string
  }
  media?: {
    before?: any
    after?: any
  }
  [key: string]: any // Json 타입과 호환성을 위한 인덱스 시그니처
}

// 최적화된 작업 기록 데이터 타입
export interface WorkRecordData {
  id?: number
  customerId: number | null
  equipmentId?: number | null
  workDate: string
  workType: string
  totalPrice?: number
  connectionMethod?: string
  toolsUsed?: string[]
  workDescription?: string
  files?: any
  remappingWorks: RemappingWork[]
  isActive?: boolean
  // ECU 관련 속성들
  ecuMaker?: string
  ecuModel?: string
  ecuType?: string
  ecuPrice?: number
  ecuStatus?: string
  // ACU 관련 속성들
  acuManufacturer?: string
  acuModel?: string
  acuType?: string
  acuPrice?: number
  acuStatus?: string
}

// 상태 색상 매핑 함수
export const getStatusColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case '완료':
    case 'completed':
      return 'text-green-600 bg-green-100 rounded-full'
    case '진행중':
    case 'in-progress':
      return 'text-blue-600 bg-blue-100 rounded-full'
    case '대기':
    case 'pending':
      return 'text-yellow-600 bg-yellow-100 rounded-full'
    case '실패':
    case 'failed':
      return 'text-red-600 bg-red-100 rounded-full'
    case 'as':
      return 'text-purple-600 bg-purple-100 rounded-full'
    case 'n/a':
    case 'na':
      return 'text-gray-600 bg-gray-100 rounded-full'
    default:
      return 'text-gray-600 bg-gray-100 rounded-full'
  }
}

// 간단한 상태 표시 함수
export const getOverallStatus = (status?: string): string => {
  return status || 'pending'
}

// 총 가격 계산 함수
export const calculateTotalPrice = (remappingWorks: RemappingWork[]): number => {
  if (!remappingWorks || remappingWorks.length === 0) {
    return 0
  }

  return remappingWorks.reduce((total, work) => {
    const ecuPrice = parseInt(work.ecu?.price || '0')
    const acuPrice = parseInt(work.acu?.price || '0')
    return total + ecuPrice + acuPrice
  }, 0)
}



// 작업 기록 생성 함수 (최적화됨)
export const createWorkRecord = async (data: WorkRecordData): Promise<WorkRecord> => {
  const {
    customerId,
    equipmentId,
    workDate,
    workType,
    totalPrice,
    connectionMethod,
    toolsUsed,
    workDescription,
    files,
    remappingWorks,
    isActive = true
  } = data

  // 총 가격 계산
  const calculatedTotalPrice = totalPrice || calculateTotalPrice(remappingWorks)

  const { data: workRecord, error } = await supabase
    .from('work_records')
    .insert({
      customer_id: customerId,
      equipment_id: equipmentId,
      work_date: workDate,
      work_type: workType,
      total_price: calculatedTotalPrice,
      connection_method: connectionMethod,
      tools_used: toolsUsed,
      work_description: workDescription,
      files: files,
      remapping_works: remappingWorks as any, // Json 타입으로 캐스팅
      is_active: isActive
    })
    .select()
    .single()

  if (error) {
    console.error('작업 기록 생성 오류:', error)
    throw new Error(`작업 기록 생성 실패: ${error.message}`)
  }

  return workRecord
}

// 작업 기록 조회 함수 (최적화됨)
export const getWorkRecords = async (options: {
  customerId?: number
  equipmentId?: number
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
} = {}): Promise<WorkRecord[]> => {
  let query = supabase
    .from('work_records')
    .select(`
      *,
      customer:customers(name),
      equipment:equipment(model, equipment_type, manufacturer)
    `)
    .order('work_date', { ascending: false })

  // 필터 적용
  if (options.customerId) {
    query = query.eq('customer_id', options.customerId)
  }
  if (options.equipmentId) {
    query = query.eq('equipment_id', options.equipmentId)
  }
  if (options.startDate) {
    query = query.gte('work_date', options.startDate)
  }
  if (options.endDate) {
    query = query.lte('work_date', options.endDate)
  }

  // 페이지네이션
  if (options.limit) {
    query = query.limit(options.limit)
  }
  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
  }

  const { data, error } = await query

  if (error) {
    console.error('작업 기록 조회 오류:', error)
    throw new Error(`작업 기록 조회 실패: ${error.message}`)
  }

  return data || []
}

// 작업 기록 업데이트 함수 (최적화됨)
export const updateWorkRecord = async (
  id: number,
  data: Partial<WorkRecordData>
): Promise<WorkRecord> => {
  const updateData: any = {}

  // 기본 필드들
  if (data.customerId !== undefined) updateData.customer_id = data.customerId
  if (data.equipmentId !== undefined) updateData.equipment_id = data.equipmentId
  if (data.workDate) updateData.work_date = data.workDate
  if (data.workType) updateData.work_type = data.workType
  if (data.connectionMethod) updateData.connection_method = data.connectionMethod
  if (data.toolsUsed) updateData.tools_used = data.toolsUsed
  if (data.workDescription) updateData.work_description = data.workDescription
  if (data.files) updateData.files = data.files
  if (data.isActive !== undefined) updateData.is_active = data.isActive

  // remapping_works 업데이트
  if (data.remappingWorks) {
    updateData.remapping_works = data.remappingWorks
    
        // 총 가격 자동 계산
    const calculatedTotalPrice = calculateTotalPrice(data.remappingWorks)

    updateData.total_price = calculatedTotalPrice
  }

  const { data: workRecord, error } = await supabase
    .from('work_records')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('작업 기록 업데이트 오류:', error)
    throw new Error(`작업 기록 업데이트 실패: ${error.message}`)
  }

  return workRecord
}

// 작업 기록 삭제 함수
export const deleteWorkRecord = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('work_records')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('작업 기록 삭제 오류:', error)
    throw new Error(`작업 기록 삭제 실패: ${error.message}`)
  }
}

// 상태별 작업 기록 통계
export const getWorkRecordStats = async (): Promise<{
  total: number
  completed: number
  inProgress: number
  pending: number
  failed: number
}> => {
  const { data, error } = await supabase
    .from('work_records')
    .select('status')

  if (error) {
    console.error('통계 조회 오류:', error)
    throw new Error(`통계 조회 실패: ${error.message}`)
  }

  const stats = {
    total: data?.length || 0,
    completed: data?.filter(r => r.status === '완료').length || 0,
    inProgress: data?.filter(r => r.status === '진행중').length || 0,
    pending: data?.filter(r => r.status === 'pending').length || 0,
    failed: data?.filter(r => r.status === '실패').length || 0
  }

  return stats
} 

// 모든 작업 기록 조회 함수 (getWorkRecords의 별칭)
export const getAllWorkRecords = getWorkRecords 

// 페이지네이션된 작업 기록 조회 함수 (안정적 버전)
export const getWorkRecordsPaginatedStable = async (options: {
  page?: number
  pageSize?: number
  customerId?: number
  equipmentId?: number
  startDate?: string
  endDate?: string
  sortField?: string
  sortDirection?: 'asc' | 'desc'
} = {}): Promise<{
  data: WorkRecord[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}> => {
  const {
    page = 1,
    pageSize = 20,
    customerId,
    equipmentId,
    startDate,
    endDate,
    sortField = 'created_at',
    sortDirection = 'desc'
  } = options

  let query = supabase
    .from('work_records')
    .select('*, remapping_works', { count: 'exact' })

  // 필터 적용
  if (customerId) query = query.eq('customer_id', customerId)
  if (equipmentId) query = query.eq('equipment_id', equipmentId)
  if (startDate) query = query.gte('work_date', startDate)
  if (endDate) query = query.lte('work_date', endDate)

  // 정렬 적용
  query = query.order(sortField, { ascending: sortDirection === 'asc' })

  // 페이지네이션 적용
  const offset = (page - 1) * pageSize
  query = query.range(offset, offset + pageSize - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('페이지네이션 작업 기록 조회 오류:', error)
    throw new Error(`페이지네이션 작업 기록 조회 실패: ${error.message}`)
  }

  const total = count || 0
  const totalPages = Math.ceil(total / pageSize)

  return {
    data: data || [],
    total,
    page,
    pageSize,
    totalPages
  }
}

// 작업 기록 상세 조회 함수 (안정적 버전)
export const getWorkRecordDetailsStable = async (id: number): Promise<WorkRecord | null> => {
  const { data, error } = await supabase
    .from('work_records')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // 레코드를 찾을 수 없는 경우
      return null
    }
    console.error('작업 기록 상세 조회 오류:', error)
    throw new Error(`작업 기록 상세 조회 실패: ${error.message}`)
  }

  return data
}

// 파일 정보가 포함된 작업 기록 조회 함수
export const getWorkRecordWithFiles = async (id: number): Promise<WorkRecord | null> => {
  const { data, error } = await supabase
    .from('work_records')
    .select(`
      *,
      customers:customer_id(*),
      equipment:equipment_id(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('파일 포함 작업 기록 조회 오류:', error)
    throw new Error(`파일 포함 작업 기록 조회 실패: ${error.message}`)
  }

  return data
} 