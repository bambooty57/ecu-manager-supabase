'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ACU_TYPES, ACU_MANUFACTURERS, ACU_MODELS_BY_MANUFACTURER, ECU_MODELS, ECU_MAKERS, CONNECTION_METHODS, ECU_TOOL_CATEGORIES, ECU_TOOLS, ECU_TOOLS_FLAT, TUNING_WORKS, TUNING_CATEGORIES, TUNING_WORKS_BY_CATEGORY, WORK_STATUS } from '@/constants'
import { getAllCustomers, CustomerData } from '@/lib/customers'
import { getEquipmentByCustomerId, EquipmentData } from '@/lib/equipment'
import { createWorkRecord, WorkRecordData } from '@/lib/work-records'
import { getEquipmentCategoryNames, createEquipmentCategory } from '@/lib/equipment-categories'
import { cacheManager, CacheKeys, CacheTTL } from '@/lib/cache-manager'
import { generateOptimizedImageUrl, generateCacheHeaders } from '@/lib/cdn-utils'
import Navigation from '@/components/Navigation'
import AuthGuard from '@/components/AuthGuard'
import CustomDropdown from '@/components/CustomDropdown'

export default function WorkPage() {
  const router = useRouter()
  
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
      maker: string
      type: string
      typeCustom: string
      selectedWorks: string[]
      workDetails: string
      price: string
      status: string
    }
    // ACU 정보
    acu: {
      toolCategory: string
      toolCategoryCustom?: string
      connectionMethod: string
      manufacturer: string
      model: string
      modelCustom: string
      selectedWorks: string[]
      workDetails: string
      price: string
      status: string
    }
    notes: string
    files: {
      originalFiles?: File[]
      originalFileDescription?: string
      stage1File?: File
      stage1FileDescription?: string
      stage2File?: File
      stage2FileDescription?: string
      stage3File?: File
      stage3FileDescription?: string
      acuOriginalFiles?: File[]
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
  }

  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    equipmentId: '',
    workDate: getTodayDate(),
    price: '',
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
      maker: '',
      type: '',
      typeCustom: '',
      selectedWorks: [] as string[],
      workDetails: '',
      price: '',
      status: '예약'
    },
    acu: {
      toolCategory: '',
      toolCategoryCustom: '',
      connectionMethod: '',
      manufacturer: '',
      model: '',
      modelCustom: '',
      selectedWorks: [] as string[],
      workDetails: '',
      price: '',
      status: '예약'
    },
    notes: '',
    files: {
      originalFiles: [] as File[],
      originalFileDescription: '',
      stage1File: undefined,
      stage1FileDescription: '',
      stage2File: undefined,
      stage2FileDescription: '',
      stage3File: undefined,
      stage3FileDescription: '',
      acuOriginalFiles: [] as File[],
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

  // 선택된 고객의 장비 목록
  const [availableEquipment, setAvailableEquipment] = useState<EquipmentData[]>([])
  
  // 고객 자동완성 관련 state
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerData[]>([])

  // 동적 ECU 모델 목록 (로컬 스토리지에서 가져오기)
  const [ecuModels, setEcuModels] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ecuModels')
      return saved ? JSON.parse(saved) : [...ECU_MODELS]
    }
    return [...ECU_MODELS]
  })

  // 동적 ACU 타입 목록 (로컬 스토리지에서 가져오기) - 기존 호환성용
  const [acuTypes, setAcuTypes] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('acuTypes')
      return saved ? JSON.parse(saved) : [...ACU_TYPES]
    }
    return [...ACU_TYPES]
  })

  // 동적 ACU 제조사별 모델 목록 (로컬 스토리지에서 가져오기)
  const [acuModelsByManufacturer, setAcuModelsByManufacturer] = useState<Record<string, string[]>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('acuModelsByManufacturer')
      return saved ? JSON.parse(saved) : { ...ACU_MODELS_BY_MANUFACTURER }
    }
    return { ...ACU_MODELS_BY_MANUFACTURER }
  })

  // 동적 ECU 장비 카테고리 목록 (데이터베이스에서 가져오기)
  const [ecuCategories, setEcuCategories] = useState<string[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)

  // 새로운 ECU 타입을 목록에 추가
  const addNewEcuType = (newType: string) => {
    if (newType.trim() && !ecuModels.includes(newType.trim())) {
      const newList = [...ecuModels, newType.trim()]
      setEcuModels(newList)
      localStorage.setItem('ecuModels', JSON.stringify(newList))
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
      const allCategories = [...ecuCategories, ...acuCategories]
      setEcuCategories(allCategories.length > 0 ? allCategories : [...ECU_TOOL_CATEGORIES])
    } catch (error) {
      console.error('장비 카테고리 로드 오류:', error)
      // 오류 시 기본 카테고리 사용
      setEcuCategories([...ECU_TOOL_CATEGORIES])
    } finally {
      setIsLoadingCategories(false)
    }
  }

  // 새로운 ECU 카테고리를 데이터베이스에 추가
  const addNewEcuCategory = async (newCategory: string) => {
    try {
      if (!newCategory.trim() || ecuCategories.includes(newCategory.trim())) {
        return
      }

      await createEquipmentCategory({
        name: newCategory.trim(),
        type: 'ECU'
      })

      // 카테고리 목록 새로고침
      await loadEquipmentCategories()
    } catch (error) {
      console.error('카테고리 추가 오류:', error)
      alert(error instanceof Error ? error.message : '카테고리 추가 중 오류가 발생했습니다.')
    }
  }

  // 새로운 ACU 타입을 목록에 추가 (기존 호환성용)
  const addNewAcuType = (newType: string) => {
    if (newType.trim() && !acuTypes.includes(newType.trim())) {
      const newList = [...acuTypes, newType.trim()]
      setAcuTypes(newList)
      localStorage.setItem('acuTypes', JSON.stringify(newList))
    }
  }

  // 새로운 ACU 모델을 제조사별 목록에 추가
  const addNewAcuModel = (manufacturer: string, newModel: string) => {
    if (newModel.trim() && manufacturer) {
      const currentModels = acuModelsByManufacturer[manufacturer] || []
      if (!currentModels.includes(newModel.trim())) {
        const newModelsByManufacturer = {
          ...acuModelsByManufacturer,
          [manufacturer]: [...currentModels, newModel.trim()]
        }
        setAcuModelsByManufacturer(newModelsByManufacturer)
        localStorage.setItem('acuModelsByManufacturer', JSON.stringify(newModelsByManufacturer))
      }
    }
  }

  // ECU/ACU 타입 관리 상태
  const [showEcuManagement, setShowEcuManagement] = useState(false)
  const [showAcuManagement, setShowAcuManagement] = useState(false)
  const [selectedEcuModels, setSelectedEcuModels] = useState<string[]>([])
  const [selectedAcuTypes, setSelectedAcuTypes] = useState<string[]>([])
  const [newEcuModel, setNewEcuModel] = useState('')
  const [newAcuType, setNewAcuType] = useState('')

  // ECU 모델 선택/해제
  const handleEcuModelSelect = (model: string) => {
    setSelectedEcuModels(prev => 
      prev.includes(model) 
        ? prev.filter(m => m !== model)
        : [...prev, model]
    )
  }

  // ACU 타입 선택/해제
  const handleAcuTypeSelect = (type: string) => {
    setSelectedAcuTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  // 선택된 ECU 모델 삭제
  const deleteSelectedEcuModels = () => {
    if (selectedEcuModels.length === 0) {
      alert('삭제할 ECU 모델을 선택해주세요.')
      return
    }

    if (confirm(`선택된 ${selectedEcuModels.length}개의 ECU 모델을 삭제하시겠습니까?`)) {
      const newEcuModels = ecuModels.filter(model => !selectedEcuModels.includes(model))
      setEcuModels(newEcuModels)
      localStorage.setItem('ecuModels', JSON.stringify(newEcuModels))
      setSelectedEcuModels([])
      alert('선택된 ECU 모델이 삭제되었습니다.')
    }
  }

  // 선택된 ACU 타입 삭제
  const deleteSelectedAcuTypes = () => {
    if (selectedAcuTypes.length === 0) {
      alert('삭제할 ACU 타입을 선택해주세요.')
      return
    }

    if (confirm(`선택된 ${selectedAcuTypes.length}개의 ACU 타입을 삭제하시겠습니까?`)) {
      const newAcuTypes = acuTypes.filter(type => !selectedAcuTypes.includes(type))
      setAcuTypes(newAcuTypes)
      localStorage.setItem('acuTypes', JSON.stringify(newAcuTypes))
      setSelectedAcuTypes([])
      alert('선택된 ACU 타입이 삭제되었습니다.')
    }
  }

  // 새로운 ECU 모델 추가 (중복 확인)
  const handleAddNewEcuModel = () => {
    const trimmedModel = newEcuModel.trim()
    if (!trimmedModel) {
      alert('ECU 모델명을 입력해주세요.')
      return
    }

    if (ecuModels.includes(trimmedModel)) {
      alert('이미 목록에 있는 ECU 모델입니다.')
      return
    }

    const newEcuModels = [...ecuModels, trimmedModel]
    setEcuModels(newEcuModels)
    localStorage.setItem('ecuModels', JSON.stringify(newEcuModels))
    setNewEcuModel('')
    alert('새로운 ECU 모델이 추가되었습니다.')
  }

  // 새로운 ACU 타입 추가 (중복 확인)
  const handleAddNewAcuType = () => {
    const trimmedType = newAcuType.trim()
    if (!trimmedType) {
      alert('ACU 타입명을 입력해주세요.')
      return
    }

    if (acuTypes.includes(trimmedType)) {
      alert('이미 목록에 있는 ACU 타입입니다.')
      return
    }

    const newAcuTypes = [...acuTypes, trimmedType]
    setAcuTypes(newAcuTypes)
    localStorage.setItem('acuTypes', JSON.stringify(newAcuTypes))
    setNewAcuType('')
    alert('새로운 ACU 타입이 추가되었습니다.')
  }

  // ACU 제조사별 사용 가능한 모델 목록 가져오기
  const getAvailableAcuModels = (manufacturer: string): string[] => {
    return acuModelsByManufacturer[manufacturer] || []
  }

  // 고객 데이터 및 카테고리 로드
  useEffect(() => {
    loadCustomers()
    loadEquipmentCategories()
  }, [])

  // 페이지 포커스 시 고객 목록 새로고침
  useEffect(() => {
    const handleFocus = () => {
      loadCustomers()
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadCustomers()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
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
    setCurrentRemappingWork(prev => ({
      ...prev,
      files: {
        ...prev.files,
        ...(file !== null && { [fileType]: file }),
        ...(description !== undefined && { [`${fileType}Description`]: description })
      }
    }))
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
        maker: '',
        type: '',
        typeCustom: '',
        selectedWorks: [],
        workDetails: '',
        price: '',
        status: '예약'
      },
      acu: {
        toolCategory: '',
        toolCategoryCustom: '',
        connectionMethod: '',
        manufacturer: '',
        model: '',
        modelCustom: '',
        selectedWorks: [],
        workDetails: '',
        price: '',
        status: '예약'
      },
      notes: '',
      files: {
        originalFiles: [] as File[],
        originalFileDescription: '',
        stage1File: undefined,
        stage1FileDescription: '',
        stage2File: undefined,
        stage2FileDescription: '',
        stage3File: undefined,
        stage3FileDescription: '',
        acuOriginalFiles: [] as File[],
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
        maker: work.ecu.maker,
        type: work.ecu.type,
        typeCustom: work.ecu.typeCustom,
        selectedWorks: work.ecu.selectedWorks,
        workDetails: work.ecu.workDetails,
        price: work.ecu.price,
        status: work.ecu.status
      },
      acu: {
        toolCategory: work.acu.toolCategory,
        toolCategoryCustom: work.acu.toolCategoryCustom || '',
        connectionMethod: work.acu.connectionMethod,
        manufacturer: work.acu.manufacturer,
        model: work.acu.model || work.acu.modelCustom,
        modelCustom: work.acu.modelCustom,
        selectedWorks: work.acu.selectedWorks,
        workDetails: work.acu.workDetails,
        price: work.acu.price,
        status: work.acu.status
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

  // Remapping 작업 편집 취소
  const handleCancelRemappingEdit = () => {
    setCurrentRemappingWork({
      ecu: {
        toolCategory: '',
        toolCategoryCustom: '',
        connectionMethod: '',
        maker: '',
        type: '',
        typeCustom: '',
        selectedWorks: [],
        workDetails: '',
        price: '',
        status: '예약'
      },
      acu: {
        toolCategory: '',
        toolCategoryCustom: '',
        connectionMethod: '',
        manufacturer: '',
        model: '',
        modelCustom: '',
        selectedWorks: [],
        workDetails: '',
        price: '',
        status: '예약'
      },
      notes: '',
      files: {
        originalFiles: [] as File[],
        originalFileDescription: '',
        stage1File: undefined,
        stage1FileDescription: '',
        stage2File: undefined,
        stage2FileDescription: '',
        stage3File: undefined,
        stage3FileDescription: '',
        acuOriginalFiles: [] as File[],
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
    
    // 금액 입력 시 만원 단위를 원 단위로 변환
    if (name === 'price') {
      const priceInWon = value ? parseFloat(value) * 10000 : ''
      setFormData(prev => ({ ...prev, [name]: priceInWon.toString() }))
      return
    }
    
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
        // 파일 데이터 처리
        const files: any[] = []
        
        if (remappingWork.files.originalFiles && remappingWork.files.originalFiles.length > 0) {
          for (const originalFile of remappingWork.files.originalFiles) {
            const data = await convertFileToBase64(originalFile)
            files.push({
              name: originalFile.name,
              size: originalFile.size,
              type: originalFile.type,
              data: data,
              description: remappingWork.files.originalFileDescription || '원본 ECU 폴더',
              category: 'original',
              uploadDate: new Date().toISOString()
            })
          }
        }

        if (remappingWork.files.stage1File) {
          const data = await convertFileToBase64(remappingWork.files.stage1File)
          files.push({
            name: remappingWork.files.stage1File.name,
            size: remappingWork.files.stage1File.size,
            type: remappingWork.files.stage1File.type,
            data: data,
            description: remappingWork.files.stage1FileDescription || 'Stage 1 튜닝 파일',
            category: 'stage1',
            uploadDate: new Date().toISOString()
          })
        }

        if (remappingWork.files.stage2File) {
          const data = await convertFileToBase64(remappingWork.files.stage2File)
          files.push({
            name: remappingWork.files.stage2File.name,
            size: remappingWork.files.stage2File.size,
            type: remappingWork.files.stage2File.type,
            data: data,
            description: remappingWork.files.stage2FileDescription || 'Stage 2 튜닝 파일',
            category: 'stage2',
            uploadDate: new Date().toISOString()
          })
        }

        if (remappingWork.files.stage3File) {
          const data = await convertFileToBase64(remappingWork.files.stage3File)
          files.push({
            name: remappingWork.files.stage3File.name,
            size: remappingWork.files.stage3File.size,
            type: remappingWork.files.stage3File.type,
            data: data,
            description: remappingWork.files.stage3FileDescription || 'Stage 3 튜닝 파일',
            category: 'stage3',
            uploadDate: new Date().toISOString()
          })
        }

        // ACU 파일들 처리
        if (remappingWork.files.acuOriginalFiles && remappingWork.files.acuOriginalFiles.length > 0) {
          for (const acuOriginalFile of remappingWork.files.acuOriginalFiles) {
            const data = await convertFileToBase64(acuOriginalFile)
            files.push({
              name: acuOriginalFile.name,
              size: acuOriginalFile.size,
              type: acuOriginalFile.type,
              data: data,
              description: remappingWork.files.acuOriginalFileDescription || '원본 ACU 폴더',
              category: 'acuOriginal',
              uploadDate: new Date().toISOString()
            })
          }
        }

        if (remappingWork.files.acuStage1File) {
          const data = await convertFileToBase64(remappingWork.files.acuStage1File)
          files.push({
            name: remappingWork.files.acuStage1File.name,
            size: remappingWork.files.acuStage1File.size,
            type: remappingWork.files.acuStage1File.type,
            data: data,
            description: remappingWork.files.acuStage1FileDescription || 'ACU Stage 1 튜닝 파일',
            category: 'acuStage1',
            uploadDate: new Date().toISOString()
          })
        }

        if (remappingWork.files.acuStage2File) {
          const data = await convertFileToBase64(remappingWork.files.acuStage2File)
          files.push({
            name: remappingWork.files.acuStage2File.name,
            size: remappingWork.files.acuStage2File.size,
            type: remappingWork.files.acuStage2File.type,
            data: data,
            description: remappingWork.files.acuStage2FileDescription || 'ACU Stage 2 튜닝 파일',
            category: 'acuStage2',
            uploadDate: new Date().toISOString()
          })
        }

        if (remappingWork.files.acuStage3File) {
          const data = await convertFileToBase64(remappingWork.files.acuStage3File)
          files.push({
            name: remappingWork.files.acuStage3File.name,
            size: remappingWork.files.acuStage3File.size,
            type: remappingWork.files.acuStage3File.type,
            data: data,
            description: remappingWork.files.acuStage3FileDescription || 'ACU Stage 3 튜닝 파일',
            category: 'acuStage3',
            uploadDate: new Date().toISOString()
          })
        }

        // 미디어 파일들 처리 (5개)
        for (let i = 1; i <= 5; i++) {
          const mediaFileKey = `mediaFile${i}` as keyof typeof remappingWork.files
          const mediaDescKey = `mediaFile${i}Description` as keyof typeof remappingWork.files
          const mediaFile = remappingWork.files[mediaFileKey] as File | undefined
          const mediaDesc = remappingWork.files[mediaDescKey] as string | undefined
          
          if (mediaFile) {
            const data = await convertFileToBase64(mediaFile)
            files.push({
              name: mediaFile.name,
              size: mediaFile.size,
              type: mediaFile.type,
              data: data,
              description: mediaDesc || `미디어 파일 ${i}`,
              category: `media${i}`,
              uploadDate: new Date().toISOString()
            })
          }
        }

        // Supabase에 저장할 작업 기록 데이터 생성
        const allSelectedWorks = [...remappingWork.ecu.selectedWorks, ...remappingWork.acu.selectedWorks]
        const workDescription = allSelectedWorks.join(', ') + 
          (remappingWork.ecu.workDetails ? ` - ECU: ${remappingWork.ecu.workDetails}` : '') +
          (remappingWork.acu.workDetails ? ` - ACU: ${remappingWork.acu.workDetails}` : '')
        
        const workRecordData: Omit<WorkRecordData, 'id' | 'created_at'> = {
          customerId: parseInt(formData.customerId),
          equipmentId: parseInt(formData.equipmentId),
          workDate: formData.workDate,
          workType: 'ECU 튜닝',
          totalPrice: (parseFloat(remappingWork.ecu.price) || 0) + (parseFloat(remappingWork.acu.price) || 0),
          status: remappingWork.ecu.status || remappingWork.acu.status,
          remappingWorks: [{
            stage: 'stage1' as const,
            // ECU 정보 추가
            ecu: {
              maker: remappingWork.ecu.maker,
              type: remappingWork.ecu.type || remappingWork.ecu.typeCustom,
              connectionMethod: remappingWork.ecu.connectionMethod,
              toolCategory: remappingWork.ecu.toolCategory,
              selectedWorks: remappingWork.ecu.selectedWorks,
              workDetails: remappingWork.ecu.workDetails,
              price: remappingWork.ecu.price,
              status: remappingWork.ecu.status
            },
            // ACU 정보 추가
            acu: {
              manufacturer: remappingWork.acu.manufacturer,
              model: remappingWork.acu.model || remappingWork.acu.modelCustom,
              connectionMethod: remappingWork.acu.connectionMethod,
              toolCategory: remappingWork.acu.toolCategory,
              selectedWorks: remappingWork.acu.selectedWorks,
              workDetails: remappingWork.acu.workDetails,
              price: remappingWork.acu.price,
              status: remappingWork.acu.status
            },
            files: {
              original: remappingWork.files.originalFiles?.[0] ? { file: remappingWork.files.originalFiles[0], description: remappingWork.files.originalFileDescription || '' } : undefined,
              read: remappingWork.files.stage1File ? { file: remappingWork.files.stage1File, description: remappingWork.files.stage1FileDescription || '' } : undefined,
              modified: remappingWork.files.stage2File ? { file: remappingWork.files.stage2File, description: remappingWork.files.stage2FileDescription || '' } : undefined,
              vr: remappingWork.files.stage3File ? { file: remappingWork.files.stage3File, description: remappingWork.files.stage3FileDescription || '' } : undefined
            },
            media: {
              before: remappingWork.files.mediaFile1 || null,
              after: remappingWork.files.mediaFile2 || null
            }
          }]
        }

        // Supabase에 작업 기록 저장
        const savedRecord = await createWorkRecord(workRecordData)
        
        if (savedRecord) {
          workHistoryEntries.push(savedRecord)
          console.log(`✅ 작업 기록 ${index + 1} 저장 완료:`, savedRecord)
        } else {
          console.error(`❌ 작업 기록 ${index + 1} 저장 실패`)
          alert(`작업 기록 ${index + 1} 저장 중 오류가 발생했습니다.`)
        }
      } catch (error) {
        console.error(`❌ 작업 기록 ${index + 1} 처리 중 오류:`, error)
        alert(`작업 기록 ${index + 1} 처리 중 오류가 발생했습니다.`)
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
      price: '',
      status: '예약'
    })
    
    setRemappingWorks([])
    setCurrentRemappingWork({
      ecu: {
        toolCategory: '',
        toolCategoryCustom: '',
        connectionMethod: '',
        maker: '',
        type: '',
        typeCustom: '',
        selectedWorks: [],
        workDetails: '',
        price: '',
        status: '예약'
      },
      acu: {
        toolCategory: '',
        toolCategoryCustom: '',
        connectionMethod: '',
        manufacturer: '',
        model: '',
        modelCustom: '',
        selectedWorks: [],
        workDetails: '',
        price: '',
        status: '예약'
      },
      notes: '',
      files: {
        originalFiles: [] as File[],
        originalFileDescription: '',
        stage1File: undefined,
        stage1FileDescription: '',
        stage2File: undefined,
        stage2FileDescription: '',
        stage3File: undefined,
        stage3FileDescription: '',
        acuOriginalFiles: [] as File[],
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

  // 이미지 압축 함수
  const compressImage = (file: File, maxWidth: number = 1920, maxHeight: number = 1080, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
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
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            })
            resolve(compressedFile)
          } else {
            resolve(file) // 압축 실패시 원본 반환
          }
        }, file.type, quality)
      }
      
      img.onerror = () => resolve(file) // 오류시 원본 반환
      img.src = URL.createObjectURL(file)
    })
  }

  // 파일을 Base64로 변환하는 함수 (압축 적용)
  const convertFileToBase64 = async (file: File): Promise<string> => {
    // 이미지 파일인 경우 압축 적용
    let processedFile = file
    if (file.type.startsWith('image/') && file.size > 500000) { // 500KB 이상인 이미지만 압축
      console.log(`🖼️ 이미지 압축 시작: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
      processedFile = await compressImage(file)
      console.log(`✅ 이미지 압축 완료: ${processedFile.name} (${(processedFile.size / 1024 / 1024).toFixed(2)}MB)`)
    }
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(',')[1]) // Base64 데이터만 추출
      }
      reader.onerror = reject
      reader.readAsDataURL(processedFile)
    })
  }

  // 파일 크기 검증 함수
  const validateFileSize = (file: File, maxSizeMB: number = 10): boolean => {
    const fileSizeMB = file.size / 1024 / 1024
    if (fileSizeMB > maxSizeMB) {
      alert(`파일 크기가 너무 큽니다. 최대 ${maxSizeMB}MB까지 업로드 가능합니다.\n현재 파일 크기: ${fileSizeMB.toFixed(2)}MB`)
      return false
    }
    return true
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-900">
        <Navigation />
        <main className="pt-20 pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-6">
        {/* 페이지 헤더 */}
        <div>
          <h1 className="text-3xl font-bold text-white">작업 등록</h1>
          <p className="mt-2 text-gray-300">
            새로운 ECU 튜닝 작업을 등록하고 관리합니다.
          </p>
        </div>

      {/* 최적화 상태 알림 */}
      <div className="mb-4 p-3 bg-green-900/20 border border-green-700 rounded-lg">
        <div className="flex items-center space-x-2 text-sm text-green-300">
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>
            ⚡ 성능 최적화 활성화: 이미지 자동 압축, 캐시 시스템, 파일 크기 검증이 적용되어 업로드 속도가 향상되었습니다.
          </span>
          <a 
            href="/optimization-dashboard" 
            className="text-green-400 hover:text-green-300 underline ml-2"
          >
            관리 대시보드 →
          </a>
        </div>
      </div>

      {/* 작업 등록 폼 */}
      <div className="bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-white mb-6">새 작업 등록</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
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
                                <div className="text-sm font-medium text-blue-200">
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
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <div className="text-xs font-medium text-blue-800 mb-2">작업내용</div>
                              <div className="flex flex-wrap gap-1">
                                {work.ecu.selectedWorks && work.ecu.selectedWorks.length > 0 ? (
                                  work.ecu.selectedWorks.map((workName, idx) => (
                                    <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-200 text-blue-800">
                                      {workName}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-blue-500 italic">작업내용 미설정</span>
                                )}
                              </div>
                              {work.ecu.workDetails && (
                                <div className="mt-2 text-xs text-blue-700">
                                  <span className="font-medium">상세:</span> {work.ecu.workDetails}
                                </div>
                              )}
                            </div>
                            
                            {/* 3. 연결방법 */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <div className="text-xs font-medium text-blue-800 mb-1">연결방법</div>
                              <div className="text-sm text-blue-900">
                                {work.ecu.connectionMethod || <span className="text-blue-500 italic">연결방법 미설정</span>}
                              </div>
                            </div>
                            
                            {/* 추가 정보 */}
                            <div className="text-xs text-gray-600 space-y-1">
                              {work.ecu.toolCategory && <div><span className="font-medium">카테고리:</span> {work.ecu.toolCategory}</div>}
                              {work.ecu.price && <div><span className="font-medium">금액:</span> {(parseFloat(work.ecu.price) / 10000).toFixed(1)}만원</div>}
                              {work.ecu.status && <div><span className="font-medium">상태:</span> <span className={`px-2 py-1 rounded-full text-xs ${work.ecu.status === '완료' ? 'bg-green-100 text-green-800' : work.ecu.status === '진행중' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{work.ecu.status}</span></div>}
                            </div>
                          </div>

                          {/* ACU/튜닝 섹션 */}
                          <div className="space-y-3">
                            <h5 className="font-medium text-green-800">⚙️ ACU/튜닝</h5>
                            
                            {/* 1. 제조사-모델명 (초록색 박스) */}
                            <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                              <div className="text-sm font-medium text-green-900">
                                {work.acu.manufacturer && work.acu.model ? (
                                  `${work.acu.manufacturer} - ${work.acu.model}`
                                ) : work.acu.manufacturer ? (
                                  work.acu.manufacturer
                                ) : work.acu.model ? (
                                  work.acu.model
                                ) : (
                                  <span className="text-green-500 italic">제조사-모델명 미설정</span>
                                )}
                              </div>
                              {work.acu.modelCustom && (
                                <div className="text-xs text-green-700 mt-1">
                                  추가: {work.acu.modelCustom}
                                </div>
                              )}
                            </div>
                            
                            {/* 2. 작업내용 */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <div className="text-xs font-medium text-green-800 mb-2">작업내용</div>
                              <div className="flex flex-wrap gap-1">
                                {work.acu.selectedWorks && work.acu.selectedWorks.length > 0 ? (
                                  work.acu.selectedWorks.map((workName, idx) => (
                                    <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-200 text-green-800">
                                      {workName}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-green-500 italic">작업내용 미설정</span>
                                )}
                              </div>
                              {work.acu.workDetails && (
                                <div className="mt-2 text-xs text-green-700">
                                  <span className="font-medium">상세:</span> {work.acu.workDetails}
                                </div>
                              )}
                            </div>
                            
                            {/* 3. 연결방법 */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <div className="text-xs font-medium text-green-800 mb-1">연결방법</div>
                              <div className="text-sm text-green-900">
                                {work.acu.connectionMethod || <span className="text-green-500 italic">연결방법 미설정</span>}
                              </div>
                            </div>
                            
                            {/* 추가 정보 */}
                            <div className="text-xs text-gray-600 space-y-1">
                              {work.acu.toolCategory && <div><span className="font-medium">카테고리:</span> {work.acu.toolCategory}</div>}
                              {work.acu.price && <div><span className="font-medium">금액:</span> {(parseFloat(work.acu.price) / 10000).toFixed(1)}만원</div>}
                              {work.acu.status && <div><span className="font-medium">상태:</span> <span className={`px-2 py-1 rounded-full text-xs ${work.acu.status === '완료' ? 'bg-green-100 text-green-800' : work.acu.status === '진행중' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{work.acu.status}</span></div>}
                            </div>
                          </div>
                        </div>

                        {work.notes && (
                          <div className="mt-2">
                            <span className="font-medium text-gray-700">메모:</span>
                            <p className="text-sm text-gray-600 mt-1">{work.notes}</p>
                          </div>
                        )}
                        {/* 첨부 파일 정보 */}
                        <div className="mt-3">
                          <span className="font-medium text-gray-700">첨부 파일:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {/* ECU 파일들 */}
                            {work.files.originalFiles && work.files.originalFiles.length > 0 && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">🔧 ECU원본({work.files.originalFiles.length})</span>}
                            {work.files.stage1File && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-200 text-blue-900">🔧 ECU Stage1</span>}
                            {work.files.stage2File && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-300 text-blue-900">🔧 ECU Stage2</span>}
                            {work.files.stage3File && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-400 text-blue-900">🔧 ECU Stage3</span>}
                            
                            {/* ACU 파일들 */}
                            {work.files.acuOriginalFiles && work.files.acuOriginalFiles.length > 0 && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">⚙️ ACU원본({work.files.acuOriginalFiles.length})</span>}
                            {work.files.acuStage1File && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-200 text-green-900">⚙️ ACU Stage1</span>}
                            {work.files.acuStage2File && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-300 text-green-900">⚙️ ACU Stage2</span>}
                            {work.files.acuStage3File && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-400 text-green-900">⚙️ ACU Stage3</span>}
                            
                            {/* 미디어 파일들 표시 */}
                            {(() => {
                              const mediaCount = [1, 2, 3, 4, 5].filter(i => {
                                const fileKey = `mediaFile${i}` as keyof typeof work.files
                                return work.files[fileKey]
                              }).length
                              return mediaCount > 0 && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">📷 미디어({mediaCount})</span>
                            })()}
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
          <div className="border-t border-gray-200 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {isEditingRemapping ? 'Remapping 편집' : 'Remapping 추가'}
              </h3>
              {isEditingRemapping && (
                <button
                  type="button"
                  onClick={handleCancelRemappingEdit}
                  className="text-gray-600 hover:text-gray-800 text-sm"
                >
                  편집 취소
                </button>
              )}
            </div>
            
            <div className="space-y-6">
              {/* ECU 섹션 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="text-lg font-medium text-blue-800 mb-4">🔧 ECU 정보</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ECU 장비 카테고리
                    </label>
                    <CustomDropdown
                      value={currentRemappingWork.ecu.toolCategory}
                      onChange={(value) => handleRemappingWorkInputChange('ecu', 'toolCategory', value)}
                      options={ecuCategories.map(category => ({ value: category, label: category }))}
                      placeholder="장비 카테고리를 선택하세요"
                      maxHeight="250px"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      연결 방법
                    </label>
                    <CustomDropdown
                      value={currentRemappingWork.ecu.connectionMethod}
                      onChange={(value) => handleRemappingWorkInputChange('ecu', 'connectionMethod', value)}
                      options={CONNECTION_METHODS.map(method => ({ value: method, label: method }))}
                      placeholder="연결 방법을 선택하세요"
                      maxHeight="250px"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ECU 제조사
                    </label>
                    <CustomDropdown
                      value={currentRemappingWork.ecu.maker}
                      onChange={(value) => handleRemappingWorkInputChange('ecu', 'maker', value)}
                      options={ECU_MAKERS.map(maker => ({ value: maker, label: maker }))}
                      placeholder="ECU 제조사를 선택하세요"
                      maxHeight="250px"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        ECU 모델
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowEcuManagement(true)}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                        title="ECU 모델 관리"
                      >
                        관리
                      </button>
                    </div>
                    <CustomDropdown
                      value={currentRemappingWork.ecu.type}
                      onChange={(value) => handleRemappingWorkInputChange('ecu', 'type', value)}
                      options={ecuModels.map(type => ({ value: type, label: type }))}
                      placeholder="ECU 모델을 선택하세요"
                      maxHeight="250px"
                    />
                    <div className="mt-2 flex space-x-2">
                      <input
                        type="text"
                        value={currentRemappingWork.ecu.typeCustom}
                        onChange={(e) => handleRemappingWorkInputChange('ecu', 'typeCustom', e.target.value)}
                        className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="새로운 ECU 모델을 입력하여 목록에 추가"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (currentRemappingWork.ecu.typeCustom.trim()) {
                            addNewEcuType(currentRemappingWork.ecu.typeCustom.trim())
                            handleRemappingWorkInputChange('ecu', 'type', currentRemappingWork.ecu.typeCustom.trim())
                            handleRemappingWorkInputChange('ecu', 'typeCustom', '')
                          }
                        }}
                        className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
                        title="목록에 추가하고 선택"
                      >
                        추가
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ECU 작업 상태
                    </label>
                    <CustomDropdown
                      value={currentRemappingWork.ecu.status}
                      onChange={(value) => handleRemappingWorkInputChange('ecu', 'status', value)}
                      options={WORK_STATUS.map(status => ({ value: status, label: status }))}
                      placeholder="작업 상태를 선택하세요"
                      maxHeight="250px"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ECU 작업 금액 (만원)
                    </label>
                    <input
                      type="number"
                      value={currentRemappingWork.ecu.price ? (parseFloat(currentRemappingWork.ecu.price) / 10000).toString() : ''}
                      onChange={(e) => handleRemappingWorkInputChange('ecu', 'price', e.target.value)}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="35 (35만원)"
                      min="0"
                      step="0.1"
                    />
                  </div>
                </div>

                {/* ECU 작업 상세 정보 */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ECU 작업 상세 정보
                  </label>
                  <textarea
                    value={currentRemappingWork.ecu.workDetails}
                    onChange={(e) => handleRemappingWorkInputChange('ecu', 'workDetails', e.target.value)}
                    rows={3}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ECU 작업 내용, 특이사항, 주의사항 등을 상세히 입력하세요..."
                  />
                </div>
              </div>

              {/* ACU 섹션 */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h4 className="text-lg font-medium text-green-800 mb-4">⚙️ ACU 정보</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ACU 장비 카테고리
                    </label>
                    <CustomDropdown
                      value={currentRemappingWork.acu.toolCategory}
                      onChange={(value) => handleRemappingWorkInputChange('acu', 'toolCategory', value)}
                      options={ecuCategories.map(category => ({ value: category, label: category }))}
                      placeholder="장비 카테고리를 선택하세요"
                      maxHeight="250px"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      연결 방법
                    </label>
                    <CustomDropdown
                      value={currentRemappingWork.acu.connectionMethod}
                      onChange={(value) => handleRemappingWorkInputChange('acu', 'connectionMethod', value)}
                      options={CONNECTION_METHODS.map(method => ({ value: method, label: method }))}
                      placeholder="연결 방법을 선택하세요"
                      maxHeight="250px"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ACU 제조사
                    </label>
                    <CustomDropdown
                      value={currentRemappingWork.acu.manufacturer}
                      onChange={(value) => handleRemappingWorkInputChange('acu', 'manufacturer', value)}
                      options={ACU_MANUFACTURERS.map(manufacturer => ({ value: manufacturer, label: manufacturer }))}
                      placeholder="ACU 제조사를 선택하세요"
                      maxHeight="250px"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        ACU 모델
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAcuManagement(true)}
                        className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                        title="ACU 타입 관리"
                      >
                        관리
                      </button>
                    </div>
                    <CustomDropdown
                      value={currentRemappingWork.acu.model}
                      onChange={(value) => handleRemappingWorkInputChange('acu', 'model', value)}
                      options={currentRemappingWork.acu.manufacturer ? 
                        getAvailableAcuModels(currentRemappingWork.acu.manufacturer).map(model => ({ value: model, label: model })) : 
                        []
                      }
                      placeholder={currentRemappingWork.acu.manufacturer ? 'ACU 모델을 선택하세요' : '먼저 제조사를 선택하세요'}
                      disabled={!currentRemappingWork.acu.manufacturer}
                      maxHeight="250px"
                    />
                    <div className="mt-2 flex space-x-2">
                      <input
                        type="text"
                        value={currentRemappingWork.acu.modelCustom}
                        onChange={(e) => handleRemappingWorkInputChange('acu', 'modelCustom', e.target.value)}
                        className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                        placeholder="새로운 ACU 모델을 입력하여 목록에 추가"
                        disabled={!currentRemappingWork.acu.manufacturer}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (currentRemappingWork.acu.modelCustom.trim() && currentRemappingWork.acu.manufacturer) {
                            addNewAcuModel(currentRemappingWork.acu.manufacturer, currentRemappingWork.acu.modelCustom.trim())
                            handleRemappingWorkInputChange('acu', 'model', currentRemappingWork.acu.modelCustom.trim())
                            handleRemappingWorkInputChange('acu', 'modelCustom', '')
                          }
                        }}
                        disabled={!currentRemappingWork.acu.manufacturer || !currentRemappingWork.acu.modelCustom.trim()}
                        className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm whitespace-nowrap disabled:bg-gray-400 disabled:cursor-not-allowed"
                        title="목록에 추가하고 선택"
                      >
                        추가
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ACU 작업 상태
                    </label>
                    <CustomDropdown
                      value={currentRemappingWork.acu.status}
                      onChange={(value) => handleRemappingWorkInputChange('acu', 'status', value)}
                      options={WORK_STATUS.map(status => ({ value: status, label: status }))}
                      placeholder="작업 상태를 선택하세요"
                      maxHeight="250px"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ACU 작업 금액 (만원)
                    </label>
                    <input
                      type="number"
                      value={currentRemappingWork.acu.price ? (parseFloat(currentRemappingWork.acu.price) / 10000).toString() : ''}
                      onChange={(e) => handleRemappingWorkInputChange('acu', 'price', e.target.value)}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                      placeholder="25 (25만원)"
                      min="0"
                      step="0.1"
                    />
                  </div>
                </div>

                {/* ACU 작업 상세 정보 */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ACU 작업 상세 정보
                  </label>
                  <textarea
                    value={currentRemappingWork.acu.workDetails}
                    onChange={(e) => handleRemappingWorkInputChange('acu', 'workDetails', e.target.value)}
                    rows={3}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                    placeholder="ACU 작업 내용, 특이사항, 주의사항 등을 상세히 입력하세요..."
                  />
                </div>
              </div>

              {/* 공통 정보 섹션 */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-800 mb-4">📝 공통 정보</h4>
                
                {/* 작업 메모 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    작업 메모
                  </label>
                  <textarea
                    value={currentRemappingWork.notes}
                    onChange={(e) => handleRemappingWorkInputChange('general', 'notes', e.target.value)}
                    rows={2}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500"
                    placeholder="이 Remapping 작업에 대한 간단한 메모를 입력하세요..."
                  />
                </div>

                {/* 튜닝 작업 선택 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    튜닝 작업 선택 (다중 선택 가능)
                  </label>
                  
                  {/* 선택된 작업 요약 */}
                  {(currentRemappingWork.ecu.selectedWorks.length > 0 || currentRemappingWork.acu.selectedWorks.length > 0) && (
                    <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                      <div className="text-sm font-medium text-gray-900 mb-2">
                        선택된 작업 (ECU: {currentRemappingWork.ecu.selectedWorks.length}개, ACU: {currentRemappingWork.acu.selectedWorks.length}개):
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <div className="text-xs font-medium text-blue-800 mb-1">🔧 ECU 작업:</div>
                          <div className="flex flex-wrap gap-1">
                            {currentRemappingWork.ecu.selectedWorks.map((work, index) => (
                              <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {work}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-green-800 mb-1">⚙️ ACU 작업:</div>
                          <div className="flex flex-wrap gap-1">
                            {currentRemappingWork.acu.selectedWorks.map((work, index) => (
                              <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {work}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* 카테고리별 작업 선택 */}
                  <div className="space-y-4">
                    {TUNING_CATEGORIES.map((category) => {
                      const categoryWorks = TUNING_WORKS_BY_CATEGORY[category as keyof typeof TUNING_WORKS_BY_CATEGORY] || []
                      const selectedInCategory = workSelections[category] || []
                      const isAllSelected = categoryWorks.length > 0 && categoryWorks.every(work => selectedInCategory.includes(work))
                      const isPartialSelected = selectedInCategory.length > 0 && !isAllSelected
                      const borderColor = category === 'ECU/튜닝' ? 'border-blue-200' : 'border-green-200'
                      const bgColor = category === 'ECU/튜닝' ? 'bg-blue-50' : 'bg-green-50'
                      const textColor = category === 'ECU/튜닝' ? 'text-blue-800' : 'text-green-800'
                      
                      return (
                        <div key={category} className={`border ${borderColor} ${bgColor} rounded-lg p-4`}>
                          <div className="flex items-center justify-between mb-3">
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
                            <span className="text-xs text-gray-500">
                              {selectedInCategory.length}/{categoryWorks.length} 선택됨
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 ml-6">
                            {categoryWorks.map((work) => {
                              return (
                                <label key={work} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={selectedInCategory.includes(work)}
                                    onChange={() => handleWorkSelection(category, work)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                  <span className="ml-2 text-sm text-gray-700">{work}</span>
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
              <div className="mt-8 border-t border-gray-200 pt-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">파일 첨부</h4>
                <div className="space-y-6">
                  {/* 원본 ECU 파일 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      원본 ECU 폴더
                    </label>
                    <div className="flex items-center space-x-3 mb-2">
                      <input
                        type="file"
                        id="original-folder"
                        className="hidden"
                        multiple
                        {...({ webkitdirectory: "", directory: "" } as any)}
                        onChange={(e) => {
                          const files = Array.from(e.target.files || [])
                          handleFileChange('originalFiles', files)
                        }}
                      />
                      <label
                        htmlFor="original-folder"
                        className="flex items-center justify-center px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                      >
                        <svg className="w-6 h-6 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-sm text-gray-600">
                          {currentRemappingWork.files.originalFiles && currentRemappingWork.files.originalFiles.length > 0 
                            ? `📁 ${currentRemappingWork.files.originalFiles.length}개 파일 선택됨` 
                            : '📁 원본 폴더 선택'}
                        </span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={currentRemappingWork.files.originalFileDescription || ''}
                      onChange={(e) => handleFileDescriptionChange('originalFileDescription', e.target.value)}
                      placeholder="폴더 설명을 입력하세요 (예: 원본 백업 폴더, 읽기 전용 등)"
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    {/* 선택된 파일 목록 표시 */}
                    {currentRemappingWork.files.originalFiles && currentRemappingWork.files.originalFiles.length > 0 && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-700 mb-2">선택된 파일:</div>
                        <div className="max-h-32 overflow-y-auto">
                          {currentRemappingWork.files.originalFiles.map((file, index) => (
                            <div key={index} className="text-xs text-gray-600 py-1 flex items-center">
                              <span className="mr-2">📄</span>
                              <span className="truncate">{file.name}</span>
                              <span className="ml-auto text-gray-400">
                                ({(file.size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stage 파일들 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 1차 튜닝 */}
                    <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                      <label className="block text-sm font-medium text-green-800 mb-2">
                        📈 1차 튜닝
                      </label>
                      <div className="flex items-center space-x-3 mb-2">
                        <input
                          type="file"
                          id="stage1-file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null
                            handleFileChange('stage1File', file)
                          }}
                        />
                        <label
                          htmlFor="stage1-file"
                          className="flex items-center justify-center px-3 py-2 border-2 border-dashed border-green-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-100 transition-colors text-xs w-full"
                        >
                          <span className="text-green-700">
                            {currentRemappingWork.files.stage1File 
                              ? `📄 ${(currentRemappingWork.files.stage1File as File).name} (${((currentRemappingWork.files.stage1File as File).size / 1024).toFixed(1)} KB)` 
                              : '📄 1차 튜닝 파일 선택'}
                          </span>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={currentRemappingWork.files.stage1FileDescription || ''}
                        onChange={(e) => handleFileDescriptionChange('stage1FileDescription', e.target.value)}
                        placeholder="1차 튜닝 설명을 입력하세요"
                        className="w-full border-green-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-xs"
                      />
                    </div>

                    {/* 2차 튜닝 */}
                    <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                      <label className="block text-sm font-medium text-yellow-800 mb-2">
                        🚀 2차 튜닝
                      </label>
                      <div className="flex items-center space-x-3 mb-2">
                        <input
                          type="file"
                          id="stage2-file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null
                            handleFileChange('stage2File', file)
                          }}
                        />
                        <label
                          htmlFor="stage2-file"
                          className="flex items-center justify-center px-3 py-2 border-2 border-dashed border-yellow-300 rounded-lg cursor-pointer hover:border-yellow-500 hover:bg-yellow-100 transition-colors text-xs w-full"
                        >
                          <span className="text-yellow-800">
                            {currentRemappingWork.files.stage2File 
                              ? `⚡ ${(currentRemappingWork.files.stage2File as File).name} (${((currentRemappingWork.files.stage2File as File).size / 1024).toFixed(1)} KB)` 
                              : '⚡ 2차 튜닝 파일 선택'}
                          </span>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={currentRemappingWork.files.stage2FileDescription || ''}
                        onChange={(e) => handleFileDescriptionChange('stage2FileDescription', e.target.value)}
                        placeholder="2차 튜닝 설명을 입력하세요"
                        className="w-full border-yellow-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 text-xs"
                      />
                    </div>

                    {/* 3차 튜닝 */}
                    <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <label className="block text-sm font-medium text-red-800 mb-2">
                        🔥 3차 튜닝
                      </label>
                      <div className="flex items-center space-x-3 mb-2">
                        <input
                          type="file"
                          id="stage3-file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null
                            handleFileChange('stage3File', file)
                          }}
                        />
                        <label
                          htmlFor="stage3-file"
                          className="flex items-center justify-center px-3 py-2 border-2 border-dashed border-red-300 rounded-lg cursor-pointer hover:border-red-500 hover:bg-red-100 transition-colors text-xs w-full"
                        >
                          <span className="text-red-800">
                            {currentRemappingWork.files.stage3File 
                              ? `🔥 ${(currentRemappingWork.files.stage3File as File).name} (${((currentRemappingWork.files.stage3File as File).size / 1024).toFixed(1)} KB)` 
                              : '🔥 3차 튜닝 파일 선택'}
                          </span>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={currentRemappingWork.files.stage3FileDescription || ''}
                        onChange={(e) => handleFileDescriptionChange('stage3FileDescription', e.target.value)}
                        placeholder="3차 튜닝 설명을 입력하세요"
                        className="w-full border-red-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 text-xs"
                      />
                    </div>
                  </div>

                  {/* ACU 파일 업로드 섹션 */}
                  <div className="border-t border-gray-300 pt-6">
                    <h5 className="text-md font-medium text-gray-900 mb-4">ACU 파일 업로드</h5>
                    
                    {/* 원본 ACU 파일 */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        원본 ACU 폴더
                      </label>
                      <div className="flex items-center space-x-3 mb-2">
                        <input
                          type="file"
                          id="acu-original-folder"
                          className="hidden"
                          multiple
                          {...({ webkitdirectory: "", directory: "" } as any)}
                          onChange={(e) => {
                            const files = Array.from(e.target.files || [])
                            handleFileChange('acuOriginalFiles', files)
                          }}
                        />
                        <label
                          htmlFor="acu-original-folder"
                          className="flex items-center justify-center px-4 py-2 border-2 border-dashed border-green-300 rounded-lg cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
                        >
                          <svg className="w-6 h-6 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="text-sm text-green-600">
                            {currentRemappingWork.files.acuOriginalFiles && currentRemappingWork.files.acuOriginalFiles.length > 0 
                              ? `⚙️ ${currentRemappingWork.files.acuOriginalFiles.length}개 파일 선택됨` 
                              : '⚙️ 원본 ACU 폴더 선택'}
                          </span>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={currentRemappingWork.files.acuOriginalFileDescription || ''}
                        onChange={(e) => handleFileDescriptionChange('acuOriginalFileDescription', e.target.value)}
                        placeholder="ACU 폴더 설명을 입력하세요 (예: 원본 백업 폴더, 읽기 전용 등)"
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                      />
                      {/* 선택된 ACU 파일 목록 표시 */}
                      {currentRemappingWork.files.acuOriginalFiles && currentRemappingWork.files.acuOriginalFiles.length > 0 && (
                        <div className="mt-2 p-3 bg-green-50 rounded-lg">
                          <div className="text-sm font-medium text-green-700 mb-2">선택된 ACU 파일:</div>
                          <div className="max-h-32 overflow-y-auto">
                            {currentRemappingWork.files.acuOriginalFiles.map((file, index) => (
                              <div key={index} className="text-xs text-green-600 py-1 flex items-center">
                                <span className="mr-2">⚙️</span>
                                <span className="truncate">{file.name}</span>
                                <span className="ml-auto text-green-400">
                                  ({(file.size / 1024).toFixed(1)} KB)
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ACU Stage 파일들 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      {/* ACU 1차 튜닝 */}
                      <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                        <label className="block text-sm font-medium text-green-800 mb-2">
                          ⚙️ ACU 1차 튜닝
                        </label>
                        <div className="flex items-center space-x-3 mb-2">
                          <input
                            type="file"
                            id="acu-stage1-file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null
                              handleFileChange('acuStage1File', file)
                            }}
                          />
                          <label
                            htmlFor="acu-stage1-file"
                            className="flex items-center justify-center px-3 py-2 border-2 border-dashed border-green-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-100 transition-colors text-xs w-full"
                          >
                            <span className="text-green-700">
                              {currentRemappingWork.files.acuStage1File 
                                ? `⚙️ ${(currentRemappingWork.files.acuStage1File as File).name} (${((currentRemappingWork.files.acuStage1File as File).size / 1024).toFixed(1)} KB)` 
                                : '⚙️ ACU 1차 튜닝 파일 선택'}
                            </span>
                          </label>
                        </div>
                        <input
                          type="text"
                          value={currentRemappingWork.files.acuStage1FileDescription || ''}
                          onChange={(e) => handleFileDescriptionChange('acuStage1FileDescription', e.target.value)}
                          placeholder="ACU 1차 튜닝 설명을 입력하세요"
                          className="w-full border-green-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-xs"
                        />
                      </div>

                      {/* ACU 2차 튜닝 */}
                      <div className="border border-green-300 rounded-lg p-4 bg-green-100">
                        <label className="block text-sm font-medium text-green-800 mb-2">
                          ⚙️ ACU 2차 튜닝
                        </label>
                        <div className="flex items-center space-x-3 mb-2">
                          <input
                            type="file"
                            id="acu-stage2-file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null
                              handleFileChange('acuStage2File', file)
                            }}
                          />
                          <label
                            htmlFor="acu-stage2-file"
                            className="flex items-center justify-center px-3 py-2 border-2 border-dashed border-green-400 rounded-lg cursor-pointer hover:border-green-600 hover:bg-green-200 transition-colors text-xs w-full"
                          >
                            <span className="text-green-800">
                              {currentRemappingWork.files.acuStage2File 
                                ? `⚙️ ${(currentRemappingWork.files.acuStage2File as File).name} (${((currentRemappingWork.files.acuStage2File as File).size / 1024).toFixed(1)} KB)` 
                                : '⚙️ ACU 2차 튜닝 파일 선택'}
                            </span>
                          </label>
                        </div>
                        <input
                          type="text"
                          value={currentRemappingWork.files.acuStage2FileDescription || ''}
                          onChange={(e) => handleFileDescriptionChange('acuStage2FileDescription', e.target.value)}
                          placeholder="ACU 2차 튜닝 설명을 입력하세요"
                          className="w-full border-green-400 rounded-md shadow-sm focus:ring-green-600 focus:border-green-600 text-xs"
                        />
                      </div>

                      {/* ACU 3차 튜닝 */}
                      <div className="border border-green-400 rounded-lg p-4 bg-green-200">
                        <label className="block text-sm font-medium text-green-900 mb-2">
                          ⚙️ ACU 3차 튜닝
                        </label>
                        <div className="flex items-center space-x-3 mb-2">
                          <input
                            type="file"
                            id="acu-stage3-file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null
                              handleFileChange('acuStage3File', file)
                            }}
                          />
                          <label
                            htmlFor="acu-stage3-file"
                            className="flex items-center justify-center px-3 py-2 border-2 border-dashed border-green-500 rounded-lg cursor-pointer hover:border-green-700 hover:bg-green-300 transition-colors text-xs w-full"
                          >
                            <span className="text-green-900">
                              {currentRemappingWork.files.acuStage3File 
                                ? `⚙️ ${(currentRemappingWork.files.acuStage3File as File).name} (${((currentRemappingWork.files.acuStage3File as File).size / 1024).toFixed(1)} KB)` 
                                : '⚙️ ACU 3차 튜닝 파일 선택'}
                            </span>
                          </label>
                        </div>
                        <input
                          type="text"
                          value={currentRemappingWork.files.acuStage3FileDescription || ''}
                          onChange={(e) => handleFileDescriptionChange('acuStage3FileDescription', e.target.value)}
                          placeholder="ACU 3차 튜닝 설명을 입력하세요"
                          className="w-full border-green-500 rounded-md shadow-sm focus:ring-green-700 focus:border-green-700 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 사진/영상 첨부 (5개) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">
                      사진/영상 첨부 (최대 5개)
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                      {[1, 2, 3, 4, 5].map((index) => {
                        const fileKey = `mediaFile${index}` as keyof typeof currentRemappingWork.files
                        const descKey = `mediaFile${index}Description` as keyof typeof currentRemappingWork.files
                        const file = currentRemappingWork.files[fileKey] as File | undefined
                        const description = currentRemappingWork.files[descKey] as string | undefined
                        
                        return (
                          <div key={index} className="border border-purple-200 rounded-lg p-3 bg-purple-50">
                            <label className="block text-xs font-medium text-purple-800 mb-2">
                              📷 미디어 {index}
                            </label>
                            
                            {/* 파일 선택 및 미리보기 */}
                            <div className="mb-2">
                              <input
                                type="file"
                                id={`media-file-${index}`}
                                className="hidden"
                                accept="image/*,video/*"
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
                                  ) : (
                                    <div className="w-full h-32 bg-gray-100 rounded-lg border border-purple-300 flex items-center justify-center">
                                      <div className="text-center text-gray-500">
                                        <div className="text-lg">📄</div>
                                        <div className="text-xs">미리보기 불가</div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* 파일 정보 */}
                                  <div className="mt-1 text-xs text-purple-600 truncate" title={file.name}>
                                    📄 {file.name}
                                  </div>
                                  <div className="text-xs text-purple-500">
                                    ({(file.size / 1024).toFixed(1)} KB)
                                  </div>
                                </div>
                              ) : (
                                <label
                                  htmlFor={`media-file-${index}`}
                                  className="flex items-center justify-center px-2 py-2 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-100 transition-colors text-xs w-full h-32"
                                >
                                  <div className="text-center text-purple-700">
                                    <div className="text-2xl mb-1">📷</div>
                                    <div>파일 선택</div>
                                    <div className="text-purple-500">이미지/동영상</div>
                                  </div>
                                </label>
                              )}
                            </div>
                            
                            {/* 설명 입력 */}
                            <textarea
                              value={description || ''}
                              onChange={(e) => handleFileDescriptionChange(`mediaFile${index}Description`, e.target.value)}
                              placeholder={`미디어 ${index} 설명`}
                              className="w-full border-purple-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-xs resize-none"
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
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              작업 등록
            </button>
          </div>
        </form>
      </div>


          </div>
        </div>
      </main>

      {/* ECU 모델 관리 모달 */}
      {showEcuManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-[9999]">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">🔧 ECU 모델 관리</h3>
              <button
                type="button"
                onClick={() => {
                  setShowEcuManagement(false)
                  setSelectedEcuModels([])
                  setNewEcuModel('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">닫기</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 새 ECU 모델 추가 */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-md font-medium text-blue-800 mb-3">새 ECU 모델 추가</h4>
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={newEcuModel}
                  onChange={(e) => setNewEcuModel(e.target.value)}
                  className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="새 ECU 모델명을 입력하세요"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddNewEcuModel()}
                />
                <button
                  type="button"
                  onClick={handleAddNewEcuModel}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  추가
                </button>
              </div>
            </div>

            {/* 선택 삭제 */}
            <div className="mb-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                총 {ecuModels.length}개 모델 | 선택됨: {selectedEcuModels.length}개
              </div>
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedEcuModels.length === ecuModels.length) {
                      setSelectedEcuModels([])
                    } else {
                      setSelectedEcuModels([...ecuModels])
                    }
                  }}
                  className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors"
                >
                  {selectedEcuModels.length === ecuModels.length ? '전체 해제' : '전체 선택'}
                </button>
                <button
                  type="button"
                  onClick={deleteSelectedEcuModels}
                  disabled={selectedEcuModels.length === 0}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  선택 삭제 ({selectedEcuModels.length})
                </button>
              </div>
            </div>

            {/* ECU 모델 목록 */}
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-4">
                {ecuModels.map((model, index) => (
                  <div
                    key={index}
                    className={`flex items-center p-2 rounded-lg border transition-colors cursor-pointer ${
                      selectedEcuModels.includes(model)
                        ? 'bg-blue-100 border-blue-300'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => handleEcuModelSelect(model)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEcuModels.includes(model)}
                      onChange={() => handleEcuModelSelect(model)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                    />
                    <span className="text-sm text-gray-900 flex-1 truncate" title={model}>
                      {model}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowEcuManagement(false)
                  setSelectedEcuModels([])
                  setNewEcuModel('')
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACU 타입 관리 모달 */}
      {showAcuManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-[9999]">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">⚙️ ACU 타입 관리</h3>
              <button
                type="button"
                onClick={() => {
                  setShowAcuManagement(false)
                  setSelectedAcuTypes([])
                  setNewAcuType('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">닫기</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 새 ACU 타입 추가 */}
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="text-md font-medium text-green-800 mb-3">새 ACU 타입 추가</h4>
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={newAcuType}
                  onChange={(e) => setNewAcuType(e.target.value)}
                  className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                  placeholder="새 ACU 타입명을 입력하세요"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddNewAcuType()}
                />
                <button
                  type="button"
                  onClick={handleAddNewAcuType}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  추가
                </button>
              </div>
            </div>

            {/* 선택 삭제 */}
            <div className="mb-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                총 {acuTypes.length}개 타입 | 선택됨: {selectedAcuTypes.length}개
              </div>
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedAcuTypes.length === acuTypes.length) {
                      setSelectedAcuTypes([])
                    } else {
                      setSelectedAcuTypes([...acuTypes])
                    }
                  }}
                  className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors"
                >
                  {selectedAcuTypes.length === acuTypes.length ? '전체 해제' : '전체 선택'}
                </button>
                <button
                  type="button"
                  onClick={deleteSelectedAcuTypes}
                  disabled={selectedAcuTypes.length === 0}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  선택 삭제 ({selectedAcuTypes.length})
                </button>
              </div>
            </div>

            {/* ACU 타입 목록 */}
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-4">
                {acuTypes.map((type, index) => (
                  <div
                    key={index}
                    className={`flex items-center p-2 rounded-lg border transition-colors cursor-pointer ${
                      selectedAcuTypes.includes(type)
                        ? 'bg-green-100 border-green-300'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => handleAcuTypeSelect(type)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAcuTypes.includes(type)}
                      onChange={() => handleAcuTypeSelect(type)}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded mr-3"
                    />
                    <span className="text-sm text-gray-900 flex-1 truncate" title={type}>
                      {type}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAcuManagement(false)
                  setSelectedAcuTypes([])
                  setNewAcuType('')
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                완료
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </AuthGuard>
  )
} 