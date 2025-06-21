'use client'

import { supabase } from './supabase'
// import { isPlaceholderEnvironment } from '../utils/helpers' // 더 이상 사용하지 않음
import type { Database } from './database.types'

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
});

// 모든 작업 기록 조회
export const getAllWorkRecords = async (): Promise<WorkRecordData[]> => {
  const { data, error } = await supabase
    .from('work_records')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching work records:', error)
    throw error
  }
  
  return data.map(transformWorkRecordFromDB)
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

  const { remappingWorks, totalPrice, ...restOfRecordData } = recordData as any

  const recordToInsert = {
    ...transformWorkRecordToDB(restOfRecordData),
    remapping_works: JSON.stringify(remappingWorks) as any,
    total_price: totalPrice,
  }

  const { data, error } = await supabase
    .from('work_records')
    .insert(recordToInsert)
    .select()
    .single()
  
  if (error) {
    console.error('Error creating work record:', error)
    throw error
  }

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