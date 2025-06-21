import { supabase } from './supabase'

export interface EquipmentModel {
  id: number
  manufacturer: string
  model: string
  type: string
  created_at: string | null
  updated_at: string | null
}

// 모든 장비 모델 조회
export const getAllEquipmentModels = async (): Promise<EquipmentModel[]> => {
  try {
    const { data, error } = await supabase
      .from('equipment_models')
      .select('*')
      .order('manufacturer', { ascending: true })
      .order('model', { ascending: true })

    if (error) {
      console.error('Error fetching equipment models:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Failed to fetch equipment models:', error)
    return []
  }
}

// 특정 제조사의 모델 목록 조회
export const getModelsByManufacturer = async (manufacturer: string, type: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('equipment_models')
      .select('model')
      .eq('manufacturer', manufacturer)
      .eq('type', type)
      .order('model', { ascending: true })

    if (error) {
      console.error('Error fetching models by manufacturer:', error)
      throw error
    }

    return data?.map(item => item.model) || []
  } catch (error) {
    console.error('Failed to fetch models by manufacturer:', error)
    return []
  }
}

// 제조사별 모델 목록을 객체 형태로 조회
export const getModelsByManufacturerObject = async (type: string): Promise<Record<string, string[]>> => {
  try {
    const { data, error } = await supabase
      .from('equipment_models')
      .select('manufacturer, model')
      .eq('type', type)
      .order('manufacturer', { ascending: true })
      .order('model', { ascending: true })

    if (error) {
      console.error('Error fetching models:', error)
      throw error
    }

    // 제조사별로 모델 목록을 그룹화
    const modelsByManufacturer: Record<string, string[]> = {}
    data?.forEach(item => {
      if (!modelsByManufacturer[item.manufacturer]) {
        modelsByManufacturer[item.manufacturer] = []
      }
      modelsByManufacturer[item.manufacturer].push(item.model)
    })

    return modelsByManufacturer
  } catch (error) {
    console.error('Failed to fetch models by manufacturer object:', error)
    return {}
  }
}

// 새로운 모델 추가
export const addEquipmentModel = async (manufacturer: string, model: string, type: string): Promise<EquipmentModel | null> => {
  try {
    const { data, error } = await supabase
      .from('equipment_models')
      .insert({
        manufacturer: manufacturer.trim(),
        model: model.trim(),
        type: type
      })
      .select()
      .single()

    if (error) {
      // 중복 오류 처리
      if (error.code === '23505') {
        console.log('Model already exists:', manufacturer, model)
        return null
      }
      console.error('Error adding equipment model:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Failed to add equipment model:', error)
    return null
  }
}

// 모델 삭제
export const deleteEquipmentModel = async (id: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('equipment_models')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting equipment model:', error)
      throw error
    }

    return true
  } catch (error) {
    console.error('Failed to delete equipment model:', error)
    return false
  }
}

// 모델 수정
export const updateEquipmentModel = async (id: number, manufacturer: string, model: string, type: string): Promise<EquipmentModel | null> => {
  try {
    const { data, error } = await supabase
      .from('equipment_models')
      .update({
        manufacturer: manufacturer.trim(),
        model: model.trim(),
        type: type
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating equipment model:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Failed to update equipment model:', error)
    return null
  }
}

// 모델 존재 여부 확인
export const checkModelExists = async (manufacturer: string, model: string, type: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('equipment_models')
      .select('id')
      .eq('manufacturer', manufacturer.trim())
      .eq('model', model.trim())
      .eq('type', type.trim())
      .maybeSingle()

    if (error) {
      console.error('Error checking model existence:', error)
      throw error
    }

    return data !== null
  } catch (error) {
    console.error('Failed to check model existence:', error)
    return false
  }
} 