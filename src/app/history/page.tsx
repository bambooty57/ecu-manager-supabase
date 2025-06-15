'use client'

import { useState, useEffect } from 'react'
import { ACU_TYPES, CONNECTION_METHODS, ECU_TOOLS_FLAT, TUNING_WORKS, EQUIPMENT_TYPES, MANUFACTURERS, MANUFACTURER_MODELS, WORK_STATUS, ECU_MODELS } from '@/constants'
import { getAllWorkRecords, updateWorkRecord, WorkRecordData } from '@/lib/work-records'
import { getAllCustomers, CustomerData } from '@/lib/customers'
import { getAllEquipment, EquipmentData } from '@/lib/equipment'

export default function HistoryPage() {
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    customer: '',
    equipmentType: '',
    manufacturer: '',
    model: '',
    ecuType: '',
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

  // 데이터 로드
  useEffect(() => {
    loadAllData()
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
        
        return {
          ...record,
          customerName: customer?.name || '알 수 없음',
          equipmentType: equipment?.equipmentType || '알 수 없음',
          manufacturer: equipment?.manufacturer || '알 수 없음',
          model: equipment?.model || '알 수 없음',
          serial: equipment?.serialNumber || '',
          tuningWork: record.workDescription || '',
          customTuningWork: record.workDescription || '',
          ecuType: record.ecuModel || '',
          connectionMethod: record.connectionMethod || '',
          registrationDate: record.workDate
        }
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
      tuningWork: '',
      status: ''
    })
  }

  // 상세보기 핸들러
  const handleViewDetail = (record: any) => {
    setSelectedRecord(record)
    setShowDetailModal(true)
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
          registrationDate: new Date(customer.createdAt).toLocaleDateString('ko-KR'),
          notes: customer.notes || ''
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
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">작업 이력</h1>
          <p className="mt-2 text-gray-600">
            모든 ECU 튜닝 작업 이력을 조회하고 관리합니다.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
        </div>
      </div>



      {/* 필터 섹션 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">검색 필터</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">고객명</label>
            <input
              type="text"
              name="customer"
              value={filters.customer}
              onChange={handleFilterChange}
              placeholder="고객명 검색"
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">장비 종류</label>
            <select
              name="equipmentType"
              value={filters.equipmentType}
              onChange={handleFilterChange}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">전체</option>
              {EQUIPMENT_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제조사</label>
            <select
              name="manufacturer"
              value={filters.manufacturer}
              onChange={handleFilterChange}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">전체</option>
              {MANUFACTURERS.map((manufacturer) => (
                <option key={manufacturer} value={manufacturer}>{manufacturer}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">모델명</label>
            <select
              name="model"
              value={filters.model}
              onChange={handleFilterChange}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              disabled={!filters.manufacturer}
            >
              <option value="">전체</option>
              {filters.manufacturer && getAvailableModels(filters.manufacturer).map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
            {!filters.manufacturer && (
              <p className="text-xs text-gray-500 mt-1">제조사를 먼저 선택하세요</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">튜닝 작업</label>
            <select
              name="tuningWork"
              value={filters.tuningWork}
              onChange={handleFilterChange}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">전체</option>
              {TUNING_WORKS.map((work) => (
                <option key={work} value={work}>{work}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ECU 타입</label>
            <select
              name="ecuType"
              value={filters.ecuType}
              onChange={handleFilterChange}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">전체</option>
              {ECU_MODELS.map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">작업 상태</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">전체</option>
              {WORK_STATUS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
            <input
              type="date"
              name="dateFrom"
              value={filters.dateFrom}
              onChange={handleFilterChange}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
            <input
              type="date"
              name="dateTo"
              value={filters.dateTo}
              onChange={handleFilterChange}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-gray-500">
            💡 기간을 입력하지 않으면 모든 기간의 자료를 검색합니다.
          </p>
          <div className="flex space-x-2">
            <button
              onClick={clearFilters}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
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
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">작업 목록</h2>
        </div>
        <div className="p-6">
          {isLoadingRecords ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">작업 이력을 불러오는 중...</p>
            </div>
          ) : filteredWorkRecords.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.712-3.714M14 40v-4a9.971 9.971 0 01.712-3.714m0 0A9.971 9.971 0 0118 32a9.971 9.971 0 013.288.714M14 36.286A9.971 9.971 0 0118 36c1.408 0 2.742.29 3.962.714" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">작업 이력이 없습니다</h3>
              <p className="mt-1 text-sm text-gray-500">
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
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          작업일
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          고객/장비
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ECU/튜닝
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          상태
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          금액
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          작업
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredWorkRecords.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.workDate}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{record.customerName}</div>
                            <div className="text-sm text-gray-500">{record.equipmentType}</div>
                            <div className="text-xs text-gray-400">{record.manufacturer} {record.model}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{record.ecuType}</div>
                            <div className="text-sm text-gray-500">
                              {record.tuningWork === '기타' && record.customTuningWork 
                                ? record.customTuningWork 
                                : record.tuningWork}
                            </div>
                            <div className="text-xs text-gray-400">{record.connectionMethod}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              record.status === '완료' 
                                ? 'bg-green-100 text-green-800'
                                : record.status === '진행중'
                                ? 'bg-yellow-100 text-yellow-800'
                                : record.status === '예약'
                                ? 'bg-blue-100 text-blue-800'
                                : record.status === 'AS'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(record.price / 10000).toLocaleString()}만원
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button 
                              onClick={() => handleViewDetail(record)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              상세보기
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredWorkRecords.map((record) => (
                    <div key={record.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{record.customerName}</h3>
                          <p className="text-sm text-gray-500">{record.workDate}</p>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          record.status === '완료' 
                            ? 'bg-green-100 text-green-800'
                            : record.status === '진행중'
                            ? 'bg-yellow-100 text-yellow-800'
                            : record.status === '예약'
                            ? 'bg-blue-100 text-blue-800'
                            : record.status === 'AS'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {record.status}
                        </span>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">장비:</span>
                          <span className="text-sm text-gray-900">{record.equipmentType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">제조사:</span>
                          <span className="text-sm text-gray-900">{record.manufacturer}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">모델:</span>
                          <span className="text-sm text-gray-900">{record.model}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">ECU:</span>
                          <span className="text-sm text-gray-900">{record.ecuType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">작업:</span>
                          <span className="text-sm text-gray-900">
                            {record.tuningWork === '기타' && record.customTuningWork 
                              ? record.customTuningWork 
                              : record.tuningWork}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">금액:</span>
                          <span className="text-sm font-medium text-gray-900">{(record.price / 10000).toLocaleString()}만원</span>
                        </div>
                      </div>
                      
                      {record.notes && (
                        <div className="mb-4">
                          <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                            {record.notes}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleViewDetail(record)}
                          className="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                        >
                          상세보기
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
      {showDetailModal && selectedRecord && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
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
                </div>
              </div>

              {/* 작업 정보 */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900 border-b pb-2">작업 정보</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">ECU 제조사:</span>
                    <span className="text-sm text-gray-900">{selectedRecord.ecuMaker || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">ECU 모델:</span>
                    <span className="text-sm text-gray-900">{selectedRecord.ecuType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">연결 방법:</span>
                    <span className="text-sm text-gray-900">{selectedRecord.connectionMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">사용 도구:</span>
                    <span className="text-sm text-gray-900">{selectedRecord.ecuTool}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">튜닝 작업:</span>
                    <span className="text-sm text-gray-900">
                      {selectedRecord.tuningWork === '기타' && selectedRecord.customTuningWork 
                        ? selectedRecord.customTuningWork 
                        : selectedRecord.tuningWork}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">작업 금액:</span>
                    <span className="text-sm font-medium text-gray-900">{(selectedRecord.price / 10000).toLocaleString()}만원</span>
                  </div>
                </div>
              </div>
            </div>

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
                <h4 className="text-md font-medium text-gray-900 border-b pb-2 mb-3">첨부 파일</h4>
                
                {/* 파일 카테고리별 분류 */}
                {(() => {
                  const filesByCategory = selectedRecord.files.reduce((acc: any, file: any) => {
                    const category = file.category || 'other'
                    if (!acc[category]) acc[category] = []
                    acc[category].push(file)
                    return acc
                  }, {})

                  const categoryNames: { [key: string]: string } = {
                    original: '📄 원본 ECU 파일',
                    stage1: '📈 Stage 1 파일',
                    stage2: '🚀 Stage 2 파일', 
                    stage3: '🔥 Stage 3 파일',
                    media: '📷 미디어 파일',
                    other: '📁 기타 파일'
                  }

                  const categoryColors: { [key: string]: string } = {
                    original: 'bg-gray-50 border-gray-200',
                    stage1: 'bg-green-50 border-green-200',
                    stage2: 'bg-yellow-50 border-yellow-200',
                    stage3: 'bg-red-50 border-red-200',
                    media: 'bg-blue-50 border-blue-200',
                    other: 'bg-purple-50 border-purple-200'
                  }

                  return Object.entries(filesByCategory).map(([category, files]: [string, any]) => (
                    <div key={category} className={`mb-4 p-4 rounded-lg border ${categoryColors[category] || categoryColors.other}`}>
                      <h5 className="text-sm font-medium text-gray-800 mb-3">
                        {categoryNames[category] || categoryNames.other} ({files.length}개)
                      </h5>
                      <div className="space-y-2">
                        {files.map((file: any, index: number) => (
                          <div key={index} className="flex items-center justify-between bg-white p-3 rounded border">
                            <div className="flex items-center space-x-3">
                              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{file.name}</p>
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
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded border border-blue-300 hover:bg-blue-50"
                            >
                              다운로드
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                })()}
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => {
                  setShowDetailModal(false)
                  handleEdit(selectedRecord)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                수정
              </button>
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
                      {ECU_MODELS.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
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
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            다운로드
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
  )
} 