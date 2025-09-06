'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ECU_TOOL_CATEGORIES, ECU_TOOLS, ECU_TOOLS_FLAT, TUNING_WORKS, TUNING_CATEGORIES, TUNING_WORKS_BY_CATEGORY } from '@/constants'
import { getAllCustomers, CustomerData } from '@/lib/customers'
import { getEquipmentByCustomerId, EquipmentData } from '@/lib/equipment'
import { createWorkRecord, WorkRecordData } from '@/lib/work-records'
import { uploadFileToStorage } from '@/lib/file-upload'
import { 
  getEquipmentCategoryNames, 
  createEquipmentCategory,
  deleteEquipmentCategory,
  getManufacturerNames,
  createManufacturer,
  deleteManufacturer,
  getConnectionMethodNames,
  createConnectionMethod,
  deleteConnectionMethod,
  getWorkStatusNames,
  createWorkStatus,
  deleteWorkStatus,
  findConnectionMethodIdByName,
  findManufacturerIdByName,
  findWorkStatusIdByName,
  findEquipmentCategoryIdByName
} from '@/lib/equipment-categories'
import { cacheManager, CacheKeys, CacheTTL } from '@/lib/cache-manager'
import { generateOptimizedImageUrl, generateCacheHeaders } from '@/lib/cdn-utils'
import { supabase } from '@/lib/supabase'
import Navigation from '@/components/Navigation'
import AuthGuard from '@/components/AuthGuard'
import CustomDropdown from '@/components/CustomDropdown'
import WorkDetailModal from '@/components/WorkDetailModal'
import { findEcuModelIdByName, findAcuModelIdByName, getEcuModelNames, createEcuModel, deleteEcuModel, getAcuModelNames, createAcuModel, deleteAcuModel } from '@/lib/ecu-acu-models'

export default function WorkPage() {
  const router = useRouter()
  
  // 다크모드 상태
  const [isDarkMode, setIsDarkMode] = useState(true)
  
  // 실제 고객 데이터 state
  const [customers, setCustomers] = useState<CustomerData[]>([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true)
  
  // 오늘 날짜를 YYYY-MM-DD 형식으로 가져오기
  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  // Remapping 작업 정보 인터페이스
  interface RemappingWork {
    id: number
    // ECU 정보
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
    // ACU 정보
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
      originalFile?: File | File[]
      originalFileDescription?: string
      stage1File?: File
      stage1FileDescription?: string
      stage2File?: File
      stage2FileDescription?: string
      stage3File?: File
      stage3FileDescription?: string
      acuOriginalFile?: File | File[]
      acuOriginalFileDescription?: string
      acuStage1File?: File
      acuStage1FileDescription?: string
      acuStage2File?: File
      acuStage2FileDescription?: string
      acuStage3File?: File
      acuStage3FileDescription?: string
      mediaFile1?: File
      mediaFile1Description?: string
      mediaFile2?: File
      mediaFile2Description?: string
      mediaFile3?: File
      mediaFile3Description?: string
      mediaFile4?: File
      mediaFile4Description?: string
      mediaFile5?: File
      mediaFile5Description?: string
    }
    media?: {
      before?: File | null
      after?: File | null
    }
  }

  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    equipmentId: '',
    workDate: getTodayDate(),
    status: '예약' // 기본값을 예약으로 설정
  })

  // 다중 Remapping 작업 목록
  const [remappingWorks, setRemappingWorks] = useState<RemappingWork[]>([])
  
  // 현재 편집 중인 Remapping 작업
  const [currentRemappingWork, setCurrentRemappingWork] = useState({
    ecu: {
      toolCategory: '',
      toolCategoryCustom: '',
      connectionMethod: '',
      connectionMethodCustom: '',
      maker: '',
      makerCustom: '',
      type: '',
      typeCustom: '',
      selectedWorks: [] as string[],
      workDetails: '',
      price: '',
      status: '',
      statusCustom: ''
    },
    acu: {
      toolCategory: '',
      toolCategoryCustom: '',
      connectionMethod: '',
      connectionMethodCustom: '',
      manufacturer: '',
      manufacturerCustom: '',
      model: '',
      modelCustom: '',
      selectedWorks: [] as string[],
      workDetails: '',
      price: '',
      status: '',
      statusCustom: ''
    },
    notes: '',
    files: {
      originalFile: undefined,
      originalFileDescription: '',
      stage1File: undefined,
      stage1FileDescription: '',
      stage2File: undefined,
      stage2FileDescription: '',
      stage3File: undefined,
      stage3FileDescription: '',
      acuOriginalFile: undefined,
      acuOriginalFileDescription: '',
      acuStage1File: undefined,
      acuStage1FileDescription: '',
      acuStage2File: undefined,
      acuStage2FileDescription: '',
      acuStage3File: undefined,
      acuStage3FileDescription: '',
      mediaFile1: undefined,
      mediaFile1Description: '',
      mediaFile2: undefined,
      mediaFile2Description: '',
      mediaFile3: undefined,
      mediaFile3Description: '',
      mediaFile4: undefined,
      mediaFile4Description: '',
      mediaFile5: undefined,
      mediaFile5Description: ''
    }
  })

  // 작업 카테고리별 선택 상태 (현재 편집 중인 작업용)
  const [workSelections, setWorkSelections] = useState<{[category: string]: string[]}>({
    'ECU/튜닝': [],
    'ACU/튜닝': []
  })

  // Remapping 작업 편집 모드
  const [isEditingRemapping, setIsEditingRemapping] = useState(false)
  const [editingRemappingId, setEditingRemappingId] = useState<number | null>(null)
  
  // 작업 기록 편집 모달 상태
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedWorkRecord, setSelectedWorkRecord] = useState<any>(null)

  // 선택된 고객의 장비 목록
  const [availableEquipment, setAvailableEquipment] = useState<EquipmentData[]>([])
  
  // 고객 자동완성 관련 state
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerData[]>([])

  // 동적 ECU 모델 목록 (Supabase에서 가져오기)
  const [ecuModels, setEcuModels] = useState<string[]>(['직접입력'])

  // 동적 ACU 모델 목록 (Supabase에서 가져오기)
  const [acuModels, setAcuModels] = useState<string[]>(['직접입력'])



  // 동적 ECU 장비 카테고리 목록 (데이터베이스에서 가져오기)
  const [ecuCategories, setEcuCategories] = useState<string[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)

  // 동적 드롭다운 목록들 (Supabase에서 가져오기)
  const [connectionMethods, setConnectionMethods] = useState<string[]>([])
  const [ecuMakers, setEcuMakers] = useState<string[]>([])
  const [acuManufacturers, setAcuManufacturers] = useState<string[]>([])
  const [workStatus, setWorkStatus] = useState<string[]>([])
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true)

  // 연결방법 데이터만 로드하는 전용 함수 (ECU 장비 카테고리와 동일한 패턴)
  const loadConnectionMethods = async () => {
    try {
      const connectionMethodsData = await getConnectionMethodNames()
      
      console.log('🔍 Supabase 연결방법 데이터:', connectionMethodsData)
      
      // "직접입력"을 제일 하단으로 배치 (항상 추가)
      const sortedMethods = connectionMethodsData.filter(method => method !== '직접입력')
      sortedMethods.push('직접입력')
      
      console.log('✅ 최종 연결방법:', sortedMethods)
      setConnectionMethods(sortedMethods)
    } catch (error) {
      console.error('❌ 연결방법 로드 오류:', error)
      console.error('❌ 오류 상세:', (error as any).message)
      
      // 오류 시에도 최소한 "직접입력"만 유지
      console.log('⚠️ 오류 발생으로 직접입력만 유지')
      setConnectionMethods(['직접입력'])
    }
  }

  // ECU 제조사 데이터만 로드하는 전용 함수
  const loadEcuMakers = async () => {
    try {
      const ecuMakersData = await getManufacturerNames('ECU')
      
      console.log('🔍 Supabase ECU 제조사 데이터:', ecuMakersData)
      
      // "직접입력"을 제일 하단으로 배치 (항상 추가)
      const sortedMakers = ecuMakersData.filter(maker => maker !== '직접입력')
      sortedMakers.push('직접입력')
      
      console.log('✅ 최종 ECU 제조사:', sortedMakers)
      setEcuMakers(sortedMakers)
    } catch (error) {
      console.error('❌ ECU 제조사 로드 오류:', error)
      console.error('❌ 오류 상세:', (error as any).message)
      
      // 오류 시에도 최소한 "직접입력"만 유지
      console.log('⚠️ 오류 발생으로 직접입력만 유지')
      setEcuMakers(['직접입력'])
    }
  }

  // ECU 모델 데이터만 로드하는 전용 함수
  const loadEcuModels = async () => {
    try {
      console.log('🔄 ECU 모델 로드 시작 - Supabase에서 데이터 가져오는 중...')
      const ecuModelNames = await getEcuModelNames()
      
      console.log('🔍 Supabase ECU 모델 원본 데이터:', ecuModelNames)
      console.log('🔍 ECU 모델 개수:', ecuModelNames.length)
      
      // "직접입력"을 제일 하단으로 배치 (항상 추가)
      const sortedModels = ecuModelNames.filter(model => model !== '직접입력')
      sortedModels.push('직접입력')
      
      console.log('✅ 최종 ECU 모델 목록:', sortedModels)
      console.log('✅ 최종 ECU 모델 개수:', sortedModels.length)
      
      setEcuModels(sortedModels)
      console.log('🎉 ECU 모델 상태 업데이트 완료!')
    } catch (error) {
      console.error('❌ ECU 모델 로드 오류:', error)
      console.error('❌ 오류 상세:', (error as any).message)
      console.error('❌ 오류 스택:', (error as any).stack)
      
      // 오류 시에도 최소한 "직접입력"만 유지
      console.log('⚠️ 오류 발생으로 직접입력만 유지')
      setEcuModels(['직접입력'])
    }
  }

  // ACU 모델 데이터만 로드하는 전용 함수
  const loadAcuModels = async () => {
    try {
      const acuModelNames = await getAcuModelNames()
      
      console.log('🔍 Supabase ACU 모델 데이터:', acuModelNames)
      
      // "직접입력"을 제일 하단으로 배치 (항상 추가)
      const sortedModels = acuModelNames.filter(model => model !== '직접입력')
      sortedModels.push('직접입력')
      
      console.log('✅ 최종 ACU 모델:', sortedModels)
      setAcuModels(sortedModels)
    } catch (error) {
      console.error('❌ ACU 모델 로드 오류:', error)
      console.error('❌ 오류 상세:', (error as any).message)
      
      // 오류 시에도 최소한 "직접입력"만 유지
      console.log('⚠️ 오류 발생으로 직접입력만 유지')
      setAcuModels(['직접입력'])
    }
  }

  // ACU 제조사 데이터만 로드하는 전용 함수
  const loadAcuManufacturers = async () => {
    try {
      const acuManufacturersData = await getManufacturerNames('ACU')
      
      console.log('🔍 Supabase ACU 제조사 데이터:', acuManufacturersData)
      
      // "직접입력"을 제일 하단으로 배치 (항상 추가)
      const sortedManufacturers = acuManufacturersData.filter(manufacturer => manufacturer !== '직접입력')
      sortedManufacturers.push('직접입력')
      
      console.log('✅ 최종 ACU 제조사:', sortedManufacturers)
      setAcuManufacturers(sortedManufacturers)
    } catch (error) {
      console.error('❌ ACU 제조사 로드 오류:', error)
      console.error('❌ 오류 상세:', (error as any).message)
      
      // 오류 시에도 최소한 "직접입력"만 유지
      console.log('⚠️ 오류 발생으로 직접입력만 유지')
      setAcuManufacturers(['직접입력'])
    }
  }

  // 작업상태 데이터만 로드하는 전용 함수
  const loadWorkStatus = async () => {
    try {
      const workStatusData = await getWorkStatusNames()
      
      console.log('🔍 Supabase 작업상태 데이터:', workStatusData)
      
      // "직접입력"을 제일 하단으로 배치 (항상 추가)
      const sortedStatus = workStatusData.filter(status => status !== '직접입력')
      sortedStatus.push('직접입력')
      
      console.log('✅ 최종 작업상태:', sortedStatus)
      setWorkStatus(sortedStatus)
    } catch (error) {
      console.error('❌ 작업상태 로드 오류:', error)
      console.error('❌ 오류 상세:', (error as any).message)
      
      // 오류 시에도 최소한 "직접입력"만 유지
      console.log('⚠️ 오류 발생으로 직접입력만 유지')
      setWorkStatus(['직접입력'])
    }
  }

  // 장비 카테고리 로드
  const loadEquipmentCategories = async () => {
    try {
      setIsLoadingCategories(true)
      const [ecuCategories, acuCategories] = await Promise.all([
        getEquipmentCategoryNames('ECU'),
        getEquipmentCategoryNames('ACU')
      ])
      
      console.log('🔍 Supabase ECU 카테고리 데이터:', ecuCategories)
      console.log('🔍 Supabase ACU 카테고리 데이터:', acuCategories)
      
      // Supabase 데이터를 그대로 사용 (빈 배열이어도 폴백하지 않음)
      const allCategories = [...ecuCategories, ...acuCategories]
      
      // "직접입력"을 제일 하단으로 배치 (항상 추가)
      const sortedCategories = allCategories.filter(cat => cat !== '직접입력')
      sortedCategories.push('직접입력')
      
      console.log('✅ 최종 장비 카테고리:', sortedCategories)
      setEcuCategories(sortedCategories)
    } catch (error) {
      console.error('❌ 장비 카테고리 로드 오류:', error)
      console.error('❌ 오류 상세:', (error as any).message)
      
      // 오류 시에도 최소한 "직접입력"만 유지
      console.log('⚠️ 오류 발생으로 직접입력만 유지')
      setEcuCategories(['직접입력'])
    } finally {
      setIsLoadingCategories(false)
    }
  }

  // 모든 드롭다운 데이터 로드 (캐시 무효화 포함)
  const loadAllDropdownData = async (forceRefresh: boolean = false) => {
    try {
      setIsLoadingDropdowns(true)
      
      // 캐시 무효화 (실시간 동기화 시 강제 새로고침)
      if (forceRefresh) {
        console.log('🗑️ 드롭다운 데이터 캐시 무효화 중...')
        await cacheManager.deleteByPattern('dropdown_*')
        await cacheManager.deleteByPattern('equipment_*')
        console.log('✅ 드롭다운 데이터 캐시 무효화 완료')
      }
      
      // 각 항목을 전용 함수로 처리 (작업금액 제외)
      await Promise.all([
        loadConnectionMethods(),
        loadEcuMakers(),
        loadEcuModels(),
        loadAcuManufacturers(),
        loadAcuModels(),
        loadWorkStatus()
      ])
      
      console.log('✅ 모든 드롭다운 데이터 로드 완료')
      
    } catch (error) {
      console.error('❌ 드롭다운 데이터 로드 오류:', error)
      console.error('❌ 오류 상세:', (error as any).message)
      console.error('❌ 오류 스택:', (error as any).stack)
      
      // 오류 시에도 기존 데이터 유지 (기본값으로 덮어쓰지 않음)
      console.log('⚠️ 오류 발생으로 기존 데이터 유지')
      console.log('📊 현재 상태 - 연결방법:', connectionMethods.length)
      console.log('📊 현재 상태 - ECU제조사:', ecuMakers.length)
      console.log('📊 현재 상태 - ACU제조사:', acuManufacturers.length)
      console.log('📊 현재 상태 - 작업상태:', workStatus.length)
      console.log('📊 현재 상태 - ECU모델:', ecuModels.length)
      console.log('📊 현재 상태 - ACU모델:', acuModels.length)
      
      // 오류 시에도 최소한 "직접입력"만 유지
      if (connectionMethods.length === 0) {
        console.log('⚠️ 오류 발생으로 직접입력만 유지')
        setConnectionMethods(['직접입력'])
      }
      if (ecuMakers.length === 0) {
        console.log('⚠️ 오류 발생으로 직접입력만 유지')
        setEcuMakers(['직접입력'])
      }
      if (acuManufacturers.length === 0) {
        console.log('⚠️ 오류 발생으로 직접입력만 유지')
        setAcuManufacturers(['직접입력'])
      }
      if (workStatus.length === 0) {
        console.log('⚠️ 오류 발생으로 직접입력만 유지')
        setWorkStatus(['직접입력'])
      }
      if (ecuModels.length === 0) {
        console.log('⚠️ 오류 발생으로 직접입력만 유지')
        setEcuModels(['직접입력'])
      }
      if (acuModels.length === 0) {
        console.log('⚠️ 오류 발생으로 직접입력만 유지')
        setAcuModels(['직접입력'])
      }
    } finally {
      setIsLoadingDropdowns(false)
    }
  }

  // 새로운 ECU 카테고리를 데이터베이스에 추가
  const addNewEcuCategory = async (newCategory: string) => {
    try {
      console.log('➕ 새로운 ECU 카테고리 추가 중:', newCategory)
      await createEquipmentCategory({ name: newCategory, type: 'ECU' })
      console.log('✅ ECU 카테고리 추가 완료')
      
      // 데이터 새로고침
      await loadEquipmentCategories()
    } catch (error) {
      console.error('❌ ECU 카테고리 추가 오류:', error)
      alert('ECU 카테고리 추가 중 오류가 발생했습니다.')
    }
  }

  // 새로운 연결방법을 데이터베이스에 추가
  const addNewConnectionMethod = async (newMethod: string) => {
    try {
      console.log('➕ 새로운 연결방법 추가 중:', newMethod)
      await createConnectionMethod({ name: newMethod })
      console.log('✅ 연결방법 추가 완료')
      
      // 데이터 새로고침
      await loadConnectionMethods()
    } catch (error) {
      console.error('❌ 연결방법 추가 오류:', error)
      alert('연결방법 추가 중 오류가 발생했습니다.')
    }
  }

  // 새로운 ECU 제조사를 데이터베이스에 추가
  const addNewEcuMaker = async (newMaker: string) => {
    try {
      console.log('➕ 새로운 ECU 제조사 추가 중:', newMaker)
      await createManufacturer({ name: newMaker, type: 'ECU' })
      console.log('✅ ECU 제조사 추가 완료')
      
      // 데이터 새로고침
      await loadEcuMakers()
    } catch (error) {
      console.error('❌ ECU 제조사 추가 오류:', error)
      alert('ECU 제조사 추가 중 오류가 발생했습니다.')
    }
  }

  // 새로운 ECU 모델을 데이터베이스에 추가
  const addNewEcuModel = async (newModel: string) => {
    try {
      console.log('🔧 ECU 모델 추가 시작 - 모델명:', newModel)
      console.log('🔧 Supabase createEcuModel 호출 중...')
      
      const result = await createEcuModel({ 
        name: newModel, 
        category: '기타',
        series: '기타'
      })
      
      console.log('✅ ECU 모델 Supabase 저장 완료:', result)
      console.log('🔄 ECU 모델 목록 새로고침 중...')
      
      // 데이터 새로고침
      await loadEcuModels()
      
      console.log('🎉 ECU 모델 추가 프로세스 완료!')
      alert('✅ ECU 모델이 성공적으로 추가되었습니다!')
    } catch (error) {
      console.error('❌ ECU 모델 추가 오류:', error)
      console.error('❌ 오류 상세:', (error as any).message)
      console.error('❌ 오류 스택:', (error as any).stack)
      alert(`❌ ECU 모델 추가 중 오류가 발생했습니다:\n${(error as any).message}`)
    }
  }

  // 새로운 ACU 모델을 데이터베이스에 추가
  const addNewAcuModel = async (newModel: string) => {
    try {
      console.log('➕ 새로운 ACU 모델 추가 중:', newModel)
      await createAcuModel({ 
        name: newModel, 
        manufacturer: '기타',
        series: '기타'
      })
      console.log('✅ ACU 모델 추가 완료')
      
      // 데이터 새로고침
      await loadAcuModels()
    } catch (error) {
      console.error('❌ ACU 모델 추가 오류:', error)
      alert('ACU 모델 추가 중 오류가 발생했습니다.')
    }
  }

  // 새로운 ACU 제조사를 데이터베이스에 추가
  const addNewAcuManufacturer = async (newManufacturer: string) => {
    try {
      console.log('➕ 새로운 ACU 제조사 추가 중:', newManufacturer)
      await createManufacturer({ name: newManufacturer, type: 'ACU' })
      console.log('✅ ACU 제조사 추가 완료')
      
      // 데이터 새로고침
      await loadAcuManufacturers()
    } catch (error) {
      console.error('❌ ACU 제조사 추가 오류:', error)
      alert('ACU 제조사 추가 중 오류가 발생했습니다.')
    }
  }

  // 새로운 작업상태를 데이터베이스에 추가
  const addNewWorkStatus = async (newStatus: string) => {
    try {
      console.log('➕ 새로운 작업상태 추가 중:', newStatus)
      await createWorkStatus({ name: newStatus })
      console.log('✅ 작업상태 추가 완료')
      
      // 데이터 새로고침
      await loadWorkStatus()
    } catch (error) {
      console.error('❌ 작업상태 추가 오류:', error)
      alert('작업상태 추가 중 오류가 발생했습니다.')
    }
  }















  // ECU 카테고리 삭제
  const handleDeleteEcuCategory = async (categoryName: string) => {
    try {
      console.log('🗑️ ECU 카테고리 삭제 중:', categoryName)
      const categoryId = await findEquipmentCategoryIdByName(categoryName, 'ECU')
      if (categoryId) {
        await deleteEquipmentCategory(categoryId)
        console.log('✅ ECU 카테고리 삭제 완료')
        
        // 데이터 새로고침
        await loadEquipmentCategories()
      }
    } catch (error) {
      console.error('❌ ECU 카테고리 삭제 오류:', error)
      alert('ECU 카테고리 삭제 중 오류가 발생했습니다.')
    }
  }

  // 연결방법 삭제
  const handleDeleteConnectionMethod = async (methodName: string) => {
    try {
      console.log('🗑️ 연결방법 삭제 중:', methodName)
      const methodId = await findConnectionMethodIdByName(methodName)
      if (methodId) {
        await deleteConnectionMethod(methodId)
        console.log('✅ 연결방법 삭제 완료')
        
        // 데이터 새로고침
        await loadConnectionMethods()
      }
    } catch (error) {
      console.error('❌ 연결방법 삭제 오류:', error)
      alert('연결방법 삭제 중 오류가 발생했습니다.')
    }
  }

  // ECU 제조사 삭제
  const handleDeleteEcuMaker = async (makerName: string) => {
    try {
      console.log('🗑️ ECU 제조사 삭제 중:', makerName)
      const makerId = await findManufacturerIdByName(makerName, 'ECU')
      if (makerId) {
        await deleteManufacturer(makerId)
        console.log('✅ ECU 제조사 삭제 완료')
        
        // 데이터 새로고침
        await loadEcuMakers()
      }
    } catch (error) {
      console.error('❌ ECU 제조사 삭제 오류:', error)
      alert('ECU 제조사 삭제 중 오류가 발생했습니다.')
    }
  }

  // ECU 모델 삭제
  const handleDeleteEcuModel = async (modelName: string) => {
    try {
      console.log('🗑️ ECU 모델 삭제 중:', modelName)
      const modelId = await findEcuModelIdByName(modelName)
      if (modelId) {
        await deleteEcuModel(modelId)
        console.log('✅ ECU 모델 삭제 완료')
        
        // 데이터 새로고침
        await loadEcuModels()
      }
    } catch (error) {
      console.error('❌ ECU 모델 삭제 오류:', error)
      alert('ECU 모델 삭제 중 오류가 발생했습니다.')
    }
  }

  // ACU 모델 삭제
  const handleDeleteAcuModel = async (modelName: string) => {
    try {
      console.log('🗑️ ACU 모델 삭제 중:', modelName)
      const modelId = await findAcuModelIdByName(modelName)
      if (modelId) {
        await deleteAcuModel(modelId)
        console.log('✅ ACU 모델 삭제 완료')
        
        // 데이터 새로고침
        await loadAcuModels()
      }
    } catch (error) {
      console.error('❌ ACU 모델 삭제 오류:', error)
      alert('ACU 모델 삭제 중 오류가 발생했습니다.')
    }
  }

  // ACU 제조사 삭제
  const handleDeleteAcuManufacturer = async (manufacturerName: string) => {
    try {
      console.log('🗑️ ACU 제조사 삭제 중:', manufacturerName)
      const manufacturerId = await findManufacturerIdByName(manufacturerName, 'ACU')
      if (manufacturerId) {
        await deleteManufacturer(manufacturerId)
        console.log('✅ ACU 제조사 삭제 완료')
        
        // 데이터 새로고침
        await loadAcuManufacturers()
      }
    } catch (error) {
      console.error('❌ ACU 제조사 삭제 오류:', error)
      alert('ACU 제조사 삭제 중 오류가 발생했습니다.')
    }
  }

  // 작업상태 삭제
  const handleDeleteWorkStatus = async (statusName: string) => {
    try {
      console.log('🗑️ 작업상태 삭제 중:', statusName)
      const statusId = await findWorkStatusIdByName(statusName)
      if (statusId) {
        await deleteWorkStatus(statusId)
        console.log('✅ 작업상태 삭제 완료')
        
        // 데이터 새로고침
        await loadWorkStatus()
      }
    } catch (error) {
      console.error('❌ 작업상태 삭제 오류:', error)
      alert('작업상태 삭제 중 오류가 발생했습니다.')
    }
  }



  // 🚀 최적화된 초기화 시스템
  useEffect(() => {
    const initializeApp = async () => {
      console.log('🚀 작업등록 페이지 초기화 시작...')
      
      // 클라이언트 사이드 렌더링 설정
      setIsClient(true)
      
      // 메모리 사용량 및 페이지 로드 시간 업데이트
      if (typeof window !== 'undefined') {
        // 메모리 사용량
        if ((performance as any).memory) {
          const memoryMB = ((performance as any).memory.usedJSHeapSize / 1024 / 1024).toFixed(1)
          setMemoryUsage(`${memoryMB}MB`)
        }
        
        // 페이지 로드 시간
        if (performance.timing) {
          const loadTime = (performance.timing.loadEventEnd - performance.timing.navigationStart).toFixed(0)
          setPageLoadTime(`${loadTime}ms`)
        }
      }
      
      try {
        // 1단계: 로컬스토리지 정리 (한 번만 실행)
        if (typeof window !== 'undefined') {
          const keysToRemove = ['ecuModels', 'acuModels', 'acuTypes', 'acuModelsByManufacturer']
          keysToRemove.forEach(key => localStorage.removeItem(key))
          console.log('🧹 로컬스토리지 정리 완료')
        }

        // 2단계: 병렬 데이터 로딩 (성능 최적화)
        console.log('📊 병렬 데이터 로딩 시작...')
        const [customersResult, dropdownsResult] = await Promise.allSettled([
          loadCustomers(),
          loadAllDropdownData(false) // 캐시 활용
        ])

        // 3단계: 장비 카테고리 로딩 (독립적 실행)
        await loadEquipmentCategories()

        // 4단계: 결과 검증 및 오류 처리
        if (customersResult.status === 'rejected') {
          console.warn('⚠️ 고객 데이터 로딩 실패:', customersResult.reason)
        }
        if (dropdownsResult.status === 'rejected') {
          console.warn('⚠️ 드롭다운 데이터 로딩 실패:', dropdownsResult.reason)
        }

        console.log('✅ 초기화 완료')
      } catch (error) {
        console.error('❌ 초기화 중 오류:', error)
      }
    }

    initializeApp()
  }, [])

  // 🎯 스마트 새로고침 시스템 (성능 최적화)
  useEffect(() => {
    let refreshTimeout: NodeJS.Timeout
    let isRefreshing = false

    const smartRefresh = async () => {
      if (isRefreshing) return
      isRefreshing = true
      
      try {
        console.log('🔄 스마트 새로고침 시작...')
        
        // 캐시 상태 확인 후 필요시에만 새로고침
        const cacheStatus = await cacheManager.getStatus()
        const needsRefresh = cacheStatus.lastUpdate < Date.now() - 300000 // 5분
        
        if (needsRefresh) {
          await Promise.allSettled([
            loadCustomers(),
            loadAllDropdownData(true) // 강제 캐시 무효화
          ])
          console.log('✅ 스마트 새로고침 완료')
        } else {
          console.log('💾 캐시가 최신 상태 - 새로고침 생략')
        }
      } catch (error) {
        console.error('❌ 스마트 새로고침 실패:', error)
      } finally {
        isRefreshing = false
      }
    }

    const handleFocus = () => {
      // 디바운싱 적용 (중복 호출 방지)
      clearTimeout(refreshTimeout)
      refreshTimeout = setTimeout(smartRefresh, 100)
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // 페이지가 다시 보일 때만 새로고침
        clearTimeout(refreshTimeout)
        refreshTimeout = setTimeout(smartRefresh, 200)
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearTimeout(refreshTimeout)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Supabase 실시간 구독 설정
  useEffect(() => {
    console.log('🔄 실시간 데이터 동기화 설정 중...')
    
    // 연결방법 테이블 실시간 구독 (ECU 장비 카테고리와 동일한 패턴)
    const connectionMethodsSubscription = supabase
      .channel('connection_methods_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'connection_methods' },
        (payload: any) => {
          console.log('📡 연결방법 데이터 변경 감지:', payload)
          console.log('🔍 변경 유형:', payload.eventType)
          console.log('🔍 변경된 데이터:', payload.new || payload.old)
          
          if (payload.eventType === 'DELETE') {
            console.log('🗑️ 연결방법 삭제됨 - UI 즉시 업데이트')
            // 삭제 시 즉시 상태 초기화 후 새로고침
            setConnectionMethods(['직접입력'])
          } else if (payload.eventType === 'INSERT') {
            console.log('➕ 연결방법 추가됨 - UI 즉시 업데이트')
          } else if (payload.eventType === 'UPDATE') {
            console.log('✏️ 연결방법 수정됨 - UI 즉시 업데이트')
          }
          
          // 모든 경우에 데이터 새로고침 (ECU 장비 카테고리와 동일한 패턴)
          loadConnectionMethods()
        }
      )
      .subscribe((status: any) => {
        console.log('📡 연결방법 구독 상태:', status)
      })

    // 제조사 테이블 실시간 구독
    const manufacturersSubscription = supabase
      .channel('manufacturers_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'manufacturers' },
        (payload: any) => {
          console.log('📡 제조사 데이터 변경 감지:', payload)
          console.log('🔍 변경 유형:', payload.eventType)
          console.log('🔍 변경된 데이터:', payload.new || payload.old)
          
          if (payload.eventType === 'DELETE') {
            console.log('🗑️ 제조사 삭제됨 - UI 즉시 업데이트')
            // 삭제 시 즉시 상태 초기화 후 새로고침
            setEcuMakers(['직접입력'])
            setAcuManufacturers(['직접입력'])
          } else if (payload.eventType === 'INSERT') {
            console.log('➕ 제조사 추가됨 - UI 즉시 업데이트')
          } else if (payload.eventType === 'UPDATE') {
            console.log('✏️ 제조사 수정됨 - UI 즉시 업데이트')
          }
          
          // 모든 경우에 데이터 새로고침
          loadEcuMakers()
          loadAcuManufacturers()
        }
      )
      .subscribe((status: any) => {
        console.log('📡 제조사 구독 상태:', status)
      })

    // 장비 모델 테이블 실시간 구독
    const modelsSubscription = supabase
      .channel('equipment_models_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'equipment_models' },
        (payload: any) => {
          console.log('📡 장비 모델 데이터 변경 감지:', payload)
          console.log('🔍 변경 유형:', payload.eventType)
          console.log('🔍 변경된 데이터:', payload.new || payload.old)
          
          if (payload.eventType === 'DELETE') {
            console.log('🗑️ ECU 모델 삭제됨 - UI 즉시 업데이트')
            // 삭제 시 즉시 상태 초기화 후 새로고침
            setEcuModels(['직접입력'])
          } else if (payload.eventType === 'INSERT') {
            console.log('➕ ECU 모델 추가됨 - UI 즉시 업데이트')
          } else if (payload.eventType === 'UPDATE') {
            console.log('✏️ ECU 모델 수정됨 - UI 즉시 업데이트')
          }
          
          // 모든 경우에 데이터 새로고침
          loadEcuModels()
        }
      )
      .subscribe((status: any) => {
        console.log('📡 ECU 모델 구독 상태:', status)
      })

    // 작업 상태 테이블 실시간 구독
    const workStatusSubscription = supabase
      .channel('work_status_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'work_status' },
        (payload: any) => {
          console.log('📡 작업 상태 데이터 변경 감지:', payload)
          console.log('🔍 변경 유형:', payload.eventType)
          console.log('🔍 변경된 데이터:', payload.new || payload.old)
          
          if (payload.eventType === 'DELETE') {
            console.log('🗑️ 작업상태 삭제됨 - UI 즉시 업데이트')
            // 삭제 시 즉시 상태 초기화 후 새로고침
            setWorkStatus(['직접입력'])
          } else if (payload.eventType === 'INSERT') {
            console.log('➕ 작업상태 추가됨 - UI 즉시 업데이트')
          } else if (payload.eventType === 'UPDATE') {
            console.log('✏️ 작업상태 수정됨 - UI 즉시 업데이트')
          }
          
          // 모든 경우에 데이터 새로고침
          loadWorkStatus()
        }
      )
      .subscribe((status: any) => {
        console.log('📡 작업상태 구독 상태:', status)
      })

    // 장비 카테고리 테이블 실시간 구독
    const categoriesSubscription = supabase
      .channel('equipment_categories_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'equipment_categories' },
        (payload: any) => {
          console.log('📡 장비 카테고리 데이터 변경 감지:', payload)
          console.log('🔍 변경 유형:', payload.eventType)
          console.log('🔍 변경된 데이터:', payload.new || payload.old)
          
          if (payload.eventType === 'DELETE') {
            console.log('🗑️ 장비 카테고리 삭제됨 - UI 즉시 업데이트')
            // 삭제 시 즉시 상태 초기화 후 새로고침
            setEcuCategories(['직접입력'])
          } else if (payload.eventType === 'INSERT') {
            console.log('➕ 장비 카테고리 추가됨 - UI 즉시 업데이트')
          } else if (payload.eventType === 'UPDATE') {
            console.log('✏️ 장비 카테고리 수정됨 - UI 즉시 업데이트')
          }
          
          // 모든 경우에 데이터 새로고침
          loadEquipmentCategories()
        }
      )
      .subscribe()

    // ECU 모델 테이블 실시간 구독
    const ecuModelsSubscription = supabase
      .channel('ecu_models_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'ecu_models' },
        (payload: any) => {
          console.log('📡 ECU 모델 데이터 변경 감지:', payload)
          console.log('🔍 변경 유형:', payload.eventType)
          console.log('🔍 변경된 데이터:', payload.new || payload.old)
          
          if (payload.eventType === 'DELETE') {
            console.log('🗑️ ECU 모델 삭제됨 - UI 즉시 업데이트')
            // 삭제 시 즉시 상태 초기화 후 새로고침
            setEcuModels(['직접입력'])
          } else if (payload.eventType === 'INSERT') {
            console.log('➕ ECU 모델 추가됨 - UI 즉시 업데이트')
          } else if (payload.eventType === 'UPDATE') {
            console.log('✏️ ECU 모델 수정됨 - UI 즉시 업데이트')
          }
          
          // 모든 경우에 데이터 새로고침
          loadEcuModels()
        }
      )
      .subscribe((status: any) => {
        console.log('📡 ECU 모델 구독 상태:', status)
      })

    // ACU 모델 테이블 실시간 구독
    const acuModelsSubscription = supabase
      .channel('acu_models_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'acu_models' },
        (payload: any) => {
          console.log('📡 ACU 모델 데이터 변경 감지:', payload)
          console.log('🔍 변경 유형:', payload.eventType)
          console.log('🔍 변경된 데이터:', payload.new || payload.old)
          
          if (payload.eventType === 'DELETE') {
            console.log('🗑️ ACU 모델 삭제됨 - UI 즉시 업데이트')
            // 삭제 시 즉시 상태 초기화 후 새로고침
            setAcuModels(['직접입력'])
          } else if (payload.eventType === 'INSERT') {
            console.log('➕ ACU 모델 추가됨 - UI 즉시 업데이트')
          } else if (payload.eventType === 'UPDATE') {
            console.log('✏️ ACU 모델 수정됨 - UI 즉시 업데이트')
          }
          
          // 모든 경우에 데이터 새로고침
          loadAcuModels()
        }
      )
      .subscribe((status: any) => {
        console.log('📡 ACU 모델 구독 상태:', status)
      })

    console.log('✅ 실시간 데이터 동기화 설정 완료')

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      console.log('🔌 실시간 구독 해제 중...')
      connectionMethodsSubscription.unsubscribe()
      manufacturersSubscription.unsubscribe()
      modelsSubscription.unsubscribe()
      workStatusSubscription.unsubscribe()
      categoriesSubscription.unsubscribe()
      ecuModelsSubscription.unsubscribe()
      acuModelsSubscription.unsubscribe()
      console.log('✅ 실시간 구독 해제 완료')
    }
  }, [])

  const loadCustomers = async () => {
    setIsLoadingCustomers(true)
    try {
      console.log('🔄 고객 데이터 로딩 시작...')
      
      // 캐시에서 먼저 확인
      let data = await cacheManager.get(CacheKeys.CUSTOMERS)
      
      if (!data) {
        console.log('🔄 고객 데이터를 서버에서 로드 중...')
        data = await getAllCustomers()
        
        // 캐시에 저장 (5분간 유지)
        await cacheManager.set(CacheKeys.CUSTOMERS, data, CacheTTL.SHORT)
        console.log('💾 고객 데이터 캐시 저장 완료')
      } else {
        console.log('⚡ 고객 데이터를 캐시에서 로드')
      }
      
      console.log('✅ 로드된 고객 데이터:', data)
      setCustomers(data as CustomerData[])
      setFilteredCustomers(data as CustomerData[])
    } catch (error) {
      console.error('❌ 고객 데이터 로딩 실패:', error)
    } finally {
      setIsLoadingCustomers(false)
    }
  }
  
  // 드롭다운 외부 클릭 감지용 ref
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 작업 선택/해제 핸들러
  const handleWorkSelection = (category: string, work: string) => {
    setWorkSelections(prev => {
      const categoryWorks = prev[category] || []
      const isSelected = categoryWorks.includes(work)
      
      let newCategoryWorks
      if (isSelected) {
        // 선택 해제
        newCategoryWorks = categoryWorks.filter(w => w !== work)
      } else {
        // 선택 추가
        newCategoryWorks = [...categoryWorks, work]
      }
      
      const newSelections = { ...prev, [category]: newCategoryWorks }
      
      // 현재 Remapping 작업의 선택된 작업 목록 업데이트 (ECU/ACU 별로)
      if (category === 'ECU/튜닝') {
        setCurrentRemappingWork(prev => ({
          ...prev,
          ecu: {
            ...prev.ecu,
            selectedWorks: newSelections['ECU/튜닝']
          }
        }))
      } else if (category === 'ACU/튜닝') {
        setCurrentRemappingWork(prev => ({
          ...prev,
          acu: {
            ...prev.acu,
            selectedWorks: newSelections['ACU/튜닝']
          }
        }))
      }
      
      return newSelections
    })
  }

  // 카테고리 전체 선택/해제
  const handleCategoryToggle = (category: string) => {
    const categoryWorks = TUNING_WORKS_BY_CATEGORY[category as keyof typeof TUNING_WORKS_BY_CATEGORY] || []
    const currentSelections = workSelections[category] || []
    const isAllSelected = categoryWorks.length > 0 && categoryWorks.every(work => currentSelections.includes(work))
    
    setWorkSelections(prev => {
      const newSelections = {
        ...prev,
        [category]: isAllSelected ? [] : [...categoryWorks]
      }
      
      // 현재 Remapping 작업의 선택된 작업 목록 업데이트 (ECU/ACU 별로)
      if (category === 'ECU/튜닝') {
        setCurrentRemappingWork(prev => ({
          ...prev,
          ecu: {
            ...prev.ecu,
            selectedWorks: newSelections['ECU/튜닝']
          }
        }))
      } else if (category === 'ACU/튜닝') {
        setCurrentRemappingWork(prev => ({
          ...prev,
          acu: {
            ...prev.acu,
            selectedWorks: newSelections['ACU/튜닝']
          }
        }))
      }
      
      return newSelections
    })
  }

  // Remapping 작업 입력 핸들러
  const handleRemappingWorkInputChange = (section: 'ecu' | 'acu' | 'general', field: string, value: string) => {
    if (section === 'general') {
      setCurrentRemappingWork(prev => ({
        ...prev,
        [field]: value
      }))
    } else {
      // 금액 입력 시 만원 단위를 원 단위로 변환
      if (field === 'price') {
        const priceInWon = value ? parseFloat(value) * 10000 : ''
        setCurrentRemappingWork(prev => ({
          ...prev,
          [section]: {
            ...prev[section],
            [field]: priceInWon.toString()
          }
        }))
        return
      }
      
      setCurrentRemappingWork(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }))
    }
  }

  // 파일 입력 핸들러
  const handleFileChange = (fileType: string, file: File | File[] | null, description?: string) => {
    // 파일 크기 및 형식 검증
    if (file) {
      if (Array.isArray(file)) {
        // 다중 파일 선택의 경우
        for (const f of file) {
          if (!validateFileSize(f, 50)) { // 폴더 파일은 50MB 제한
            alert(`파일 크기가 너무 큽니다: ${f.name} (최대 50MB)`)
            return
          }
        }
      } else {
        // 단일 파일 선택의 경우
        if (!validateFileSize(file, 50)) { // 단일 파일도 50MB 제한
          alert(`파일 크기가 너무 큽니다: ${file.name} (최대 50MB)`)
          return
        }
      }
    }

    setCurrentRemappingWork(prev => {
      const currentFiles = prev.files[fileType as keyof typeof prev.files] as File | File[] | undefined
      
      let newFiles: File | File[] | null = file
      
      // 다중 파일 선택 필드인 경우 기존 파일들과 합치기
      if ((fileType === 'originalFile' || fileType === 'acuOriginalFile') && file && Array.isArray(file)) {
        if (Array.isArray(currentFiles)) {
          // 기존 파일들과 새 파일들 합치기 (최대 5개)
          const combinedFiles = [...currentFiles, ...file]
          if (combinedFiles.length > 5) {
            alert('최대 5개 파일까지만 선택할 수 있습니다.')
            return prev
          }
          newFiles = combinedFiles
        }
      }
      
      return {
        ...prev,
        files: {
          ...prev.files,
          ...(newFiles !== null && { [fileType]: newFiles }),
          ...(description !== undefined && { [`${fileType}Description`]: description })
        }
      }
    })
  }

  // 파일 설명만 업데이트하는 함수
  const handleFileDescriptionChange = (descriptionField: string, value: string) => {
    setCurrentRemappingWork(prev => ({
      ...prev,
      files: {
        ...prev.files,
        [descriptionField]: value
      }
    }))
  }

  // Remapping 작업 추가
  const handleAddRemappingWork = () => {
    // ECU 또는 ACU 중 최소 하나는 설정되어야 함
    const hasEcuWork = currentRemappingWork.ecu.toolCategory && currentRemappingWork.ecu.selectedWorks.length > 0
    const hasAcuWork = currentRemappingWork.acu.toolCategory && currentRemappingWork.acu.selectedWorks.length > 0
    
    if (!hasEcuWork && !hasAcuWork) {
      alert('ECU 또는 ACU 중 최소 하나 이상의 작업을 설정해주세요.')
      return
    }

    const newRemappingWork: RemappingWork = {
      id: Date.now(),
      ...currentRemappingWork
    }

    if (isEditingRemapping && editingRemappingId) {
      // 편집 모드
      setRemappingWorks(prev => prev.map(work => 
        work.id === editingRemappingId ? newRemappingWork : work
      ))
      setIsEditingRemapping(false)
      setEditingRemappingId(null)
    } else {
      // 추가 모드
      setRemappingWorks(prev => [...prev, newRemappingWork])
    }

    // 현재 Remapping 작업 초기화
    setCurrentRemappingWork({
      ecu: {
        toolCategory: '',
        toolCategoryCustom: '',
        connectionMethod: '',
        connectionMethodCustom: '',
        maker: '',
        makerCustom: '',
        type: '',
        typeCustom: '',
        selectedWorks: [],
        workDetails: '',
        price: '',
        status: '',
        statusCustom: ''
      },
      acu: {
        toolCategory: '',
        toolCategoryCustom: '',
        connectionMethod: '',
        connectionMethodCustom: '',
        manufacturer: '',
        manufacturerCustom: '',
        model: '',
        modelCustom: '',
        selectedWorks: [],
        workDetails: '',
        price: '',
        status: '',
        statusCustom: ''
      },
      notes: '',
      files: {
        originalFile: undefined,
        originalFileDescription: '',
        stage1File: undefined,
        stage1FileDescription: '',
        stage2File: undefined,
        stage2FileDescription: '',
        stage3File: undefined,
        stage3FileDescription: '',
        acuOriginalFile: undefined,
        acuOriginalFileDescription: '',
        acuStage1File: undefined,
        acuStage1FileDescription: '',
        acuStage2File: undefined,
        acuStage2FileDescription: '',
        acuStage3File: undefined,
        acuStage3FileDescription: '',
        mediaFile1: undefined,
        mediaFile1Description: '',
        mediaFile2: undefined,
        mediaFile2Description: '',
        mediaFile3: undefined,
        mediaFile3Description: '',
        mediaFile4: undefined,
        mediaFile4Description: '',
        mediaFile5: undefined,
        mediaFile5Description: ''
      }
    })

    setWorkSelections({
      'ECU/튜닝': [],
      'ACU/튜닝': []
    })
  }

  // Remapping 작업 편집
  const handleEditRemappingWork = (work: RemappingWork) => {
    setCurrentRemappingWork({
      ecu: {
        toolCategory: work.ecu.toolCategory,
        toolCategoryCustom: work.ecu.toolCategoryCustom || '',
        connectionMethod: work.ecu.connectionMethod,
        connectionMethodCustom: work.ecu.connectionMethodCustom || '',
        maker: work.ecu.maker,
        makerCustom: work.ecu.makerCustom || '',
        type: work.ecu.type,
        typeCustom: work.ecu.typeCustom,
        selectedWorks: work.ecu.selectedWorks,
        workDetails: work.ecu.workDetails,
        price: work.ecu.price,
        status: work.ecu.status,
        statusCustom: work.ecu.statusCustom || ''
      },
      acu: {
        toolCategory: work.acu.toolCategory,
        toolCategoryCustom: work.acu.toolCategoryCustom || '',
        connectionMethod: work.acu.connectionMethod,
        connectionMethodCustom: work.acu.connectionMethodCustom || '',
        manufacturer: work.acu.manufacturer,
        manufacturerCustom: work.acu.manufacturerCustom || '',
        model: work.acu.model || work.acu.modelCustom,
        modelCustom: work.acu.modelCustom,
        selectedWorks: work.acu.selectedWorks,
        workDetails: work.acu.workDetails,
        price: work.acu.price,
        status: work.acu.status,
        statusCustom: work.acu.statusCustom || ''
      },
      notes: work.notes,
      files: work.files as any
    })

    // 작업 선택 상태 복원
    setWorkSelections({
      'ECU/튜닝': work.ecu.selectedWorks,
      'ACU/튜닝': work.acu.selectedWorks
    })

    setIsEditingRemapping(true)
    setEditingRemappingId(work.id)
  }

  // Remapping 작업 삭제
  const handleDeleteRemappingWork = (id: number) => {
    if (confirm('이 Remapping 작업을 삭제하시겠습니까?')) {
      setRemappingWorks(prev => prev.filter(work => work.id !== id))
    }
  }

  // 작업 기록 편집 모달 열기
  const handleOpenEditModal = (workRecord: any) => {
    setSelectedWorkRecord(workRecord)
    setIsEditModalOpen(true)
  }

  // 작업 기록 편집 모달 닫기
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedWorkRecord(null)
  }

  // 작업 기록 저장 후 처리
  const handleWorkRecordSave = () => {
    // 저장 후 필요한 처리 (예: 목록 새로고침)
    console.log('작업 기록이 저장되었습니다.')
  }

  // Remapping 작업 편집 취소
  const handleCancelRemappingEdit = () => {
    setCurrentRemappingWork({
      ecu: {
        toolCategory: '',
        toolCategoryCustom: '',
        connectionMethod: '',
        connectionMethodCustom: '',
        maker: '',
        makerCustom: '',
        type: '',
        typeCustom: '',
        selectedWorks: [],
        workDetails: '',
        price: '',
        status: '',
        statusCustom: ''
      },
      acu: {
        toolCategory: '',
        toolCategoryCustom: '',
        connectionMethod: '',
        connectionMethodCustom: '',
        manufacturer: '',
        manufacturerCustom: '',
        model: '',
        modelCustom: '',
        selectedWorks: [],
        workDetails: '',
        price: '',
        status: '',
        statusCustom: ''
      },
      notes: '',
      files: {
        originalFile: undefined,
        originalFileDescription: '',
        stage1File: undefined,
        stage1FileDescription: '',
        stage2File: undefined,
        stage2FileDescription: '',
        stage3File: undefined,
        stage3FileDescription: '',
        acuOriginalFile: undefined,
        acuOriginalFileDescription: '',
        acuStage1File: undefined,
        acuStage1FileDescription: '',
        acuStage2File: undefined,
        acuStage2FileDescription: '',
        acuStage3File: undefined,
        acuStage3FileDescription: '',
        mediaFile1: undefined,
        mediaFile1Description: '',
        mediaFile2: undefined,
        mediaFile2Description: '',
        mediaFile3: undefined,
        mediaFile3Description: '',
        mediaFile4: undefined,
        mediaFile4Description: '',
        mediaFile5: undefined,
        mediaFile5Description: ''
      }
    })

    setWorkSelections({
      'ECU/튜닝': [],
      'ACU/튜닝': []
    })

    setIsEditingRemapping(false)
    setEditingRemappingId(null)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    setFormData(prev => ({ ...prev, [name]: value }))

    // 고객명 검색 처리
    if (name === 'customerName') {
      if (value.trim() === '') {
        setFilteredCustomers(customers)
        setShowCustomerDropdown(true) // 빈 값일 때도 드롭다운 유지
        // 고객명이 비어있으면 고객 ID도 초기화
        setFormData(prev => ({ ...prev, customerId: '', equipmentId: '' }))
        setAvailableEquipment([])
      } else {
        const filtered = customers.filter(customer =>
          customer.name.toLowerCase().includes(value.toLowerCase()) ||
          customer.phone.includes(value) ||
          customer.roadAddress.toLowerCase().includes(value.toLowerCase())
        )
        setFilteredCustomers(filtered)
        setShowCustomerDropdown(true)
      }
    }

    // 장비 선택 처리
    if (name === 'equipmentId') {
      setFormData(prev => ({ ...prev, [name]: value }))
    }

    // 기타 입력 처리
    if (!['customerName', 'equipmentId'].includes(name)) {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  // 고객 선택 처리
  const handleCustomerSelect = async (customer: CustomerData) => {
    setFormData(prev => ({
      ...prev,
      customerId: customer.id.toString(),
      customerName: customer.name,
      equipmentId: '' // 고객 변경 시 장비 선택 초기화
    }))
    setShowCustomerDropdown(false)

    // 선택된 고객의 장비 목록 업데이트 (캐시 적용)
    try {
      const cacheKey = `${CacheKeys.EQUIPMENT}_customer_${customer.id}`
      let customerEquipment = await cacheManager.get(cacheKey)
      
      if (!customerEquipment) {
        console.log('🔄 장비 데이터를 서버에서 로드 중...')
        customerEquipment = await getEquipmentByCustomerId(customer.id)
        
        // 캐시에 저장 (3분간 유지)
        await cacheManager.set(cacheKey, customerEquipment, CacheTTL.SHORT)
        console.log('💾 장비 데이터 캐시 저장 완료')
      } else {
        console.log('⚡ 장비 데이터를 캐시에서 로드')
      }
      
      setAvailableEquipment(customerEquipment as EquipmentData[])
    } catch (error) {
      console.error('Failed to load customer equipment:', error)
      setAvailableEquipment([])
    }
  }

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 필수 필드 검증
    if (!formData.customerId) {
      alert('고객을 선택해주세요.')
      return
    }
    
    if (!formData.equipmentId) {
      alert('장비를 선택해주세요.')
      return
    }
    
    if (remappingWorks.length === 0) {
      alert('최소 하나 이상의 Remapping 작업을 추가해주세요.')
      return
    }

    // 선택된 고객과 장비 정보 가져오기
    const selectedCustomer = customers.find(c => c.id.toString() === formData.customerId)
    const selectedEquipment = availableEquipment.find(e => e.id.toString() === formData.equipmentId)
    
    // 파일을 Base64로 변환하는 함수
    const convertFileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          resolve(result.split(',')[1]) // Base64 데이터만 추출
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    }

    // 작업 이력 데이터 생성 및 Supabase에 저장 (각 Remapping 작업별로 개별 이력 생성)
    const workHistoryEntries = []
    
    for (const [index, remappingWork] of remappingWorks.entries()) {
      try {
        console.log(`🔄 작업 기록 ${index + 1} 처리 시작...`)
        
        // 파일 업로드 처리
        const uploadedFiles: any = {}
        const filesToUpload = []
        
        // 업로드할 파일 목록 생성
        const fileFields = [
          'originalFile', 'stage1File', 'stage2File', 'stage3File',
          'acuOriginalFile', 'acuStage1File', 'acuStage2File', 'acuStage3File',
          'mediaFile1', 'mediaFile2', 'mediaFile3', 'mediaFile4', 'mediaFile5'
        ]
        
        for (const field of fileFields) {
          const file = remappingWork.files[field as keyof typeof remappingWork.files] as File | File[]
          if (file) {
            if (Array.isArray(file)) {
              // 다중 파일 처리 (originalFile, acuOriginalFile)
              file.forEach((f, index) => {
                filesToUpload.push({
                  file: f,
                  field: `${field}_${index}`,
                  category: field.startsWith('acu') ? 'acu' : field.startsWith('media') ? 'media' : 'ecu',
                  description: remappingWork.files[`${field}Description` as keyof typeof remappingWork.files] as string
                })
              })
            } else {
              // 단일 파일 처리
              filesToUpload.push({
                file,
                field,
                category: field.startsWith('acu') ? 'acu' : field.startsWith('media') ? 'media' : 'ecu',
                description: remappingWork.files[`${field}Description` as keyof typeof remappingWork.files] as string
              })
            }
          }
        }
        
        // 미디어 파일 추가
        if (remappingWork.media?.before) {
          filesToUpload.push({
            file: remappingWork.media.before,
            field: 'mediaBefore',
            category: 'media',
            description: 'Before 이미지'
          })
        }
        if (remappingWork.media?.after) {
          filesToUpload.push({
            file: remappingWork.media.after,
            field: 'mediaAfter',
            category: 'media',
            description: 'After 이미지'
          })
        }
        
        console.log(`📁 업로드할 파일 개수: ${filesToUpload.length}`)
        
        // 파일들을 Supabase Storage에 업로드
        if (filesToUpload.length > 0) {
          console.log('🚀 파일 업로드 시작...')
          
          // 업로드 진행 상황 초기화
          setUploadProgress({
            isUploading: true,
            currentFile: '',
            totalFiles: filesToUpload.length,
            currentIndex: 0,
            progress: 0
          })
          
          for (let i = 0; i < filesToUpload.length; i++) {
            const fileInfo = filesToUpload[i]
            
            try {
              // 업로드 진행 상황 업데이트
              setUploadProgress(prev => ({
                ...prev,
                currentFile: fileInfo.file.name,
                currentIndex: i + 1,
                progress: Math.round(((i + 1) / filesToUpload.length) * 100)
              }))
              
              console.log(`📤 파일 업로드 중: ${fileInfo.file.name} (${i + 1}/${filesToUpload.length})`)
              
              // 파일 ID 생성 (고유한 식별자)
              const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              
              // 파일 타입에 따른 버킷 선택
              let bucketName = 'work-files' // 기본값
              let category = fileInfo.category
              const fileExtension = fileInfo.file.name.split('.').pop()?.toLowerCase() || ''
              
              if (fileInfo.category === 'media' || fileInfo.field.startsWith('media')) {
                bucketName = 'work-media'
                category = 'media'
              } else if (fileInfo.file.type.includes('pdf') || fileInfo.file.type.includes('document') || fileInfo.file.type.includes('text')) {
                bucketName = 'work-documents'
                category = 'document'
              } else if (fileExtension === 'zip' || fileInfo.file.type === 'application/zip' || fileInfo.file.type === 'application/x-zip-compressed') {
                bucketName = 'work-files'
                category = fileInfo.category // ecu, acu
                console.log(`📦 ZIP 파일 감지: ${fileInfo.file.name} (${fileInfo.file.type}) → work-files 버킷`)
              } else {
                bucketName = 'work-files'
                category = fileInfo.category // ecu, acu
              }
              
              console.log(`📦 선택된 버킷: ${bucketName} (파일 타입: ${fileInfo.file.type})`)
              
              // 파일명을 안전하게 처리 (한글, 특수문자 제거)
              const safeFileName = fileInfo.file.name
                .replace(/[^\w\-_.]/g, '_') // 한글, 특수문자를 언더스코어로 변경
                .replace(/_+/g, '_') // 연속된 언더스코어를 하나로
                .replace(/^_|_$/g, '') // 앞뒤 언더스코어 제거
              
              // Storage 경로 생성
              const storagePath = `${formData.customerId}/${formData.equipmentId}/${category}_${fileId}_${safeFileName}`
              
              // ZIP 파일인 경우 특별 처리
              let uploadOptions = {
                cacheControl: '3600',
                upsert: true,
                contentType: fileInfo.file.type
              }
              
              // ZIP 파일의 경우 MIME 타입 강제 설정
              if (fileExtension === 'zip') {
                uploadOptions.contentType = 'application/zip'
                console.log(`📦 ZIP 파일 MIME 타입 강제 설정: application/zip`)
              }
              
              console.log(`📤 업로드 옵션:`, uploadOptions)
              console.log(`📁 파일 크기: ${(fileInfo.file.size / 1024 / 1024).toFixed(2)}MB`)
              
              // Supabase Storage에 직접 업로드 (기존 방식)
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(storagePath, fileInfo.file, uploadOptions)
              
              if (uploadError) {
                console.error(`❌ 파일 업로드 실패: ${fileInfo.file.name}`, uploadError)
                console.error(`❌ 오류 상세:`, {
                  message: uploadError.message,
                  error: uploadError
                })
                throw new Error(`파일 업로드 실패: ${uploadError.message}`)
              }
              
              // 공개 URL 생성
              const { data: urlData } = supabase.storage
                .from(bucketName)
                .getPublicUrl(uploadData.path)
              
              console.log(`✅ 파일 업로드 성공: ${fileInfo.file.name}`)
              console.log(`📍 Storage 경로: ${uploadData.path}`)
              console.log(`🔗 공개 URL: ${urlData.publicUrl}`)
              console.log(`📦 저장된 버킷: ${bucketName}`)
              
              // 업로드 결과 저장
              uploadedFiles[fileId] = {
                name: fileInfo.file.name,
                url: urlData.publicUrl,
                path: uploadData.path,
                bucket: bucketName,
                size: fileInfo.file.size,
                type: fileInfo.file.type,
                description: fileInfo.description || ''
              }
              
              console.log(`📋 업로드된 파일 정보:`, uploadedFiles[fileId])
              
            } catch (error) {
              console.error(`❌ 파일 업로드 중 오류: ${fileInfo.file.name}`, error)
              throw new Error(`파일 업로드 실패: ${fileInfo.file.name}`)
            }
          }
          
          // 업로드 완료
          setUploadProgress({
            isUploading: false,
            currentFile: '',
            totalFiles: 0,
            currentIndex: 0,
            progress: 0
          })
          
          console.log('✅ 모든 파일 업로드 완료')
        } else {
          console.log('📝 업로드할 파일이 없습니다.')
        }

        // 모델명 → id 변환
        const ecuModelId = await findEcuModelIdByName(remappingWork.ecu.type || remappingWork.ecu.typeCustom)
        const acuModelId = await findAcuModelIdByName(remappingWork.acu.model || remappingWork.acu.modelCustom)

        // 총 금액 계산 (ECU + ACU 작업 금액)
        const ecuPrice = parseFloat(remappingWork.ecu?.price || '0') || 0
        const acuPrice = parseFloat(remappingWork.acu?.price || '0') || 0
        const totalCalculatedPrice = ecuPrice + acuPrice

        console.log('💰 금액 계산 상세:')
        console.log('  - ECU 금액:', ecuPrice)
        console.log('  - ACU 금액:', acuPrice)
        console.log('  - 총 금액:', totalCalculatedPrice)

        // Supabase에 저장할 작업 기록 데이터 생성 (모든 필수 필드 포함)
        const workRecordData: Omit<WorkRecordData, 'id' | 'created_at'> = {
          customerId: parseInt(formData.customerId),
          equipmentId: parseInt(formData.equipmentId),
          workDate: formData.workDate,
          workType: 'ECU 튜닝',
          totalPrice: totalCalculatedPrice,
          // ECU 정보
          ecuMaker: remappingWork.ecu?.maker || undefined,
          ecuModel: remappingWork.ecu?.type || remappingWork.ecu?.typeCustom || undefined,
          // ACU 정보
          acuManufacturer: remappingWork.acu?.manufacturer || undefined,
          acuModel: remappingWork.acu?.model || remappingWork.acu?.modelCustom || undefined,
          // 연결 방법 (ECU 우선, 없으면 ACU)
          connectionMethod: remappingWork.ecu?.connectionMethod || remappingWork.acu?.connectionMethod || undefined,
          // 사용된 도구들
          toolsUsed: [
            ...(remappingWork.ecu?.toolCategory ? [remappingWork.ecu.toolCategory] : []),
            ...(remappingWork.acu?.toolCategory ? [remappingWork.acu.toolCategory] : [])
          ],
          // 작업 설명
          workDescription: [
            ...(remappingWork.ecu?.workDetails ? [`ECU: ${remappingWork.ecu.workDetails}`] : []),
            ...(remappingWork.acu?.workDetails ? [`ACU: ${remappingWork.acu.workDetails}`] : [])
          ].join(', ') || undefined,
          // 업로드된 파일 정보
          files: uploadedFiles,
          // 리매핑 작업 데이터
          remappingWorks: [
            {
              ...remappingWork, // RemappingWork 전체 구조(jsonb)
              files: uploadedFiles, // 업로드된 파일 정보 포함
              media: {
                before: uploadedFiles.mediaBefore || null,
                after: uploadedFiles.mediaAfter || null
              }
            }
          ] as any
        }

        console.log('📋 생성된 workRecordData 상세:')
        console.log('  - ecuMaker:', workRecordData.ecuMaker)
        console.log('  - ecuModel:', workRecordData.ecuModel)
        console.log('  - acuManufacturer:', workRecordData.acuManufacturer)
        console.log('  - acuModel:', workRecordData.acuModel)
        console.log('  - connectionMethod:', workRecordData.connectionMethod)
        console.log('  - totalPrice:', workRecordData.totalPrice)
        console.log('  - toolsUsed:', workRecordData.toolsUsed)
        console.log('  - workDescription:', workRecordData.workDescription)
        console.log('  - uploadedFiles:', Object.keys(uploadedFiles))

        // Supabase에 작업 기록 저장
        const savedRecord = await createWorkRecord(workRecordData)
        
        if (savedRecord) {
          workHistoryEntries.push(savedRecord)
          console.log(`✅ 작업 기록 ${index + 1} 저장 완료:`, savedRecord)
          
          // 작업 기록 생성 후 파일 업로드 처리
          const workRecordId = savedRecord.id
          console.log(`📁 작업 기록 ${workRecordId}의 파일 업로드 시작...`)
          
          // 파일 업로드 처리 (uploadFileToStorage 함수 사용)
          const uploadedFiles: any = {}
          const filesToUpload = []
          
          // 업로드할 파일 목록 생성
          const fileFields = [
            'originalFile', 'stage1File', 'stage2File', 'stage3File',
            'acuOriginalFile', 'acuStage1File', 'acuStage2File', 'acuStage3File',
            'mediaFile1', 'mediaFile2', 'mediaFile3', 'mediaFile4', 'mediaFile5'
          ]
          
          for (const field of fileFields) {
            const file = remappingWork.files[field as keyof typeof remappingWork.files] as File | File[]
            if (file) {
              if (Array.isArray(file)) {
                // 다중 파일 처리 (originalFile, acuOriginalFile)
                file.forEach((f, index) => {
                  filesToUpload.push({
                    file: f,
                    field: `${field}_${index}`,
                    category: field.startsWith('acu') ? 'acu' : field.startsWith('media') ? 'media' : 'ecu',
                    description: remappingWork.files[`${field}Description` as keyof typeof remappingWork.files] as string
                  })
                })
              } else {
                // 단일 파일 처리
                filesToUpload.push({
                  file,
                  field,
                  category: field.startsWith('acu') ? 'acu' : field.startsWith('media') ? 'media' : 'ecu',
                  description: remappingWork.files[`${field}Description` as keyof typeof remappingWork.files] as string
                })
              }
            }
          }
          
          // 미디어 파일 추가
          if (remappingWork.media?.before) {
            filesToUpload.push({
              file: remappingWork.media.before,
              field: 'mediaBefore',
              category: 'media',
              description: 'Before 이미지'
            })
          }
          if (remappingWork.media?.after) {
            filesToUpload.push({
              file: remappingWork.media.after,
              field: 'mediaAfter',
              category: 'media',
              description: 'After 이미지'
            })
          }
          
          console.log(`📁 업로드할 파일 개수: ${filesToUpload.length}`)
          
          // 파일들을 Supabase Storage에 업로드
          if (filesToUpload.length > 0) {
            console.log('🚀 파일 업로드 시작...')
            
            // 업로드 진행 상황 초기화
            setUploadProgress({
              isUploading: true,
              currentFile: '',
              totalFiles: filesToUpload.length,
              currentIndex: 0,
              progress: 0
            })
            
            for (let i = 0; i < filesToUpload.length; i++) {
              const fileInfo = filesToUpload[i]
              
              try {
                // 업로드 진행 상황 업데이트
                setUploadProgress(prev => ({
                  ...prev,
                  currentFile: fileInfo.file.name,
                  currentIndex: i + 1,
                  progress: Math.round(((i + 1) / filesToUpload.length) * 100)
                }))
                
                // 파일 카테고리에 따른 카테고리 결정
                let category = 'original'
                
                if (fileInfo.category === 'media') {
                  category = 'media'
                } else if (fileInfo.category === 'acu') {
                  if (fileInfo.field.includes('stage1')) {
                    category = 'acu-stage1'
                  } else if (fileInfo.field.includes('stage2')) {
                    category = 'acu-stage2'
                  } else if (fileInfo.field.includes('stage3')) {
                    category = 'acu-stage3'
                  } else {
                    category = 'acu-original'
                  }
                } else {
                  // ECU 파일의 경우 파일명에 따라 카테고리 결정
                  if (fileInfo.field.includes('stage1')) {
                    category = 'stage1'
                  } else if (fileInfo.field.includes('stage2')) {
                    category = 'stage2'
                  } else if (fileInfo.field.includes('stage3')) {
                    category = 'stage3'
                  } else {
                    category = 'original'
                  }
                }
                
                // 고유한 파일 ID 생성
                const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                
                console.log(`📦 파일 업로드 시작: ${fileInfo.file.name} (카테고리: ${category})`)
                
                // uploadFileToStorage 함수 사용 (file_metadata 자동 저장)
                const uploadResult = await uploadFileToStorage(
                  fileInfo.file,
                  workRecordId, // 작업 기록 ID 전달
                  fileId,
                  category as 'original' | 'stage1' | 'stage2' | 'stage3' | 'acu-original' | 'acu-stage1' | 'acu-stage2' | 'acu-stage3' | 'media'
                )
                
                if (!uploadResult.success) {
                  console.error(`❌ 파일 업로드 실패: ${fileInfo.file.name}`, uploadResult.error)
                  throw new Error(`파일 업로드 실패: ${uploadResult.error}`)
                }
                
                console.log(`✅ 파일 업로드 성공: ${fileInfo.file.name}`)
                console.log(`📍 Storage 경로: ${uploadResult.path}`)
                console.log(`🔗 공개 URL: ${uploadResult.url}`)
                console.log(`📦 저장된 버킷: ${uploadResult.bucket}`)
                
                // 업로드된 파일 정보 저장
                uploadedFiles[fileInfo.field] = {
                  url: uploadResult.url,
                  path: uploadResult.path,
                  bucket: uploadResult.bucket,
                  name: fileInfo.file.name,
                  size: fileInfo.file.size,
                  type: fileInfo.file.type,
                  category: category,
                  description: fileInfo.description
                }
                
              } catch (error) {
                console.error(`❌ 파일 업로드 중 오류: ${fileInfo.file.name}`, error)
                throw new Error(`파일 업로드 실패: ${fileInfo.file.name}`)
              }
            }
            
            // 업로드 완료
            setUploadProgress({
              isUploading: false,
              currentFile: '',
              totalFiles: 0,
              currentIndex: 0,
              progress: 0
            })
            
            console.log('✅ 모든 파일 업로드 완료')
          } else {
            console.log('📁 업로드할 파일이 없습니다')
          }
        } else {
          console.error(`❌ 작업 기록 ${index + 1} 저장 실패`)
          alert(`작업 기록 ${index + 1} 저장 중 오류가 발생했습니다.`)
        }
      } catch (error) {
        console.error(`❌ 작업 기록 ${index + 1} 처리 중 오류:`, error)
        alert(`작업 기록 ${index + 1} 처리 중 오류가 발생했습니다: ${error}`)
      }
    }
    
    console.log('=== 작업 등록 디버깅 ===')
    console.log('remappingWorks 배열:', remappingWorks)
    console.log('remappingWorks.length:', remappingWorks.length)
    console.log('Supabase에 저장된 workHistoryEntries:', workHistoryEntries)
    console.log('workHistoryEntries.length:', workHistoryEntries.length)
    console.log('=== 디버깅 끝 ===')
    
    const allWorks = remappingWorks.flatMap(work => [...work.ecu.selectedWorks, ...work.acu.selectedWorks])
    
    // 저장 성공 여부 확인
    if (workHistoryEntries.length === 0) {
      alert('작업 등록 중 오류가 발생했습니다. 다시 시도해주세요.')
      return
    }
    
    // 사용자에게 작업이력 페이지로 이동할지 확인
    const goToHistory = confirm(`작업이 성공적으로 등록되었습니다!\n총 ${workHistoryEntries.length}개의 작업 이력이 Supabase에 저장되었습니다.\n(${remappingWorks.length}개의 Remapping 작업)\n선택된 작업: ${allWorks.join(', ')}\n\n작업이력 페이지로 이동하시겠습니까?`)
    
    if (goToHistory) {
      router.push('/history')
      return
    }
    
    // 폼 초기화
    setFormData({
      customerId: '',
      customerName: '',
      equipmentId: '',
      workDate: getTodayDate(),
      status: '예약'
    })
    
    setRemappingWorks([])
    setCurrentRemappingWork({
      ecu: {
        toolCategory: '',
        toolCategoryCustom: '',
        connectionMethod: '',
        connectionMethodCustom: '',
        maker: '',
        makerCustom: '',
        type: '',
        typeCustom: '',
        selectedWorks: [],
        workDetails: '',
        price: '',
        status: '',
        statusCustom: ''
      },
      acu: {
        toolCategory: '',
        toolCategoryCustom: '',
        connectionMethod: '',
        connectionMethodCustom: '',
        manufacturer: '',
        manufacturerCustom: '',
        model: '',
        modelCustom: '',
        selectedWorks: [],
        workDetails: '',
        price: '',
        status: '',
        statusCustom: ''
      },
      notes: '',
      files: {
        originalFile: undefined,
        originalFileDescription: '',
        stage1File: undefined,
        stage1FileDescription: '',
        stage2File: undefined,
        stage2FileDescription: '',
        stage3File: undefined,
        stage3FileDescription: '',
        acuOriginalFile: undefined,
        acuOriginalFileDescription: '',
        acuStage1File: undefined,
        acuStage1FileDescription: '',
        acuStage2File: undefined,
        acuStage2FileDescription: '',
        acuStage3File: undefined,
        acuStage3FileDescription: '',
        mediaFile1: undefined,
        mediaFile1Description: '',
        mediaFile2: undefined,
        mediaFile2Description: '',
        mediaFile3: undefined,
        mediaFile3Description: '',
        mediaFile4: undefined,
        mediaFile4Description: '',
        mediaFile5: undefined,
        mediaFile5Description: ''
      }
    })
    
    setWorkSelections({
      'ECU/튜닝': [],
      'ACU/튜닝': []
    })
    
    setIsEditingRemapping(false)
    setEditingRemappingId(null)
    
    setAvailableEquipment([])
  }

  // 파일 URL 정리 (메모리 누수 방지)
  useEffect(() => {
    return () => {
      // 컴포넌트 언마운트 시 생성된 URL들 정리
      for (let i = 1; i <= 5; i++) {
        const fileKey = `mediaFile${i}` as keyof typeof currentRemappingWork.files
        const file = currentRemappingWork.files[fileKey] as File | undefined
        if (file) {
          URL.revokeObjectURL(URL.createObjectURL(file))
        }
      }
    }
  }, [currentRemappingWork.files])

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowCustomerDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // 🖼️ 최적화된 이미지 압축 시스템
  const compressImage = (file: File, maxWidth: number = 1920, maxHeight: number = 1080, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      // WebP 지원 확인 및 최적 형식 선택
      const isWebPSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
      const outputFormat = isWebPSupported ? 'image/webp' : 'image/jpeg'
      const outputExtension = outputFormat === 'image/webp' ? 'webp' : 'jpg'
      
      img.onload = () => {
        // 비율 유지하며 크기 조정
        let { width, height } = img
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height
            height = maxHeight
          }
        }
        
        canvas.width = width
        canvas.height = height
        
        // 이미지 그리기
        ctx?.drawImage(img, 0, 0, width, height)
        
        // 압축된 blob 생성
        canvas.toBlob((blob) => {
          if (blob) {
            const originalSize = file.size
            const compressedSize = blob.size
            const compressionRatio = Math.round((1 - compressedSize / originalSize) * 100)
            
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, `.${outputExtension}`), {
              type: outputFormat,
              lastModified: Date.now()
            })
            
            console.log(`✅ 이미지 최적화 완료: ${file.name}`)
            console.log(`📊 크기: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(compressedSize / 1024 / 1024).toFixed(2)}MB`)
            console.log(`📈 압축률: ${compressionRatio}%`)
            console.log(`🎨 형식: ${outputFormat}`)
            
            resolve(compressedFile)
          } else {
            console.warn('⚠️ 이미지 압축 실패 - 원본 사용')
            resolve(file) // 압축 실패시 원본 반환
          }
        }, outputFormat, quality)
      }
      
      img.onerror = () => {
        console.error('❌ 이미지 로드 실패 - 원본 사용')
        resolve(file) // 오류시 원본 반환
      }
      img.src = URL.createObjectURL(file)
    })
  }

  // 📁 최적화된 파일 변환 시스템
  const convertFileToBase64 = async (file: File): Promise<string> => {
    // 파일 타입별 최적화 전략
    let processedFile = file
    const fileSizeMB = file.size / 1024 / 1024
    
    try {
      // 이미지 파일 최적화
      if (file.type.startsWith('image/')) {
        if (fileSizeMB > 0.5) { // 500KB 이상인 이미지만 압축
          console.log(`🖼️ 이미지 최적화 시작: ${file.name} (${fileSizeMB.toFixed(2)}MB)`)
          processedFile = await compressImage(file)
          console.log(`✅ 이미지 최적화 완료: ${processedFile.name}`)
        } else {
          console.log(`💾 작은 이미지 파일 - 압축 생략: ${file.name} (${fileSizeMB.toFixed(2)}MB)`)
        }
      }
      
      // 비디오 파일 검증
      else if (file.type.startsWith('video/')) {
        if (fileSizeMB > 50) { // 50MB 이상 비디오 경고
          console.warn(`⚠️ 큰 비디오 파일: ${file.name} (${fileSizeMB.toFixed(2)}MB)`)
        }
      }
      
      // 문서 파일 검증
      else if (file.type.includes('pdf') || file.type.includes('document')) {
        if (fileSizeMB > 10) { // 10MB 이상 문서 경고
          console.warn(`⚠️ 큰 문서 파일: ${file.name} (${fileSizeMB.toFixed(2)}MB)`)
        }
      }
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        
        reader.onload = () => {
          const result = reader.result as string
          const base64Data = result.split(',')[1] // Base64 데이터만 추출
          
          console.log(`✅ 파일 변환 완료: ${file.name} → ${(base64Data.length / 1024).toFixed(1)}KB`)
          resolve(base64Data)
        }
        
        reader.onerror = (error) => {
          console.error(`❌ 파일 변환 실패: ${file.name}`, error)
          reject(error)
        }
        
        reader.readAsDataURL(processedFile)
      })
      
    } catch (error) {
      console.error(`❌ 파일 처리 중 오류: ${file.name}`, error)
      throw error
    }
  }

  // 📏 스마트 파일 크기 검증 시스템
  const validateFileSize = (file: File, maxSizeMB: number = 10): boolean => {
    const fileSizeMB = file.size / 1024 / 1024
    const fileType = file.type
    
    // 파일 타입별 크기 제한
    const sizeLimits = {
      'image/': 5,      // 이미지: 5MB
      'video/': 50,     // 비디오: 50MB
      'application/pdf': 10, // PDF: 10MB
      'application/': 5, // 문서: 5MB
      'text/': 1        // 텍스트: 1MB
    }
    
    // 파일 타입에 따른 크기 제한 결정
    let limit = maxSizeMB
    for (const [type, sizeLimit] of Object.entries(sizeLimits)) {
      if (fileType.startsWith(type)) {
        limit = sizeLimit
        break
      }
    }
    
    if (fileSizeMB > limit) {
      const fileTypeName = fileType.split('/')[0] === 'image' ? '이미지' :
                          fileType.split('/')[0] === 'video' ? '비디오' :
                          fileType.includes('pdf') ? 'PDF' :
                          fileType.split('/')[0] === 'application' ? '문서' :
                          '파일'
      
      alert(`${fileTypeName} 파일 크기가 너무 큽니다.\n최대 ${limit}MB까지 업로드 가능합니다.\n현재 파일 크기: ${fileSizeMB.toFixed(2)}MB\n파일명: ${file.name}`)
      return false
    }
    
    console.log(`✅ 파일 크기 검증 통과: ${file.name} (${fileSizeMB.toFixed(2)}MB)`)
    return true
  }

  // 파일 업로드 진행 상황 상태
  const [uploadProgress, setUploadProgress] = useState<{
    isUploading: boolean
    currentFile: string
    totalFiles: number
    currentIndex: number
    progress: number
  }>({
    isUploading: false,
    currentFile: '',
    totalFiles: 0,
    currentIndex: 0,
    progress: 0
  })
  
  // 클라이언트 사이드 렌더링 상태
  const [isClient, setIsClient] = useState(false)
  const [memoryUsage, setMemoryUsage] = useState<string>('N/A')
  const [pageLoadTime, setPageLoadTime] = useState<string>('N/A')

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-900">
        <Navigation />
        <main className="pt-20 pb-8 bg-gray-900 min-h-screen">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-6">
        {/* 페이지 헤더 */}
        <div>
          <h1 className="text-3xl font-bold text-white">작업 등록</h1>
          <p className="mt-2 text-gray-400">
            새로운 ECU 튜닝 작업을 등록하고 관리합니다.
          </p>
        </div>

      {/* 🚀 실시간 성능 모니터링 */}
      <div className="mb-4 p-4 bg-gray-800 border border-gray-700 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2 text-sm text-green-400">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>
              ⚡ 성능 최적화 + 실시간 동기화 활성화: 이미지 자동 압축, 캐시 시스템, 데이터 실시간 반영이 적용되었습니다.
            </span>
          </div>
          
          {/* 수동 새로고침 버튼 */}
          <button
            type="button"
            onClick={async () => {
              console.log('🔄 수동 데이터 새로고침 시작...')
              
              // 전체 캐시 강제 삭제
              console.log('🗑️ 전체 캐시 강제 삭제 중...')
              await cacheManager.flush()
              
              // 상태 초기화
              console.log('🔄 상태 초기화 중...')
              setConnectionMethods([])
              setEcuMakers([])
              setAcuManufacturers([])
              setWorkStatus([])
              setEcuModels([])
              setAcuModels([])
              
              // 데이터 강제 새로고침
              await Promise.all([
                loadAllDropdownData(true), // 강제 캐시 무효화
                loadEquipmentCategories(),
                loadCustomers()
              ])
              
              console.log('✅ 수동 데이터 새로고침 완료')
              alert('✅ 모든 데이터가 강제 새로고침되었습니다!\n캐시도 완전히 삭제되었습니다.')
            }}
            className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-colors"
            title="드롭다운 데이터를 즉시 새로고침합니다"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>새로고침</span>
          </button>

          {/* 완전한 페이지 새로고침 버튼 */}
          <button
            type="button"
            onClick={() => {
              console.log('🔄 완전한 페이지 새로고침 실행...')
              window.location.reload()
            }}
            className="flex items-center space-x-1 px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded-md transition-colors"
            title="페이지 전체를 새로고침합니다 (확실한 방법)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>새로고침</span>
          </button>
        </div>
        
        {/* 실시간 성능 메트릭 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="bg-gray-700 p-2 rounded">
            <div className="text-gray-400">메모리 사용량</div>
            <div className="text-green-400 font-mono">
              {isClient ? memoryUsage : 'N/A'}
            </div>
          </div>
          <div className="bg-gray-700 p-2 rounded">
            <div className="text-gray-400">페이지 로드 시간</div>
            <div className="text-blue-400 font-mono">
              {isClient ? pageLoadTime : 'N/A'}
            </div>
          </div>
          <div className="bg-gray-700 p-2 rounded">
            <div className="text-gray-400">캐시 상태</div>
            <div className="text-yellow-400 font-mono">
              {cacheManager ? '활성화' : '비활성화'}
            </div>
          </div>
          <div className="bg-gray-700 p-2 rounded">
            <div className="text-gray-400">이미지 최적화</div>
            <div className="text-purple-400 font-mono">
              WebP 지원
            </div>
          </div>
        </div>
      </div>

      {/* 파일 업로드 진행 상황 */}
      {uploadProgress.isUploading && (
        <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
              <span className="text-blue-300 font-medium">파일 업로드 중...</span>
            </div>
            <span className="text-blue-400 text-sm">
              {uploadProgress.currentIndex}/{uploadProgress.totalFiles}
            </span>
          </div>
          
          <div className="mb-2">
            <div className="text-sm text-blue-300 mb-1">
              현재 파일: {uploadProgress.currentFile}
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress.progress}%` }}
              ></div>
            </div>
          </div>
          
          <div className="text-xs text-blue-400">
            진행률: {uploadProgress.progress}%
          </div>
        </div>
      )}

      {/* 작업 등록 폼 */}
      <div className="bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-white mb-6">새 작업 등록</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 업로드 중 폼 비활성화 */}
          {uploadProgress.isUploading && (
            <div className="absolute inset-0 bg-gray-900/50 rounded-lg flex items-center justify-center z-10">
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                  <span className="text-white">파일 업로드 중... 잠시만 기다려주세요.</span>
                </div>
              </div>
            </div>
          )}
          {/* 고객 및 장비 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="relative" ref={dropdownRef}>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                고객 선택 *
              </label>
              <input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleInputChange}
                onFocus={() => {
                  // 포커스 시 전체 고객 목록 표시
                  setFilteredCustomers(customers)
                  setShowCustomerDropdown(true)
                }}
                className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 px-3 py-3"
                placeholder="고객을 선택하거나 검색하세요..."
                required
                autoComplete="off"
                style={{ imeMode: 'active' }}
                lang="ko"
              />
              
              {/* 고객 자동완성 드롭다운 */}
              {showCustomerDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-gray-700 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                  {isLoadingCustomers ? (
                    <div className="px-4 py-3 text-gray-400 text-center">
                      고객 데이터 로딩 중...
                    </div>
                  ) : filteredCustomers.length > 0 ? (
                    <>
                      {formData.customerName.trim() === '' && (
                        <div className="px-4 py-2 bg-gray-600 text-sm text-gray-300 border-b border-gray-500">
                          전체 고객 목록 ({filteredCustomers.length}명)
                        </div>
                      )}
                      {filteredCustomers.map((customer) => (
                        <div
                          key={customer.id}
                          onClick={() => handleCustomerSelect(customer)}
                          className="px-4 py-3 hover:bg-gray-600 cursor-pointer border-b border-gray-600 last:border-b-0"
                        >
                                                      <div className="font-medium text-white">{customer.name}</div>
                            <div className="text-sm text-gray-300">{customer.phone}</div>
                            <div className="text-xs text-gray-400">{customer.roadAddress}</div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="px-4 py-3 text-gray-400 text-center">
                      {formData.customerName.trim() === '' ? '고객 데이터를 불러오지 못했습니다.' : '검색 결과가 없습니다.'}
                    </div>
                  )}
                </div>
              )}


              {formData.customerId && (
                <div className="mt-2 p-3 bg-blue-900/20 border border-blue-700 rounded-md">
                  <p className="text-sm text-blue-300">
                    📍 {customers.find(c => c.id.toString() === formData.customerId)?.roadAddress}
                  </p>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                장비 선택 *
              </label>
              <CustomDropdown
                name="equipmentId"
                value={formData.equipmentId}
                onChange={(value) => setFormData(prev => ({ ...prev, equipmentId: value }))}
                options={availableEquipment.map(equipment => ({
                  value: equipment.id.toString(),
                  label: `${equipment.equipmentType} - ${equipment.manufacturer} ${equipment.model}`
                }))}
                placeholder={formData.customerId ? '장비를 선택하세요' : '먼저 고객을 선택하세요'}
                disabled={!formData.customerId}
                required={true}
                maxHeight="250px"
              />
              {formData.equipmentId && (
                <div className="mt-2 p-3 bg-green-900/20 border border-green-700 rounded-md">
                  <p className="text-sm text-green-300">
                    🚜 {availableEquipment.find(e => e.id.toString() === formData.equipmentId)?.serialNumber}
                  </p>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                작업 날짜 *
              </label>
              <input
                type="date"
                name="workDate"
                value={formData.workDate}
                onChange={handleInputChange}
                className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-3"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                전체 작업 금액 (자동 계산)
              </label>
              <div className="w-full bg-gray-800 border-gray-600 text-gray-300 rounded-md px-3 py-3 text-center border-2 border-dashed">
                {(() => {
                  // 기존 등록된 작업들의 금액 합계
                  const existingEcuTotal = remappingWorks.reduce((sum, work) => sum + (parseFloat(work.ecu.price) || 0), 0)
                  const existingAcuTotal = remappingWorks.reduce((sum, work) => sum + (parseFloat(work.acu.price) || 0), 0)
                  
                  // 현재 입력 중인 작업의 금액
                  const currentEcuPrice = parseFloat(currentRemappingWork.ecu.price) || 0
                  const currentAcuPrice = parseFloat(currentRemappingWork.acu.price) || 0
                  
                  // 전체 합계
                  const total = existingEcuTotal + existingAcuTotal + currentEcuPrice + currentAcuPrice
                  return total > 0 ? `${Math.floor(total / 10000)}만원` : '0만원'
                })()}
              </div>
              <div className="mt-1 text-xs text-gray-400 text-center">
                ECU 금액 + ACU 금액의 합계
              </div>
            </div>
          </div>

          {/* 등록된 Remapping 작업 목록 */}
          {remappingWorks.length > 0 && (
            <div className="border-t border-gray-600 pt-6">
              <h3 className="text-lg font-medium text-white mb-4">등록된 Remapping 작업 ({remappingWorks.length}개)</h3>
              <div className="space-y-4">
                {remappingWorks.map((work, index) => (
                  <div key={work.id} className="bg-gray-700 border border-gray-600 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-white">Remapping #{index + 1}</h4>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* ECU/튜닝 섹션 */}
                          <div className="space-y-3">
                            <h5 className="font-medium text-blue-300">🔧 ECU/튜닝</h5>
                            
                            {/* 1. 제조사-모델명 (파란색 박스) */}
                                                          <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-3">
                                <div className="text-sm font-medium text-blue-300">
                                {work.ecu.maker && work.ecu.type ? (
                                  `${work.ecu.maker} - ${work.ecu.type}`
                                ) : work.ecu.maker ? (
                                  work.ecu.maker
                                ) : work.ecu.type ? (
                                  work.ecu.type
                                ) : (
                                  <span className="text-blue-500 italic">제조사-모델명 미설정</span>
                                )}
                              </div>
                              {work.ecu.typeCustom && (
                                <div className="text-xs text-blue-700 mt-1">
                                  추가: {work.ecu.typeCustom}
                                </div>
                              )}
                            </div>
                            
                            {/* 2. 작업내용 */}
                            <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-3">
                              <div className="text-xs font-medium text-blue-300 mb-2">작업내용</div>
                              <div className="flex flex-wrap gap-1">
                                {work.ecu.selectedWorks && work.ecu.selectedWorks.length > 0 ? (
                                  work.ecu.selectedWorks.map((workName, idx) => (
                                    <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-800 text-blue-200">
                                      {workName}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-blue-400 italic">작업내용 미설정</span>
                                )}
                              </div>
                              {work.ecu.workDetails && (
                                <div className="mt-2 text-xs text-blue-300">
                                  <span className="font-medium">상세:</span> {work.ecu.workDetails}
                                </div>
                              )}
                            </div>
                            
                            {/* 3. 연결방법 */}
                            <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-3">
                              <div className="text-xs font-medium text-blue-300 mb-1">연결방법</div>
                              <div className="text-sm text-blue-200">
                                {work.ecu.connectionMethod || <span className="text-blue-400 italic">연결방법 미설정</span>}
                              </div>
                            </div>
                            
                            {/* 추가 정보 */}
                            <div className="text-xs text-gray-400 space-y-1">
                              {work.ecu.toolCategory && <div><span className="font-medium">카테고리:</span> {work.ecu.toolCategory}</div>}
                              {work.ecu.price && <div><span className="font-medium">금액:</span> {(parseFloat(work.ecu.price) / 10000).toFixed(1)}만원</div>}
                              {work.ecu.status && <div><span className="font-medium">상태:</span> <span className={`px-2 py-1 rounded-full text-xs ${work.ecu.status === '완료' ? 'bg-green-900 text-green-200' : work.ecu.status === '진행중' ? 'bg-yellow-900 text-yellow-200' : 'bg-gray-700 text-gray-300'}`}>{work.ecu.status}</span></div>}
                            </div>
                          </div>

                          {/* ACU/튜닝 섹션 */}
                          <div className="space-y-3">
                            <h5 className="font-medium text-green-300">⚙️ ACU/튜닝</h5>
                            
                            {/* 1. 제조사-모델명 (초록색 박스) */}
                            <div className="bg-green-900/30 border border-green-600 rounded-lg p-3">
                              <div className="text-sm font-medium text-green-200">
                                {work.acu.manufacturer && work.acu.model ? (
                                  `${work.acu.manufacturer} - ${work.acu.model}`
                                ) : work.acu.manufacturer ? (
                                  work.acu.manufacturer
                                ) : work.acu.model ? (
                                  work.acu.model
                                ) : (
                                  <span className="text-green-400 italic">제조사-모델명 미설정</span>
                                )}
                              </div>
                              {work.acu.modelCustom && (
                                <div className="text-xs text-green-300 mt-1">
                                  추가: {work.acu.modelCustom}
                                </div>
                              )}
                            </div>
                            
                            {/* 2. 작업내용 */}
                            <div className="bg-green-900/30 border border-green-600 rounded-lg p-3">
                              <div className="text-xs font-medium text-green-300 mb-2">작업내용</div>
                              <div className="flex flex-wrap gap-1">
                                {work.acu.selectedWorks && work.acu.selectedWorks.length > 0 ? (
                                  work.acu.selectedWorks.map((workName, idx) => (
                                    <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-800 text-green-200">
                                      {workName}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-green-400 italic">작업내용 미설정</span>
                                )}
                              </div>
                              {work.acu.workDetails && (
                                <div className="mt-2 text-xs text-green-300">
                                  <span className="font-medium">상세:</span> {work.acu.workDetails}
                                </div>
                              )}
                            </div>
                            
                            {/* 3. 연결방법 */}
                            <div className="bg-green-900/30 border border-green-600 rounded-lg p-3">
                              <div className="text-xs font-medium text-green-300 mb-1">연결방법</div>
                              <div className="text-sm text-green-200">
                                {work.acu.connectionMethod || <span className="text-green-400 italic">연결방법 미설정</span>}
                              </div>
                            </div>
                            
                            {/* 추가 정보 */}
                            <div className="text-xs text-gray-400 space-y-1">
                              {work.acu.toolCategory && <div><span className="font-medium">카테고리:</span> {work.acu.toolCategory}</div>}
                              {work.acu.price && <div><span className="font-medium">금액:</span> {(parseFloat(work.acu.price) / 10000).toFixed(1)}만원</div>}
                              {work.acu.status && <div><span className="font-medium">상태:</span> <span className={`px-2 py-1 rounded-full text-xs ${work.acu.status === '완료' ? 'bg-green-900 text-green-200' : work.acu.status === '진행중' ? 'bg-yellow-900 text-yellow-200' : 'bg-gray-700 text-gray-300'}`}>{work.acu.status}</span></div>}
                            </div>
                          </div>
                        </div>

                        {work.notes && (
                          <div className="mt-2">
                            <span className="font-medium text-gray-300">메모:</span>
                            <p className="text-sm text-gray-400 mt-1">{work.notes}</p>
                          </div>
                        )}
                        {/* 첨부 파일 정보 */}
                        <div className="mt-3">
                          <span className="font-medium text-gray-300">첨부 파일:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {/* ECU 파일들 */}
                            {work.files.originalFile && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-900 text-blue-200">🔧 ECU원본</span>}
                            {work.files.stage1File && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-800 text-blue-200">🔧 ECU Stage1</span>}
                            {work.files.stage2File && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-700 text-blue-200">🔧 ECU Stage2</span>}
                            {work.files.stage3File && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-600 text-blue-200">🔧 ECU Stage3</span>}
                            
                            {/* ACU 파일들 */}
                            {work.files.acuOriginalFile && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900 text-green-200">⚙️ ACU원본</span>}
                            {work.files.acuStage1File && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-800 text-green-200">⚙️ ACU Stage1</span>}
                            {work.files.acuStage2File && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-700 text-green-200">⚙️ ACU Stage2</span>}
                            {work.files.acuStage3File && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-600 text-green-200">⚙️ ACU Stage3</span>}
                            
                            {/* 미디어 파일들 표시 */}
                            {(() => {
                              const mediaCount = [1, 2, 3, 4, 5].filter(i => {
                                const fileKey = `mediaFile${i}` as keyof typeof work.files
                                return work.files[fileKey]
                              }).length
                              return mediaCount > 0 && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-900 text-purple-200">📷 미디어({mediaCount})</span>
                            })()}
                          </div>
                          
                          {/* 버킷별 저장 정보 표시 */}
                          <div className="mt-2 text-xs text-gray-400">
                            <div className="flex items-center space-x-4">
                              <span className="flex items-center">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                                work-files: ECU/ACU 파일
                              </span>
                              <span className="flex items-center">
                                <span className="w-2 h-2 bg-purple-500 rounded-full mr-1"></span>
                                work-media: 미디어 파일
                              </span>
                              <span className="flex items-center">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                                work-documents: 문서 파일
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          type="button"
                          onClick={() => handleEditRemappingWork(work)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          편집
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRemappingWork(work.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Remapping 작업 추가/편집 */}
          <div className="border-t border-gray-700 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-white">
                {isEditingRemapping ? 'Remapping 편집' : 'Remapping 추가'}
              </h3>
              {isEditingRemapping && (
                <button
                  type="button"
                  onClick={handleCancelRemappingEdit}
                  className="text-gray-400 hover:text-gray-300 text-sm"
                >
                  편집 취소
                </button>
              )}
            </div>
            
            <div className="space-y-6">
              {/* ECU 섹션 */}
              <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-6">
                <h4 className="text-lg font-medium text-blue-300 mb-4">🔧 ECU 정보</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ECU 장비 카테고리
                    </label>
                    <CustomDropdown
                      value={currentRemappingWork.ecu.toolCategory}
                      onChange={(value) => handleRemappingWorkInputChange('ecu', 'toolCategory', value)}
                      options={ecuCategories.map(category => ({ value: category, label: category }))}
                      placeholder="장비 카테고리를 선택하세요"
                      maxHeight="250px"
                      onDelete={handleDeleteEcuCategory}
                      deletableOptions={ecuCategories.filter(category => category !== '직접입력')}
                      deleteButtonColor="text-red-400 hover:text-red-600"
                    />
                    
                    {/* 직접입력 선택 시 새 카테고리 추가 필드 */}
                    {currentRemappingWork.ecu.toolCategory === '직접입력' && (
                      <div className="mt-2 flex space-x-2">
                        <input
                          type="text"
                          value={currentRemappingWork.ecu.toolCategoryCustom || ''}
                          onChange={(e) => handleRemappingWorkInputChange('ecu', 'toolCategoryCustom', e.target.value)}
                          className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          placeholder="새로운 ECU 카테고리를 입력하세요"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            const customCategory = currentRemappingWork.ecu.toolCategoryCustom?.trim()
                            if (customCategory) {
                              await addNewEcuCategory(customCategory)
                              handleRemappingWorkInputChange('ecu', 'toolCategory', customCategory)
                              handleRemappingWorkInputChange('ecu', 'toolCategoryCustom', '')
                            }
                          }}
                          className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
                          title="카테고리 목록에 추가하고 선택"
                        >
                          추가
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      연결 방법
                    </label>
                    <CustomDropdown
                      value={currentRemappingWork.ecu.connectionMethod}
                      onChange={(value) => handleRemappingWorkInputChange('ecu', 'connectionMethod', value)}
                      options={connectionMethods.map(method => ({ value: method, label: method }))}
                      placeholder="연결 방법을 선택하세요"
                      maxHeight="250px"
                      onDelete={handleDeleteConnectionMethod}
                      deletableOptions={connectionMethods.filter(method => method !== '직접입력')}
                      deleteButtonColor="text-red-400 hover:text-red-600"
                    />
                    
                    {/* 직접입력 선택 시 새 연결방법 추가 필드 */}
                    {currentRemappingWork.ecu.connectionMethod === '직접입력' && (
                      <div className="mt-2 flex space-x-2">
                        <input
                          type="text"
                          value={currentRemappingWork.ecu.connectionMethodCustom || ''}
                          onChange={(e) => handleRemappingWorkInputChange('ecu', 'connectionMethodCustom', e.target.value)}
                          className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          placeholder="새로운 연결방법을 입력하세요"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            const customMethod = currentRemappingWork.ecu.connectionMethodCustom?.trim()
                            if (customMethod) {
                              await addNewConnectionMethod(customMethod)
                              handleRemappingWorkInputChange('ecu', 'connectionMethod', customMethod)
                              handleRemappingWorkInputChange('ecu', 'connectionMethodCustom', '')
                            }
                          }}
                          className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
                          title="연결방법 목록에 추가하고 선택"
                        >
                          추가
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ECU 제조사
                    </label>
                    <CustomDropdown
                      value={currentRemappingWork.ecu.maker}
                      onChange={(value) => handleRemappingWorkInputChange('ecu', 'maker', value)}
                      options={ecuMakers.map(maker => ({ value: maker, label: maker }))}
                      placeholder="ECU 제조사를 선택하세요"
                      maxHeight="250px"
                      onDelete={handleDeleteEcuMaker}
                      deletableOptions={ecuMakers.filter(maker => maker !== '직접입력')}
                      deleteButtonColor="text-red-400 hover:text-red-600"
                    />
                    
                    {/* 직접입력 선택 시 새 제조사 추가 필드 */}
                    {currentRemappingWork.ecu.maker === '직접입력' && (
                      <div className="mt-2 flex space-x-2">
                        <input
                          type="text"
                          value={currentRemappingWork.ecu.makerCustom || ''}
                          onChange={(e) => handleRemappingWorkInputChange('ecu', 'makerCustom', e.target.value)}
                          className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          placeholder="새로운 ECU 제조사를 입력하세요"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            const customMaker = currentRemappingWork.ecu.makerCustom?.trim()
                            if (customMaker) {
                              await addNewEcuMaker(customMaker)
                              handleRemappingWorkInputChange('ecu', 'maker', customMaker)
                              handleRemappingWorkInputChange('ecu', 'makerCustom', '')
                            }
                          }}
                          className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
                          title="ECU 제조사 목록에 추가하고 선택"
                        >
                          추가
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-300">
                        ECU 모델
                      </label>
                    </div>
                    <CustomDropdown
                      value={currentRemappingWork.ecu.type}
                      onChange={(value) => handleRemappingWorkInputChange('ecu', 'type', value)}
                      options={ecuModels.map(type => ({ value: type, label: type }))}
                      placeholder="ECU 모델을 선택하세요"
                      maxHeight="250px"
                      onDelete={handleDeleteEcuModel}
                      deletableOptions={ecuModels.filter(model => model !== '직접입력')}
                      deleteButtonColor="text-red-400 hover:text-red-600"
                    />
                    
                    {/* 직접입력 선택 시 새 모델 추가 필드 */}
                    {currentRemappingWork.ecu.type === '직접입력' && (
                      <div className="mt-2 flex space-x-2">
                        <input
                          type="text"
                          value={currentRemappingWork.ecu.typeCustom || ''}
                          onChange={(e) => handleRemappingWorkInputChange('ecu', 'typeCustom', e.target.value)}
                          className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          placeholder="새로운 ECU 모델을 입력하세요"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const customModel = currentRemappingWork.ecu.typeCustom?.trim()
                            if (customModel) {
                              addNewEcuModel(customModel)
                              handleRemappingWorkInputChange('ecu', 'type', customModel)
                              handleRemappingWorkInputChange('ecu', 'typeCustom', '')
                            }
                          }}
                          className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
                          title="ECU 모델 목록에 추가하고 선택"
                        >
                          추가
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ECU 작업 상태
                    </label>
                    <CustomDropdown
                      value={currentRemappingWork.ecu.status}
                      onChange={(value) => handleRemappingWorkInputChange('ecu', 'status', value)}
                      options={workStatus.map(status => ({ value: status, label: status }))}
                      placeholder="작업 상태를 선택하세요"
                      maxHeight="250px"
                      onDelete={handleDeleteWorkStatus}
                      deletableOptions={workStatus.filter(status => status !== '직접입력')}
                      deleteButtonColor="text-red-400 hover:text-red-600"
                    />
                    
                    {/* 직접입력 선택 시 새 상태 추가 필드 */}
                    {currentRemappingWork.ecu.status === '직접입력' && (
                      <div className="mt-2 flex space-x-2">
                        <input
                          type="text"
                          value={currentRemappingWork.ecu.statusCustom || ''}
                          onChange={(e) => handleRemappingWorkInputChange('ecu', 'statusCustom', e.target.value)}
                          className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          placeholder="새로운 작업 상태를 입력하세요"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const customStatus = currentRemappingWork.ecu.statusCustom?.trim()
                            if (customStatus) {
                              addNewWorkStatus(customStatus)
                              handleRemappingWorkInputChange('ecu', 'status', customStatus)
                              handleRemappingWorkInputChange('ecu', 'statusCustom', '')
                            }
                          }}
                          className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
                          title="작업 상태 목록에 추가하고 선택"
                        >
                          추가
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ECU 작업 금액 (만원)
                    </label>
                    <input
                      type="text"
                      value={currentRemappingWork.ecu.price ? `${Math.floor(parseFloat(currentRemappingWork.ecu.price) / 10000)}(만원)` : ''}
                      onChange={(e) => {
                        const inputValue = e.target.value.replace(/[^\d]/g, '')
                        handleRemappingWorkInputChange('ecu', 'price', inputValue)
                      }}
                      className="w-full h-12 bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-white px-3 py-3 text-center"
                      placeholder="35(만원)"
                    />
                    <div className="mt-1 text-xs text-gray-400 text-center">
                      만원 단위 (예: 35 → 35만원)
                    </div>
                  </div>
                </div>

                {/* ECU 작업 상세 정보 */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    ECU 작업 상세 정보
                  </label>
                  <textarea
                    value={currentRemappingWork.ecu.workDetails}
                    onChange={(e) => handleRemappingWorkInputChange('ecu', 'workDetails', e.target.value)}
                    rows={3}
                    className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ECU 작업 내용, 특이사항, 주의사항 등을 상세히 입력하세요..."
                  />
                </div>
              </div>

              {/* ACU 섹션 */}
              <div className="bg-green-900/30 border border-green-600 rounded-lg p-6">
                <h4 className="text-lg font-medium text-green-300 mb-4">⚙️ ACU 정보</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ACU 장비 카테고리
                    </label>
                    <CustomDropdown
                      value={currentRemappingWork.acu.toolCategory}
                      onChange={(value) => handleRemappingWorkInputChange('acu', 'toolCategory', value)}
                      options={ecuCategories.map(category => ({ value: category, label: category }))}
                      placeholder="장비 카테고리를 선택하세요"
                      maxHeight="250px"
                      onDelete={handleDeleteEcuCategory}
                      deletableOptions={ecuCategories.filter(category => category !== '직접입력')}
                      deleteButtonColor="text-red-400 hover:text-red-600"
                    />
                    
                    {/* 직접입력 선택 시 새 카테고리 추가 필드 */}
                    {currentRemappingWork.acu.toolCategory === '직접입력' && (
                      <div className="mt-2 flex space-x-2">
                        <input
                          type="text"
                          value={currentRemappingWork.acu.toolCategoryCustom || ''}
                          onChange={(e) => handleRemappingWorkInputChange('acu', 'toolCategoryCustom', e.target.value)}
                          className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                          placeholder="새로운 ACU 카테고리를 입력하세요"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            const customCategory = currentRemappingWork.acu.toolCategoryCustom?.trim()
                            if (customCategory) {
                              await addNewEcuCategory(customCategory)
                              handleRemappingWorkInputChange('acu', 'toolCategory', customCategory)
                              handleRemappingWorkInputChange('acu', 'toolCategoryCustom', '')
                            }
                          }}
                          className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
                          title="카테고리 목록에 추가하고 선택"
                        >
                          추가
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      연결 방법
                    </label>
                    <CustomDropdown
                      value={currentRemappingWork.acu.connectionMethod}
                      onChange={(value) => handleRemappingWorkInputChange('acu', 'connectionMethod', value)}
                      options={connectionMethods.map(method => ({ value: method, label: method }))}
                      placeholder="연결 방법을 선택하세요"
                      maxHeight="250px"
                      onDelete={handleDeleteConnectionMethod}
                      deletableOptions={connectionMethods.filter(method => method !== '직접입력')}
                      deleteButtonColor="text-red-400 hover:text-red-600"
                    />
                    
                    {/* 직접입력 선택 시 새 연결방법 추가 필드 */}
                    {currentRemappingWork.acu.connectionMethod === '직접입력' && (
                      <div className="mt-2 flex space-x-2">
                        <input
                          type="text"
                          value={currentRemappingWork.acu.connectionMethodCustom || ''}
                          onChange={(e) => handleRemappingWorkInputChange('acu', 'connectionMethodCustom', e.target.value)}
                          className="flex-1 bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                          placeholder="새로운 연결방법을 입력하세요"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const customMethod = currentRemappingWork.acu.connectionMethodCustom?.trim()
                            if (customMethod) {
                              addNewConnectionMethod(customMethod)
                              handleRemappingWorkInputChange('acu', 'connectionMethod', customMethod)
                              handleRemappingWorkInputChange('acu', 'connectionMethodCustom', '')
                            }
                          }}
                          className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
                          title="연결방법 목록에 추가하고 선택"
                        >
                          추가
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ACU 제조사
                    </label>
                    <CustomDropdown
                      value={currentRemappingWork.acu.manufacturer}
                      onChange={(value) => handleRemappingWorkInputChange('acu', 'manufacturer', value)}
                      options={acuManufacturers.map(manufacturer => ({ value: manufacturer, label: manufacturer }))}
                      placeholder="ACU 제조사를 선택하세요"
                      maxHeight="250px"
                      onDelete={handleDeleteAcuManufacturer}
                      deletableOptions={acuManufacturers.filter(manufacturer => manufacturer !== '직접입력')}
                      deleteButtonColor="text-red-400 hover:text-red-600"
                    />
                    
                    {/* 직접입력 선택 시 새 제조사 추가 필드 */}
                    {currentRemappingWork.acu.manufacturer === '직접입력' && (
                      <div className="mt-2 flex space-x-2">
                        <input
                          type="text"
                          value={currentRemappingWork.acu.manufacturerCustom || ''}
                          onChange={(e) => handleRemappingWorkInputChange('acu', 'manufacturerCustom', e.target.value)}
                          className="flex-1 bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                          placeholder="새로운 ACU 제조사를 입력하세요"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const customManufacturer = currentRemappingWork.acu.manufacturerCustom?.trim()
                            if (customManufacturer) {
                              addNewAcuManufacturer(customManufacturer)
                              handleRemappingWorkInputChange('acu', 'manufacturer', customManufacturer)
                              handleRemappingWorkInputChange('acu', 'manufacturerCustom', '')
                            }
                          }}
                          className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
                          title="ACU 제조사 목록에 추가하고 선택"
                        >
                          추가
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-300">
                        ACU 모델
                      </label>

                    </div>
                    <CustomDropdown
                      value={currentRemappingWork.acu.model}
                      onChange={(value) => handleRemappingWorkInputChange('acu', 'model', value)}
                      options={acuModels.map(model => ({ value: model, label: model }))}
                      placeholder="ACU 모델을 선택하세요"
                      maxHeight="250px"
                      onDelete={handleDeleteAcuModel}
                      deletableOptions={acuModels.filter(model => model !== '직접입력')}
                      deleteButtonColor="text-red-400 hover:text-red-600"
                    />
                    
                    {/* 직접입력 선택 시 새 모델 추가 필드 */}
                    {currentRemappingWork.acu.model === '직접입력' && (
                      <div className="mt-2 flex space-x-2">
                        <input
                          type="text"
                          value={currentRemappingWork.acu.modelCustom || ''}
                          onChange={(e) => handleRemappingWorkInputChange('acu', 'modelCustom', e.target.value)}
                          className="flex-1 bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                          placeholder="새로운 ACU 모델을 입력하세요"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            const customModel = currentRemappingWork.acu.modelCustom?.trim()
                            if (customModel) {
                              await addNewAcuModel(customModel)
                              handleRemappingWorkInputChange('acu', 'model', customModel)
                              handleRemappingWorkInputChange('acu', 'modelCustom', '')
                            }
                          }}
                          className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
                          title="ACU 모델 목록에 추가하고 선택"
                        >
                          추가
                        </button>
                      </div>
                    )}

                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ACU 작업 상태
                    </label>
                    <CustomDropdown
                      value={currentRemappingWork.acu.status}
                      onChange={(value) => handleRemappingWorkInputChange('acu', 'status', value)}
                      options={workStatus.map(status => ({ value: status, label: status }))}
                      placeholder="작업 상태를 선택하세요"
                      maxHeight="250px"
                      onDelete={handleDeleteWorkStatus}
                      deletableOptions={workStatus.filter(status => status !== '직접입력')}
                      deleteButtonColor="text-red-400 hover:text-red-600"
                    />
                    
                    {/* 직접입력 선택 시 새 상태 추가 필드 */}
                    {currentRemappingWork.acu.status === '직접입력' && (
                      <div className="mt-2 flex space-x-2">
                        <input
                          type="text"
                          value={currentRemappingWork.acu.statusCustom || ''}
                          onChange={(e) => handleRemappingWorkInputChange('acu', 'statusCustom', e.target.value)}
                          className="flex-1 bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                          placeholder="새로운 작업 상태를 입력하세요"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const customStatus = currentRemappingWork.acu.statusCustom?.trim()
                            if (customStatus) {
                              addNewWorkStatus(customStatus)
                              handleRemappingWorkInputChange('acu', 'status', customStatus)
                              handleRemappingWorkInputChange('acu', 'statusCustom', '')
                            }
                          }}
                          className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
                          title="작업 상태 목록에 추가하고 선택"
                        >
                          추가
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ACU 작업 금액 (만원)
                    </label>
                    <input
                      type="text"
                      value={currentRemappingWork.acu.price ? `${Math.floor(parseFloat(currentRemappingWork.acu.price) / 10000)}(만원)` : ''}
                      onChange={(e) => {
                        const inputValue = e.target.value.replace(/[^\d]/g, '')
                        handleRemappingWorkInputChange('acu', 'price', inputValue)
                      }}
                      className="w-full h-12 bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-white px-3 py-3 text-center"
                      placeholder="25(만원)"
                    />
                    <div className="mt-1 text-xs text-gray-400 text-center">
                      만원 단위 (예: 25 → 25만원)
                    </div>
                  </div>
                </div>

                {/* ACU 작업 상세 정보 */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    ACU 작업 상세 정보
                  </label>
                  <textarea
                    value={currentRemappingWork.acu.workDetails}
                    onChange={(e) => handleRemappingWorkInputChange('acu', 'workDetails', e.target.value)}
                    rows={3}
                    className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                    placeholder="ACU 작업 내용, 특이사항, 주의사항 등을 상세히 입력하세요..."
                  />
                </div>
              </div>

              {/* 공통 정보 섹션 */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-8">
                <h4 className="text-lg font-medium text-white mb-6">📝 공통 정보</h4>
                
                {/* 작업 메모 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    작업 메모
                  </label>
                  <textarea
                    value={currentRemappingWork.notes}
                    onChange={(e) => handleRemappingWorkInputChange('general', 'notes', e.target.value)}
                    rows={3}
                    className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500 p-3"
                    placeholder="이 Remapping 작업에 대한 간단한 메모를 입력하세요..."
                  />
                </div>

                {/* 튜닝 작업 선택 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-5">
                    튜닝 작업 선택 (다중 선택 가능)
                  </label>
                  
                  {/* 선택된 작업 요약 */}
                  {(currentRemappingWork.ecu.selectedWorks.length > 0 || currentRemappingWork.acu.selectedWorks.length > 0) && (
                    <div className="mb-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
                      <div className="text-sm font-medium text-white mb-3">
                        선택된 작업 (ECU: {currentRemappingWork.ecu.selectedWorks.length}개, ACU: {currentRemappingWork.acu.selectedWorks.length}개):
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs font-medium text-blue-300 mb-2">🔧 ECU 작업:</div>
                          <div className="flex flex-wrap gap-2">
                            {currentRemappingWork.ecu.selectedWorks.map((work, index) => (
                              <span key={index} className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-blue-900 text-blue-200">
                                {work}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-green-300 mb-2">⚙️ ACU 작업:</div>
                          <div className="flex flex-wrap gap-2">
                            {currentRemappingWork.acu.selectedWorks.map((work, index) => (
                              <span key={index} className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-green-900 text-green-200">
                                {work}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* 카테고리별 작업 선택 */}
                  <div className="space-y-5">
                    {TUNING_CATEGORIES.map((category) => {
                      const categoryWorks = TUNING_WORKS_BY_CATEGORY[category as keyof typeof TUNING_WORKS_BY_CATEGORY] || []
                      const selectedInCategory = workSelections[category] || []
                      const isAllSelected = categoryWorks.length > 0 && categoryWorks.every(work => selectedInCategory.includes(work))
                      const isPartialSelected = selectedInCategory.length > 0 && !isAllSelected
                      const borderColor = category === 'ECU/튜닝' ? 'border-blue-600' : 'border-green-600'
                      const bgColor = category === 'ECU/튜닝' ? 'bg-blue-900/30' : 'bg-green-900/30'
                      const textColor = category === 'ECU/튜닝' ? 'text-blue-300' : 'text-green-300'
                      
                      return (
                        <div key={category} className={`border ${borderColor} ${bgColor} rounded-lg p-5`}>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id={`category-${category}`}
                                checked={isAllSelected}
                                ref={(el) => {
                                  if (el) el.indeterminate = isPartialSelected
                                }}
                                onChange={() => handleCategoryToggle(category)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <label htmlFor={`category-${category}`} className={`ml-2 text-sm font-medium ${textColor}`}>
                                {category === 'ECU/튜닝' ? '🔧 ' : '⚙️ '}{category}
                              </label>
                            </div>
                            <span className="text-xs text-gray-400">
                              {selectedInCategory.length}/{categoryWorks.length} 선택됨
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ml-6">
                            {categoryWorks.map((work) => {
                              return (
                                <label key={work} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={selectedInCategory.includes(work)}
                                    onChange={() => handleWorkSelection(category, work)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                  <span className="ml-2 text-sm text-gray-300">{work}</span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* 파일 첨부 섹션 */}
              <div className="mt-10 border-t border-gray-700 pt-8">
                <h4 className="text-lg font-medium text-white mb-6">📁 파일 첨부</h4>
                <div className="space-y-8">
                  {/* 원본 ECU 파일 */}
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      📁 원본 ECU 폴더 (최대 5개 파일)
                    </label>
                    <div className="flex items-center space-x-3 mb-3">
                      <input
                        type="file"
                        id="original-file"
                        className="hidden"
                        accept="*"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || [])
                          if (files.length > 5) {
                            alert('최대 5개 파일까지만 선택할 수 있습니다.')
                            return
                          }
                          handleFileChange('originalFile', files)
                        }}
                      />
                      <label
                        htmlFor="original-file"
                        className="flex items-center justify-center px-6 py-3 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-gray-700 transition-colors"
                      >
                        <svg className="w-6 h-6 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-sm text-gray-300">
                          {Array.isArray(currentRemappingWork.files.originalFile) 
                            ? `📄 ${(currentRemappingWork.files.originalFile as File[]).length}개 파일 선택됨` 
                            : '📄 원본 ECU 파일 선택 (최대 5개)'}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          모든 파일 형식 지원 (ZIP 포함)
                        </div>
                      </label>
                    </div>
                    {/* 선택된 파일 목록 표시 */}
                    {Array.isArray(currentRemappingWork.files.originalFile) && (currentRemappingWork.files.originalFile as File[]).length > 0 && (
                      <div className="mb-3 p-3 bg-gray-700 rounded-lg">
                        <div className="text-xs text-gray-400 mb-2">선택된 파일들:</div>
                        {(currentRemappingWork.files.originalFile as File[]).map((file, index) => (
                          <div key={index} className="text-sm text-gray-300 flex items-center justify-between">
                            <span>📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (Array.isArray(currentRemappingWork.files.originalFile)) {
                                  const newFiles = currentRemappingWork.files.originalFile as File[]
                                  const updatedFiles = newFiles.filter((_, i) => i !== index)
                                  handleFileChange('originalFile', updatedFiles.length > 0 ? updatedFiles : null)
                                }
                              }}
                              className="text-red-400 hover:text-red-300 text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <input
                      type="text"
                      value={currentRemappingWork.files.originalFileDescription || ''}
                      onChange={(e) => handleFileDescriptionChange('originalFileDescription', e.target.value)}
                      placeholder="폴더 설명을 입력하세요 (예: 원본 백업 폴더, 읽기 전용 등)"
                      className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3"
                    />

                  </div>

                  {/* Stage 파일들 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* 1차 튜닝 */}
                    <div className="border border-green-600 rounded-lg p-5 bg-green-900/30">
                      <label className="block text-sm font-medium text-green-300 mb-3">
                        📈 엔진 ECU 1차 튜닝
                      </label>
                      <div className="flex items-center space-x-3 mb-3">
                        <input
                          type="file"
                          id="stage1-file"
                          className="hidden"
                          accept="*"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null
                            handleFileChange('stage1File', file)
                          }}
                        />
                        <label
                          htmlFor="stage1-file"
                          className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-green-600 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-900/50 transition-colors text-sm w-full"
                        >
                          <span className="text-green-300">
                            {currentRemappingWork.files.stage1File 
                              ? `📄 ${(currentRemappingWork.files.stage1File as File).name} (${((currentRemappingWork.files.stage1File as File).size / 1024).toFixed(1)} KB)` 
                              : '📄 엔진 ECU 1차 튜닝 파일 선택'}
                          </span>
                          <div className="text-xs text-green-500 mt-1">
                            모든 파일 형식 지원
                          </div>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={currentRemappingWork.files.stage1FileDescription || ''}
                        onChange={(e) => handleFileDescriptionChange('stage1FileDescription', e.target.value)}
                        placeholder="엔진 ECU 1차 튜닝 설명을 입력하세요"
                        className="w-full bg-gray-700 border-green-600 text-white rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-sm p-3 h-12"
                      />
                    </div>

                    {/* 2차 튜닝 */}
                    <div className="border border-yellow-600 rounded-lg p-5 bg-yellow-900/30">
                      <label className="block text-sm font-medium text-yellow-300 mb-3">
                        🚀 엔진 ECU 2차 튜닝
                      </label>
                      <div className="flex items-center space-x-3 mb-3">
                        <input
                          type="file"
                          id="stage2-file"
                          className="hidden"
                          accept="*"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null
                            handleFileChange('stage2File', file)
                          }}
                        />
                        <label
                          htmlFor="stage2-file"
                          className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-yellow-600 rounded-lg cursor-pointer hover:border-yellow-500 hover:bg-yellow-900/50 transition-colors text-sm w-full"
                        >
                          <span className="text-yellow-300">
                            {currentRemappingWork.files.stage2File 
                              ? `📄 ${(currentRemappingWork.files.stage2File as File).name} (${((currentRemappingWork.files.stage2File as File).size / 1024).toFixed(1)} KB)` 
                              : '📄 엔진 ECU 2차 튜닝 파일 선택'}
                          </span>
                          <div className="text-xs text-yellow-500 mt-1">
                            모든 파일 형식 지원
                          </div>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={currentRemappingWork.files.stage2FileDescription || ''}
                        onChange={(e) => handleFileDescriptionChange('stage2FileDescription', e.target.value)}
                        placeholder="엔진 ECU 2차 튜닝 설명을 입력하세요"
                        className="w-full bg-gray-700 border-yellow-600 text-white rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 text-sm p-3 h-12"
                      />
                    </div>

                    {/* 3차 튜닝 */}
                    <div className="border border-red-600 rounded-lg p-5 bg-red-900/30">
                      <label className="block text-sm font-medium text-red-300 mb-3">
                        🔥 엔진 ECU 3차 튜닝
                      </label>
                      <div className="flex items-center space-x-3 mb-3">
                        <input
                          type="file"
                          id="stage3-file"
                          className="hidden"
                          accept="*"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null
                            handleFileChange('stage3File', file)
                          }}
                        />
                        <label
                          htmlFor="stage3-file"
                          className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-red-600 rounded-lg cursor-pointer hover:border-red-500 hover:bg-red-900/50 transition-colors text-sm w-full"
                        >
                          <span className="text-red-300">
                            {currentRemappingWork.files.stage3File 
                              ? `📄 ${(currentRemappingWork.files.stage3File as File).name} (${((currentRemappingWork.files.stage3File as File).size / 1024).toFixed(1)} KB)` 
                              : '📄 엔진 ECU 3차 튜닝 파일 선택'}
                          </span>
                          <div className="text-xs text-red-500 mt-1">
                            모든 파일 형식 지원
                          </div>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={currentRemappingWork.files.stage3FileDescription || ''}
                        onChange={(e) => handleFileDescriptionChange('stage3FileDescription', e.target.value)}
                        placeholder="엔진 ECU 3차 튜닝 설명을 입력하세요"
                        className="w-full bg-gray-700 border-red-600 text-white rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 text-sm p-3 h-12"
                      />
                    </div>
                  </div>

                  {/* ACU 파일 업로드 섹션 */}
                  <div className="border-t border-gray-600 pt-8">
                    <h5 className="text-lg font-medium text-white mb-6">⚙️ ACU 파일 업로드</h5>
                    
                    {/* 원본 ACU 파일 */}
                    <div className="mb-8 bg-gray-800 border border-gray-700 rounded-lg p-6">
                      <label className="block text-sm font-medium text-gray-300 mb-3">
                        📁 원본 ACU 폴더 (최대 5개 파일)
                      </label>
                      <div className="flex items-center space-x-3 mb-2">
                        <input
                          type="file"
                          id="acu-original-file"
                          className="hidden"
                          accept="*"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || [])
                            if (files.length > 5) {
                              alert('최대 5개 파일까지만 선택할 수 있습니다.')
                              return
                            }
                            handleFileChange('acuOriginalFile', files)
                          }}
                        />
                        <label
                          htmlFor="acu-original-file"
                          className="flex items-center justify-center px-4 py-2 border-2 border-dashed border-green-600 rounded-lg cursor-pointer hover:border-green-400 hover:bg-gray-700 transition-colors"
                        >
                          <svg className="w-6 h-6 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="text-sm text-green-300">
                            {Array.isArray(currentRemappingWork.files.acuOriginalFile) 
                              ? `📄 ${(currentRemappingWork.files.acuOriginalFile as File[]).length}개 파일 선택됨` 
                              : '📄 ACU 원본 파일 선택 (최대 5개)'}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            모든 파일 형식 지원 (ZIP 포함)
                          </div>
                        </label>
                      </div>
                      {/* 선택된 파일 목록 표시 */}
                      {Array.isArray(currentRemappingWork.files.acuOriginalFile) && (currentRemappingWork.files.acuOriginalFile as File[]).length > 0 && (
                        <div className="mb-3 p-3 bg-gray-700 rounded-lg">
                          <div className="text-xs text-gray-400 mb-2">선택된 파일들:</div>
                          {(currentRemappingWork.files.acuOriginalFile as File[]).map((file, index) => (
                            <div key={index} className="text-sm text-gray-300 flex items-center justify-between">
                              <span>📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (Array.isArray(currentRemappingWork.files.acuOriginalFile)) {
                                    const newFiles = currentRemappingWork.files.acuOriginalFile as File[]
                                    const updatedFiles = newFiles.filter((_, i) => i !== index)
                                    handleFileChange('acuOriginalFile', updatedFiles.length > 0 ? updatedFiles : null)
                                  }
                                }}
                                className="text-red-400 hover:text-red-300 text-xs"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <input
                        type="text"
                        value={currentRemappingWork.files.acuOriginalFileDescription || ''}
                        onChange={(e) => handleFileDescriptionChange('acuOriginalFileDescription', e.target.value)}
                        placeholder="ACU 폴더 설명을 입력하세요 (예: 원본 백업 폴더, 읽기 전용 등)"
                        className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 p-3 h-12"
                      />

                    </div>

                    {/* ACU Stage 파일들 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      {/* ACU 1차 튜닝 */}
                      <div className="border border-green-600 rounded-lg p-4 bg-green-900/30">
                        <label className="block text-sm font-medium text-green-300 mb-2">
                          ⚙️ ACU 1차 튜닝
                        </label>
                        <div className="flex items-center space-x-3 mb-2">
                          <input
                            type="file"
                            id="acu-stage1-file"
                            className="hidden"
                            accept="*"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null
                              handleFileChange('acuStage1File', file)
                            }}
                          />
                          <label
                            htmlFor="acu-stage1-file"
                            className="flex items-center justify-center px-3 py-2 border-2 border-dashed border-green-600 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-900/50 transition-colors text-xs w-full"
                          >
                            <span className="text-green-300">
                              {currentRemappingWork.files.acuStage1File 
                                ? `⚙️ ${(currentRemappingWork.files.acuStage1File as File).name} (${((currentRemappingWork.files.acuStage1File as File).size / 1024).toFixed(1)} KB)` 
                                : '⚙️ ACU 1차 튜닝 파일 선택'}
                            </span>
                            <div className="text-xs text-green-500 mt-1">
                              모든 파일 형식 지원
                            </div>
                          </label>
                        </div>
                        <input
                          type="text"
                          value={currentRemappingWork.files.acuStage1FileDescription || ''}
                          onChange={(e) => handleFileDescriptionChange('acuStage1FileDescription', e.target.value)}
                          placeholder="ACU 1차 튜닝 설명을 입력하세요"
                          className="w-full bg-gray-700 border-green-600 text-white rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-sm p-3 h-12"
                        />
                      </div>

                      {/* ACU 2차 튜닝 */}
                      <div className="border border-green-600 rounded-lg p-4 bg-green-900/30">
                        <label className="block text-sm font-medium text-green-300 mb-2">
                          ⚙️ ACU 2차 튜닝
                        </label>
                        <div className="flex items-center space-x-3 mb-2">
                          <input
                            type="file"
                            id="acu-stage2-file"
                            className="hidden"
                            accept="*"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null
                              handleFileChange('acuStage2File', file)
                            }}
                          />
                          <label
                            htmlFor="acu-stage2-file"
                            className="flex items-center justify-center px-3 py-2 border-2 border-dashed border-green-600 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-900/50 transition-colors text-xs w-full"
                          >
                            <span className="text-green-300">
                              {currentRemappingWork.files.acuStage2File 
                                ? `⚙️ ${(currentRemappingWork.files.acuStage2File as File).name} (${((currentRemappingWork.files.acuStage2File as File).size / 1024).toFixed(1)} KB)` 
                                : '⚙️ ACU 2차 튜닝 파일 선택'}
                            </span>
                            <div className="text-xs text-green-500 mt-1">
                              모든 파일 형식 지원
                            </div>
                          </label>
                        </div>
                        <input
                          type="text"
                          value={currentRemappingWork.files.acuStage2FileDescription || ''}
                          onChange={(e) => handleFileDescriptionChange('acuStage2FileDescription', e.target.value)}
                          placeholder="ACU 2차 튜닝 설명을 입력하세요"
                          className="w-full bg-gray-700 border-green-600 text-white rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-sm p-3 h-12"
                        />
                      </div>

                      {/* ACU 3차 튜닝 */}
                      <div className="border border-green-600 rounded-lg p-4 bg-green-900/30">
                        <label className="block text-sm font-medium text-green-300 mb-2">
                          ⚙️ ACU 3차 튜닝
                        </label>
                        <div className="flex items-center space-x-3 mb-2">
                          <input
                            type="file"
                            id="acu-stage3-file"
                            className="hidden"
                            accept="*"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null
                              handleFileChange('acuStage3File', file)
                            }}
                          />
                          <label
                            htmlFor="acu-stage3-file"
                            className="flex items-center justify-center px-3 py-2 border-2 border-dashed border-green-600 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-900/50 transition-colors text-xs w-full"
                          >
                            <span className="text-green-300">
                              {currentRemappingWork.files.acuStage3File 
                                ? `⚙️ ${(currentRemappingWork.files.acuStage3File as File).name} (${((currentRemappingWork.files.acuStage3File as File).size / 1024).toFixed(1)} KB)` 
                                : '⚙️ ACU 3차 튜닝 파일 선택'}
                            </span>
                            <div className="text-xs text-green-500 mt-1">
                              모든 파일 형식 지원
                            </div>
                          </label>
                        </div>
                        <input
                          type="text"
                          value={currentRemappingWork.files.acuStage3FileDescription || ''}
                          onChange={(e) => handleFileDescriptionChange('acuStage3FileDescription', e.target.value)}
                          placeholder="ACU 3차 튜닝 설명을 입력하세요"
                          className="w-full bg-gray-700 border-green-600 text-white rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-sm p-3 h-12"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 사진/영상 첨부 (5개) */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-4">
                      📷 사진/영상 첨부 (최대 5개, 각 파일 최대 50MB)
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                      {[1, 2, 3, 4, 5].map((index) => {
                        const fileKey = `mediaFile${index}` as keyof typeof currentRemappingWork.files
                        const descKey = `mediaFile${index}Description` as keyof typeof currentRemappingWork.files
                        const file = currentRemappingWork.files[fileKey] as File | undefined
                        const description = currentRemappingWork.files[descKey] as string | undefined
                        
                        return (
                          <div key={index} className="border border-purple-600 rounded-lg p-3 bg-purple-900/30">
                            <label className="block text-xs font-medium text-purple-300 mb-2">
                              📷 미디어 {index}
                            </label>
                            
                            {/* 파일 선택 및 미리보기 */}
                            <div className="mb-2">
                              <input
                                type="file"
                                id={`media-file-${index}`}
                                className="hidden"
                                accept="*"
                                onChange={(e) => {
                                  const selectedFile = e.target.files?.[0] || null
                                  handleFileChange(`mediaFile${index}`, selectedFile)
                                }}
                              />
                              
                              {/* 미리보기 영역 */}
                              {file ? (
                                <div className="relative">
                                  {file.type.startsWith('image/') ? (
                                    <div className="relative">
                                      <img
                                        src={URL.createObjectURL(file)}
                                        alt="미리보기"
                                        className="w-full h-32 object-cover rounded-lg border border-purple-300"
                                      />
                                      <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center">
                                        <label
                                          htmlFor={`media-file-${index}`}
                                          className="text-white text-xs font-medium cursor-pointer px-2 py-1 bg-purple-600 rounded hover:bg-purple-700"
                                        >
                                          파일 변경
                                        </label>
                                      </div>
                                    </div>
                                  ) : file.type.startsWith('video/') ? (
                                    <div className="relative">
                                      <video
                                        src={URL.createObjectURL(file)}
                                        className="w-full h-32 object-cover rounded-lg border border-purple-300"
                                        controls={false}
                                        muted
                                      />
                                      <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center">
                                        <label
                                          htmlFor={`media-file-${index}`}
                                          className="text-white text-xs font-medium cursor-pointer px-2 py-1 bg-purple-600 rounded hover:bg-purple-700"
                                        >
                                          파일 변경
                                        </label>
                                      </div>
                                      <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-1 py-0.5 rounded">
                                        🎥 동영상
                                      </div>
                                    </div>
                                  ) : file.type.includes('pdf') ? (
                                    <div className="w-full h-32 bg-red-700 rounded-lg border border-purple-600 flex items-center justify-center">
                                      <div className="text-center text-white">
                                        <div className="text-lg">📄</div>
                                        <div className="text-xs">PDF 문서</div>
                                      </div>
                                    </div>
                                  ) : file.type.includes('excel') || file.type.includes('spreadsheet') || file.name.toLowerCase().includes('.xlsx') || file.name.toLowerCase().includes('.xls') ? (
                                    <div className="w-full h-32 bg-green-700 rounded-lg border border-purple-600 flex items-center justify-center">
                                      <div className="text-center text-white">
                                        <div className="text-lg">📊</div>
                                        <div className="text-xs">엑셀 파일</div>
                                      </div>
                                    </div>
                                  ) : file.type.includes('word') || file.type.includes('document') || file.name.toLowerCase().includes('.docx') || file.name.toLowerCase().includes('.doc') ? (
                                    <div className="w-full h-32 bg-blue-700 rounded-lg border border-purple-600 flex items-center justify-center">
                                      <div className="text-center text-white">
                                        <div className="text-lg">📝</div>
                                        <div className="text-xs">워드 문서</div>
                                      </div>
                                    </div>
                                  ) : file.name.toLowerCase().includes('.hwp') ? (
                                    <div className="w-full h-32 bg-orange-700 rounded-lg border border-purple-600 flex items-center justify-center">
                                      <div className="text-center text-white">
                                        <div className="text-lg">📄</div>
                                        <div className="text-xs">한글 문서</div>
                                      </div>
                                    </div>
                                  ) : file.name.toLowerCase().includes('.txt') ? (
                                    <div className="w-full h-32 bg-gray-700 rounded-lg border border-purple-600 flex items-center justify-center">
                                      <div className="text-center text-white">
                                        <div className="text-lg">📄</div>
                                        <div className="text-xs">텍스트 파일</div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="w-full h-32 bg-gray-700 rounded-lg border border-purple-600 flex items-center justify-center">
                                      <div className="text-center text-gray-400">
                                        <div className="text-lg">📄</div>
                                        <div className="text-xs">기타 파일</div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* 파일 정보 */}
                                  <div className="mt-1 text-xs text-purple-400 truncate" title={file.name}>
                                    📄 {file.name}
                                  </div>
                                  <div className="text-xs text-purple-500">
                                    ({(file.size / 1024).toFixed(1)} KB)
                                  </div>
                                </div>
                              ) : (
                                <label
                                  htmlFor={`media-file-${index}`}
                                  className="flex items-center justify-center px-2 py-2 border-2 border-dashed border-purple-600 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-900/30 transition-colors text-xs w-full h-32"
                                >
                                  <div className="text-center text-purple-300">
                                    <div className="text-2xl mb-1">📁</div>
                                    <div>파일 선택</div>
                                    <div className="text-purple-400">모든 파일 형식</div>
                                    <div className="text-xs text-purple-500 mt-1">
                                      지원 형식: 이미지, 동영상, 문서, PDF, 엑셀, 워드, 한글, 텍스트 등
                                    </div>
                                  </div>
                                </label>
                              )}
                            </div>
                            
                            {/* 설명 입력 */}
                            <textarea
                              value={description || ''}
                              onChange={(e) => handleFileDescriptionChange(`mediaFile${index}Description`, e.target.value)}
                              placeholder={`미디어 ${index} 설명`}
                              className="w-full bg-gray-700 border-purple-600 text-white rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-sm p-3 h-12 resize-none"
                              rows={2}
                              maxLength={100}
                            />
                            <div className="text-right text-xs text-purple-400 mt-1">
                              {(description || '').length}/100
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  onClick={handleAddRemappingWork}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {isEditingRemapping ? 'Remapping 수정' : 'Remapping 추가'}
                </button>
              </div>
            </div>
          </div>





          {/* 제출 버튼 */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700">
            <button
              type="button"
              onClick={() => router.push('/history')}
              className="px-4 py-2 text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={uploadProgress.isUploading}
              className={`px-6 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                uploadProgress.isUploading
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {uploadProgress.isUploading ? '업로드 중...' : '작업 등록'}
            </button>
          </div>
        </form>
      </div>


          </div>
        </div>
      </main>




      </div>
      
      {/* 작업 기록 편집 모달 */}
      <WorkDetailModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        workRecord={selectedWorkRecord}
        onSave={handleWorkRecordSave}
      />
    </AuthGuard>
  )
} 