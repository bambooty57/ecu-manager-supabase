'use client'

import { useState, useRef, useEffect } from 'react'
import { EQUIPMENT_TYPES, MANUFACTURERS, MANUFACTURER_MODELS, ECU_MODELS, ACU_TYPES } from '@/constants'
import { getAllCustomers, CustomerData } from '@/lib/customers'
import { getAllEquipment, createEquipment, deleteEquipment, updateEquipment, EquipmentData } from '@/lib/equipment'
import { getModelsByManufacturerObject, addEquipmentModel } from '@/lib/equipment-models'
import Navigation from '@/components/Navigation'
import AuthGuard from '@/components/AuthGuard'
import CustomDropdown from '@/components/CustomDropdown'
import { toast } from 'react-hot-toast'

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
    customManufacturer: '',
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
    customManufacturer: '',
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

  // 제조사 목록 상태 (동적으로 추가 가능)
  const [manufacturers, setManufacturers] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('manufacturers')
      return saved ? JSON.parse(saved) : [...MANUFACTURERS]
    }
    return [...MANUFACTURERS]
  })

  // ECU/ACU 타입 목록 상태 (Supabase에서 로드)
  const [ecuModels, setEcuModels] = useState<string[]>([...ECU_MODELS])
  const [acuTypes, setAcuTypes] = useState<string[]>([...ACU_TYPES])
  
  // 제조사별 모델 목록 상태 (데이터베이스에서 가져옴)
  const [modelsByManufacturer, setModelsByManufacturer] = useState<Record<string, string[]>>({})

  const fileInputRef = useRef<HTMLInputElement>(null)

  // 고객 및 장비 데이터 로드
  useEffect(() => {
    loadCustomers()
    loadEquipments()
    loadModels()
    loadEcuAcuModels()
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

  // ECU/ACU 모델 목록 로드 (Supabase에서)
  const loadEcuAcuModels = async () => {
    try {
      console.log('🔄 Loading ECU/ACU models from Supabase...');
      const { getEcuModelNames, getAcuModelNames } = await import('@/lib/ecu-acu-models');
      
      const [ecuModelNames, acuModelNames] = await Promise.all([
        getEcuModelNames(),
        getAcuModelNames()
      ]);
      
      console.log('✅ ECU Models loaded from Supabase:', ecuModelNames);
      console.log('✅ ACU Models loaded from Supabase:', acuModelNames);
      
      setEcuModels(ecuModelNames);
      setAcuTypes(acuModelNames);
      
      // localStorage에도 저장 (캐싱용)
      localStorage.setItem('ecuModels', JSON.stringify(ecuModelNames));
      localStorage.setItem('acuTypes', JSON.stringify(acuModelNames));
    } catch (error) {
      console.error('❌ Error loading ECU/ACU models from Supabase:', error);
      // Supabase 로드 실패 시 기본값 사용
      setEcuModels([...ECU_MODELS]);
      setAcuTypes([...ACU_TYPES]);
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

  // 새로운 제조사를 목록에 추가
  const addNewManufacturer = (newManufacturer: string) => {
    if (newManufacturer.trim() && !manufacturers.includes(newManufacturer.trim())) {
      const newList = [...manufacturers, newManufacturer.trim()]
      setManufacturers(newList)
      localStorage.setItem('manufacturers', JSON.stringify(newList))
      console.log('✅ 새로운 제조사 추가:', newManufacturer.trim())
    }
  }

  // 새로운 ECU 타입을 목록에 추가 (Supabase 저장 포함)
  const addNewEcuType = async (newType: string) => {
    if (!newType.trim() || ecuModels.includes(newType.trim())) {
      return
    }

    try {
      // Supabase에 ECU 모델 저장
      const { createEcuModel } = await import('@/lib/ecu-acu-models')
      await createEcuModel({
        name: newType.trim(),
        category: '사용자 추가',
        series: 'Custom'
      })

      // 로컬 상태 업데이트
      const newList = [...ecuModels, newType.trim()]
      setEcuModels(newList)
      localStorage.setItem('ecuModels', JSON.stringify(newList))
      
      toast.success(`ECU 타입 "${newType.trim()}"이 성공적으로 추가되었습니다.`)
    } catch (error) {
      console.error('ECU 타입 추가 실패:', error)
      toast.error(`ECU 타입 추가 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  // 새로운 ACU 타입을 목록에 추가 (Supabase 저장 포함)
  const addNewAcuType = async (newType: string) => {
    if (!newType.trim() || acuTypes.includes(newType.trim())) {
      return
    }

    try {
      // Supabase에 ACU 모델 저장
      const { createAcuModel } = await import('@/lib/ecu-acu-models')
      await createAcuModel({
        name: newType.trim(),
        manufacturer: '사용자 추가',
        series: 'Custom'
      })

      // 로컬 상태 업데이트
      const newList = [...acuTypes, newType.trim()]
      setAcuTypes(newList)
      localStorage.setItem('acuTypes', JSON.stringify(newList))
      
      toast.success(`ACU 타입 "${newType.trim()}"이 성공적으로 추가되었습니다.`)
    } catch (error) {
      console.error('ACU 타입 추가 실패:', error)
      toast.error(`ACU 타입 추가 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  // ECU 타입 삭제 핸들러
  const handleDeleteEcuType = async (typeToDelete: string) => {
    if (!confirm(`ECU 타입 "${typeToDelete}"을(를) 삭제하시겠습니까?`)) {
      return
    }

    try {
      // Supabase에서 ECU 모델 삭제
      const { findEcuModelIdByName, deleteEcuModel } = await import('@/lib/ecu-acu-models')
      const modelId = await findEcuModelIdByName(typeToDelete)
      
      if (modelId) {
        await deleteEcuModel(modelId)
      }

      // 로컬 상태 업데이트
      const newList = ecuModels.filter(type => type !== typeToDelete)
      setEcuModels(newList)
      localStorage.setItem('ecuModels', JSON.stringify(newList))
      
      // 현재 선택된 값이 삭제된 타입이면 초기화
      if (formData.ecuType === typeToDelete) {
        setFormData(prev => ({ ...prev, ecuType: '' }))
      }
      
      toast.success(`ECU 타입 "${typeToDelete}"이 삭제되었습니다.`)
    } catch (error) {
      console.error('ECU 타입 삭제 실패:', error)
      toast.error(`ECU 타입 삭제 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  // ACU 타입 삭제 핸들러
  const handleDeleteAcuType = async (typeToDelete: string) => {
    if (!confirm(`ACU 타입 "${typeToDelete}"을(를) 삭제하시겠습니까?`)) {
      return
    }

    try {
      // Supabase에서 ACU 모델 삭제
      const { findAcuModelIdByName, deleteAcuModel } = await import('@/lib/ecu-acu-models')
      const modelId = await findAcuModelIdByName(typeToDelete)
      
      if (modelId) {
        await deleteAcuModel(modelId)
      }

      // 로컬 상태 업데이트
      const newList = acuTypes.filter(type => type !== typeToDelete)
      setAcuTypes(newList)
      localStorage.setItem('acuTypes', JSON.stringify(newList))
      
      // 현재 선택된 값이 삭제된 타입이면 초기화
      if (formData.acuType === typeToDelete) {
        setFormData(prev => ({ ...prev, acuType: '' }))
      }
      
      toast.success(`ACU 타입 "${typeToDelete}"이 삭제되었습니다.`)
    } catch (error) {
      console.error('ACU 타입 삭제 실패:', error)
      toast.error(`ACU 타입 삭제 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
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

  // 모델 삭제 핸들러
  const handleDeleteModel = async (manufacturer: string, modelToDelete: string) => {
    if (!confirm(`모델 "${modelToDelete}"을(를) 삭제하시겠습니까?`)) {
      return
    }

    try {
      // Supabase에서 모델 삭제
      const { deleteEquipmentModel, findEquipmentModelId } = await import('@/lib/equipment-models')
      const modelId = await findEquipmentModelId(manufacturer, modelToDelete)
      
      if (modelId) {
        const success = await deleteEquipmentModel(modelId)
        if (success) {
          // 로컬 상태 업데이트
          setModelsByManufacturer(prev => {
            const newModels = { ...prev }
            if (newModels[manufacturer]) {
              newModels[manufacturer] = newModels[manufacturer].filter(model => model !== modelToDelete)
            }
            return newModels
          })
          
          // 현재 선택된 값이 삭제된 모델이면 초기화
          if (formData.model === modelToDelete) {
            setFormData(prev => ({ ...prev, model: '' }))
          }
          if (editFormData.model === modelToDelete) {
            setEditFormData(prev => ({ ...prev, model: '' }))
          }
          
          toast.success(`모델 "${modelToDelete}"이 삭제되었습니다.`)
        } else {
          toast.error('모델 삭제에 실패했습니다.')
        }
      } else {
        toast.error('삭제할 모델을 찾을 수 없습니다.')
      }
    } catch (error) {
      console.error('모델 삭제 실패:', error)
      toast.error(`모델 삭제 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
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
      customManufacturer: '',
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
          customManufacturer: '',
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navigation />
        <main className="pt-24 pb-12">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
        <div className="flex justify-between items-center">
          <div className="animate-slideIn">
            <h1 className="text-5xl font-bold text-slate-800 flex items-center">
              <span className="text-6xl mr-4">🚜</span>
              장비 관리
            </h1>
            <p className="mt-3 text-xl text-slate-600">농기계 장비 정보를 등록하고 관리합니다.</p>
          </div>
          <div className="flex items-center space-x-3 animate-fadeIn">
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
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center space-x-2 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>장비 등록</span>
            </button>
          </div>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">검색</label>
            <input
              type="text"
              placeholder="고객명, 모델명, 기대번호 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-4 h-14 bg-white/90 border-slate-200 text-slate-800 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">장비 종류</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-3 h-12 bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full px-3 py-3 h-12 bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">모든 제조사</option>
              {manufacturers.map(manufacturer => (
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
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 shadow-xl border border-white/20">
          <div className="text-center">
            <div className="relative">
              <div className="w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-pulse"></div>
                <div className="absolute inset-0 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
              </div>
            </div>
            <p className="text-2xl text-slate-600 font-medium">장비 데이터를 불러오는 중...</p>
            <p className="text-base text-slate-500 mt-3">잠시만 기다려주세요</p>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-white/20">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-medium text-white">장비 목록</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
                <tr>
                  <th className="px-8 py-6 text-left text-lg font-bold text-slate-700 uppercase tracking-wider">
                    <div className="flex items-center">
                      <span className="text-3xl mr-3">👤</span>
                      고객명
                    </div>
                  </th>
                  <th className="px-8 py-6 text-left text-lg font-bold text-slate-700 uppercase tracking-wider">
                    <div className="flex items-center">
                      <span className="text-3xl mr-3">🚜</span>
                      장비 정보
                    </div>
                  </th>
                  <th className="px-8 py-6 text-left text-lg font-bold text-slate-700 uppercase tracking-wider">
                    <div className="flex items-center">
                      <span className="text-3xl mr-3">🏭</span>
                      제조사/모델
                    </div>
                  </th>
                  <th className="px-8 py-6 text-left text-lg font-bold text-slate-700 uppercase tracking-wider">
                    <div className="flex items-center">
                      <span className="text-3xl mr-3">⏰</span>
                      사용시간
                    </div>
                  </th>
                  <th className="px-8 py-6 text-left text-lg font-bold text-slate-700 uppercase tracking-wider">
                    <div className="flex items-center">
                      <span className="text-3xl mr-3">🔧</span>
                      ECU 타입
                    </div>
                  </th>
                  <th className="px-8 py-6 text-left text-lg font-bold text-slate-700 uppercase tracking-wider">
                    <div className="flex items-center">
                      <span className="text-3xl mr-3">⚙️</span>
                      ACU 타입
                    </div>
                  </th>
                  <th className="px-8 py-6 text-left text-lg font-bold text-slate-700 uppercase tracking-wider">
                    <div className="flex items-center">
                      <span className="text-3xl mr-3">📝</span>
                      메모
                    </div>
                  </th>
                  <th className="px-8 py-6 text-left text-lg font-bold text-slate-700 uppercase tracking-wider">
                    <div className="flex items-center">
                      <span className="text-3xl mr-3">📅</span>
                      등록일
                    </div>
                  </th>
                  <th className="px-8 py-6 text-left text-lg font-bold text-slate-700 uppercase tracking-wider">
                    <div className="flex items-center">
                      <span className="text-3xl mr-3">🔨</span>
                      작업
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/70 backdrop-blur-sm">
                {filteredEquipments.map((equipment) => (
                  <tr key={equipment.id} className="border-b border-slate-100 hover:bg-blue-50/50 transition-all duration-300 animate-slideInUp group">
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg mr-4 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                          {equipment.customerName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xl font-bold text-slate-800">{equipment.customerName}</div>
                          <div className="text-base text-slate-500">고객</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="bg-slate-100 rounded-xl px-4 py-2 inline-block">
                        <div className="text-xl font-bold text-slate-800">{equipment.equipmentType}</div>
                        <div className="text-base text-slate-500">기대번호: {equipment.serialNumber}</div>
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="bg-slate-100 rounded-xl px-4 py-2 inline-block">
                        <div className="text-xl font-bold text-slate-800">{equipment.manufacturer}</div>
                        <div className="text-base text-slate-500">{equipment.model}</div>
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="bg-slate-100 rounded-xl px-4 py-2 inline-block">
                        <div className="text-xl font-bold text-slate-800">{equipment.usageHours.toLocaleString()}시간</div>
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <span className="px-4 py-3 text-base font-bold bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl shadow-lg">
                        {equipment.ecuType}
                      </span>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <span className="px-4 py-3 text-base font-bold bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl shadow-lg">
                        {equipment.acuType}
                      </span>
                    </td>
                    <td className="px-8 py-6 max-w-xs">
                      <div className="text-base text-slate-700" title={equipment.notes || '메모 없음'}>
                        {equipment.notes ? (
                          <div className="flex items-start space-x-2">
                            <span className="text-yellow-500 text-lg">📝</span>
                            <span className="text-slate-700 text-base leading-relaxed">
                              {equipment.notes.length > 30 ? `${equipment.notes.substring(0, 30)}...` : equipment.notes}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-base">메모 없음</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="bg-slate-100 rounded-xl px-4 py-2 inline-block">
                        <div className="text-base font-medium text-slate-700">{equipment.registrationDate}</div>
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleViewDetail(equipment)}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-5 py-3 rounded-xl font-medium text-base transition-all duration-300 hover:shadow-lg hover:scale-105 flex items-center space-x-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>상세보기</span>
                        </button>
                        <button
                          onClick={() => handleDelete(equipment.id)}
                          className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white p-4 rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105"
                          title="삭제"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredEquipments.length === 0 && (
            <div className="text-center py-16">
              <div className="text-8xl mb-6 animate-bounce">🚜</div>
              <h3 className="text-3xl font-bold text-slate-700 mb-4">등록된 장비가 없습니다</h3>
              <p className="text-xl text-slate-500 mb-8">새로운 장비를 등록하여 시작해보세요!</p>
              <button
                onClick={() => setIsFormOpen(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-10 py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:shadow-xl hover:scale-105 flex items-center space-x-3 mx-auto"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>첫 장비 등록하기</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEquipments.map((equipment) => (
            <div key={equipment.id} className="group bg-white/90 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 animate-slideInUp relative overflow-hidden">
              {/* 배경 그라데이션 효과 */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-pink-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative flex justify-between items-start mb-6">
                <div className="flex items-center">
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl mr-4 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:rotate-6">
                      {equipment.customerName.charAt(0)}
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white shadow-sm animate-pulse"></div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors duration-300">{equipment.customerName}</h3>
                    <p className="text-base text-slate-500 font-medium">고객</p>
                  </div>
                </div>
                {/* 액션 버튼 */}
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0">
                  <button
                    onClick={() => handleViewDetail(equipment)}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-2 rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-110"
                    title="상세보기"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(equipment.id)}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white p-2 rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-110"
                    title="삭제"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              {/* 카드 내용 */}
              <div className="relative space-y-4">
                {/* 장비 정보 */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:border-blue-300 transition-colors duration-300">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-500 rounded-xl flex items-center justify-center mr-3">
                      <span className="text-white text-lg">🚜</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">장비 정보</p>
                      <p className="text-xl font-bold text-slate-800">{equipment.equipmentType}</p>
                      <p className="text-base text-slate-600">기대번호: {equipment.serialNumber}</p>
                    </div>
                  </div>
                </div>

                {/* 제조사/모델 */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:border-blue-300 transition-colors duration-300">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-purple-500 rounded-xl flex items-center justify-center mr-3">
                      <span className="text-white text-lg">🏭</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">제조사/모델</p>
                      <p className="text-xl font-bold text-slate-800">{equipment.manufacturer}</p>
                      <p className="text-base text-slate-600">{equipment.model}</p>
                    </div>
                  </div>
                </div>

                {/* 사용시간 */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:border-blue-300 transition-colors duration-300">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-green-500 rounded-xl flex items-center justify-center mr-3">
                      <span className="text-white text-lg">⏰</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">사용시간</p>
                      <p className="text-xl font-bold text-slate-800">{equipment.usageHours.toLocaleString()}시간</p>
                    </div>
                  </div>
                </div>

                {/* ECU/ACU */}
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <span className="px-4 py-3 text-base font-bold bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl shadow-lg block text-center">
                      ECU: {equipment.ecuType}
                    </span>
                  </div>
                  <div className="flex-1">
                    <span className="px-4 py-3 text-base font-bold bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl shadow-lg block text-center">
                      ACU: {equipment.acuType}
                    </span>
                  </div>
                </div>

                {/* 등록일 */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:border-blue-300 transition-colors duration-300">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-orange-500 rounded-xl flex items-center justify-center mr-3">
                      <span className="text-white text-lg">📅</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">등록일</p>
                      <p className="text-xl font-bold text-slate-800">{equipment.registrationDate}</p>
                    </div>
                  </div>
                </div>

                {/* 메모 */}
                {equipment.notes && (
                  <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                    <div className="flex items-start">
                      <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center mr-3 mt-1">
                        <span className="text-white text-lg">📝</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">메모</p>
                        <p className="text-base text-slate-700 leading-relaxed">{equipment.notes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {filteredEquipments.length === 0 && (
            <div className="col-span-full text-center py-16">
              <div className="text-8xl mb-6 animate-bounce">🚜</div>
              <h3 className="text-3xl font-bold text-slate-700 mb-4">등록된 장비가 없습니다</h3>
              <p className="text-xl text-slate-500 mb-8">새로운 장비를 등록하여 비즈니스를 시작해보세요!</p>
              <button
                onClick={() => setIsFormOpen(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-10 py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:shadow-xl hover:scale-105 flex items-center space-x-3 mx-auto"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>첫 장비 등록하기</span>
              </button>
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
                      <CustomDropdown
                        name="customerName"
                        value={editFormData.customerName}
                        onChange={(value) => setEditFormData(prev => ({ ...prev, customerName: value }))}
                        options={customers.map(customer => ({ value: customer.name, label: customer.name }))}
                        placeholder={isLoadingCustomers ? '고객 목록 로딩 중...' : '고객을 선택하세요'}
                        disabled={isLoadingCustomers}
                        required={true}
                        maxHeight="250px"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        장비 종류 *
                      </label>
                      <CustomDropdown
                        name="equipmentType"
                        value={editFormData.equipmentType}
                        onChange={(value) => setEditFormData(prev => ({ ...prev, equipmentType: value }))}
                        options={EQUIPMENT_TYPES.map(type => ({ value: type, label: type }))}
                        placeholder="장비 종류를 선택하세요"
                        required={true}
                        maxHeight="250px"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        제조사 *
                      </label>
                      <CustomDropdown
                        name="manufacturer"
                        value={editFormData.manufacturer}
                        onChange={(value) => setEditFormData(prev => ({ ...prev, manufacturer: value, model: '' }))}
                        options={manufacturers.map(manufacturer => ({ value: manufacturer, label: manufacturer }))}
                        placeholder="제조사를 선택하세요"
                        required={true}
                        maxHeight="250px"
                      />
                      <div className="mt-2 flex space-x-2">
                        <input
                          type="text"
                          name="customManufacturer"
                          value={editFormData.customManufacturer || ''}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, customManufacturer: e.target.value }))}
                          className="flex-1 bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          placeholder="새로운 제조사명을 입력하여 목록에 추가"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (editFormData.customManufacturer?.trim()) {
                              addNewManufacturer(editFormData.customManufacturer.trim())
                              setEditFormData(prev => ({ 
                                ...prev, 
                                manufacturer: editFormData.customManufacturer.trim(),
                                customManufacturer: '',
                                model: '' // 제조사 변경 시 모델 초기화
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
                        모델명 *
                      </label>
                      <CustomDropdown
                        name="model"
                        value={editFormData.model}
                        onChange={(value) => setEditFormData(prev => ({ ...prev, model: value }))}
                        options={editFormData.manufacturer ? getAvailableModels(editFormData.manufacturer).map(model => ({ value: model, label: model })) : []}
                        placeholder="모델을 선택하세요"
                        disabled={!editFormData.manufacturer}
                        required={true}
                        maxHeight="250px"
                        onDelete={(modelToDelete) => handleDeleteModel(editFormData.manufacturer, modelToDelete)}
                        deletableOptions={editFormData.manufacturer ? getAvailableModels(editFormData.manufacturer) : []}
                        deleteButtonColor="text-red-400 hover:text-red-600"
                      />
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
                    <CustomDropdown
                      name="customerName"
                      value={formData.customerName}
                      onChange={(value) => setFormData(prev => ({ ...prev, customerName: value }))}
                      options={customers.map(customer => ({ value: customer.name, label: customer.name }))}
                      placeholder={isLoadingCustomers ? '고객 목록 로딩 중...' : '고객을 선택하세요'}
                      disabled={isLoadingCustomers}
                      required={true}
                      maxHeight="250px"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      장비 종류 *
                    </label>
                    <CustomDropdown
                      name="equipmentType"
                      value={formData.equipmentType}
                      onChange={(value) => setFormData(prev => ({ ...prev, equipmentType: value }))}
                      options={EQUIPMENT_TYPES.map(type => ({ value: type, label: type }))}
                      placeholder="장비 종류를 선택하세요"
                      required={true}
                      maxHeight="250px"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      제조사 *
                    </label>
                    <CustomDropdown
                      name="manufacturer"
                      value={formData.manufacturer}
                      onChange={(value) => setFormData(prev => ({ ...prev, manufacturer: value, model: '' }))}
                      options={manufacturers.map(manufacturer => ({ value: manufacturer, label: manufacturer }))}
                      placeholder="제조사를 선택하세요"
                      required={true}
                      maxHeight="250px"
                    />
                    <div className="mt-2 flex space-x-2">
                      <input
                        type="text"
                        name="customManufacturer"
                        value={formData.customManufacturer || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, customManufacturer: e.target.value }))}
                        className="flex-1 bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="새로운 제조사명을 입력하여 목록에 추가"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (formData.customManufacturer?.trim()) {
                            addNewManufacturer(formData.customManufacturer.trim())
                            setFormData(prev => ({ 
                              ...prev, 
                              manufacturer: formData.customManufacturer.trim(),
                              customManufacturer: '',
                              model: '' // 제조사 변경 시 모델 초기화
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
                      onDelete={(modelToDelete) => handleDeleteModel(formData.manufacturer, modelToDelete)}
                      deletableOptions={formData.manufacturer ? getAvailableModels(formData.manufacturer) : []}
                      deleteButtonColor="text-red-400 hover:text-red-600"
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
                      onDelete={handleDeleteEcuType}
                      deletableOptions={ecuModels.filter(type => type !== '직접입력' && type !== '기타')}
                      deleteButtonColor="text-red-400 hover:text-red-600"
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
                        onClick={async () => {
                          if (formData.customEcuType.trim()) {
                            await addNewEcuType(formData.customEcuType.trim())
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
                      onDelete={handleDeleteAcuType}
                      deletableOptions={acuTypes.filter(type => type !== '직접입력' && type !== '기타')}
                      deleteButtonColor="text-red-400 hover:text-red-600"
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
                        onClick={async () => {
                          if (formData.customAcuType.trim()) {
                            await addNewAcuType(formData.customAcuType.trim())
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