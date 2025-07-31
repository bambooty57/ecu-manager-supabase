import { supabase } from './supabase'

export interface EquipmentCategory {
  id: number
  name: string
  type: 'ECU' | 'ACU'
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface Manufacturer {
  id: number
  name: string
  type: 'ECU' | 'ACU'
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface EquipmentModel {
  id: number
  manufacturer_id: number
  name: string
  type: 'ECU' | 'ACU'
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface EquipmentData {
  category_name: string
  equipment_type: 'ECU' | 'ACU'
  manufacturer_name: string
  model_name: string
  category_id: number
  manufacturer_id: number
  model_id: number
}

export interface ConnectionMethod {
  id: number
  name: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface WorkStatus {
  id: number
  name: string
  is_default: boolean
  created_at: string
  updated_at: string
}

// 장비 카테고리 관련 함수들
export async function getEquipmentCategoriesByType(type: 'ECU' | 'ACU'): Promise<EquipmentCategory[]> {
  const { data, error } = await (supabase as any)
    .from('equipment_categories')
    .select('*')
    .eq('type', type)
    .order('name')

  if (error) {
    console.error('Error fetching equipment categories:', error)
    throw error
  }

  return data || []
}

export async function getEquipmentCategoryNames(type: 'ECU' | 'ACU'): Promise<string[]> {
  const categories = await getEquipmentCategoriesByType(type)
  return categories.map(cat => cat.name)
}

export async function createEquipmentCategory(category: {
  name: string
  type: 'ECU' | 'ACU'
}): Promise<EquipmentCategory> {
  // 중복 체크
  const { data: existing } = await (supabase as any)
    .from('equipment_categories')
    .select('id')
    .eq('name', category.name)
    .eq('type', category.type)
    .single()

  if (existing) {
    throw new Error(`${category.type} 카테고리 "${category.name}"가 이미 존재합니다.`)
  }

  const { data, error } = await (supabase as any)
    .from('equipment_categories')
    .insert([{
      name: category.name,
      type: category.type,
      is_default: false
    }])
    .select()
    .single()

  if (error) {
    console.error('Error creating equipment category:', error)
    throw error
  }

  return data
}

// 제조사 관련 함수들
export async function getManufacturersByType(type: 'ECU' | 'ACU'): Promise<Manufacturer[]> {
  const { data, error } = await (supabase as any)
    .from('manufacturers')
    .select('*')
    .eq('type', type)
    .order('name')

  if (error) {
    console.error('Error fetching manufacturers:', error)
    throw error
  }

  return data || []
}

export async function getManufacturerNames(type: 'ECU' | 'ACU'): Promise<string[]> {
  const manufacturers = await getManufacturersByType(type)
  return manufacturers.map(m => m.name)
}

export async function createManufacturer(manufacturer: {
  name: string
  type: 'ECU' | 'ACU'
}): Promise<Manufacturer> {
  // 중복 체크
  const { data: existing } = await (supabase as any)
    .from('manufacturers')
    .select('id')
    .eq('name', manufacturer.name)
    .eq('type', manufacturer.type)
    .single()

  if (existing) {
    throw new Error(`${manufacturer.type} 제조사 "${manufacturer.name}"가 이미 존재합니다.`)
  }

  const { data, error } = await (supabase as any)
    .from('manufacturers')
    .insert([{
      name: manufacturer.name,
      type: manufacturer.type,
      is_default: false
    }])
    .select()
    .single()

  if (error) {
    console.error('Error creating manufacturer:', error)
    throw error
  }

  return data
}

// 모델 관련 함수들
export async function getModelsByManufacturer(manufacturerId: number): Promise<EquipmentModel[]> {
  const { data, error } = await (supabase as any)
    .from('equipment_models')
    .select('*')
    .eq('manufacturer_id', manufacturerId)
    .order('name')

  if (error) {
    console.error('Error fetching models:', error)
    throw error
  }

  return data || []
}

export async function getModelsByType(type: 'ECU' | 'ACU'): Promise<EquipmentModel[]> {
  const { data, error } = await (supabase as any)
    .from('equipment_models')
    .select('*')
    .eq('type', type)
    .order('name')

  if (error) {
    console.error('Error fetching models by type:', error)
    throw error
  }

  return data || []
}

export async function getModelNamesByManufacturer(manufacturerName: string, type: 'ECU' | 'ACU'): Promise<string[]> {
  const { data, error } = await (supabase as any)
    .from('equipment_models')
    .select('name, manufacturers!inner(name)')
    .eq('type', type)
    .eq('manufacturers.name', manufacturerName)
    .order('name')

  if (error) {
    console.error('Error fetching model names by manufacturer:', error)
    return []
  }

  return data?.map((item: any) => item.name) || []
}

export async function createModel(model: {
  manufacturer_id: number
  name: string
  type: 'ECU' | 'ACU'
}): Promise<EquipmentModel> {
  // 중복 체크
  const { data: existing } = await (supabase as any)
    .from('equipment_models')
    .select('id')
    .eq('manufacturer_id', model.manufacturer_id)
    .eq('name', model.name)
    .single()

  if (existing) {
    throw new Error(`모델 "${model.name}"가 이미 존재합니다.`)
  }

  const { data, error } = await (supabase as any)
    .from('equipment_models')
    .insert([{
      manufacturer_id: model.manufacturer_id,
      name: model.name,
      type: model.type,
      is_default: false
    }])
    .select()
    .single()

  if (error) {
    console.error('Error creating model:', error)
    throw error
  }

  return data
}

// 통합 조회 함수들
export async function getAllEquipmentData(): Promise<EquipmentData[]> {
  const { data, error } = await (supabase as any)
    .from('v_equipment_data')
    .select('*')

  if (error) {
    console.error('Error fetching equipment data:', error)
    throw error
  }

  return data || []
}

export async function getEquipmentDataByType(type: 'ECU' | 'ACU'): Promise<EquipmentData[]> {
  const { data, error } = await (supabase as any)
    .from('v_equipment_data')
    .select('*')
    .eq('equipment_type', type)

  if (error) {
    console.error('Error fetching equipment data by type:', error)
    throw error
  }

  return data || []
}

// 삭제 함수들
export async function deleteEquipmentCategory(id: number): Promise<void> {
  const { error } = await (supabase as any)
    .from('equipment_categories')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting equipment category:', error)
    throw error
  }
}

export async function deleteManufacturer(id: number): Promise<void> {
  const { error } = await (supabase as any)
    .from('manufacturers')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting manufacturer:', error)
    throw error
  }
}

export async function deleteModel(id: number): Promise<void> {
  const { error } = await (supabase as any)
    .from('equipment_models')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting model:', error)
    throw error
  }
}

// 통계 및 유틸리티 함수들
export async function getEquipmentStats(): Promise<{
  ecuCategories: number
  acuCategories: number
  ecuManufacturers: number
  acuManufacturers: number
  ecuModels: number
  acuModels: number
}> {
  const [
    ecuCategories,
    acuCategories,
    ecuManufacturers,
    acuManufacturers,
    ecuModels,
    acuModels
  ] = await Promise.all([
    getEquipmentCategoriesByType('ECU'),
    getEquipmentCategoriesByType('ACU'),
    getManufacturersByType('ECU'),
    getManufacturersByType('ACU'),
    getModelsByType('ECU'),
    getModelsByType('ACU')
  ])

  return {
    ecuCategories: ecuCategories.length,
    acuCategories: acuCategories.length,
    ecuManufacturers: ecuManufacturers.length,
    acuManufacturers: acuManufacturers.length,
    ecuModels: ecuModels.length,
    acuModels: acuModels.length
  }
}

// 연결 방법 관련 함수들
export async function getConnectionMethods(): Promise<ConnectionMethod[]> {
  const { data, error } = await (supabase as any)
    .from('connection_methods')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching connection methods:', error)
    throw error
  }

  return data || []
}

export async function getConnectionMethodNames(): Promise<string[]> {
  const methods = await getConnectionMethods()
  return methods.map(method => method.name)
}

export async function createConnectionMethod(method: {
  name: string
}): Promise<ConnectionMethod> {
  // 중복 체크
  const { data: existing } = await (supabase as any)
    .from('connection_methods')
    .select('id')
    .eq('name', method.name)
    .single()

  if (existing) {
    throw new Error(`연결방법 "${method.name}"이 이미 존재합니다.`)
  }

  const { data, error } = await (supabase as any)
    .from('connection_methods')
    .insert([{
      name: method.name,
      is_default: false
    }])
    .select()
    .single()

  if (error) {
    console.error('Error creating connection method:', error)
    throw error
  }

  return data
}

export async function deleteConnectionMethod(id: number): Promise<void> {
  const { error } = await (supabase as any)
    .from('connection_methods')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting connection method:', error)
    throw error
  }
}

// 작업 상태 관련 함수들
export async function getWorkStatuses(): Promise<WorkStatus[]> {
  const { data, error } = await (supabase as any)
    .from('work_status')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching work statuses:', error)
    throw error
  }

  return data || []
}

export async function getWorkStatusNames(): Promise<string[]> {
  const statuses = await getWorkStatuses()
  return statuses.map(status => status.name)
}

export async function createWorkStatus(status: {
  name: string
}): Promise<WorkStatus> {
  // 중복 체크
  const { data: existing } = await (supabase as any)
    .from('work_status')
    .select('id')
    .eq('name', status.name)
    .single()

  if (existing) {
    throw new Error(`작업상태 "${status.name}"이 이미 존재합니다.`)
  }

  const { data, error } = await (supabase as any)
    .from('work_status')
    .insert([{
      name: status.name,
      is_default: false
    }])
    .select()
    .single()

  if (error) {
    console.error('Error creating work status:', error)
    throw error
  }

  return data
}

export async function deleteWorkStatus(id: number): Promise<void> {
  const { error } = await (supabase as any)
    .from('work_status')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting work status:', error)
    throw error
  }
}

// 이름으로 ID 찾기 헬퍼 함수들
export async function findConnectionMethodIdByName(name: string): Promise<number | null> {
  const { data, error } = await (supabase as any)
    .from('connection_methods')
    .select('id')
    .eq('name', name)
    .single()

  if (error || !data) {
    console.error('Connection method not found:', name)
    return null
  }

  return data.id
}

export async function findManufacturerIdByName(name: string, type: 'ECU' | 'ACU'): Promise<number | null> {
  const { data, error } = await (supabase as any)
    .from('manufacturers')
    .select('id')
    .eq('name', name)
    .eq('type', type)
    .single()

  if (error || !data) {
    console.error('Manufacturer not found:', name, type)
    return null
  }

  return data.id
}

export async function findModelIdByName(name: string, type: 'ECU' | 'ACU'): Promise<number | null> {
  const { data, error } = await (supabase as any)
    .from('equipment_models')
    .select('id')
    .eq('name', name)
    .eq('type', type)
    .single()

  if (error || !data) {
    console.error('Model not found:', name, type)
    return null
  }

  return data.id
}

export async function findWorkStatusIdByName(name: string): Promise<number | null> {
  const { data, error } = await (supabase as any)
    .from('work_status')
    .select('id')
    .eq('name', name)
    .single()

  if (error || !data) {
    console.error('Work status not found:', name)
    return null
  }

  return data.id
}

export async function findEquipmentCategoryIdByName(name: string, type: 'ECU' | 'ACU'): Promise<number | null> {
  const { data, error } = await (supabase as any)
    .from('equipment_categories')
    .select('id')
    .eq('name', name)
    .eq('type', type)
    .single()

  if (error || !data) {
    console.error('Equipment category not found:', name, type)
    return null
  }

  return data.id
} 