'use client'

import { useState, useEffect } from 'react'
import { ACU_TYPES, CONNECTION_METHODS, ECU_TOOLS_FLAT, TUNING_WORKS, EQUIPMENT_TYPES, MANUFACTURERS, MANUFACTURER_MODELS, WORK_STATUS, ECU_MODELS } from '@/constants'
import { getAllWorkRecords, updateWorkRecord, deleteWorkRecord, WorkRecordData } from '@/lib/work-records'
import { getAllCustomers, CustomerData } from '@/lib/customers'
import { getAllEquipment, EquipmentData } from '@/lib/equipment'
import Navigation from '@/components/Navigation'
import AuthGuard from '@/components/AuthGuard'

export default function HistoryPage() {
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    customer: '',
    equipmentType: '',
    manufacturer: '',
    model: '',
    ecuType: '',
    acuType: '',
    tuningWork: '',
    status: ''
  })
  
  const [workRecords, setWorkRecords] = useState<any[]>([])
  const [isLoadingRecords, setIsLoadingRecords] = useState(true)
  const [customers, setCustomers] = useState<CustomerData[]>([])
  const [equipments, setEquipments] = useState<EquipmentData[]>([])
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  
  // 상세보기 및 수정 모달 상태
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState<any>({})
  
  // 고객 정보 모달 상태
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)

  // 동적 ECU 모델 목록 상태
  const [ecuModels, setEcuModels] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ecuModels')
      return saved ? JSON.parse(saved) : ECU_MODELS
    }
    return ECU_MODELS
  })
  const [newEcuModel, setNewEcuModel] = useState('')

  // 동적 ACU 타입 목록 상태
  const [acuTypes, setAcuTypes] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('acuTypes')
      return saved ? JSON.parse(saved) : ACU_TYPES
    }
    return ACU_TYPES
  })
  const [newAcuType, setNewAcuType] = useState('')

  // ECU/ACU 타입 관리 상태
  const [showEcuManagement, setShowEcuManagement] = useState(false)
  const [showAcuManagement, setShowAcuManagement] = useState(false)
  const [selectedEcuModels, setSelectedEcuModels] = useState<string[]>([])
  const [selectedAcuTypes, setSelectedAcuTypes] = useState<string[]>([])
  const [newEcuModelManagement, setNewEcuModelManagement] = useState('')
  const [newAcuTypeManagement, setNewAcuTypeManagement] = useState('')

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
  const handleAddNewEcuModelManagement = () => {
    const trimmedModel = newEcuModelManagement.trim()
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
    setNewEcuModelManagement('')
    alert('새로운 ECU 모델이 추가되었습니다.')
  }

  // 새로운 ACU 타입 추가 (중복 확인)
  const handleAddNewAcuTypeManagement = () => {
    const trimmedType = newAcuTypeManagement.trim()
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
    setNewAcuTypeManagement('')
    alert('새로운 ACU 타입이 추가되었습니다.')
  }

  // 데이터 로드
  useEffect(() => {
    loadAllData()
  }, [])

  // 페이지 포커스 시 데이터 새로고침
  useEffect(() => {
    const handleFocus = () => {
      loadAllData()
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadAllData()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const loadAllData = async () => {
    setIsLoadingRecords(true)
    try {
      // 병렬로 모든 데이터 로드
      const [workRecordsData, customersData, equipmentsData] = await Promise.all([
        getAllWorkRecords(),
        getAllCustomers(),
        getAllEquipment()
      ])

      // 작업 기록에 고객명과 장비 정보 추가
      const enrichedWorkRecords = workRecordsData.map(record => {
        const customer = customersData.find(c => c.id === record.customerId)
        const equipment = equipmentsData.find(e => e.id === record.equipmentId)
        
        console.log('🔍 Processing record:', record.id, record)
        
        // ECU 정보 추출
        let ecuMaker = '';
        let ecuType = '';
        let ecuConnectionMethod = '';
        let ecuTool = '';
        let ecuTuningWorks: string[] = [];
        
        // ACU 정보 추출
        let acuManufacturer = '';
        let acuModel = '';
        let acuConnectionMethod = '';
        let acuTool = '';
        let acuTuningWorks: string[] = [];
        
        // 파일 정보 추출
        let allFiles: any[] = [];
        
        // remappingWorks에서 ECU/ACU 정보 추출 시도
        if (record.remappingWorks && record.remappingWorks.length > 0) {
          // 첫 번째 remappingWork에서 정보 추출
          const firstWork = record.remappingWorks[0] as any;
          console.log('🔍 First remapping work:', firstWork)
          
          // ECU 정보가 있는 경우
          if (firstWork.ecu) {
            console.log('🔧 ECU 정보 발견:', firstWork.ecu)
            ecuMaker = firstWork.ecu.maker || '';
            ecuType = firstWork.ecu.type || firstWork.ecu.typeCustom || '';
            ecuConnectionMethod = firstWork.ecu.connectionMethod || '';
            ecuTool = firstWork.ecu.toolCategory || firstWork.ecu.tool || '';
            ecuTuningWorks = firstWork.ecu.selectedWorks || [];
          }
          
          // ACU 정보가 있는 경우
          if (firstWork.acu) {
            console.log('⚙️ ACU 정보 발견:', firstWork.acu)
            acuManufacturer = firstWork.acu.manufacturer || '';
            acuModel = firstWork.acu.model || firstWork.acu.modelCustom || '';
            acuConnectionMethod = firstWork.acu.connectionMethod || '';
            acuTool = firstWork.acu.toolCategory || firstWork.acu.tool || '';
            acuTuningWorks = firstWork.acu.selectedWorks || [];
          }
          
          // 파일 정보 추출
          if (firstWork.files) {
            Object.entries(firstWork.files).forEach(([category, fileData]: [string, any]) => {
              if (fileData && fileData.file) {
                // 파일 카테고리 매핑
                let mappedCategory = category;
                if (category === 'original') mappedCategory = 'original';
                else if (category === 'read') mappedCategory = 'read';
                else if (category === 'modified') mappedCategory = 'modified';
                else if (category === 'vr') mappedCategory = 'vr';
                
                allFiles.push({
                  name: fileData.file.name || `${category}.bin`,
                  size: fileData.file.size || 0,
                  type: fileData.file.type || 'application/octet-stream',
                  data: fileData.file.data || '',
                  description: fileData.description || '',
                  category: mappedCategory,
                  uploadDate: new Date().toISOString()
                });
              }
            });
          }
          
          // ACU 파일 추출 (별도 처리)
          if (firstWork.files) {
            // ACU 관련 파일들을 찾아서 acuOriginal, acuRead 등으로 분류
            const acuFileMapping: { [key: string]: string } = {
              'acuOriginalFiles': 'acuOriginal',
              'acuStage1File': 'acuRead', 
              'acuStage2File': 'acuModified',
              'acuStage3File': 'acuStage3'
            };
            
            Object.entries(acuFileMapping).forEach(([fileKey, category]) => {
              const fileData = (firstWork.files as any)[fileKey];
              if (fileData && fileData.file) {
                allFiles.push({
                  name: fileData.file.name || `${category}.bin`,
                  size: fileData.file.size || 0,
                  type: fileData.file.type || 'application/octet-stream',
                  data: fileData.file.data || '',
                  description: fileData.description || '',
                  category: category,
                  uploadDate: new Date().toISOString()
                });
              }
            });
          }
          
          // 미디어 파일 추출
          if (firstWork.media) {
            if (firstWork.media.before) {
              allFiles.push({
                name: firstWork.media.before.name || 'before_media',
                size: firstWork.media.before.size || 0,
                type: firstWork.media.before.type || 'image/jpeg',
                data: firstWork.media.before.data || '',
                description: '작업 전 미디어',
                category: 'before',
                uploadDate: new Date().toISOString()
              });
            }
            if (firstWork.media.after) {
              allFiles.push({
                name: firstWork.media.after.name || 'after_media',
                size: firstWork.media.after.size || 0,
                type: firstWork.media.after.type || 'image/jpeg',
                data: firstWork.media.after.data || '',
                description: '작업 후 미디어',
                category: 'after',
                uploadDate: new Date().toISOString()
              });
            }
          }
          
          // 추가 미디어 파일들 (mediaFile1~5)
          if (firstWork.files) {
            for (let i = 1; i <= 5; i++) {
              const mediaFile = (firstWork.files as any)[`mediaFile${i}`];
              if (mediaFile && mediaFile.file) {
                allFiles.push({
                  name: mediaFile.file.name || `media_${i}`,
                  size: mediaFile.file.size || 0,
                  type: mediaFile.file.type || 'image/jpeg',
                  data: mediaFile.file.data || '',
                  description: mediaFile.description || `미디어 파일 ${i}`,
                  category: 'media',
                  uploadDate: new Date().toISOString()
                });
              }
            }
          }
        }
        
        // 데이터베이스의 기존 필드도 확인 (타입 안전성을 위해 any로 캐스팅)
        const recordAny = record as any;
        if (!ecuMaker && recordAny.ecuMaker) ecuMaker = recordAny.ecuMaker;
        if (!ecuType && recordAny.ecuModel) ecuType = recordAny.ecuModel;
        if (!ecuConnectionMethod && recordAny.connectionMethod) ecuConnectionMethod = recordAny.connectionMethod;
        if (!acuManufacturer && recordAny.acuManufacturer) acuManufacturer = recordAny.acuManufacturer;
        if (!acuModel && recordAny.acuModel) acuModel = recordAny.acuModel;

        const enrichedRecord = {
          ...record,
          customerName: customer?.name || '알 수 없음',
          equipmentType: equipment?.equipmentType || '알 수 없음',
          manufacturer: equipment?.manufacturer || '알 수 없음',
          model: equipment?.model || '알 수 없음',
          serial: equipment?.serialNumber || '',
          // ECU 정보
          ecuMaker: ecuMaker,
          ecuType: ecuType,
          connectionMethod: ecuConnectionMethod,
          ecuTool: ecuTool,
          ecuTuningWorks: ecuTuningWorks,
          // ACU 정보
          acuManufacturer: acuManufacturer,
          acuModel: acuModel,
          acuConnectionMethod: acuConnectionMethod,
          acuTool: acuTool,
          acuTuningWorks: acuTuningWorks,
          // 작업 정보 (기존 호환성을 위해 유지)
          tuningWork: record.workType,
          customTuningWork: record.workType,
          registrationDate: record.workDate,
          // 가격 정보 (만원 단위로 변환)
          price: record.totalPrice || 0,
          // 파일 정보
          files: allFiles
        }
        
        console.log('✅ Enriched record:', enrichedRecord.id, {
          ecuMaker: enrichedRecord.ecuMaker,
          ecuType: enrichedRecord.ecuType,
          ecuTuningWorks: enrichedRecord.ecuTuningWorks,
          acuManufacturer: enrichedRecord.acuManufacturer,
          acuModel: enrichedRecord.acuModel,
          acuTuningWorks: enrichedRecord.acuTuningWorks
        })
        
        return enrichedRecord
      })

      setWorkRecords(enrichedWorkRecords)
      setCustomers(customersData)
      setEquipments(equipmentsData)
      
      console.log('✅ 작업 이력 데이터 로드 완료:', enrichedWorkRecords)
    } catch (error) {
      console.error('❌ 데이터 로드 실패:', error)
    } finally {
      setIsLoadingRecords(false)
    }
  }

  // 제조사별 모델명 목록 가져오기
  const getAvailableModels = (manufacturer: string) => {
    return MANUFACTURER_MODELS[manufacturer] || []
  }

  // ECU 모델 추가 함수
  const addNewEcuModel = () => {
    if (newEcuModel.trim() && !ecuModels.includes(newEcuModel.trim())) {
      const updatedModels = [...ecuModels, newEcuModel.trim()]
      setEcuModels(updatedModels)
      localStorage.setItem('ecuModels', JSON.stringify(updatedModels))
      
      // 수정 폼에 새로운 모델 자동 선택
      setEditFormData((prev: any) => ({ ...prev, ecuModel: newEcuModel.trim() }))
      setNewEcuModel('')
    }
  }

  // ACU 타입 추가 함수
  const addNewAcuType = () => {
    if (newAcuType.trim() && !acuTypes.includes(newAcuType.trim())) {
      const updatedTypes = [...acuTypes, newAcuType.trim()]
      setAcuTypes(updatedTypes)
      localStorage.setItem('acuTypes', JSON.stringify(updatedTypes))
      
      // 수정 폼에 새로운 타입 자동 선택
      setEditFormData((prev: any) => ({ ...prev, acuType: newAcuType.trim() }))
      setNewAcuType('')
    }
  }

  // 필터링된 작업 목록
  const filteredWorkRecords = workRecords.filter(record => {
    // 날짜 필터링
    if (filters.dateFrom && record.workDate < filters.dateFrom) return false
    if (filters.dateTo && record.workDate > filters.dateTo) return false
    
    // 고객명 필터링
    if (filters.customer && !record.customerName.toLowerCase().includes(filters.customer.toLowerCase())) return false
    
    // 장비종류 필터링
    if (filters.equipmentType && record.equipmentType !== filters.equipmentType) return false
    
    // 제조사 필터링
    if (filters.manufacturer && record.manufacturer !== filters.manufacturer) return false
    
    // 모델명 필터링
    if (filters.model && record.model !== filters.model) return false
    
    // ECU 타입 필터링
    if (filters.ecuType && record.ecuType !== filters.ecuType) return false
    
    // ACU 타입 필터링
    if (filters.acuType && record.acuType !== filters.acuType) return false
    
    // 튜닝작업 필터링
    if (filters.tuningWork && record.tuningWork !== filters.tuningWork) {
      // "기타"가 선택된 경우 customTuningWork도 확인
      if (filters.tuningWork === '기타' && record.tuningWork === '기타') {
        // 통과 (기타끼리 매칭)
      } else {
        return false
      }
    }
    
    // 작업상태 필터링
    if (filters.status && record.status !== filters.status) return false
    
    return true
  })

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    if (name === 'manufacturer') {
      // 제조사 변경 시 모델명 초기화
      setFilters(prev => ({ 
        ...prev, 
        [name]: value,
        model: ''
      }))
    } else {
      setFilters(prev => ({ ...prev, [name]: value }))
    }
  }

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      customer: '',
      equipmentType: '',
      manufacturer: '',
      model: '',
      ecuType: '',
      acuType: '',
      tuningWork: '',
      status: ''
    })
  }

  // 상세보기 핸들러
  const handleViewDetail = (record: any) => {
    console.log('🔍 상세보기 클릭:', record)
    setSelectedRecord(record)
    setShowDetailModal(true)
    console.log('📋 모달 상태 업데이트 완료')
  }

  // 수정 핸들러
  const handleEdit = (record: any) => {
    setSelectedRecord(record)
    setEditFormData({ ...record })
    setShowEditModal(true)
  }

  // 수정 폼 입력 핸들러
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setEditFormData((prev: any) => ({ ...prev, [name]: value }))
  }

  // 수정 저장 핸들러
  const handleSaveEdit = async () => {
    try {
      // Supabase에서 작업 기록 수정
      const updateData = {
        workDate: editFormData.workDate,
        workType: editFormData.workType,
        workDescription: editFormData.tuningWork,
        ecuModel: editFormData.ecuType,
        connectionMethod: editFormData.connectionMethod,
        price: parseFloat(editFormData.price) || 0,
        status: editFormData.status
      }

      const updatedRecord = await updateWorkRecord(editFormData.id, updateData)
      
      if (updatedRecord) {
        // 성공적으로 수정되면 목록 새로고침
        await loadAllData()
        
        setShowEditModal(false)
        setSelectedRecord(null)
        setEditFormData({})
        alert('작업이 수정되었습니다.')
      } else {
        alert('작업 수정 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Failed to update work record:', error)
      alert('작업 수정 중 오류가 발생했습니다.')
    }
  }

  // 파일 다운로드 핸들러
  const handleFileDownload = (file: any) => {
    try {
      if (file.url) {
        // URL이 있는 경우 직접 다운로드
        const link = document.createElement('a')
        link.href = file.url
        link.download = file.name
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else if (file.data) {
        // Base64 데이터가 있는 경우
        const link = document.createElement('a')
        link.href = `data:${file.type || 'application/octet-stream'};base64,${file.data}`
        link.download = file.name
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        alert('파일을 다운로드할 수 없습니다.')
      }
    } catch (error) {
      console.error('파일 다운로드 오류:', error)
      alert('파일 다운로드 중 오류가 발생했습니다.')
    }
  }

  // 카테고리별 일괄 다운로드 핸들러
  const handleCategoryDownload = async (files: any[], categoryName: string) => {
    try {
      if (files.length === 1) {
        // 파일이 1개면 개별 다운로드
        handleFileDownload(files[0])
        return
      }

      // 여러 파일이면 순차적으로 다운로드
      const downloadPromises = files.map((file, index) => {
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            handleFileDownload(file)
            resolve()
          }, index * 500) // 500ms 간격으로 다운로드
        })
      })

      await Promise.all(downloadPromises)
      alert(`${categoryName} 파일들이 모두 다운로드되었습니다.`)
    } catch (error) {
      console.error('일괄 다운로드 오류:', error)
      alert('파일 다운로드 중 오류가 발생했습니다.')
    }
  }

  // 작업 기록 삭제 핸들러
  const handleDeleteRecord = async (record: any) => {
    if (confirm(`'${record.customerName}' 고객의 작업 기록(ID: ${record.id})을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      try {
        await deleteWorkRecord(record.id);

        // 성공적으로 삭제된 경우 UI 업데이트
        setWorkRecords(prev => prev.filter(r => r.id !== record.id));
        alert('작업 기록이 성공적으로 삭제되었습니다.');

        // 모달이 열려있다면 닫기
        closeModals();
        
      } catch (error) {
        console.error('Failed to delete work record:', error);
        alert('작업 기록 삭제에 실패했습니다. 콘솔을 확인해주세요.');
      }
    }
  };

  // 파일 업로드 핸들러
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const maxSize = 10 * 1024 * 1024 // 10MB
    const newFiles: any[] = []

    Array.from(files).forEach((file) => {
      if (file.size > maxSize) {
        alert(`${file.name}은(는) 파일 크기가 10MB를 초과합니다.`)
        return
      }

      const reader = new FileReader()
      reader.onload = (event) => {
        const fileData = {
          name: file.name,
          size: file.size,
          type: file.type,
          data: event.target?.result?.toString().split(',')[1], // Base64 데이터만 추출
          uploadDate: new Date().toISOString()
        }
        newFiles.push(fileData)

        // 모든 파일이 읽혀졌을 때 상태 업데이트
        if (newFiles.length === files.length) {
          setEditFormData((prev: any) => ({
            ...prev,
            files: [...(prev.files || []), ...newFiles]
          }))
        }
      }
      reader.readAsDataURL(file)
    })

    // 파일 입력 초기화
    e.target.value = ''
  }

  // 파일 삭제 핸들러
  const handleRemoveFile = (index: number) => {
    setEditFormData((prev: any) => ({
      ...prev,
      files: prev.files.filter((_: any, i: number) => i !== index)
    }))
  }

  // 고객 정보 보기 핸들러
  const handleViewCustomer = async (customerId: number) => {
    try {
      // customers 상태에서 먼저 찾기
      let customer = customers.find(c => c.id === customerId)
      
      if (!customer) {
        // customers 상태에 없으면 다시 로드
        const allCustomers = await getAllCustomers()
        customer = allCustomers.find(c => c.id === customerId)
      }
      
      if (customer) {
        setSelectedCustomer({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          address: customer.roadAddress || customer.jibunAddress || 'N/A',
          registrationDate: customer.registrationDate,
          notes: ''
        })
        setShowCustomerModal(true)
      } else {
        alert('고객 정보를 찾을 수 없습니다.')
      }
    } catch (error) {
      console.error('고객 정보 조회 실패:', error)
      alert('고객 정보를 불러오는데 실패했습니다.')
    }
  }

  // 모달 닫기 핸들러
  const closeModals = () => {
    setShowDetailModal(false)
    setShowEditModal(false)
    setShowCustomerModal(false)
    setSelectedRecord(null)
    setSelectedCustomer(null)
    setEditFormData({})
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
            <h1 className="text-3xl font-bold text-white">작업 이력</h1>
            <p className="mt-2 text-gray-300">
              모든 ECU 튜닝 작업 이력을 조회하고 관리합니다.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
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
          </div>
        </div>



        {/* 필터 섹션 */}
        <div className="bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-white mb-4">검색 필터</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">고객명</label>
              <input
                type="text"
                name="customer"
                value={filters.customer}
                onChange={handleFilterChange}
                placeholder="고객명 검색"
                className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">장비 종류</label>
              <select
                name="equipmentType"
                value={filters.equipmentType}
                onChange={handleFilterChange}
                className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">전체</option>
                {EQUIPMENT_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">제조사</label>
              <select
                name="manufacturer"
                value={filters.manufacturer}
                onChange={handleFilterChange}
                className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">전체</option>
                {MANUFACTURERS.map((manufacturer) => (
                  <option key={manufacturer} value={manufacturer}>{manufacturer}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">모델명</label>
              <select
                name="model"
                value={filters.model}
                onChange={handleFilterChange}
                className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                disabled={!filters.manufacturer}
              >
                <option value="">전체</option>
                {filters.manufacturer && getAvailableModels(filters.manufacturer).map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
              {!filters.manufacturer && (
                <p className="text-xs text-gray-400 mt-1">제조사를 먼저 선택하세요</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">튜닝 작업</label>
              <select
                name="tuningWork"
                value={filters.tuningWork}
                onChange={handleFilterChange}
                className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">전체</option>
                {TUNING_WORKS.map((work) => (
                  <option key={work} value={work}>{work}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">ECU 타입</label>
              <select
                name="ecuType"
                value={filters.ecuType}
                onChange={handleFilterChange}
                className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">전체</option>
                {ecuModels.map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">ACU 타입</label>
              <select
                name="acuType"
                value={filters.acuType}
                onChange={handleFilterChange}
                className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">전체</option>
                {acuTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">작업 상태</label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">전체</option>
                {WORK_STATUS.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">시작일</label>
              <input
                type="date"
                name="dateFrom"
                value={filters.dateFrom}
                onChange={handleFilterChange}
                className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">종료일</label>
              <input
                type="date"
                name="dateTo"
                value={filters.dateTo}
                onChange={handleFilterChange}
                className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm text-gray-400">
              💡 기간을 입력하지 않으면 모든 기간의 자료를 검색합니다.
            </p>
            <div className="flex space-x-2">
              <button
                onClick={clearFilters}
                className="px-4 py-2 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-700"
              >
                초기화
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                검색
              </button>
            </div>
          </div>
        </div>

        {/* 작업 목록 */}
        <div className="bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-medium text-white">작업 목록</h2>
          </div>
          <div className="p-6">
            {isLoadingRecords ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-300">작업 이력을 불러오는 중...</p>
              </div>
            ) : filteredWorkRecords.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.712-3.714M14 40v-4a9.971 9.971 0 01.712-3.714m0 0A9.971 9.971 0 0118 32a9.971 9.971 0 013.288.714M14 36.286A9.971 9.971 0 0118 36c1.408 0 2.742.29 3.962.714" />
              </svg>
                <h3 className="mt-2 text-sm font-medium text-white">작업 이력이 없습니다</h3>
                <p className="mt-1 text-sm text-gray-400">
                  새로운 작업을 등록하여 이력을 관리해보세요.
                </p>
                <div className="mt-6">
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    새 작업 등록
                  </button>
                </div>
              </div>
            ) : (
              <>
                {viewMode === 'list' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full divide-y divide-gray-700">
                      <thead className="bg-gray-700">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider whitespace-nowrap">
                            작업일
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider whitespace-nowrap">
                            고객/장비
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider whitespace-nowrap">
                            🔧 ECU/튜닝
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider whitespace-nowrap">
                            ⚙️ ACU/튜닝
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider whitespace-nowrap">
                            상태
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider whitespace-nowrap">
                            금액
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider whitespace-nowrap">
                            작업
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-gray-800 divide-y divide-gray-700">
                        {filteredWorkRecords.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-700">
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-white">
                              {record.workDate}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-white">{record.customerName}</div>
                              <div className="text-sm text-gray-300">{record.equipmentType}</div>
                              <div className="text-xs text-gray-400">{record.manufacturer} {record.model}</div>
                            </td>
                            {/* ECU/튜닝 칸 */}
                            <td className="px-3 py-4 whitespace-nowrap">
                              {(record.ecuMaker || record.ecuType) ? (
                                <>
                                  {/* 1. 제조사-모델명 (파란 박스) */}
                                  <div className="text-sm text-white mb-1">
                                    <span className="inline-block mr-2 px-2 py-1 text-xs bg-blue-600 text-white rounded">
                                      🔧 {record.ecuMaker && record.ecuType ? `${record.ecuMaker}-${record.ecuType}` : (record.ecuMaker || record.ecuType)}
                                    </span>
                                  </div>
                                  {/* 2. 연결방법 */}
                                  <div className="text-sm text-gray-300 mb-1">
                                    {record.connectionMethod || 'N/A'}
                                  </div>
                                  {/* 3. 작업내용 */}
                                  <div className="text-xs text-gray-400">
                                    {record.ecuTuningWorks && record.ecuTuningWorks.length > 0 
                                      ? record.ecuTuningWorks.join(', ') 
                                      : (record.tuningWork || 'N/A')}
                                  </div>
                                </>
                              ) : (
                                <span className="text-gray-500 text-sm">N/A</span>
                              )}
                            </td>
                            {/* ACU/튜닝 칸 */}
                            <td className="px-3 py-4 whitespace-nowrap">
                              {(record.acuManufacturer || record.acuModel || record.acuType) ? (
                                <>
                                  {/* 1. 제조사-모델명 (초록 박스) */}
                                  <div className="text-sm text-white mb-1">
                                    <span className="inline-block mr-2 px-2 py-1 text-xs bg-green-600 text-white rounded">
                                      ⚙️ {record.acuManufacturer && record.acuModel ? `${record.acuManufacturer}-${record.acuModel}` : (record.acuManufacturer || record.acuModel || record.acuType)}
                                    </span>
                                  </div>
                                  {/* 2. 연결방법 */}
                                  <div className="text-sm text-gray-300 mb-1">
                                    {record.connectionMethod || 'N/A'}
                                  </div>
                                  {/* 3. 작업내용 */}
                                  <div className="text-xs text-gray-400">
                                    {record.acuTuningWorks && record.acuTuningWorks.length > 0 
                                      ? record.acuTuningWorks.join(', ') 
                                      : 'N/A'}
                                  </div>
                                </>
                              ) : (
                                <span className="text-gray-500 text-sm">N/A</span>
                              )}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                record.status === '완료' 
                                  ? 'bg-green-600 text-white'
                                  : record.status === '진행중'
                                  ? 'bg-yellow-600 text-white'
                                  : record.status === '예약'
                                  ? 'bg-blue-600 text-white'
                                  : record.status === 'AS'
                                  ? 'bg-orange-600 text-white'
                                  : 'bg-red-600 text-white'
                              }`}>
                                {record.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {record.totalPrice && record.totalPrice > 0 
                                ? `${record.totalPrice.toLocaleString()}만원` 
                                : '미입력'}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button 
                                  onClick={() => handleViewDetail(record)}
                                  className="text-blue-400 hover:text-blue-300 hover:bg-blue-900 px-2 py-1 rounded transition-all duration-200 cursor-pointer"
                                >
                                  상세보기
                                </button>
                                <button 
                                  onClick={() => handleDeleteRecord(record)}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-900 p-1 rounded transition-all duration-200 cursor-pointer"
                                  title="삭제"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredWorkRecords.map((record) => (
                      <div key={record.id} className="bg-gray-700 border border-gray-600 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-medium text-white">{record.customerName}</h3>
                            <p className="text-sm text-gray-300">{record.workDate}</p>
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            record.status === '완료' 
                              ? 'bg-green-600 text-white'
                              : record.status === '진행중'
                              ? 'bg-yellow-600 text-white'
                              : record.status === '예약'
                              ? 'bg-blue-600 text-white'
                              : record.status === 'AS'
                              ? 'bg-orange-600 text-white'
                              : 'bg-red-600 text-white'
                          }`}>
                            {record.status}
                          </span>
                        </div>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-400">장비:</span>
                            <span className="text-sm text-white">{record.equipmentType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-400">제조사:</span>
                            <span className="text-sm text-white">{record.manufacturer}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-400">모델:</span>
                            <span className="text-sm text-white">{record.model}</span>
                          </div>
                          {(record.ecuMaker || record.ecuType) && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-400">ECU:</span>
                              <span className="text-sm text-white">
                                {record.ecuMaker && record.ecuType ? `${record.ecuMaker}-${record.ecuType}` : (record.ecuMaker || record.ecuType)}
                              </span>
                            </div>
                          )}
                          {record.ecuTuningWorks && record.ecuTuningWorks.length > 0 && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-400">ECU 작업:</span>
                              <span className="text-sm text-white">
                                {record.ecuTuningWorks.join(', ')}
                              </span>
                            </div>
                          )}
                          {(record.acuManufacturer || record.acuModel || record.acuType) && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-400">ACU:</span>
                              <span className="text-sm text-white">
                                {record.acuManufacturer && record.acuModel ? `${record.acuManufacturer}-${record.acuModel}` : (record.acuManufacturer || record.acuModel || record.acuType)}
                              </span>
                            </div>
                          )}
                          {record.acuTuningWorks && record.acuTuningWorks.length > 0 && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-400">ACU 작업:</span>
                              <span className="text-sm text-white">
                                {record.acuTuningWorks.join(', ')}
                              </span>
                            </div>
                          )}
                          {record.connectionMethod && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-400">연결방법:</span>
                              <span className="text-sm text-white">{record.connectionMethod}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-400">작업:</span>
                            <span className="text-sm text-white">
                              {record.tuningWork === '기타' && record.customTuningWork 
                                ? record.customTuningWork 
                                : record.tuningWork}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-400">금액:</span>
                            <span className="text-sm font-medium text-white">
                              {record.totalPrice && record.totalPrice > 0 
                                ? `${record.totalPrice.toLocaleString()}만원` 
                                : '미입력'}
                            </span>
                          </div>
                        </div>
                        
                        {record.notes && (
                          <div className="mb-4">
                            <p className="text-xs text-gray-300 bg-gray-600 p-2 rounded">
                              {record.notes}
                            </p>
                          </div>
                        )}
                        
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleViewDetail(record)}
                            className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 hover:shadow-md transform hover:scale-105 transition-all duration-200 cursor-pointer"
                          >
                            상세보기
                          </button>
                          <button 
                            onClick={() => handleDeleteRecord(record)}
                            className="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 hover:shadow-md transform hover:scale-105 transition-all duration-200 cursor-pointer flex items-center justify-center"
                            title="삭제"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </>
          )}
        </div>
      </div>

      {/* 상세보기 모달 */}
      {(() => {
        console.log('🔍 모달 렌더링 체크:', { showDetailModal, hasSelectedRecord: !!selectedRecord })
        return showDetailModal && selectedRecord
      })() && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-[9999]">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">작업 상세 정보</h3>
              <button
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 기본 정보 */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900 border-b pb-2">기본 정보</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">작업일:</span>
                    <span className="text-sm text-gray-900">{selectedRecord.workDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">고객명:</span>
                    <button
                      onClick={() => handleViewCustomer(selectedRecord.customerId)}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                      {selectedRecord.customerName}
                    </button>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">장비 종류:</span>
                    <span className="text-sm text-gray-900">{selectedRecord.equipmentType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">제조사:</span>
                    <span className="text-sm text-gray-900">{selectedRecord.manufacturer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">모델:</span>
                    <span className="text-sm text-gray-900">{selectedRecord.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">상태:</span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedRecord.status === '완료' 
                        ? 'bg-green-100 text-green-800'
                        : selectedRecord.status === '진행중'
                        ? 'bg-yellow-100 text-yellow-800'
                        : selectedRecord.status === '예약'
                        ? 'bg-blue-100 text-blue-800'
                        : selectedRecord.status === 'AS'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedRecord.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">작업 금액:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedRecord.totalPrice && selectedRecord.totalPrice > 0 
                        ? `${selectedRecord.totalPrice.toLocaleString()}만원` 
                        : '미입력'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ECU 작업 정보 */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-blue-700 border-b border-blue-200 pb-2">🔧 ECU 작업 정보</h4>
                <div className="space-y-3 bg-blue-50 p-3 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">ECU 제조사:</span>
                    <span className="text-sm text-gray-900 font-medium">{selectedRecord.ecuMaker || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">ECU 모델:</span>
                    <span className="text-sm text-gray-900 font-medium">{selectedRecord.ecuType || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">연결 방법:</span>
                    <span className="text-sm text-gray-900 font-medium">{selectedRecord.connectionMethod || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">사용 도구:</span>
                    <span className="text-sm text-gray-900 font-medium">{selectedRecord.ecuTool || 'N/A'}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-gray-700">ECU 튜닝 작업:</span>
                    <div className="text-sm text-gray-900">
                      {selectedRecord.ecuTuningWorks && selectedRecord.ecuTuningWorks.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {selectedRecord.ecuTuningWorks.map((work: string, index: number) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {work}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500 italic">작업 없음</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ACU 작업 정보 (별도 행) */}
            {(selectedRecord.acuManufacturer || selectedRecord.acuModel || (selectedRecord.acuTuningWorks && selectedRecord.acuTuningWorks.length > 0)) && (
              <div className="mt-6">
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-green-700 border-b border-green-200 pb-2">⚙️ ACU 작업 정보</h4>
                  <div className="space-y-3 bg-green-50 p-3 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">ACU 제조사:</span>
                        <span className="text-sm text-gray-900 font-medium">{selectedRecord.acuManufacturer || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">ACU 모델:</span>
                        <span className="text-sm text-gray-900 font-medium">{selectedRecord.acuModel || 'N/A'}</span>
                      </div>
                                             <div className="flex justify-between">
                         <span className="text-sm text-gray-600">연결 방법:</span>
                         <span className="text-sm text-gray-900 font-medium">{selectedRecord.acuConnectionMethod || 'N/A'}</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-sm text-gray-600">사용 도구:</span>
                         <span className="text-sm text-gray-900 font-medium">{selectedRecord.acuTool || 'N/A'}</span>
                       </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-gray-700">ACU 튜닝 작업:</span>
                      <div className="text-sm text-gray-900">
                        {selectedRecord.acuTuningWorks && selectedRecord.acuTuningWorks.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {selectedRecord.acuTuningWorks.map((work: string, index: number) => (
                              <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {work}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-500 italic">작업 없음</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 메모 */}
            {selectedRecord.notes && (
              <div className="mt-6">
                <h4 className="text-md font-medium text-gray-900 border-b pb-2 mb-3">작업 메모</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700">{selectedRecord.notes}</p>
                </div>
              </div>
            )}

            {/* 파일 다운로드 섹션 */}
            {selectedRecord.files && selectedRecord.files.length > 0 && (
              <div className="mt-6">
                <div className="flex justify-between items-center border-b pb-2 mb-3">
                  <h4 className="text-md font-medium text-gray-900">첨부 파일</h4>
                  <button
                    onClick={() => handleCategoryDownload(selectedRecord.files, `${selectedRecord.customerName}_${selectedRecord.workDate}_전체파일`)}
                    className="bg-purple-600 text-white text-sm px-3 py-1 rounded hover:bg-purple-700 transition-colors flex items-center space-x-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>📦 전체 파일 다운로드</span>
                  </button>
                </div>
                
                {/* 파일 카테고리별 분류 */}
                {(() => {
                  const filesByCategory = selectedRecord.files.reduce((acc: any, file: any) => {
                    const category = file.category || 'other'
                    if (!acc[category]) acc[category] = []
                    acc[category].push(file)
                    return acc
                  }, {})

                  // ECU, ACU, 미디어로 대분류
                  const ecuCategories = ['original', 'read', 'modified', 'vr', 'stage1', 'stage2', 'stage3']
                  const acuCategories = ['acuOriginal', 'acuRead', 'acuModified', 'acuStage1', 'acuStage2', 'acuStage3']
                  const mediaCategories = ['before', 'after', 'media']

                  const ecuFiles = Object.entries(filesByCategory).filter(([category]) => ecuCategories.includes(category))
                  const acuFiles = Object.entries(filesByCategory).filter(([category]) => acuCategories.includes(category))
                  const mediaFiles = Object.entries(filesByCategory).filter(([category]) => mediaCategories.includes(category))
                  const otherFiles = Object.entries(filesByCategory).filter(([category]) => !ecuCategories.includes(category) && !acuCategories.includes(category) && !mediaCategories.includes(category))

                  const categoryNames: { [key: string]: string } = {
                    original: '📁 원본 파일',
                    read: '📖 1차 파일', 
                    modified: '✏️ 2차 파일',
                    vr: '🔍 3차 파일',
                    stage1: '📈 1차 튜닝 파일',
                    stage2: '🚀 2차 튜닝 파일', 
                    stage3: '🔥 3차 튜닝 파일',
                    acuOriginal: '📁 원본 파일',
                    acuRead: '📖 1차 파일',
                    acuModified: '✏️ 2차 파일',
                    acuStage1: '📈 1차 튜닝 파일',
                    acuStage2: '🚀 2차 튜닝 파일',
                    acuStage3: '🔥 3차 튜닝 파일',
                    before: '📷 작업 전',
                    after: '📷 작업 후',
                    media: '📷 미디어 파일',
                    other: '📁 기타 파일'
                  }

                  const categoryColors: { [key: string]: string } = {
                    original: 'bg-gray-50 border-gray-200',
                    read: 'bg-blue-50 border-blue-200',
                    modified: 'bg-orange-50 border-orange-200',
                    vr: 'bg-violet-50 border-violet-200',
                    stage1: 'bg-green-50 border-green-200',
                    stage2: 'bg-yellow-50 border-yellow-200',
                    stage3: 'bg-red-50 border-red-200',
                    acuOriginal: 'bg-teal-50 border-teal-200',
                    acuRead: 'bg-cyan-50 border-cyan-200',
                    acuModified: 'bg-emerald-50 border-emerald-200',
                    acuStage1: 'bg-sky-50 border-sky-200',
                    acuStage2: 'bg-indigo-50 border-indigo-200',
                    acuStage3: 'bg-purple-50 border-purple-200',
                    before: 'bg-pink-50 border-pink-200',
                    after: 'bg-rose-50 border-rose-200',
                    media: 'bg-fuchsia-50 border-fuchsia-200',
                    other: 'bg-slate-50 border-slate-200'
                  }

                  const renderFileGroup = (title: string, files: [string, any][], bgColor: string, downloadAllLabel: string) => {
                    if (files.length === 0) return null
                    
                    const allFiles = files.flatMap(([, fileArray]) => fileArray)
                    
                    return (
                      <div className={`mb-6 p-4 rounded-lg border-2 ${bgColor}`}>
                        <div className="flex justify-between items-center mb-4">
                          <h5 className="text-lg font-bold text-gray-800">{title} ({allFiles.length}개)</h5>
                          <button
                            onClick={() => handleCategoryDownload(allFiles, downloadAllLabel)}
                            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span>📦 {downloadAllLabel} 전체 다운로드</span>
                          </button>
                        </div>
                        {files.map(([category, categoryFiles]: [string, any]) => (
                    <div key={category} className={`mb-4 p-4 rounded-lg border ${categoryColors[category] || categoryColors.other}`}>
                      <div className="flex justify-between items-center mb-3">
                        <h5 className="text-sm font-medium text-gray-800">
                          {categoryNames[category] || categoryNames.other} ({files.length}개)
                        </h5>
                        {files.length > 1 && (
                          <button
                            onClick={() => handleCategoryDownload(files, categoryNames[category] || categoryNames.other)}
                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
                          >
                            📦 전체 다운로드
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {files.map((file: any, index: number) => (
                          <div key={index} className="flex items-center justify-between bg-white p-3 rounded border">
                            <div className="flex items-center space-x-3">
                              {/* 파일 아이콘 또는 미리보기 */}
                              {file.type && file.type.startsWith('image/') && file.data ? (
                                <img
                                  src={`data:${file.type};base64,${file.data}`}
                                  alt={file.name}
                                  className="w-10 h-10 object-cover rounded border"
                                />
                              ) : file.type && file.type.startsWith('video/') ? (
                                <div className="w-10 h-10 bg-red-100 rounded border flex items-center justify-center">
                                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              ) : (
                                <div className="w-10 h-10 bg-gray-100 rounded border flex items-center justify-center">
                                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 break-all" title={file.name}>{file.name}</p>
                                <p className="text-xs text-gray-500">
                                  {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'N/A'}
                                  {file.description && ` • ${file.description}`}
                                </p>
                                {file.uploadDate && (
                                  <p className="text-xs text-gray-400">
                                    업로드: {new Date(file.uploadDate).toLocaleDateString('ko-KR')}
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleFileDownload(file)}
                              className="bg-green-600 text-white text-sm font-medium px-3 py-1 rounded hover:bg-green-700 transition-colors flex items-center space-x-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span>다운로드</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                         ))}
                       </div>
                     )
                   }

                   return (
                     <div>
                       {renderFileGroup('🔧 ECU 파일', ecuFiles, 'bg-blue-50 border-blue-300', 'ECU')}
                       {renderFileGroup('⚙️ ACU 파일', acuFiles, 'bg-green-50 border-green-300', 'ACU')}
                       {renderFileGroup('📷 미디어 파일', mediaFiles, 'bg-purple-50 border-purple-300', '미디어')}
                       {renderFileGroup('📁 기타 파일', otherFiles, 'bg-gray-50 border-gray-300', '기타')}
                     </div>
                   )
                })()}
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDetailModal(false)
                    handleEdit(selectedRecord)
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200 cursor-pointer flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>수정</span>
                </button>
                <button
                  onClick={() => handleDeleteRecord(selectedRecord)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200 cursor-pointer flex items-center space-x-2"
                  title="삭제"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>삭제</span>
                </button>
              </div>
              <button
                onClick={closeModals}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 hover:shadow-md transform hover:scale-105 transition-all duration-200 cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {showEditModal && selectedRecord && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">작업 정보 수정</h3>
              <button
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 기본 정보 수정 */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900 border-b pb-2">기본 정보</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">작업일</label>
                    <input
                      type="date"
                      name="workDate"
                      value={editFormData.workDate || ''}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">고객명</label>
                    <input
                      type="text"
                      name="customerName"
                      value={editFormData.customerName || ''}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">장비 종류</label>
                    <select
                      name="equipmentType"
                      value={editFormData.equipmentType || ''}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {EQUIPMENT_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">제조사</label>
                    <select
                      name="manufacturer"
                      value={editFormData.manufacturer || ''}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {MANUFACTURERS.map(manufacturer => (
                        <option key={manufacturer} value={manufacturer}>{manufacturer}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">모델</label>
                    <input
                      type="text"
                      name="model"
                      value={editFormData.model || ''}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                    <select
                      name="status"
                      value={editFormData.status || ''}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {WORK_STATUS.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 작업 정보 수정 */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900 border-b pb-2">작업 정보</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ECU 모델</label>
                    <select
                      name="ecuModel"
                      value={editFormData.ecuModel || editFormData.ecuType || ''}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {ecuModels.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                    
                    {/* ECU 모델 추가 */}
                    <div className="mt-2 flex space-x-2">
                      <input
                        type="text"
                        value={newEcuModel}
                        onChange={(e) => setNewEcuModel(e.target.value)}
                        placeholder="새 ECU 모델 입력"
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        onKeyPress={(e) => e.key === 'Enter' && addNewEcuModel()}
                      />
                      <button
                        type="button"
                        onClick={addNewEcuModel}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        추가
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ACU 타입</label>
                    <select
                      name="acuType"
                      value={editFormData.acuType || ''}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">선택하세요</option>
                      {acuTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    
                    {/* ACU 타입 추가 */}
                    <div className="mt-2 flex space-x-2">
                      <input
                        type="text"
                        value={newAcuType}
                        onChange={(e) => setNewAcuType(e.target.value)}
                        placeholder="새 ACU 타입 입력"
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        onKeyPress={(e) => e.key === 'Enter' && addNewAcuType()}
                      />
                      <button
                        type="button"
                        onClick={addNewAcuType}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        추가
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">연결 방법</label>
                    <select
                      name="connectionMethod"
                      value={editFormData.connectionMethod || ''}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {CONNECTION_METHODS.map(method => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">사용 도구</label>
                    <select
                      name="ecuTool"
                      value={editFormData.ecuTool || (Array.isArray(editFormData.toolsUsed) ? editFormData.toolsUsed.join(', ') : editFormData.toolsUsed) || ''}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {ECU_TOOLS_FLAT.map(tool => (
                        <option key={tool} value={tool}>{tool}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">튜닝 작업</label>
                    <select
                      name="tuningWork"
                      value={editFormData.tuningWork || editFormData.workType || ''}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {TUNING_WORKS.map(work => (
                        <option key={work} value={work}>{work}</option>
                      ))}
                    </select>
                  </div>
                  {editFormData.tuningWork === '기타' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">기타 작업 내용</label>
                      <input
                        type="text"
                        name="customTuningWork"
                        value={editFormData.customTuningWork || ''}
                        onChange={handleEditInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="기타 작업 내용을 입력하세요"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">작업 금액 (원)</label>
                    <input
                      type="number"
                      name="price"
                      value={editFormData.price || ''}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="작업 금액을 입력하세요"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 메모 수정 */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">작업 메모</label>
              <textarea
                name="notes"
                value={editFormData.notes || editFormData.workDescription || ''}
                onChange={handleEditInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="작업 관련 메모를 입력하세요"
              />
            </div>

            {/* 파일 관리 섹션 */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">첨부 파일</label>
              
              {/* 기존 파일 목록 */}
              {editFormData.files && editFormData.files.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-sm font-medium text-gray-600 mb-2">기존 파일</h5>
                  <div className="space-y-2">
                    {editFormData.files.map((file: any, index: number) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm text-gray-700">{file.name}</span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => handleFileDownload(file)}
                            className="bg-green-600 text-white text-xs px-2 py-1 rounded hover:bg-green-700 transition-colors flex items-center space-x-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>다운로드</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(index)}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 새 파일 업로드 */}
              <div>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt"
                />
                <p className="text-xs text-gray-500 mt-1">
                  PDF, Word, Excel, 이미지 파일 등을 업로드할 수 있습니다. (최대 10MB)
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={closeModals}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                취소
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 고객 정보 모달 */}
      {showCustomerModal && selectedCustomer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">고객 정보</h3>
              <button
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {/* 기본 정보 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-medium text-gray-900 mb-3">기본 정보</h4>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <span className="text-sm text-gray-500">고객명:</span>
                     <p className="text-sm font-medium text-gray-900">{selectedCustomer.name}</p>
                   </div>
                   <div>
                     <span className="text-sm text-gray-500">연락처:</span>
                     <p className="text-sm text-gray-900">{selectedCustomer.phone}</p>
                   </div>
                   <div>
                     <span className="text-sm text-gray-500">등록일:</span>
                     <p className="text-sm text-gray-900">{selectedCustomer.registrationDate}</p>
                   </div>
                   <div>
                     <span className="text-sm text-gray-500">주소:</span>
                     <p className="text-sm text-gray-900">{selectedCustomer.address}</p>
                   </div>
                 </div>
              </div>

              

              {/* 추가 정보 */}
              {selectedCustomer.notes && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="text-md font-medium text-gray-900 mb-3">메모</h4>
                  <p className="text-sm text-gray-700">{selectedCustomer.notes}</p>
                </div>
              )}

              {/* 작업 이력 요약 */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="text-md font-medium text-gray-900 mb-3">작업 이력 요약</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-green-600">
                      {workRecords.filter(record => record.customerId === selectedCustomer.id).length}
                    </p>
                    <p className="text-xs text-gray-500">총 작업 수</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-blue-600">
                      {workRecords.filter(record => record.customerId === selectedCustomer.id && record.status === '완료').length}
                    </p>
                    <p className="text-xs text-gray-500">완료된 작업</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-yellow-600">
                      {workRecords.filter(record => record.customerId === selectedCustomer.id && record.status === '진행중').length}
                    </p>
                    <p className="text-xs text-gray-500">진행중 작업</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-purple-600">
                      {workRecords.filter(record => record.customerId === selectedCustomer.id)
                        .reduce((total, record) => total + (record.price || 0), 0)
                        .toLocaleString()}원
                    </p>
                    <p className="text-xs text-gray-500">총 작업 금액</p>
                  </div>
                </div>
              </div>
            </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={closeModals}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  닫기
                </button>
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