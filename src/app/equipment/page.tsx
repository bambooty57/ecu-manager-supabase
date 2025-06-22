'use client'

import { useState, useRef, useEffect } from 'react'
import { EQUIPMENT_TYPES, MANUFACTURERS, MANUFACTURER_MODELS, ECU_MODELS, ACU_TYPES } from '@/constants'
import { getAllCustomers, CustomerData } from '@/lib/customers'
import { getAllEquipment, createEquipment, deleteEquipment, updateEquipment, EquipmentData } from '@/lib/equipment'
import { getModelsByManufacturerObject, addEquipmentModel } from '@/lib/equipment-models'
import Navigation from '@/components/Navigation'
import AuthGuard from '@/components/AuthGuard'
import CustomDropdown from '@/components/CustomDropdown'

interface Equipment {
  id: number
  customerName: string
  equipmentType: string
  manufacturer: string
  model: string
  serialNumber: string
  usageHours: number
  ecuType: string
  acuType: string
  registrationDate: string
  notes?: string
}

export default function EquipmentPage() {
  const [customers, setCustomers] = useState<CustomerData[]>([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true)
  const [equipments, setEquipments] = useState<Equipment[]>([])
  const [isLoadingEquipments, setIsLoadingEquipments] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterManufacturer, setFilterManufacturer] = useState('')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  
  const [formData, setFormData] = useState({
    customerName: '',
    equipmentType: '',
    manufacturer: '',
    model: '',
    customModel: '',
    serialNumber: '',
    usageHours: 0,
    ecuType: '',
    customEcuType: '',
    acuType: '',
    customAcuType: '',
    notes: ''
  })

  // 수정용 폼 데이터 (상세보기 모달에서 사용)
  const [editFormData, setEditFormData] = useState({
    customerName: '',
    equipmentType: '',
    manufacturer: '',
    model: '',
    customModel: '',
    serialNumber: '',
    usageHours: 0,
    ecuType: '',
    customEcuType: '',
    acuType: '',
    customAcuType: '',
    notes: ''
  })

  // ECU/ACU 타입 목록 상태 (동적으로 추가 가능)
  const [ecuModels, setEcuModels] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ecuModels')
      return saved ? JSON.parse(saved) : [...ECU_MODELS]
    }
    return [...ECU_MODELS]
  })
  const [acuTypes, setAcuTypes] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('acuTypes')
      return saved ? JSON.parse(saved) : [...ACU_TYPES]
    }
    return [...ACU_TYPES]
  })
  
  // 제조사별 모델 목록 상태 (데이터베이스에서 가져옴)
  const [modelsByManufacturer, setModelsByManufacturer] = useState<Record<string, string[]>>({})

  const fileInputRef = useRef<HTMLInputElement>(null)

  // 고객 및 장비 데이터 로드
  useEffect(() => {
    loadCustomers()
    loadEquipments()
    loadModels()
  }, [])

  // 모델 목록 로드
  const loadModels = async () => {
    try {
      console.log('🔄 Loading models from database...');
      const [ecuModels, acuModels] = await Promise.all([
        getModelsByManufacturerObject('ECU'),
        getModelsByManufacturerObject('ACU')
      ]);
      
      console.log('✅ ECU Models loaded:', ecuModels);
      console.log('✅ ACU Models loaded:', acuModels);

      // 두 모델 객체를 병합합니다. 동일한 제조사가 양쪽에 있는 경우를 대비하여 신중하게 병합합니다.
      const combinedModels = { ...ecuModels };
      for (const manufacturer in acuModels) {
        if (combinedModels[manufacturer]) {
          // 중복되지 않는 모델만 추가합니다.
          combinedModels[manufacturer] = [...new Set([...combinedModels[manufacturer], ...acuModels[manufacturer]])];
        } else {
          combinedModels[manufacturer] = acuModels[manufacturer];
        }
      }

      setModelsByManufacturer(combinedModels);
      console.log('📊 Combined models state updated:', combinedModels);
    } catch (error) {
      console.error('❌ Failed to load models:', error);
    }
  };

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
      const data = await getAllCustomers()
      setCustomers(data)
    } catch (error) {
      console.error('Failed to load customers:', error)
    } finally {
      setIsLoadingCustomers(false)
    }
  }

  const loadEquipments = async () => {
    setIsLoadingEquipments(true)
    try {
      const equipmentData = await getAllEquipment()
      
      // EquipmentData를 Equipment 형식으로 변환
      const transformedEquipments: Equipment[] = equipmentData.map(equipment => {
        // 고객 이름 찾기
        const customer = customers.find(c => c.id === equipment.customerId)
        
        return {
          id: equipment.id,
          customerName: customer?.name || '알 수 없음',
          equipmentType: equipment.equipmentType,
          manufacturer: equipment.manufacturer,
          model: equipment.model,
          serialNumber: equipment.serialNumber || '',
          usageHours: equipment.horsepower || 0, // horsepower를 usageHours로 임시 매핑
          ecuType: equipment.ecuType || '',
          acuType: equipment.acuType || '', // ACU 타입 필드 사용
          registrationDate: equipment.createdAt ? new Date(equipment.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          notes: equipment.notes
        }
      })
      
      setEquipments(transformedEquipments)
    } catch (error) {
      console.error('Failed to load equipments:', error)
    } finally {
      setIsLoadingEquipments(false)
    }
  }

  // 고객 데이터가 로드된 후 장비 데이터 다시 로드 (고객 이름 매핑을 위해)
  useEffect(() => {
    if (customers.length > 0) {
      loadEquipments()
    }
  }, [customers])

  // 제조사별 모델명 목록 가져오기
  const getAvailableModels = (manufacturer: string) => {
    console.log('🔍 Getting models for manufacturer:', manufacturer)
    console.log('📋 Available models data:', modelsByManufacturer)
    const models = modelsByManufacturer[manufacturer] || []
    console.log('🎯 Models for', manufacturer, ':', models)
    return models
  }

  // 새로운 ECU 타입을 목록에 추가
  const addNewEcuType = (newType: string) => {
    if (newType.trim() && !ecuModels.includes(newType.trim())) {
      const newList = [...ecuModels, newType.trim()]
      setEcuModels(newList)
      localStorage.setItem('ecuModels', JSON.stringify(newList))
    }
  }

  // 새로운 ACU 타입을 목록에 추가
  const addNewAcuType = (newType: string) => {
    if (newType.trim() && !acuTypes.includes(newType.trim())) {
      const newList = [...acuTypes, newType.trim()]
      setAcuTypes(newList)
      localStorage.setItem('acuTypes', JSON.stringify(newList))
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

  // 새로운 모델을 데이터베이스에 추가
  const addNewModel = async (manufacturer: string, newModel: string) => {
    if (newModel.trim() && manufacturer) {
      try {
        console.log(`✨ Adding new model: ${manufacturer} - ${newModel}`);
        // 'ECU'를 기본 타입으로 추가하거나, UI에서 타입을 선택할 수 있도록 수정해야 합니다.
        // 여기서는 임시로 'ECU'를 사용합니다.
        const addedModel = await addEquipmentModel(manufacturer, newModel, 'ECU');
        if (addedModel) {
          console.log('✅ Model added successfully to DB:', addedModel);
          // 상태를 즉시 업데이트하여 UI에 반영
          setModelsByManufacturer(prev => {
            const newModels = { ...prev };
            if (!newModels[manufacturer]) {
              newModels[manufacturer] = [];
            }
            newModels[manufacturer].push(newModel);
            return newModels;
          });
        } else {
          console.log('ℹ️ Model already exists or failed to add.');
        }
      } catch (error) {
        console.error('❌ Failed to add new model to DB:', error);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    if (name === 'manufacturer') {
      // 제조사 변경 시 모델명 초기화
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        model: '',
        customModel: ''
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  // 수정 폼 입력 핸들러
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    if (name === 'manufacturer') {
      // 제조사 변경 시 모델명 초기화
      setEditFormData(prev => ({ 
        ...prev, 
        [name]: value,
        model: '',
        customModel: ''
      }))
    } else {
      setEditFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  // 상세보기 모달 열기
  const handleViewDetail = (equipment: Equipment) => {
    setSelectedEquipment(equipment)
    setEditFormData({
      customerName: equipment.customerName,
      equipmentType: equipment.equipmentType,
      manufacturer: equipment.manufacturer,
      model: equipment.model,
      customModel: '',
      serialNumber: equipment.serialNumber,
      usageHours: equipment.usageHours,
      ecuType: equipment.ecuType,
      customEcuType: '',
      acuType: equipment.acuType,
      customAcuType: '',
      notes: equipment.notes || ''
    })
    setIsEditMode(false)
    setIsDetailModalOpen(true)
  }

  // 수정 모드 토글
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode)
  }

  // 수정 저장
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedEquipment) return
    
    try {
      console.log('🔧 장비 수정 시작:', selectedEquipment.id)
      console.log('📝 수정 폼 데이터:', editFormData)
      
      // 고객 ID 찾기
      const customer = customers.find(c => c.name === editFormData.customerName)
      if (!customer) {
        alert('선택한 고객을 찾을 수 없습니다.')
        return
      }

      // 모델명 처리
      const finalModel = editFormData.model
      
      // ECU/ACU 타입 처리 - 빈 문자열도 그대로 저장
      const finalEcuType = editFormData.ecuType
      const finalAcuType = editFormData.acuType
      
      const updateData: Partial<Omit<EquipmentData, 'id' | 'createdAt' | 'updatedAt'>> = {
        customerId: customer.id,
        equipmentType: editFormData.equipmentType,
        manufacturer: editFormData.manufacturer,
        model: finalModel,
        serialNumber: editFormData.serialNumber || undefined,
        engineType: undefined, // 엔진 타입은 별도 필드
        horsepower: editFormData.usageHours || undefined,
        ecuType: finalEcuType || '', // 빈 문자열로 저장
        acuType: finalAcuType || '', // 빈 문자열로 저장
        notes: editFormData.notes || undefined
      }
      
      console.log('📤 업데이트 데이터:', updateData)

      const updatedEquipment = await updateEquipment(selectedEquipment.id, updateData)
      
      console.log('✅ 업데이트 결과:', updatedEquipment)
      
      if (updatedEquipment) {
        console.log('🎉 장비 수정 성공!')
        // 성공적으로 수정되면 목록 새로고침
        await loadEquipments()
        setIsEditMode(false)
        setIsDetailModalOpen(false)
        setSelectedEquipment(null)
        alert('장비가 성공적으로 수정되었습니다.')
      } else {
        console.error('❌ 장비 수정 실패: updateEquipment가 null 반환')
        alert('장비 수정 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Failed to update equipment:', error)
      alert('장비 수정 중 오류가 발생했습니다.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // 고객 ID 찾기
      const customer = customers.find(c => c.name === formData.customerName)
      if (!customer) {
        alert('선택한 고객을 찾을 수 없습니다.')
        return
      }

      // 모델명 처리
      const finalModel = formData.model
      
      // ECU/ACU 타입 처리 - 빈 문자열도 그대로 저장
      const finalEcuType = formData.ecuType
      const finalAcuType = formData.acuType
      
      const equipmentData: Omit<EquipmentData, 'id' | 'createdAt' | 'updatedAt'> = {
        customerId: customer.id,
        equipmentType: formData.equipmentType,
        manufacturer: formData.manufacturer,
        model: finalModel,
        serialNumber: formData.serialNumber || undefined,
        engineType: undefined, // 엔진 타입은 별도 필드
        horsepower: formData.usageHours || undefined,
        ecuType: finalEcuType || '', // 빈 문자열로 저장
        acuType: finalAcuType || '', // 빈 문자열로 저장
        notes: formData.notes || undefined
      }

      const newEquipment = await createEquipment(equipmentData)
      
      if (newEquipment) {
        // 성공적으로 생성되면 목록 새로고침
        await loadEquipments()
        
        setFormData({
          customerName: '',
          equipmentType: '',
          manufacturer: '',
          model: '',
          customModel: '',
          serialNumber: '',
          usageHours: 0,
          ecuType: '',
          customEcuType: '',
          acuType: '',
          customAcuType: '',
          notes: ''
        })
        setIsFormOpen(false)
      } else {
        alert('장비 등록 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Failed to create equipment:', error)
      alert('장비 등록 중 오류가 발생했습니다.')
    }
  }

  const filteredEquipments = equipments.filter(equipment => {
    const matchesSearch = 
      equipment.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      equipment.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      equipment.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = !filterType || equipment.equipmentType === filterType
    const matchesManufacturer = !filterManufacturer || equipment.manufacturer === filterManufacturer
    
    return matchesSearch && matchesType && matchesManufacturer
  })

  const handleDelete = async (id: number) => {
    if (confirm('정말로 이 장비를 삭제하시겠습니까?')) {
      try {
        const success = await deleteEquipment(id)
        if (success) {
          // 성공적으로 삭제되면 목록 새로고침
          await loadEquipments()
        } else {
          alert('장비 삭제 중 오류가 발생했습니다.')
        }
      } catch (error) {
        console.error('Failed to delete equipment:', error)
        alert('장비 삭제 중 오류가 발생했습니다.')
      }
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-900">
        <Navigation />
        <main className="pt-20 pb-8">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">장비 관리</h1>
          <p className="mt-2 text-gray-300">농기계 장비 정보를 등록하고 관리합니다.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-md ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setIsFormOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + 장비 등록
          </button>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-gray-800 p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">검색</label>
            <input
              type="text"
              placeholder="고객명, 모델명, 기대번호 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">장비 종류</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">모든 장비 종류</option>
              {EQUIPMENT_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">제조사</label>
            <select
              value={filterManufacturer}
              onChange={(e) => setFilterManufacturer(e.target.value)}
              className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">모든 제조사</option>
              {MANUFACTURERS.map(manufacturer => (
                <option key={manufacturer} value={manufacturer}>{manufacturer}</option>
              ))}
            </select>
          </div>
          <div></div>
        </div>
        <div className="text-sm text-gray-400">
          총 {filteredEquipments.length}개의 장비가 등록되어 있습니다.
        </div>
      </div>

      {/* 장비 목록 */}
      {isLoadingEquipments ? (
        <div className="bg-gray-800 rounded-lg shadow p-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-300">장비 데이터를 불러오는 중...</p>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-medium text-white">장비 목록</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">고객명</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">장비 정보</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">제조사/모델</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">사용시간</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">ECU 타입</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">ACU 타입</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">등록일</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">작업</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {filteredEquipments.map((equipment) => (
                  <tr key={equipment.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{equipment.customerName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{equipment.equipmentType}</div>
                      <div className="text-sm text-gray-400">기대번호: {equipment.serialNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{equipment.manufacturer}</div>
                      <div className="text-sm text-gray-400">{equipment.model}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{equipment.usageHours.toLocaleString()}시간</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-600 text-blue-100 rounded-full">
                        {equipment.ecuType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-green-600 text-green-100 rounded-full">
                        {equipment.acuType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {equipment.registrationDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleViewDetail(equipment)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-900 px-2 py-1 rounded transition-all duration-200 cursor-pointer"
                      >
                        상세보기
                      </button>
                      <button
                        onClick={() => handleDelete(equipment.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900 p-1 rounded transition-all duration-200 cursor-pointer"
                        title="삭제"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredEquipments.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              등록된 장비가 없습니다.
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEquipments.map((equipment) => (
            <div key={equipment.id} className="bg-gray-800 rounded-lg shadow p-6 hover:shadow-md hover:bg-gray-700 transition-all">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-white">{equipment.customerName}</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleViewDetail(equipment)}
                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-900 px-2 py-1 rounded transition-all duration-200 cursor-pointer text-sm"
                  >
                    상세보기
                  </button>
                  <button
                    onClick={() => handleDelete(equipment.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900 p-1 rounded transition-all duration-200 cursor-pointer"
                    title="삭제"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-300">
                <div><span className="font-medium text-white">장비:</span> {equipment.equipmentType}</div>
                <div><span className="font-medium text-white">제조사:</span> {equipment.manufacturer}</div>
                <div><span className="font-medium text-white">모델:</span> {equipment.model}</div>
                <div><span className="font-medium text-white">기대번호:</span> {equipment.serialNumber}</div>
                <div><span className="font-medium text-white">사용시간:</span> {equipment.usageHours.toLocaleString()}시간</div>
                <div><span className="font-medium text-white">ECU:</span> 
                  <span className="ml-2 px-2 py-1 text-xs bg-blue-600 text-blue-100 rounded-full">
                    {equipment.ecuType}
                  </span>
                </div>
                <div><span className="font-medium text-white">ACU:</span> 
                  <span className="ml-2 px-2 py-1 text-xs bg-green-600 text-green-100 rounded-full">
                    {equipment.acuType}
                  </span>
                </div>
                <div><span className="font-medium text-white">등록일:</span> {equipment.registrationDate}</div>
                {equipment.notes && (
                  <div><span className="font-medium text-white">메모:</span> {equipment.notes}</div>
                )}
              </div>
            </div>
          ))}
          {filteredEquipments.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400">
              등록된 장비가 없습니다.
            </div>
          )}
        </div>
      )}

      {/* 상세보기/수정 모달 */}
      {isDetailModalOpen && selectedEquipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {isEditMode ? '장비 수정' : '장비 상세 정보'}
                </h2>
                <div className="flex items-center space-x-4">
                  {!isEditMode && (
                    <button
                      onClick={toggleEditMode}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                    >
                      수정
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false)
                      setIsEditMode(false)
                      setSelectedEquipment(null)
                    }}
                    className="text-gray-400 hover:text-gray-300"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {isEditMode ? (
                // 수정 폼
                <form onSubmit={handleSaveEdit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        고객명 *
                      </label>
                      <select
                        name="customerName"
                        value={editFormData.customerName}
                        onChange={handleEditInputChange}
                        required
                        className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        disabled={isLoadingCustomers}
                      >
                        <option value="">
                          {isLoadingCustomers ? '고객 목록 로딩 중...' : '고객을 선택하세요'}
                        </option>
                        {customers.map(customer => (
                          <option key={customer.id} value={customer.name}>{customer.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        장비 종류 *
                      </label>
                      <select
                        name="equipmentType"
                        value={editFormData.equipmentType}
                        onChange={handleEditInputChange}
                        required
                        className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">선택하세요</option>
                        {EQUIPMENT_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        제조사 *
                      </label>
                      <select
                        name="manufacturer"
                        value={editFormData.manufacturer}
                        onChange={handleEditInputChange}
                        required
                        className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">선택하세요</option>
                        {MANUFACTURERS.map(manufacturer => (
                          <option key={manufacturer} value={manufacturer}>{manufacturer}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        모델명 *
                      </label>
                      <select
                        name="model"
                        value={editFormData.model}
                        onChange={handleEditInputChange}
                        required
                        className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        disabled={!editFormData.manufacturer}
                      >
                        <option value="">모델을 선택하세요</option>
                        {editFormData.manufacturer && getAvailableModels(editFormData.manufacturer).map((model) => (
                          <option key={model} value={model}>{model}</option>
                        ))}
                      </select>
                      {editFormData.manufacturer && (
                        <div className="mt-2 flex space-x-2">
                          <input
                            type="text"
                            name="customModel"
                            value={editFormData.customModel || ''}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, customModel: e.target.value }))}
                            className="flex-1 bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="새로운 모델명을 입력하여 목록에 추가"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              if (editFormData.customModel?.trim()) {
                                await addNewModel(editFormData.manufacturer, editFormData.customModel.trim())
                                setEditFormData(prev => ({ 
                                  ...prev, 
                                  model: editFormData.customModel.trim(),
                                  customModel: ''
                                }))
                              }
                            }}
                            className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
                            title="목록에 추가하고 선택"
                          >
                            추가
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        기대번호
                      </label>
                      <input
                        type="text"
                        name="serialNumber"
                        value={editFormData.serialNumber}
                        onChange={handleEditInputChange}
                        className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="기대번호를 입력하세요 (선택사항)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        사용시간 (시간)
                      </label>
                      <input
                        type="number"
                        name="usageHours"
                        value={editFormData.usageHours || ''}
                        onChange={handleEditInputChange}
                        min="0"
                        step="1"
                        className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="사용시간을 입력하세요 (선택사항, 예: 1500)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        ECU 타입
                      </label>
                      <CustomDropdown
                        name="ecuType"
                        value={editFormData.ecuType}
                        onChange={(value) => setEditFormData(prev => ({ ...prev, ecuType: value }))}
                        options={ecuModels.map(type => ({ value: type, label: type }))}
                        placeholder="선택하세요"
                        maxHeight="250px"
                      />
                      <div className="mt-2 flex space-x-2">
                        <input
                          type="text"
                          name="customEcuType"
                          value={editFormData.customEcuType}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, customEcuType: e.target.value }))}
                          className="flex-1 bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          placeholder="새로운 ECU 타입을 입력하여 목록에 추가"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (editFormData.customEcuType.trim()) {
                              addNewEcuType(editFormData.customEcuType.trim())
                              setEditFormData(prev => ({ 
                                ...prev, 
                                ecuType: editFormData.customEcuType.trim(),
                                customEcuType: ''
                              }))
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
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        ACU 타입
                      </label>
                      <CustomDropdown
                        name="acuType"
                        value={editFormData.acuType}
                        onChange={(value) => setEditFormData(prev => ({ ...prev, acuType: value }))}
                        options={acuTypes.map(type => ({ value: type, label: type }))}
                        placeholder="선택하세요"
                        maxHeight="250px"
                      />
                      <div className="mt-2 flex space-x-2">
                        <input
                          type="text"
                          name="customAcuType"
                          value={editFormData.customAcuType}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, customAcuType: e.target.value }))}
                          className="flex-1 bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          placeholder="새로운 ACU 타입을 입력하여 목록에 추가"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (editFormData.customAcuType.trim()) {
                              addNewAcuType(editFormData.customAcuType.trim())
                              setEditFormData(prev => ({ 
                                ...prev, 
                                acuType: editFormData.customAcuType.trim(),
                                customAcuType: ''
                              }))
                            }
                          }}
                          className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
                          title="목록에 추가하고 선택"
                        >
                          추가
                        </button>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        메모
                      </label>
                      <textarea
                        name="notes"
                        value={editFormData.notes}
                        onChange={handleEditInputChange}
                        rows={3}
                        className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="추가 정보나 특이사항을 입력하세요"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 pt-6 border-t border-gray-600">
                    <button
                      type="button"
                      onClick={() => setIsEditMode(false)}
                      className="px-4 py-2 text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      저장
                    </button>
                  </div>
                </form>
              ) : (
                // 상세보기 화면
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">고객명</label>
                      <div className="text-lg font-semibold text-white">{selectedEquipment.customerName}</div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">장비 종류</label>
                      <div className="text-white">{selectedEquipment.equipmentType}</div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">제조사</label>
                      <div className="text-white">{selectedEquipment.manufacturer}</div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">모델명</label>
                      <div className="text-white">{selectedEquipment.model}</div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">기대번호</label>
                      <div className="text-white font-mono">{selectedEquipment.serialNumber}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">사용시간</label>
                      <div className="text-white">{selectedEquipment.usageHours.toLocaleString()}시간</div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">ECU 타입</label>
                      <span className="inline-block px-3 py-1 text-sm font-medium bg-blue-600 text-blue-100 rounded-full">
                        {selectedEquipment.ecuType}
                      </span>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">ACU 타입</label>
                      <span className="inline-block px-3 py-1 text-sm font-medium bg-green-600 text-green-100 rounded-full">
                        {selectedEquipment.acuType}
                      </span>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">등록일</label>
                      <div className="text-white">{selectedEquipment.registrationDate}</div>
                    </div>
                    
                    {selectedEquipment.notes && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">메모</label>
                        <div className="text-white bg-gray-700 p-3 rounded-md">{selectedEquipment.notes}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 장비 등록 모달 */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">장비 등록</h2>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      고객명 *
                    </label>
                    <select
                      name="customerName"
                      value={formData.customerName}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      disabled={isLoadingCustomers}
                    >
                      <option value="">
                        {isLoadingCustomers ? '고객 목록 로딩 중...' : '고객을 선택하세요'}
                      </option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.name}>{customer.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      장비 종류 *
                    </label>
                    <select
                      name="equipmentType"
                      value={formData.equipmentType}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">선택하세요</option>
                      {EQUIPMENT_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      제조사 *
                    </label>
                    <select
                      name="manufacturer"
                      value={formData.manufacturer}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">선택하세요</option>
                      {MANUFACTURERS.map(manufacturer => (
                        <option key={manufacturer} value={manufacturer}>{manufacturer}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      모델명 *
                    </label>
                    <CustomDropdown
                      name="model"
                      value={formData.model}
                      onChange={(value) => setFormData(prev => ({ ...prev, model: value }))}
                      options={formData.manufacturer ? getAvailableModels(formData.manufacturer).map(model => ({ value: model, label: model })) : []}
                      placeholder="모델을 선택하세요"
                      disabled={!formData.manufacturer}
                      required={true}
                      maxHeight="250px"
                    />
                    {formData.manufacturer && (
                      <div className="mt-2 flex space-x-2">
                        <input
                          type="text"
                          name="customModel"
                          value={formData.customModel || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, customModel: e.target.value }))}
                          className="flex-1 bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          placeholder="새로운 모델명을 입력하여 목록에 추가"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            if (formData.customModel?.trim()) {
                              await addNewModel(formData.manufacturer, formData.customModel.trim())
                              setFormData(prev => ({ 
                                ...prev, 
                                model: formData.customModel.trim(),
                                customModel: ''
                              }))
                            }
                          }}
                          className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
                          title="목록에 추가하고 선택"
                        >
                          추가
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      기대번호
                    </label>
                    <input
                      type="text"
                      name="serialNumber"
                      value={formData.serialNumber}
                      onChange={handleInputChange}
                      className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="기대번호를 입력하세요 (선택사항)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      사용시간 (시간)
                    </label>
                    <input
                      type="number"
                      name="usageHours"
                      value={formData.usageHours || ''}
                      onChange={handleInputChange}
                      min="0"
                      step="1"
                      className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="사용시간을 입력하세요 (선택사항, 예: 1500)"
                    />
                    <p className="mt-1 text-sm text-gray-400">
                      장비의 총 사용시간을 시간 단위로 입력하세요 (선택사항)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ECU 타입
                    </label>
                    <CustomDropdown
                      name="ecuType"
                      value={formData.ecuType}
                      onChange={(value) => setFormData(prev => ({ ...prev, ecuType: value }))}
                      options={ecuModels.map(type => ({ value: type, label: type }))}
                      placeholder="선택하세요"
                      maxHeight="250px"
                    />
                    <div className="mt-2 flex space-x-2">
                      <input
                        type="text"
                        name="customEcuType"
                        value={formData.customEcuType}
                        onChange={(e) => setFormData(prev => ({ ...prev, customEcuType: e.target.value }))}
                        className="flex-1 bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="새로운 ECU 타입을 입력하여 목록에 추가"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (formData.customEcuType.trim()) {
                            addNewEcuType(formData.customEcuType.trim())
                            setFormData(prev => ({ 
                              ...prev, 
                              ecuType: formData.customEcuType.trim(),
                              customEcuType: ''
                            }))
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
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ACU 타입
                    </label>
                    <CustomDropdown
                      name="acuType"
                      value={formData.acuType}
                      onChange={(value) => setFormData(prev => ({ ...prev, acuType: value }))}
                      options={acuTypes.map(type => ({ value: type, label: type }))}
                      placeholder="선택하세요"
                      maxHeight="250px"
                    />
                    <div className="mt-2 flex space-x-2">
                      <input
                        type="text"
                        name="customAcuType"
                        value={formData.customAcuType}
                        onChange={(e) => setFormData(prev => ({ ...prev, customAcuType: e.target.value }))}
                        className="flex-1 bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="새로운 ACU 타입을 입력하여 목록에 추가"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (formData.customAcuType.trim()) {
                            addNewAcuType(formData.customAcuType.trim())
                            setFormData(prev => ({ 
                              ...prev, 
                              acuType: formData.customAcuType.trim(),
                              customAcuType: ''
                            }))
                          }
                        }}
                        className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
                        title="목록에 추가하고 선택"
                      >
                        추가
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      메모
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="추가 정보나 특이사항을 입력하세요"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-600">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    등록
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
} 