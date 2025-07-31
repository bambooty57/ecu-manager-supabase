import { supabase } from './supabase'

export interface EcuModel {
  id: number
  name: string
  category: string
  series: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface AcuModel {
  id: number
  name: string
  manufacturer: string
  series: string
  is_default: boolean
  created_at: string
  updated_at: string
}

// ECU 모델 관련 함수들
export async function getEcuModels(): Promise<EcuModel[]> {
  const { data, error } = await supabase
    .from('ecu_models')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching ECU models:', error)
    throw error
  }

  return data || []
}

export async function getEcuModelNames(): Promise<string[]> {
  const models = await getEcuModels()
  return models.map(model => model.name)
}

export async function getEcuModelsByCategory(category: string): Promise<EcuModel[]> {
  const { data, error } = await supabase
    .from('ecu_models')
    .select('*')
    .eq('category', category)
    .order('name')

  if (error) {
    console.error('Error fetching ECU models by category:', error)
    throw error
  }

  return data || []
}

export async function getEcuModelsBySeries(series: string): Promise<EcuModel[]> {
  const { data, error } = await supabase
    .from('ecu_models')
    .select('*')
    .eq('series', series)
    .order('name')

  if (error) {
    console.error('Error fetching ECU models by series:', error)
    throw error
  }

  return data || []
}

export async function createEcuModel(model: {
  name: string
  category: string
  series: string
}): Promise<EcuModel> {
  // 중복 체크
  const { data: existing } = await supabase
    .from('ecu_models')
    .select('id')
    .eq('name', model.name)
    .single()

  if (existing) {
    throw new Error(`ECU 모델 "${model.name}"이 이미 존재합니다.`)
  }

  const { data, error } = await supabase
    .from('ecu_models')
    .insert([{
      name: model.name,
      category: model.category,
      series: model.series,
      is_default: false
    }])
    .select()
    .single()

  if (error) {
    console.error('Error creating ECU model:', error)
    throw error
  }

  return data
}

export async function deleteEcuModel(id: number): Promise<void> {
  const { error } = await supabase
    .from('ecu_models')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting ECU model:', error)
    throw error
  }
}

export async function updateEcuModel(id: number, updates: {
  name?: string
  category?: string
  series?: string
}): Promise<EcuModel> {
  const { data, error } = await supabase
    .from('ecu_models')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating ECU model:', error)
    throw error
  }

  return data
}

// ACU 모델 관련 함수들
export async function getAcuModels(): Promise<AcuModel[]> {
  const { data, error } = await supabase
    .from('acu_models')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching ACU models:', error)
    throw error
  }

  return data || []
}

export async function getAcuModelNames(): Promise<string[]> {
  const models = await getAcuModels()
  return models.map(model => model.name)
}

export async function getAcuModelsByManufacturer(manufacturer: string): Promise<AcuModel[]> {
  const { data, error } = await supabase
    .from('acu_models')
    .select('*')
    .eq('manufacturer', manufacturer)
    .order('name')

  if (error) {
    console.error('Error fetching ACU models by manufacturer:', error)
    throw error
  }

  return data || []
}

export async function getAcuModelsBySeries(series: string): Promise<AcuModel[]> {
  const { data, error } = await supabase
    .from('acu_models')
    .select('*')
    .eq('series', series)
    .order('name')

  if (error) {
    console.error('Error fetching ACU models by series:', error)
    throw error
  }

  return data || []
}

export async function createAcuModel(model: {
  name: string
  manufacturer: string
  series: string
}): Promise<AcuModel> {
  // 중복 체크
  const { data: existing } = await supabase
    .from('acu_models')
    .select('id')
    .eq('name', model.name)
    .single()

  if (existing) {
    throw new Error(`ACU 모델 "${model.name}"이 이미 존재합니다.`)
  }

  const { data, error } = await supabase
    .from('acu_models')
    .insert([{
      name: model.name,
      manufacturer: model.manufacturer,
      series: model.series,
      is_default: false
    }])
    .select()
    .single()

  if (error) {
    console.error('Error creating ACU model:', error)
    throw error
  }

  return data
}

export async function deleteAcuModel(id: number): Promise<void> {
  const { error } = await supabase
    .from('acu_models')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting ACU model:', error)
    throw error
  }
}

export async function updateAcuModel(id: number, updates: {
  name?: string
  manufacturer?: string
  series?: string
}): Promise<AcuModel> {
  const { data, error } = await supabase
    .from('acu_models')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating ACU model:', error)
    throw error
  }

  return data
}

// 통계 및 유틸리티 함수들
export async function getEcuAcuStats(): Promise<{
  ecuModels: number
  acuModels: number
  ecuCategories: string[]
  acuManufacturers: string[]
}> {
  const [ecuModels, acuModels] = await Promise.all([
    getEcuModels(),
    getAcuModels()
  ])

  const ecuCategories = [...new Set(ecuModels.map(model => model.category))]
  const acuManufacturers = [...new Set(acuModels.map(model => model.manufacturer))]

  return {
    ecuModels: ecuModels.length,
    acuModels: acuModels.length,
    ecuCategories,
    acuManufacturers
  }
}

// 이름으로 ID 찾기 헬퍼 함수들
export async function findEcuModelIdByName(name: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('ecu_models')
    .select('id')
    .eq('name', name)
    .single()

  if (error || !data) {
    console.error('ECU model not found:', name)
    return null
  }

  return data.id
}

export async function findAcuModelIdByName(name: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('acu_models')
    .select('id')
    .eq('name', name)
    .single()

  if (error || !data) {
    console.error('ACU model not found:', name)
    return null
  }

  return data.id
}

// 검색 함수들
export async function searchEcuModels(query: string): Promise<EcuModel[]> {
  const { data, error } = await supabase
    .from('ecu_models')
    .select('*')
    .or(`name.ilike.%${query}%,category.ilike.%${query}%,series.ilike.%${query}%`)
    .order('name')

  if (error) {
    console.error('Error searching ECU models:', error)
    throw error
  }

  return data || []
}

export async function searchAcuModels(query: string): Promise<AcuModel[]> {
  const { data, error } = await supabase
    .from('acu_models')
    .select('*')
    .or(`name.ilike.%${query}%,manufacturer.ilike.%${query}%,series.ilike.%${query}%`)
    .order('name')

  if (error) {
    console.error('Error searching ACU models:', error)
    throw error
  }

  return data || []
} 