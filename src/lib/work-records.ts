'use client'

import { supabase } from './supabase'
// import { isPlaceholderEnvironment } from '../utils/helpers' // 더 이상 사용하지 않음
import type { Database } from './database.types'
import { CacheManager } from './cache-manager'
import { CustomerData } from './customers'
import { EquipmentData } from './equipment'

// isPlaceholderEnvironment 함수를 이 파일 내부에 정의하거나, 항상 false를 반환하도록 수정
const isPlaceholderEnvironment = () => {
    // 실제 환경에서는 항상 false를 반환하도록 설정
    return false;
};

export type WorkRecord = Database['public']['Tables']['work_records']['Row']
export type WorkRecordInsert = Database['public']['Tables']['work_records']['Insert']
export type WorkRecordUpdate = Database['public']['Tables']['work_records']['Update']

// 파일 업로드 객체 타입
export interface FileUpload {
  file: File | null
  description: string
}

// 리매핑 작업 입력 타입
export interface RemappingWorkInput {
  stage: 'stock' | 'stage1' | 'stage2' | 'dpf_off' | 'egr_off' | 'scr_off'
  // ECU 정보 추가
  ecu?: {
    maker: string
    type: string
    connectionMethod: string
    toolCategory: string
    selectedWorks: string[]
    workDetails: string
    price: string
    status: string
  }
  // ACU 정보 추가
  acu?: {
    manufacturer: string
    model: string
    type?: string
    connectionMethod: string
    toolCategory: string
    selectedWorks: string[]
    workDetails: string
    price: string
    status: string
  }
  files: {
    original?: FileUpload
    read?: FileUpload
    modified?: FileUpload
    vr?: FileUpload
  }
  media: {
    before: File | null
    after: File | null
  }
}

// 프론트엔드에서 사용할 작업 기록 데이터 타입
export interface WorkRecordData {
  id: number
  customerId: number | null
  equipmentId?: number
  workDate: string
  workType: string
  totalPrice?: number
  status: string
  remappingWorks: RemappingWorkInput[]
  created_at: string | null
  // ECU/ACU 정보 추가
  ecuMaker?: string | null
  ecuModel?: string | null
  acuManufacturer?: string | null
  acuModel?: string | null
  acuType?: string | null
  connectionMethod?: string | null
  toolsUsed?: string[] | null
  files?: any[]
  hasFiles?: boolean
  workDescription?: string | null
  price?: number | null
  userId?: string | null
}

// 데이터베이스 형식을 프론트엔드 형식으로 변환
const transformWorkRecordFromDB = (record: WorkRecord): WorkRecordData => {
  // remapping_works가 null 또는 undefined가 아니고, 유효한 JSON 문자열인지 확인
  const remappingWorks = 
    record.remapping_works && typeof record.remapping_works === 'string' 
    ? JSON.parse(record.remapping_works) 
    : (Array.isArray(record.remapping_works) ? record.remapping_works : [])

  return {
    id: record.id,
    customerId: record.customer_id,
    equipmentId: record.equipment_id ?? undefined,
    workDate: record.work_date,
    workType: record.work_type,
    totalPrice: record.total_price ?? undefined,
    status: record.status || '',
    remappingWorks: remappingWorks,
    created_at: record.created_at,
  }
}

// 프론트엔드 형식을 데이터베이스 형식으로 변환
const transformWorkRecordToDB = (record: Omit<WorkRecordData, 'id' | 'created_at' | 'remappingWorks' | 'totalPrice'>) => ({
  customer_id: record.customerId,
  equipment_id: record.equipmentId || null,
  work_date: record.workDate,
  work_type: record.workType,
  status: record.status,
  // ECU/ACU 정보 추가
  ecu_maker: record.ecuMaker || null,
  ecu_model: record.ecuModel || null,
  acu_manufacturer: record.acuManufacturer || null,
  acu_model: record.acuModel || null,
  acu_type: record.acuType || null,
  // 연결 방법 및 기타 정보
  connection_method: record.connectionMethod || null,
  tools_used: record.toolsUsed ? JSON.stringify(record.toolsUsed) : null,
  work_description: record.workDescription || null,
  price: record.price || null,
  user_id: record.userId || null,
});

const cacheManager = new CacheManager()

// 모든 작업 기록 조회 (파일 데이터 제외)
export const getAllWorkRecords = async (): Promise<WorkRecordData[]> => {
  const { data, error } = await supabase
    .from('work_records')
    .select('id, customer_id, equipment_id, work_date, work_type, total_price, status, created_at')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching work records:', error)
    throw error
  }
  
  return data.map((record: any) => ({
    id: record.id,
    customerId: record.customer_id,
    equipmentId: record.equipment_id ?? undefined,
    workDate: record.work_date,
    workType: record.work_type,
    totalPrice: record.total_price ?? undefined,
    status: record.status || '',
    remappingWorks: [], // 빈 배열로 초기화 (필요시 별도 로드)
    created_at: record.created_at,
  }))
}

// 파일 데이터를 포함한 상세 작업 기록 조회 (개별 상세보기용)
export const getWorkRecordWithFiles = async (id: number): Promise<WorkRecordData | null> => {
  const { data, error } = await supabase
    .from('work_records')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) {
    console.error('Error fetching work record with files:', error)
    throw error
  }
  
  return data ? transformWorkRecordFromDB(data) : null
}

// ✅ 안정적인 상태 관리를 위한 개선된 함수들
export const getWorkRecordsBasic = async (page: number = 1, pageSize: number = 20) => {
  try {
    const start = (page - 1) * pageSize
    const end = start + pageSize - 1
    
    const { data, count, error } = await supabase
      .from('work_records')
      .select('id, customer_name, work_date, vehicle_info, work_type, created_at, updated_at', { count: 'exact' })
      .range(start, end)
      .order('work_date', { ascending: false })
    
    if (error) throw error
    
    return {
      data: data || [],
      totalCount: count || 0,
      currentPage: page,
      pageSize
    }
  } catch (error) {
    console.error('기본 작업 기록 로딩 실패:', error)
    throw error
  }
}

export const enrichWorkRecordsData = async (basicData: any[], customers: CustomerData[], equipments: EquipmentData[]) => {
  try {
    // 기본 데이터에 고객 및 장비 정보 추가
    const enrichedData = basicData.map(record => {
      const customer = customers.find(c => c.id === record.customer_id)
      const equipment = equipments.find(e => e.id === record.equipment_id)
      
      return {
        ...record,
        customer: customer || null,
        equipment: equipment || null
      }
    })
    
    return enrichedData
  } catch (error) {
    console.error('작업 기록 데이터 보강 실패:', error)
    return basicData // 실패 시 기본 데이터라도 반환
  }
}

// ✅ 메모리 누수 방지를 위한 안정적인 상세 데이터 로딩
export const getWorkRecordDetailsStable = async (recordId: number) => {
  try {
    // 캐시 키 생성
    const cacheKey = `work_record_details:${recordId}`
    
    // 캐시 확인
    const cached = await cacheManager.get(cacheKey)
    if (cached) {
      console.log('캐시된 상세 데이터 사용:', recordId)
      return cached
    }
    
    console.log('새로운 상세 데이터 로드:', recordId)
    
    // 상세 데이터 로드
    const { data, error } = await supabase
      .from('work_records')
      .select(`
        *,
        ecu_maker, ecu_model, ecu_manufacturer_id,
        acu_manufacturer, acu_model, acu_type,
        customers:customer_id(id, name, phone, zip_code, road_address, jibun_address),
        equipment:equipment_id(id, equipment_type, manufacturer, model, year)
      `)
      .eq('id', recordId)
      .single()
    
    if (error) throw error
    
    // 파일 메타데이터 로드
    const fileMetadata = await getFileMetadataForRecord(recordId)
    
    const enrichedData = {
      ...data,
      files: fileMetadata
    }
    
    // 캐시에 저장 (30분 TTL)
    await cacheManager.set(cacheKey, enrichedData, 1800)
    
    return enrichedData
  } catch (error) {
    console.error('상세 데이터 로딩 실패:', error)
    throw error
  }
}

// ✅ 파일 메타데이터 조회 함수
export const getFileMetadataForRecord = async (recordId: number) => {
  try {
    const { data, error } = await supabase
      .from('file_metadata')
      .select('*')
      .eq('work_record_id', recordId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    return data || []
  } catch (error) {
    console.error('파일 메타데이터 로딩 실패:', error)
    return []
  }
}

// ✅ 안정적인 페이지네이션 데이터 로딩
export const getWorkRecordsPaginatedStable = async (page: number = 1, pageSize: number = 20): Promise<{
  data: any[]
  totalCount: number
  currentPage: number
  pageSize: number
  totalPages: number
}> => {
  try {
    const cacheKey = `work_records_page:${page}:${pageSize}`
    
    // 캐시 확인
    const cached = await cacheManager.get<{
      data: any[]
      totalCount: number
      currentPage: number
      pageSize: number
      totalPages: number
    }>(cacheKey)
    if (cached) {
      return cached
    }
    
    const start = (page - 1) * pageSize
    const end = start + pageSize - 1
    
    const { data, count, error } = await supabase
      .from('work_records')
      .select(`
        id, work_date, work_type, created_at, updated_at, customer_id, equipment_id,
        customers:customer_id(id, name, phone),
        equipment:equipment_id(id, equipment_type, manufacturer, model)
      `, { count: 'exact' })
      .range(start, end)
      .order('work_date', { ascending: false })
    
    if (error) throw error
    
    const result = {
      data: data || [],
      totalCount: count || 0,
      currentPage: page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    }
    
    // 캐시에 저장 (5분 TTL)
    await cacheManager.set(cacheKey, result, 300)
    
    return result
  } catch (error) {
    console.error('페이지네이션 데이터 로딩 실패:', error)
    throw error
  }
}

// 특정 고객의 작업 기록 조회
export const getWorkRecordsByCustomer = async (customerId: number): Promise<WorkRecordData[]> => {
  const { data, error } = await supabase
    .from('work_records')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching work records by customer:', error)
    throw error
  }
  
  return data.map(transformWorkRecordFromDB)
}

// 작업 기록 생성
export const createWorkRecord = async (recordData: Omit<WorkRecordData, 'id' | 'created_at'>): Promise<any> => {
  if (isPlaceholderEnvironment()) {
    console.log('더미 환경에서는 작업 기록을 생성할 수 없습니다.', recordData)
    return { ...recordData, id: Date.now(), created_at: new Date().toISOString() }
  }

  console.log('🔍 작업 기록 생성 시작:', recordData)
  console.log('🔍 입력 데이터 상세 분석:')
  console.log('  - customerId:', recordData.customerId)
  console.log('  - equipmentId:', recordData.equipmentId)
  console.log('  - workDate:', recordData.workDate)
  console.log('  - workType:', recordData.workType)
  console.log('  - totalPrice:', (recordData as any).totalPrice)
  console.log('  - status:', recordData.status)
  console.log('  - ecuModel:', (recordData as any).ecuModel)
  console.log('  - acuModel:', (recordData as any).acuModel)
  console.log('  - remappingWorks:', (recordData as any).remappingWorks)
  console.log('  - remappingWorks 개수:', (recordData as any).remappingWorks?.length || 0)

  const { remappingWorks, totalPrice, ...restOfRecordData } = recordData as any

  // ECU/ACU 정보: recordData에서 우선 사용, 없으면 firstWork에서 fallback
  const firstWork = remappingWorks && remappingWorks.length > 0 ? remappingWorks[0] : null
  
  // recordData에 이미 설정된 값들을 우선 사용 (work/page.tsx에서 설정한 값들)
  let ecuMaker = recordData.ecuMaker || (firstWork?.ecu?.maker) || null
  let ecuModel = recordData.ecuModel || (firstWork?.ecu?.type || firstWork?.ecu?.typeCustom) || null
  let acuManufacturer = recordData.acuManufacturer || (firstWork?.acu?.manufacturer) || null
  let acuModel = recordData.acuModel || (firstWork?.acu?.model || firstWork?.acu?.modelCustom) || null
  let acuType = recordData.acuType || (firstWork?.acu?.type) || null
  let connectionMethod = recordData.connectionMethod || (firstWork?.ecu?.connectionMethod || firstWork?.acu?.connectionMethod) || null
  let toolsUsed = recordData.toolsUsed || []
  let workDescription = recordData.workDescription || null
  let price = recordData.price || null

  console.log('🔄 ECU/ACU 정보 우선순위 적용 결과:')
  console.log('  - ecuMaker (우선: recordData, fallback: firstWork):', ecuMaker)
  console.log('  - ecuModel (우선: recordData, fallback: firstWork):', ecuModel)
  console.log('  - acuManufacturer (우선: recordData, fallback: firstWork):', acuManufacturer)
  console.log('  - acuModel (우선: recordData, fallback: firstWork):', acuModel)
  console.log('  - connectionMethod (우선: recordData, fallback: firstWork):', connectionMethod)

  // fallback: 아직 값이 없고 firstWork가 있는 경우에만 추가 처리
  if (!workDescription && firstWork) {
    const ecuInfo = ecuMaker && ecuModel ? `ECU(${ecuMaker}-${ecuModel})` : ''
    const acuInfo = acuManufacturer && acuModel ? `ACU(${acuManufacturer}-${acuModel})` : ''
    
    if (ecuInfo && acuInfo) {
      workDescription = `${ecuInfo} 및 ${acuInfo} 통합 튜닝`
    } else if (ecuInfo) {
      workDescription = `${ecuInfo} 엔진 튜닝`
    } else if (acuInfo) {
      workDescription = `${acuInfo} 변속기 튜닝`
    } else {
      workDescription = firstWork.workDetails || restOfRecordData.workType || '튜닝 작업'
    }
  }

  // fallback: toolsUsed가 비어있고 firstWork가 있는 경우
  if ((!toolsUsed || toolsUsed.length === 0) && firstWork) {
    toolsUsed = []
    if (firstWork.ecu?.toolCategory) {
      toolsUsed.push(firstWork.ecu.toolCategory)
    }
    if (firstWork.acu?.toolCategory) {
      toolsUsed.push(firstWork.acu.toolCategory)
    }
    if (connectionMethod) {
      toolsUsed.push(connectionMethod)
    }
  }

  // fallback: price가 없고 firstWork가 있는 경우
  if (!price && firstWork?.ecu?.price) {
    price = parseFloat(firstWork.ecu.price) || null
  }

  // 파일 데이터 추출 (첫 번째 remapping work에서)
  let filesData = null
  if (firstWork && firstWork.files) {
    filesData = firstWork.files
  }

  const recordToInsert = {
    ...transformWorkRecordToDB(restOfRecordData),
    remapping_works: remappingWorks ? JSON.stringify(remappingWorks) : null,
    files: filesData ? JSON.stringify(filesData) : null,
    total_price: totalPrice || null,
    ecu_maker: ecuMaker,
    ecu_model: ecuModel,
    acu_manufacturer: acuManufacturer,
    acu_model: acuModel,
    acu_type: acuType,
    connection_method: connectionMethod,
    tools_used: toolsUsed.length > 0 ? toolsUsed : null,
    work_description: workDescription,
    price: price,
  }

  console.log('📤 Supabase에 저장할 데이터:', recordToInsert)
  console.log('📤 Supabase 삽입 직전 payload 검증:')
  console.log('  - customer_id:', recordToInsert.customer_id)
  console.log('  - equipment_id:', recordToInsert.equipment_id)
  console.log('  - work_date:', recordToInsert.work_date)
  console.log('  - work_type:', recordToInsert.work_type)
  console.log('  - status:', recordToInsert.status)
  console.log('  - total_price:', recordToInsert.total_price)
  console.log('  - ecu_maker:', recordToInsert.ecu_maker)
  console.log('  - ecu_model:', recordToInsert.ecu_model)
  console.log('  - acu_manufacturer:', recordToInsert.acu_manufacturer)
  console.log('  - acu_model:', recordToInsert.acu_model)
  console.log('  - acu_type:', recordToInsert.acu_type)
  console.log('  - connection_method:', recordToInsert.connection_method)
  console.log('  - tools_used:', recordToInsert.tools_used)
  console.log('  - work_description:', recordToInsert.work_description)
  console.log('  - price:', recordToInsert.price)
  console.log('  - remapping_works (문자열 길이):', recordToInsert.remapping_works?.length || 0)
  console.log('  - files (문자열 길이):', recordToInsert.files?.length || 0)

  console.log('🚀 Supabase INSERT 실행 중...')
  const { data, error } = await supabase
    .from('work_records')
    .insert(recordToInsert)
    .select()
    .single()
  
  if (error) {
    console.error('❌ 작업 기록 저장 오류:', error)
    console.error('❌ 오류 메시지:', error.message)
    console.error('❌ 오류 코드:', error.code)
    console.error('❌ 오류 상세:', error.details)
    console.error('❌ 저장 시도한 데이터:', recordToInsert)
    throw error
  }

  console.log('✅ 작업 기록 저장 완료!')
  console.log('✅ 생성된 레코드 ID:', data?.id)
  console.log('✅ 생성된 레코드 created_at:', data?.created_at)
  console.log('✅ 반환된 전체 데이터:', data)
  return data
}

// 작업 기록 수정
export const updateWorkRecord = async (id: number, updates: Partial<WorkRecordData>): Promise<any> => {
  if (isPlaceholderEnvironment()) {
    console.log('더미 환경에서는 작업 기록을 수정할 수 없습니다.', id, updates)
    return { ...updates, id }
  }
  
  const { remappingWorks, totalPrice, ...restOfUpdates } = updates as any

  const dbUpdates: Partial<WorkRecordUpdate> = {}

  if (restOfUpdates.customerId) dbUpdates.customer_id = restOfUpdates.customerId
  if (restOfUpdates.equipmentId) dbUpdates.equipment_id = restOfUpdates.equipmentId
  if (restOfUpdates.workDate) dbUpdates.work_date = restOfUpdates.workDate
  if (restOfUpdates.workType) dbUpdates.work_type = restOfUpdates.workType
  if (restOfUpdates.status) dbUpdates.status = restOfUpdates.status
  
  if (remappingWorks) {
    dbUpdates.remapping_works = JSON.stringify(remappingWorks) as any
  }
  if (totalPrice !== undefined) {
    dbUpdates.total_price = totalPrice
  }
  
  const { data, error } = await supabase
    .from('work_records')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating work record:', error)
    throw error
  }

  return data
}

// 작업 기록 삭제
export const deleteWorkRecord = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('work_records')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting work record:', error)
    throw error
  }
} 