import { supabase } from './supabase'
import { Database } from './database.types'

type Equipment = Database['public']['Tables']['equipment']['Row']
type EquipmentInsert = Database['public']['Tables']['equipment']['Insert']
type EquipmentUpdate = Database['public']['Tables']['equipment']['Update']

export interface EquipmentData {
  id: number
  customerId: number
  equipmentType: string
  manufacturer: string
  model: string
  year?: number
  serialNumber?: string
  engineType?: string
  horsepower?: number
  notes?: string
  createdAt: string
  updatedAt: string
}

// 데이터베이스 형식을 프론트엔드 형식으로 변환
const transformEquipmentFromDB = (equipment: Equipment): EquipmentData => ({
  id: equipment.id,
  customerId: equipment.customer_id,
  equipmentType: equipment.equipment_type,
  manufacturer: equipment.manufacturer,
  model: equipment.model,
  year: equipment.year || undefined,
  serialNumber: equipment.serial_number || undefined,
  engineType: equipment.engine_type || undefined,
  horsepower: equipment.horsepower || undefined,
  notes: equipment.notes || undefined,
  createdAt: equipment.created_at,
  updatedAt: equipment.updated_at
})

// 프론트엔드 형식을 데이터베이스 형식으로 변환
const transformEquipmentToDB = (equipment: Omit<EquipmentData, 'id' | 'createdAt' | 'updatedAt'>): EquipmentInsert => ({
  customer_id: equipment.customerId,
  equipment_type: equipment.equipmentType,
  manufacturer: equipment.manufacturer,
  model: equipment.model,
  year: equipment.year || null,
  serial_number: equipment.serialNumber || null,
  engine_type: equipment.engineType || null,
  horsepower: equipment.horsepower || null,
  notes: equipment.notes || null
})

// 더미 장비 데이터 (환경변수가 placeholder일 때 사용)
const DUMMY_EQUIPMENT: EquipmentData[] = [
  {
    id: 1,
    customerId: 1,
    equipmentType: "트랙터",
    manufacturer: "John Deere",
    model: "8320R",
    year: 2020,
    serialNumber: "JD-8320R-001",
    engineType: "디젤",
    horsepower: 320,
    notes: "정기 점검 완료",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z"
  },
  {
    id: 2,
    customerId: 1,
    equipmentType: "콤바인",
    manufacturer: "New Holland",
    model: "CR9090",
    year: 2019,
    serialNumber: "NH-CR9090-002",
    engineType: "디젤",
    horsepower: 414,
    notes: "추수철 대비 정비 필요",
    createdAt: "2024-01-20T10:30:00Z",
    updatedAt: "2024-01-20T10:30:00Z"
  },
  {
    id: 3,
    customerId: 2,
    equipmentType: "트랙터",
    manufacturer: "Kubota",
    model: "M7171",
    year: 2021,
    serialNumber: "KB-M7171-003",
    engineType: "디젤",
    horsepower: 170,
    notes: "새로 구매한 장비",
    createdAt: "2024-02-20T14:15:00Z",
    updatedAt: "2024-02-20T14:15:00Z"
  },
  {
    id: 4,
    customerId: 3,
    equipmentType: "굴삭기",
    manufacturer: "Caterpillar",
    model: "320D",
    year: 2018,
    serialNumber: "CAT-320D-004",
    engineType: "디젤",
    horsepower: 153,
    notes: "토목 작업용",
    createdAt: "2024-03-10T16:45:00Z",
    updatedAt: "2024-03-10T16:45:00Z"
  }
]

// 환경변수가 placeholder인지 확인
const isPlaceholderEnvironment = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return url.includes('placeholder') || key.includes('placeholder')
}

// 모든 장비 조회
export const getAllEquipment = async (): Promise<EquipmentData[]> => {
  // 환경변수가 placeholder면 더미 데이터 반환
  if (isPlaceholderEnvironment()) {
    console.log('🔄 환경변수가 placeholder입니다. 더미 장비 데이터를 사용합니다.')
    return DUMMY_EQUIPMENT
  }

  try {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching equipment:', error)
      throw error
    }

    return data.map(transformEquipmentFromDB)
  } catch (error) {
    console.error('Failed to fetch equipment:', error)
    // 실패 시에도 더미 데이터 반환
    console.log('🔄 Supabase 연결 실패. 더미 장비 데이터를 사용합니다.')
    return DUMMY_EQUIPMENT
  }
}

// 특정 고객의 장비 조회
export const getEquipmentByCustomerId = async (customerId: number): Promise<EquipmentData[]> => {
  // 환경변수가 placeholder면 더미 데이터 반환
  if (isPlaceholderEnvironment()) {
    console.log(`🔄 고객 ID ${customerId}의 더미 장비 데이터를 사용합니다.`)
    return DUMMY_EQUIPMENT.filter(equipment => equipment.customerId === customerId)
  }

  try {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching equipment by customer:', error)
      throw error
    }

    return data.map(transformEquipmentFromDB)
  } catch (error) {
    console.error('Failed to fetch equipment by customer:', error)
    // 실패 시에도 더미 데이터 반환
    console.log(`🔄 Supabase 연결 실패. 고객 ID ${customerId}의 더미 장비 데이터를 사용합니다.`)
    return DUMMY_EQUIPMENT.filter(equipment => equipment.customerId === customerId)
  }
}

// 장비 생성
export const createEquipment = async (equipmentData: Omit<EquipmentData, 'id' | 'createdAt' | 'updatedAt'>): Promise<EquipmentData | null> => {
  try {
    const { data, error } = await supabase
      .from('equipment')
      .insert(transformEquipmentToDB(equipmentData))
      .select()
      .single()

    if (error) {
      console.error('Error creating equipment:', error)
      throw error
    }

    return transformEquipmentFromDB(data)
  } catch (error) {
    console.error('Failed to create equipment:', error)
    return null
  }
}

// 장비 수정
export const updateEquipment = async (id: number, equipmentData: Partial<Omit<EquipmentData, 'id' | 'createdAt' | 'updatedAt'>>): Promise<EquipmentData | null> => {
  try {
    const updateData: EquipmentUpdate = {}
    
    if (equipmentData.customerId !== undefined) updateData.customer_id = equipmentData.customerId
    if (equipmentData.equipmentType !== undefined) updateData.equipment_type = equipmentData.equipmentType
    if (equipmentData.manufacturer !== undefined) updateData.manufacturer = equipmentData.manufacturer
    if (equipmentData.model !== undefined) updateData.model = equipmentData.model
    if (equipmentData.year !== undefined) updateData.year = equipmentData.year || null
    if (equipmentData.serialNumber !== undefined) updateData.serial_number = equipmentData.serialNumber || null
    if (equipmentData.engineType !== undefined) updateData.engine_type = equipmentData.engineType || null
    if (equipmentData.horsepower !== undefined) updateData.horsepower = equipmentData.horsepower || null
    if (equipmentData.notes !== undefined) updateData.notes = equipmentData.notes || null
    
    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('equipment')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating equipment:', error)
      throw error
    }

    return transformEquipmentFromDB(data)
  } catch (error) {
    console.error('Failed to update equipment:', error)
    return null
  }
}

// 장비 삭제
export const deleteEquipment = async (id: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('equipment')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting equipment:', error)
      throw error
    }

    return true
  } catch (error) {
    console.error('Failed to delete equipment:', error)
    return false
  }
}

// ID로 장비 조회
export const getEquipmentById = async (id: number): Promise<EquipmentData | null> => {
  try {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching equipment:', error)
      throw error
    }

    return transformEquipmentFromDB(data)
  } catch (error) {
    console.error('Failed to fetch equipment:', error)
    return null
  }
} 