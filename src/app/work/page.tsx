'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ACU_TYPES, ECU_MODELS, ECU_MAKERS, CONNECTION_METHODS, ECU_TOOL_CATEGORIES, ECU_TOOLS, ECU_TOOLS_FLAT, TUNING_WORKS, TUNING_CATEGORIES, TUNING_WORKS_BY_CATEGORY, WORK_STATUS } from '@/constants'
import { getAllCustomers, CustomerData } from '@/lib/customers'
import { getEquipmentByCustomerId, EquipmentData } from '@/lib/equipment'
import { createWorkRecord, WorkRecordData } from '@/lib/work-records'

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
    ecuCategory: string
    ecuToolCategory: string
    connectionMethod: string
    ecuMaker?: string
    ecuType: string
    ecuTypeCustom: string
    selectedWorks: string[]
    notes: string
    workDetails: string
    price: string
    status: string
    files: {
      originalFile?: File
      originalFileDescription?: string
      stage1File?: File
      stage1FileDescription?: string
      stage2File?: File
      stage2FileDescription?: string
      stage3File?: File
      stage3FileDescription?: string
      mediaFiles?: File[]
      mediaFileDescription?: string
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
    ecuCategory: '',
    ecuToolCategory: '',
    connectionMethod: '',
    ecuMaker: '',
    ecuType: '',
    ecuTypeCustom: '',
    selectedWorks: [] as string[],
    notes: '',
    workDetails: '',
    price: '',
    status: '예약',
    files: {
      originalFile: undefined,
      originalFileDescription: '',
      stage1File: undefined,
      stage1FileDescription: '',
      stage2File: undefined,
      stage2FileDescription: '',
      stage3File: undefined,
      stage3FileDescription: '',
      mediaFiles: [] as File[],
      mediaFileDescription: ''
    }
  })

  // 작업 카테고리별 선택 상태 (현재 편집 중인 작업용)
  const [workSelections, setWorkSelections] = useState<{[category: string]: string[]}>({
    '튜닝 작업': []
  })

  // Remapping 작업 편집 모드
  const [isEditingRemapping, setIsEditingRemapping] = useState(false)
  const [editingRemappingId, setEditingRemappingId] = useState<number | null>(null)

  // 선택된 고객의 장비 목록
  const [availableEquipment, setAvailableEquipment] = useState<EquipmentData[]>([])
  
  // 고객 자동완성 관련 state
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerData[]>([])

  // 고객 데이터 로드
  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    setIsLoadingCustomers(true)
    try {
      console.log('🔄 고객 데이터 로딩 시작...')
      const data = await getAllCustomers()
      console.log('✅ 로드된 고객 데이터:', data)
      setCustomers(data)
      setFilteredCustomers(data)
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
      
      // 현재 Remapping 작업의 선택된 작업 목록 업데이트
      const allSelectedWorks = Object.values(newSelections).flat()
      setCurrentRemappingWork(prev => ({ ...prev, selectedWorks: allSelectedWorks }))
      
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
      
      // 현재 Remapping 작업의 선택된 작업 목록 업데이트
      const allSelectedWorks = Object.values(newSelections).flat()
      setCurrentRemappingWork(prev => ({ ...prev, selectedWorks: allSelectedWorks }))
      
      return newSelections
    })
  }

  // Remapping 작업 입력 핸들러
  const handleRemappingWorkInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    // 금액 입력 시 만원 단위를 원 단위로 변환
    if (name === 'price') {
      const priceInWon = value ? parseFloat(value) * 10000 : ''
      setCurrentRemappingWork(prev => ({ ...prev, [name]: priceInWon.toString() }))
      return
    }
    
    setCurrentRemappingWork(prev => ({ ...prev, [name]: value }))
  }

  // 파일 입력 핸들러
  const handleFileChange = (fileType: string, file: File | null, description?: string) => {
    setCurrentRemappingWork(prev => ({
      ...prev,
      files: {
        ...prev.files,
        [fileType]: file,
        ...(description !== undefined && { [`${fileType}Description`]: description })
      }
    }))
  }

  // Remapping 작업 추가
  const handleAddRemappingWork = () => {
    if (!currentRemappingWork.ecuCategory || !currentRemappingWork.ecuToolCategory || 
        !currentRemappingWork.connectionMethod || currentRemappingWork.selectedWorks.length === 0) {
      alert('ECU 정보와 최소 하나 이상의 작업을 선택해주세요.')
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
      ecuCategory: '',
      ecuToolCategory: '',
      connectionMethod: '',
      ecuMaker: '',
      ecuType: '',
      ecuTypeCustom: '',
      selectedWorks: [],
      notes: '',
      workDetails: '',
      price: '',
      status: '예약',
      files: {
        originalFile: undefined,
        originalFileDescription: '',
        stage1File: undefined,
        stage1FileDescription: '',
        stage2File: undefined,
        stage2FileDescription: '',
        stage3File: undefined,
        stage3FileDescription: '',
        mediaFiles: [] as File[],
        mediaFileDescription: ''
      }
    })

    setWorkSelections({
      '튜닝 작업': []
    })
  }

  // Remapping 작업 편집
  const handleEditRemappingWork = (work: RemappingWork) => {
    setCurrentRemappingWork({
      ecuCategory: work.ecuCategory,
      ecuToolCategory: work.ecuToolCategory,
      connectionMethod: work.connectionMethod,
      ecuMaker: work.ecuMaker || '',
      ecuType: work.ecuType,
      ecuTypeCustom: work.ecuTypeCustom,
      selectedWorks: work.selectedWorks,
      notes: work.notes,
      workDetails: work.workDetails,
      price: work.price,
      status: work.status,
      files: work.files
    })

    // 작업 선택 상태 복원
    setWorkSelections({
      '튜닝 작업': work.selectedWorks
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
      ecuCategory: '',
      ecuToolCategory: '',
      connectionMethod: '',
      ecuMaker: '',
      ecuType: '',
      ecuTypeCustom: '',
      selectedWorks: [],
      notes: '',
      workDetails: '',
      price: '',
      status: '예약',
      files: {
        originalFile: undefined,
        originalFileDescription: '',
        stage1File: undefined,
        stage1FileDescription: '',
        stage2File: undefined,
        stage2FileDescription: '',
        stage3File: undefined,
        stage3FileDescription: '',
        mediaFiles: [] as File[],
        mediaFileDescription: ''
      }
    })

    setWorkSelections({
      '튜닝 작업': []
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

    // 선택된 고객의 장비 목록 업데이트 - 실제 Supabase 데이터 사용
    try {
      const customerEquipment = await getEquipmentByCustomerId(customer.id)
      setAvailableEquipment(customerEquipment)
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
        
        if (remappingWork.files.originalFile) {
          const data = await convertFileToBase64(remappingWork.files.originalFile)
          files.push({
            name: remappingWork.files.originalFile.name,
            size: remappingWork.files.originalFile.size,
            type: remappingWork.files.originalFile.type,
            data: data,
            description: remappingWork.files.originalFileDescription || '원본 ECU 파일',
            category: 'original',
            uploadDate: new Date().toISOString()
          })
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

        if (remappingWork.files.mediaFiles && remappingWork.files.mediaFiles.length > 0) {
          for (const mediaFile of remappingWork.files.mediaFiles) {
            const data = await convertFileToBase64(mediaFile)
            files.push({
              name: mediaFile.name,
              size: mediaFile.size,
              type: mediaFile.type,
              data: data,
              description: remappingWork.files.mediaFileDescription || '미디어 파일',
              category: 'media',
              uploadDate: new Date().toISOString()
            })
          }
        }

        // Supabase에 저장할 작업 기록 데이터 생성
        const workRecordData: Omit<WorkRecordData, 'id' | 'createdAt' | 'updatedAt'> = {
          customerId: parseInt(formData.customerId),
          equipmentId: parseInt(formData.equipmentId),
          workDate: formData.workDate,
          workType: 'ECU 튜닝',
          workDescription: remappingWork.selectedWorks.join(', ') + (remappingWork.workDetails ? ` - ${remappingWork.workDetails}` : ''),
          ecuModel: remappingWork.ecuType || remappingWork.ecuTypeCustom,
          connectionMethod: remappingWork.connectionMethod,
          toolsUsed: [remappingWork.ecuToolCategory],
          price: parseFloat(remappingWork.price) || 0,
          status: remappingWork.status,
          files: files
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
    
    const allWorks = remappingWorks.flatMap(work => work.selectedWorks)
    
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
      ecuCategory: '',
      ecuToolCategory: '',
      connectionMethod: '',
      ecuMaker: '',
      ecuType: '',
      ecuTypeCustom: '',
      selectedWorks: [],
      notes: '',
      workDetails: '',
      price: '',
      status: '예약',
      files: {
        originalFile: undefined,
        originalFileDescription: '',
        stage1File: undefined,
        stage1FileDescription: '',
        stage2File: undefined,
        stage2FileDescription: '',
        stage3File: undefined,
        stage3FileDescription: '',
        mediaFiles: [] as File[],
        mediaFileDescription: ''
      }
    })
    
    setWorkSelections({
      '튜닝 작업': []
    })
    
    setIsEditingRemapping(false)
    setEditingRemappingId(null)
    
    setAvailableEquipment([])
  }

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

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">작업 등록</h1>
        <p className="mt-2 text-gray-600">
          새로운 ECU 튜닝 작업을 등록하고 관리합니다.
        </p>
      </div>

      {/* 작업 등록 폼 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">새 작업 등록</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 고객 및 장비 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="relative" ref={dropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="고객을 선택하거나 검색하세요..."
                required
                autoComplete="off"
                style={{ imeMode: 'active' }}
                lang="ko"
              />
              
              {/* 고객 자동완성 드롭다운 */}
              {showCustomerDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {isLoadingCustomers ? (
                    <div className="px-4 py-3 text-gray-500 text-center">
                      고객 데이터 로딩 중...
                    </div>
                  ) : filteredCustomers.length > 0 ? (
                    <>
                      {formData.customerName.trim() === '' && (
                        <div className="px-4 py-2 bg-gray-50 text-sm text-gray-600 border-b border-gray-200">
                          전체 고객 목록 ({filteredCustomers.length}명)
                        </div>
                      )}
                      {filteredCustomers.map((customer) => (
                        <div
                          key={customer.id}
                          onClick={() => handleCustomerSelect(customer)}
                          className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{customer.name}</div>
                          <div className="text-sm text-gray-500">{customer.phone}</div>
                          <div className="text-xs text-gray-400">{customer.roadAddress}</div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="px-4 py-3 text-gray-500 text-center">
                      {formData.customerName.trim() === '' ? '고객 데이터를 불러오지 못했습니다.' : '검색 결과가 없습니다.'}
                    </div>
                  )}
                </div>
              )}


              {formData.customerId && (
                <div className="mt-2 p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-700">
                    📍 {customers.find(c => c.id.toString() === formData.customerId)?.roadAddress}
                  </p>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                장비 선택 *
              </label>
              <select
                name="equipmentId"
                value={formData.equipmentId}
                onChange={handleInputChange}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={!formData.customerId}
              >
                <option value="">
                  {formData.customerId ? '장비를 선택하세요' : '먼저 고객을 선택하세요'}
                </option>
                {availableEquipment.map((equipment) => (
                  <option key={equipment.id} value={equipment.id}>
                    {equipment.equipmentType} - {equipment.manufacturer} {equipment.model}
                  </option>
                ))}
              </select>
              {formData.equipmentId && (
                <div className="mt-2 p-3 bg-green-50 rounded-md">
                  <p className="text-sm text-green-700">
                    🚜 {availableEquipment.find(e => e.id.toString() === formData.equipmentId)?.serial}
                  </p>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                작업 날짜 *
              </label>
              <input
                type="date"
                name="workDate"
                value={formData.workDate}
                onChange={handleInputChange}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* 등록된 Remapping 작업 목록 */}
          {remappingWorks.length > 0 && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">등록된 Remapping 작업 ({remappingWorks.length}개)</h3>
              <div className="space-y-4">
                {remappingWorks.map((work, index) => (
                  <div key={work.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">Remapping #{index + 1}</h4>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div><span className="font-medium">ECU 타입:</span> {work.ecuCategory}</div>
                          <div><span className="font-medium">장비:</span> {work.ecuToolCategory}</div>
                          <div><span className="font-medium">연결:</span> {work.connectionMethod}</div>
                          <div><span className="font-medium">상태:</span> <span className={`px-2 py-1 rounded-full text-xs ${work.status === '완료' ? 'bg-green-100 text-green-800' : work.status === '진행중' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{work.status}</span></div>
                          {work.ecuMaker && <div><span className="font-medium">ECU 제조사:</span> {work.ecuMaker}</div>}
                          {work.ecuType && <div><span className="font-medium">ECU 모델:</span> {work.ecuType}</div>}
                          {work.ecuTypeCustom && <div><span className="font-medium">추가 정보:</span> {work.ecuTypeCustom}</div>}
                          {work.price && <div><span className="font-medium">금액:</span> {(parseFloat(work.price) / 10000).toFixed(1)}만원</div>}
                        </div>
                        <div className="mt-3">
                          <span className="font-medium text-gray-700">선택된 작업:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {work.selectedWorks.map((workName, idx) => (
                              <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {workName}
                              </span>
                            ))}
                          </div>
                        </div>
                        {work.workDetails && (
                          <div className="mt-2">
                            <span className="font-medium text-gray-700">작업 상세:</span>
                            <p className="text-sm text-gray-600 mt-1">{work.workDetails}</p>
                          </div>
                        )}
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
                            {work.files.originalFile && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">📁 원본</span>}
                            {work.files.stage1File && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">📈 Stage1</span>}
                            {work.files.stage2File && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">🚀 Stage2</span>}
                            {work.files.stage3File && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">🔥 Stage3</span>}
                            {work.files.mediaFiles && work.files.mediaFiles.length > 0 && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">📷 미디어({work.files.mediaFiles.length})</span>}
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
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ECU 타입 *
                  </label>
                  <select
                    name="ecuCategory"
                    value={currentRemappingWork.ecuCategory}
                    onChange={handleRemappingWorkInputChange}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">ECU 타입을 선택하세요</option>
                    {ACU_TYPES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ECU 장비 카테고리 *
                  </label>
                  <select
                    name="ecuToolCategory"
                    value={currentRemappingWork.ecuToolCategory}
                    onChange={handleRemappingWorkInputChange}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">장비 카테고리를 선택하세요</option>
                    {ECU_TOOL_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    연결 방법 *
                  </label>
                  <select
                    name="connectionMethod"
                    value={currentRemappingWork.connectionMethod}
                    onChange={handleRemappingWorkInputChange}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">연결 방법을 선택하세요</option>
                    {CONNECTION_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ECU 제조사
                  </label>
                  <select
                    name="ecuMaker"
                    value={currentRemappingWork.ecuMaker || ''}
                    onChange={handleRemappingWorkInputChange}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">ECU 제조사를 선택하세요</option>
                    {ECU_MAKERS.map((maker) => (
                      <option key={maker} value={maker}>
                        {maker}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ECU 모델
                  </label>
                  <select
                    name="ecuType"
                    value={currentRemappingWork.ecuType}
                    onChange={handleRemappingWorkInputChange}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">ECU 모델을 선택하세요</option>
                    {ECU_MODELS.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    추가 정보
                  </label>
                  <input
                    type="text"
                    name="ecuTypeCustom"
                    value={currentRemappingWork.ecuTypeCustom}
                    onChange={handleRemappingWorkInputChange}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="추가 ECU 정보나 세부 모델명..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    작업 상태 *
                  </label>
                  <select
                    name="status"
                    value={currentRemappingWork.status}
                    onChange={handleRemappingWorkInputChange}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    {WORK_STATUS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    작업 금액 (만원)
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={currentRemappingWork.price ? (parseFloat(currentRemappingWork.price) / 10000).toString() : ''}
                    onChange={handleRemappingWorkInputChange}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="35 (35만원)"
                    min="0"
                    step="0.1"
                  />
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    튜닝 작업 선택 * (다중 선택 가능)
                  </label>
                  
                  {/* 선택된 작업 요약 */}
                  {currentRemappingWork.selectedWorks.length > 0 && (
                    <div className="mb-4 p-3 bg-white rounded-lg border border-blue-200">
                      <div className="text-sm font-medium text-blue-900 mb-2">
                        선택된 작업 ({currentRemappingWork.selectedWorks.length}개):
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {currentRemappingWork.selectedWorks.map((work, index) => (
                          <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {work}
                          </span>
                        ))}
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
                      
                      return (
                        <div key={category} className="bg-white border border-gray-200 rounded-lg p-4">
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
                              <label htmlFor={`category-${category}`} className="ml-2 text-sm font-medium text-gray-900">
                                {category}
                              </label>
                            </div>
                            <span className="text-xs text-gray-500">
                              {selectedInCategory.length}/{categoryWorks.length} 선택됨
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 ml-6">
                            {categoryWorks.map((work) => (
                              <label key={work} className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={selectedInCategory.includes(work)}
                                  onChange={() => handleWorkSelection(category, work)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="ml-2 text-sm text-gray-700">{work}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    작업 상세 정보
                  </label>
                  <textarea
                    name="workDetails"
                    value={currentRemappingWork.workDetails}
                    onChange={handleRemappingWorkInputChange}
                    rows={3}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="작업 내용, 특이사항, 주의사항 등을 상세히 입력하세요..."
                  />
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    작업 메모
                  </label>
                  <textarea
                    name="notes"
                    value={currentRemappingWork.notes}
                    onChange={handleRemappingWorkInputChange}
                    rows={2}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="이 Remapping 작업에 대한 간단한 메모를 입력하세요..."
                  />
                </div>
              </div>

              {/* 파일 첨부 섹션 */}
              <div className="mt-8 border-t border-gray-200 pt-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">파일 첨부</h4>
                <div className="space-y-6">
                  {/* 원본 ECU 파일 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      원본 ECU 파일
                    </label>
                    <div className="flex items-center space-x-3 mb-2">
                      <input
                        type="file"
                        id="original-file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null
                          handleFileChange('originalFile', file)
                        }}
                      />
                      <label
                        htmlFor="original-file"
                        className="flex items-center justify-center px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                      >
                        <svg className="w-6 h-6 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-sm text-gray-600">
                          {currentRemappingWork.files.originalFile ? currentRemappingWork.files.originalFile.name : '📁 원본 파일 선택'}
                        </span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={currentRemappingWork.files.originalFileDescription || ''}
                      onChange={(e) => handleFileChange('originalFileDescription', null, e.target.value)}
                      placeholder="파일 설명을 입력하세요 (예: 원본 백업 파일, 읽기 전용 등)"
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Stage 파일들 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Stage 1 */}
                    <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                      <label className="block text-sm font-medium text-green-800 mb-2">
                        📈 Stage 1 (경량 튜닝)
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
                          className="flex items-center justify-center px-3 py-2 border-2 border-dashed border-green-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-100 transition-colors text-xs"
                        >
                          <span className="text-green-700">
                            {currentRemappingWork.files.stage1File ? '📄 선택됨' : '📄 Stage 1 선택'}
                          </span>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={currentRemappingWork.files.stage1FileDescription || ''}
                        onChange={(e) => handleFileChange('stage1FileDescription', null, e.target.value)}
                        placeholder="Stage 1 설명"
                        className="w-full border-green-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-xs"
                      />
                    </div>

                    {/* Stage 2 */}
                    <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                      <label className="block text-sm font-medium text-yellow-800 mb-2">
                        🚀 Stage 2 (중간 튜닝)
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
                          className="flex items-center justify-center px-3 py-2 border-2 border-dashed border-yellow-300 rounded-lg cursor-pointer hover:border-yellow-500 hover:bg-yellow-100 transition-colors text-xs"
                        >
                          <span className="text-yellow-800">
                            {currentRemappingWork.files.stage2File ? '⚡ 선택됨' : '⚡ Stage 2 선택'}
                          </span>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={currentRemappingWork.files.stage2FileDescription || ''}
                        onChange={(e) => handleFileChange('stage2FileDescription', null, e.target.value)}
                        placeholder="Stage 2 설명"
                        className="w-full border-yellow-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 text-xs"
                      />
                    </div>

                    {/* Stage 3 */}
                    <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <label className="block text-sm font-medium text-red-800 mb-2">
                        🔥 Stage 3 (고성능 튜닝)
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
                          className="flex items-center justify-center px-3 py-2 border-2 border-dashed border-red-300 rounded-lg cursor-pointer hover:border-red-500 hover:bg-red-100 transition-colors text-xs"
                        >
                          <span className="text-red-800">
                            {currentRemappingWork.files.stage3File ? '🔥 선택됨' : '🔥 Stage 3 선택'}
                          </span>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={currentRemappingWork.files.stage3FileDescription || ''}
                        onChange={(e) => handleFileChange('stage3FileDescription', null, e.target.value)}
                        placeholder="Stage 3 설명"
                        className="w-full border-red-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 text-xs"
                      />
                    </div>
                  </div>

                  {/* 사진/영상 첨부 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      사진/영상 첨부
                    </label>
                    <div className="flex items-center space-x-3 mb-2">
                      <input
                        type="file"
                        id="media-files"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || [])
                          handleFileChange('mediaFiles', files as any)
                        }}
                      />
                      <label
                        htmlFor="media-files"
                        className="flex items-center justify-center px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                      >
                        <svg className="w-6 h-6 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm text-gray-600">
                          {currentRemappingWork.files.mediaFiles && currentRemappingWork.files.mediaFiles.length > 0 
                            ? `📷 ${currentRemappingWork.files.mediaFiles.length}개 파일 선택됨` 
                            : '📷 사진/영상 선택'}
                        </span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={currentRemappingWork.files.mediaFileDescription || ''}
                      onChange={(e) => handleFileChange('mediaFileDescription', null, e.target.value)}
                      placeholder="첨부 파일 설명 (예: 작업 전후 사진, 장비 상태 영상 등)"
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
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
  )
} 