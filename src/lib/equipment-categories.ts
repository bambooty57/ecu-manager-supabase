import { supabase } from './supabase'

// 장비 카테고리 타입 정의
export interface EquipmentCategory {
  id: number
  name: string
  type: 'ECU' | 'ACU' | 'BOTH'
  is_default: boolean
  created_at: string
  updated_at: string
}

// 장비 카테고리 생성 데이터
export interface CreateEquipmentCategoryData {
  name: string
  type: 'ECU' | 'ACU' | 'BOTH'
  is_default?: boolean
}

/**
 * 모든 장비 카테고리 조회
 */
export const getAllEquipmentCategories = async (): Promise<EquipmentCategory[]> => {
  try {
    const { data, error } = await (supabase as any)
      .from('equipment_categories')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name', { ascending: true })

    if (error) {
      console.error('장비 카테고리 조회 오류:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('getAllEquipmentCategories 오류:', error)
    throw error
  }
}

/**
 * 특정 타입의 장비 카테고리 조회
 */
export const getEquipmentCategoriesByType = async (type: 'ECU' | 'ACU' | 'BOTH'): Promise<EquipmentCategory[]> => {
  try {
    const { data, error } = await (supabase as any)
      .from('equipment_categories')
      .select('*')
      .or(`type.eq.${type},type.eq.BOTH`)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true })

    if (error) {
      console.error('타입별 장비 카테고리 조회 오류:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('getEquipmentCategoriesByType 오류:', error)
    throw error
  }
}

/**
 * 새로운 장비 카테고리 생성
 */
export const createEquipmentCategory = async (categoryData: CreateEquipmentCategoryData): Promise<EquipmentCategory> => {
  try {
    // 중복 확인
    const { data: existing } = await (supabase as any)
      .from('equipment_categories')
      .select('id')
      .eq('name', categoryData.name.trim())
      .single()

    if (existing) {
      throw new Error('이미 존재하는 카테고리명입니다.')
    }

    const { data, error } = await (supabase as any)
      .from('equipment_categories')
      .insert([{
        name: categoryData.name.trim(),
        type: categoryData.type,
        is_default: categoryData.is_default || false
      }])
      .select()
      .single()

    if (error) {
      console.error('장비 카테고리 생성 오류:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('createEquipmentCategory 오류:', error)
    throw error
  }
}

/**
 * 장비 카테고리 수정
 */
export const updateEquipmentCategory = async (id: number, updates: Partial<CreateEquipmentCategoryData>): Promise<EquipmentCategory> => {
  try {
    const { data, error } = await (supabase as any)
      .from('equipment_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('장비 카테고리 수정 오류:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('updateEquipmentCategory 오류:', error)
    throw error
  }
}

/**
 * 장비 카테고리 삭제
 */
export const deleteEquipmentCategory = async (id: number): Promise<void> => {
  try {
    // 기본 카테고리는 삭제 불가
    const { data: category } = await (supabase as any)
      .from('equipment_categories')
      .select('is_default')
      .eq('id', id)
      .single()

    if (category?.is_default) {
      throw new Error('기본 카테고리는 삭제할 수 없습니다.')
    }

    const { error } = await (supabase as any)
      .from('equipment_categories')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('장비 카테고리 삭제 오류:', error)
      throw error
    }
  } catch (error) {
    console.error('deleteEquipmentCategory 오류:', error)
    throw error
  }
}

/**
 * 카테고리명으로 카테고리 정보 조회
 */
export const getEquipmentCategoryByName = async (name: string): Promise<EquipmentCategory | null> => {
  try {
    const { data, error } = await (supabase as any)
      .from('equipment_categories')
      .select('*')
      .eq('name', name)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // 데이터가 없는 경우
        return null
      }
      console.error('카테고리명으로 조회 오류:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('getEquipmentCategoryByName 오류:', error)
    return null
  }
}

/**
 * 카테고리명 배열을 반환 (드롭다운용)
 */
export const getEquipmentCategoryNames = async (type?: 'ECU' | 'ACU' | 'BOTH'): Promise<string[]> => {
  try {
    let categories: EquipmentCategory[]
    
    if (type) {
      categories = await getEquipmentCategoriesByType(type)
    } else {
      categories = await getAllEquipmentCategories()
    }

    return categories.map(category => category.name)
  } catch (error) {
    console.error('getEquipmentCategoryNames 오류:', error)
    return []
  }
} 