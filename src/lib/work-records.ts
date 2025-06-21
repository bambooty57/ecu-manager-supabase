import { supabase } from './supabase'
import { Database } from './database.types'

type WorkRecord = Database['public']['Tables']['work_records']['Row']
type WorkRecordInsert = Database['public']['Tables']['work_records']['Insert']
type WorkRecordUpdate = Database['public']['Tables']['work_records']['Update']

export interface WorkRecordData {
  id: number
  customerId: number
  equipmentId?: number
  workDate: string
  workType: string
  workDescription?: string
  ecuModel?: string
  ecuMaker?: string
  acuType?: string
  acuManufacturer?: string
  acuModel?: string
  connectionMethod?: string
  toolsUsed?: string[]
  price?: number
  status: string
  files?: any
  createdAt: string
  updatedAt: string
}

// 데이터베이스 형식을 프론트엔드 형식으로 변환
const transformWorkRecordFromDB = (record: WorkRecord): WorkRecordData => ({
  id: record.id,
  customerId: record.customer_id,
  equipmentId: record.equipment_id || undefined,
  workDate: record.work_date,
  workType: record.work_type,
  workDescription: record.work_description || undefined,
  ecuModel: record.ecu_model || undefined,
  ecuMaker: record.ecu_maker || undefined,
  acuType: record.acu_type || undefined,
  acuManufacturer: record.acu_manufacturer || undefined,
  acuModel: record.acu_model || undefined,
  connectionMethod: record.connection_method || undefined,
  toolsUsed: record.tools_used || undefined,
  price: record.price || undefined,
  status: record.status,
  files: record.files || undefined,
  createdAt: record.created_at,
  updatedAt: record.updated_at
})

// 프론트엔드 형식을 데이터베이스 형식으로 변환
const transformWorkRecordToDB = (record: Omit<WorkRecordData, 'id' | 'createdAt' | 'updatedAt'>): WorkRecordInsert => ({
  customer_id: record.customerId,
  equipment_id: record.equipmentId || null,
  work_date: record.workDate,
  work_type: record.workType,
  work_description: record.workDescription || null,
  ecu_model: record.ecuModel || null,
  ecu_maker: record.ecuMaker || null,
  acu_type: record.acuType || null,
  acu_manufacturer: record.acuManufacturer || null,
  acu_model: record.acuModel || null,
  connection_method: record.connectionMethod || null,
  tools_used: record.toolsUsed || null,
  price: record.price || null,
  status: record.status,
  files: record.files ? JSON.stringify(record.files) : null
})

// 더미 작업 기록 데이터 (환경변수가 placeholder일 때 사용)
const DUMMY_WORK_RECORDS: WorkRecordData[] = [
  {
    id: 1,
    customerId: 1,
    equipmentId: 1,
    workDate: "2024-01-15",
    workType: "ECU 튜닝",
    workDescription: "Stage 1 튜닝, DPF 삭제, EGR 삭제",
    ecuModel: "Bosch EDC17",
    connectionMethod: "OBD",
    toolsUsed: ["KESS V2", "WinOLS"],
    price: 500000,
    status: "완료",
    files: [],
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z"
  },
  {
    id: 2,
    customerId: 1,
    equipmentId: 2,
    workDate: "2024-01-20",
    workType: "ECU 튜닝",
    workDescription: "Stage 2 튜닝, AdBlue 삭제",
    ecuModel: "Delphi DCM",
    connectionMethod: "BDM",
    toolsUsed: ["KTAG", "WinOLS"],
    price: 700000,
    status: "진행중",
    files: [],
    createdAt: "2024-01-20T10:30:00Z",
    updatedAt: "2024-01-20T10:30:00Z"
  }
]

// 환경변수가 placeholder인지 확인
const isPlaceholderEnvironment = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return url.includes('placeholder') || key.includes('placeholder')
}

// 모든 작업 기록 조회 (고객 및 장비 정보 포함)
export const getAllWorkRecords = async (): Promise<any[]> => {
  // 환경변수가 placeholder면 더미 데이터 반환
  if (isPlaceholderEnvironment()) {
    console.log('🔄 환경변수가 placeholder입니다. 더미 작업 기록 데이터를 사용합니다.')
    return DUMMY_WORK_RECORDS.map(record => ({
      ...record,
      customerName: '최철섭',
      equipmentType: '승용차',
      manufacturer: '현대',
      model: '소나타',
      ecuType: record.ecuModel,
      tuningWork: record.workType,
      notes: record.workDescription
    }))
  }

  try {
    const { data, error } = await supabase
      .from('work_records')
      .select(`
        *,
        customers (
          id,
          name
        ),
        equipment (
          id,
          equipment_type,
          manufacturer,
          model
        )
      `)
      .order('work_date', { ascending: false })

    if (error) {
      console.error('Error fetching work records:', error)
      throw error
    }

    return data.map(record => ({
      id: record.id,
      customerId: record.customer_id,
      customerName: record.customers?.name || 'N/A',
      equipmentId: record.equipment_id,
      equipmentType: record.equipment?.equipment_type || 'N/A',
      manufacturer: record.equipment?.manufacturer || 'N/A',
      model: record.equipment?.model || 'N/A',
      workDate: record.work_date,
      workType: record.work_type,
      tuningWork: record.work_type, // 호환성을 위해 추가
      workDescription: record.work_description,
      notes: record.work_description, // 호환성을 위해 추가
      ecuModel: record.ecu_model,
      ecuMaker: record.ecu_maker,
      ecuType: record.ecu_model, // 호환성을 위해 추가
      acuType: record.acu_type,
      acuManufacturer: record.acu_manufacturer,
      acuModel: record.acu_model,
      connectionMethod: record.connection_method,
      toolsUsed: record.tools_used,
      ecuTool: Array.isArray(record.tools_used) ? record.tools_used.join(', ') : record.tools_used, // 호환성을 위해 추가
      price: record.price || 0,
      status: record.status,
      files: record.files ? (typeof record.files === 'string' ? JSON.parse(record.files) : record.files) : [],
      createdAt: record.created_at,
      updatedAt: record.updated_at
    }))
  } catch (error) {
    console.error('Failed to fetch work records:', error)
    // 실패 시에도 더미 데이터 반환
    console.log('🔄 Supabase 연결 실패. 더미 작업 기록 데이터를 사용합니다.')
    return DUMMY_WORK_RECORDS.map(record => ({
      ...record,
      customerName: '최철섭',
      equipmentType: '승용차',
      manufacturer: '현대',
      model: '소나타',
      ecuType: record.ecuModel,
      tuningWork: record.workType,
      notes: record.workDescription
    }))
  }
}

// 특정 고객의 작업 기록 조회
export const getWorkRecordsByCustomerId = async (customerId: number): Promise<WorkRecordData[]> => {
  // 환경변수가 placeholder면 더미 데이터 반환
  if (isPlaceholderEnvironment()) {
    console.log(`🔄 고객 ID ${customerId}의 더미 작업 기록 데이터를 사용합니다.`)
    return DUMMY_WORK_RECORDS.filter(record => record.customerId === customerId)
  }

  try {
    const { data, error } = await supabase
      .from('work_records')
      .select('*')
      .eq('customer_id', customerId)
      .order('work_date', { ascending: false })

    if (error) {
      console.error('Error fetching work records by customer:', error)
      throw error
    }

    return data.map(transformWorkRecordFromDB)
  } catch (error) {
    console.error('Failed to fetch work records by customer:', error)
    // 실패 시에도 더미 데이터 반환
    console.log(`🔄 Supabase 연결 실패. 고객 ID ${customerId}의 더미 작업 기록 데이터를 사용합니다.`)
    return DUMMY_WORK_RECORDS.filter(record => record.customerId === customerId)
  }
}

// 작업 기록 생성
export const createWorkRecord = async (recordData: Omit<WorkRecordData, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkRecordData | null> => {
  try {
    const { data, error } = await supabase
      .from('work_records')
      .insert(transformWorkRecordToDB(recordData))
      .select()
      .single()

    if (error) {
      console.error('Error creating work record:', error)
      throw error
    }

    return transformWorkRecordFromDB(data)
  } catch (error) {
    console.error('Failed to create work record:', error)
    return null
  }
}

// 작업 기록 수정
export const updateWorkRecord = async (id: number, recordData: any): Promise<any | null> => {
  try {
    const updateData: WorkRecordUpdate = {}
    
    // 프론트엔드 필드명을 데이터베이스 필드명으로 매핑
    if (recordData.customerId !== undefined) updateData.customer_id = recordData.customerId
    if (recordData.equipmentId !== undefined) updateData.equipment_id = recordData.equipmentId
    if (recordData.workDate !== undefined) updateData.work_date = recordData.workDate
    if (recordData.workType !== undefined) updateData.work_type = recordData.workType
    if (recordData.tuningWork !== undefined) updateData.work_type = recordData.tuningWork
    if (recordData.workDescription !== undefined) updateData.work_description = recordData.workDescription
    if (recordData.notes !== undefined) updateData.work_description = recordData.notes
    if (recordData.ecuModel !== undefined) updateData.ecu_model = recordData.ecuModel
    if (recordData.ecuType !== undefined) updateData.ecu_model = recordData.ecuType
    if (recordData.connectionMethod !== undefined) updateData.connection_method = recordData.connectionMethod
    if (recordData.toolsUsed !== undefined) updateData.tools_used = recordData.toolsUsed
    if (recordData.ecuTool !== undefined) {
      // ecuTool이 문자열이면 배열로 변환
      updateData.tools_used = typeof recordData.ecuTool === 'string' 
        ? recordData.ecuTool.split(',').map((tool: string) => tool.trim())
        : recordData.ecuTool
    }
    if (recordData.price !== undefined) updateData.price = recordData.price
    if (recordData.status !== undefined) updateData.status = recordData.status
    if (recordData.files !== undefined) updateData.files = JSON.stringify(recordData.files)

    const { data, error } = await supabase
      .from('work_records')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        customers (
          id,
          name
        ),
        equipment (
          id,
          equipment_type,
          manufacturer,
          model
        )
      `)
      .single()

    if (error) {
      console.error('Error updating work record:', error)
      throw error
    }

    // 업데이트된 데이터를 프론트엔드 형식으로 변환
    const record = data
    return {
      id: record.id,
      customerId: record.customer_id,
      customerName: record.customers?.name || 'N/A',
      equipmentId: record.equipment_id,
      equipmentType: record.equipment?.equipment_type || 'N/A',
      manufacturer: record.equipment?.manufacturer || 'N/A',
      model: record.equipment?.model || 'N/A',
      workDate: record.work_date,
      workType: record.work_type,
      tuningWork: record.work_type,
      workDescription: record.work_description,
      notes: record.work_description,
      ecuModel: record.ecu_model,
      ecuType: record.ecu_model,
      connectionMethod: record.connection_method,
      toolsUsed: record.tools_used,
      ecuTool: Array.isArray(record.tools_used) ? record.tools_used.join(', ') : record.tools_used,
      price: record.price || 0,
      status: record.status,
      files: record.files ? (typeof record.files === 'string' ? JSON.parse(record.files) : record.files) : [],
      createdAt: record.created_at,
      updatedAt: record.updated_at
    }
  } catch (error) {
    console.error('Failed to update work record:', error)
    return null
  }
}

// 작업 기록 삭제
export const deleteWorkRecord = async (id: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('work_records')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting work record:', error)
      throw error
    }

    return true
  } catch (error) {
    console.error('Failed to delete work record:', error)
    return false
  }
}

// 특정 작업 기록 조회
export const getWorkRecordById = async (id: number): Promise<WorkRecordData | null> => {
  try {
    const { data, error } = await supabase
      .from('work_records')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching work record:', error)
      throw error
    }

    return transformWorkRecordFromDB(data)
  } catch (error) {
    console.error('Failed to fetch work record:', error)
    return null
  }
} 