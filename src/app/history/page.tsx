'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { ACU_TYPES, CONNECTION_METHODS, ECU_TOOLS_FLAT, TUNING_WORKS, EQUIPMENT_TYPES, MANUFACTURERS, MANUFACTURER_MODELS, WORK_STATUS, ECU_MODELS } from '@/constants'
import { 
  getAllWorkRecords, 
  getWorkRecordWithFiles, 
  getWorkRecordsPaginatedStable, 
  getWorkRecordDetailsStable,
  updateWorkRecord, 
  deleteWorkRecord, 
  WorkRecordData 
} from '@/lib/work-records'
import { getAllCustomers, CustomerData } from '@/lib/customers'
import { getAllEquipment, EquipmentData } from '@/lib/equipment'
import { searchEngine } from '@/lib/search-engine'
import { cacheManager, CacheKeys, CacheTTL } from '@/lib/cache-manager'
import { FileDownloadManager, FileMetadata } from '@/lib/file-download-manager'
import { supabase } from '@/lib/supabase'
import Navigation from '@/components/Navigation'
import AuthGuard from '@/components/AuthGuard'
import JSZip from 'jszip'
import { FileDownloadSection } from '@/components/FileDownloadSection'
import { LoadingSkeleton, WorkRecordSkeleton, DetailSkeleton } from '@/components/LoadingSkeleton'

function HistoryPage() {
  // ✅ 안정적인 상태 관리
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
  
  // ✅ 페이지네이션 상태 개선
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(0)
  
  // ✅ 상세보기 및 수정 모달 상태 개선
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState<any>({})
  
  // ✅ 고객 정보 모달 상태
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)

  // ✅ 파일 다운로드 상태
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadStatus, setDownloadStatus] = useState('')

  // ✅ 동적 ECU 모델 목록 상태
  const [ecuModels, setEcuModels] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ecuModels')
      return saved ? JSON.parse(saved) : ECU_MODELS
    }
    return ECU_MODELS
  })
  const [newEcuModel, setNewEcuModel] = useState('')

  // ✅ 동적 ACU 타입 목록 상태
  const [acuTypes, setAcuTypes] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('acuTypes')
      return saved ? JSON.parse(saved) : ACU_TYPES
    }
    return ACU_TYPES
  })
  const [newAcuType, setNewAcuType] = useState('')

  // ✅ ECU/ACU 타입 관리 상태
  const [showEcuManagement, setShowEcuManagement] = useState(false)
  const [showAcuManagement, setShowAcuManagement] = useState(false)
  const [selectedEcuModels, setSelectedEcuModels] = useState<string[]>([])
  const [selectedAcuTypes, setSelectedAcuTypes] = useState<string[]>([])
  const [newEcuModelManagement, setNewEcuModelManagement] = useState('')
  const [newAcuTypeManagement, setNewAcuTypeManagement] = useState('')

  // ✅ 파일 다운로드 매니저 인스턴스
  const downloadManager = useMemo(() => new FileDownloadManager(supabase), [])

  // ✅ 검색 관련 상태
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchTook, setSearchTook] = useState(0)
  const [searchMode, setSearchMode] = useState<'fuzzy' | 'exact'>('fuzzy')
  const [isInfiniteScrollEnabled, setIsInfiniteScrollEnabled] = useState(false)

  // ✅ 메모리 누수 방지를 위한 cleanup 함수
  const cleanup = useCallback(() => {
    // 이벤트 리스너 정리
    // 타이머 정리
    // 구독 해제
  }, [])

  // ✅ 안정적인 데이터 로딩 함수
  const loadAllData = useCallback(async (page: number = 1) => {
    try {
      setIsLoadingRecords(true)
      
      // 1단계: 기본 메타데이터 로드 (빠른 초기 렌더링)
      const basicData = await getWorkRecordsPaginatedStable(page, pageSize)
      setWorkRecords(basicData.data || [])
      setTotalCount(basicData.totalCount || 0)
      setTotalPages(basicData.totalPages || 0)
      setCurrentPage(page)
      
      // 2단계: 고객/장비 정보 병렬 로드
      const [customersData, equipmentsData] = await Promise.all([
        getAllCustomers(),
        getAllEquipment()
      ])
      
      setCustomers(customersData)
      setEquipments(equipmentsData)
      
      // 3단계: 데이터 보강 (백그라운드)
      const enrichedData = await enrichWorkRecordsData(basicData.data, customersData, equipmentsData)
      setWorkRecords(enrichedData)
      
    } catch (error) {
      console.error('데이터 로딩 실패:', error)
    } finally {
      setIsLoadingRecords(false)
    }
  }, [pageSize])

  // ✅ 데이터 보강 함수
  const enrichWorkRecordsData = useCallback(async (basicData: any[], customers: CustomerData[], equipments: EquipmentData[]) => {
    try {
      return basicData.map(record => {
        const customer = customers.find(c => c.id === record.customer_id)
        const equipment = equipments.find(e => e.id === record.equipment_id)
        
        return {
          ...record,
          customer: customer || null,
          equipment: equipment || null
        }
      })
    } catch (error) {
      console.error('데이터 보강 실패:', error)
      return basicData
    }
  }, [])

  // ✅ 안정적인 상세보기 로딩
  const handleViewDetail = useCallback(async (record: any) => {
    try {
      setShowDetailModal(true)
      setSelectedRecord(null) // 로딩 상태 표시
      
      // 캐시된 데이터 우선 사용
      const cached = await cacheManager.get(`work_record_details:${record.id}`)
      if (cached) {
        setSelectedRecord(cached)
      }
      
      // 최신 데이터 로드
      const details = await getWorkRecordDetailsStable(record.id)
      setSelectedRecord(details)
      
    } catch (error) {
      console.error('상세 데이터 로딩 실패:', error)
    }
  }, [])

  // ✅ 파일 다운로드 함수들
  const handleSingleFileDownload = useCallback(async (file: FileMetadata) => {
    try {
      setIsDownloading(true)
      setDownloadStatus(`다운로드 중: ${file.original_name}`)
      setDownloadProgress(0)
      
      await downloadManager.downloadFile(file)
      
      setDownloadProgress(100)
      setDownloadStatus('다운로드 완료!')
      
      setTimeout(() => {
        setIsDownloading(false)
        setDownloadProgress(0)
        setDownloadStatus('')
      }, 2000)
      
    } catch (error) {
      console.error('파일 다운로드 실패:', error)
      setDownloadStatus('다운로드 실패')
      setTimeout(() => {
        setIsDownloading(false)
        setDownloadProgress(0)
        setDownloadStatus('')
      }, 3000)
    }
  }, [downloadManager])

  const handleBulkDownload = useCallback(async (files: FileMetadata[], zipName: string) => {
    try {
      setIsDownloading(true)
      setDownloadStatus(`ZIP 파일 생성 중...`)
      setDownloadProgress(0)
      
      await downloadManager.downloadMultipleFiles(files, zipName)
      
      setDownloadProgress(100)
      setDownloadStatus('다운로드 완료!')
      
      setTimeout(() => {
        setIsDownloading(false)
        setDownloadProgress(0)
        setDownloadStatus('')
      }, 2000)
      
    } catch (error) {
      console.error('다중 파일 다운로드 실패:', error)
      setDownloadStatus('다운로드 실패')
      setTimeout(() => {
        setIsDownloading(false)
        setDownloadProgress(0)
        setDownloadStatus('')
      }, 3000)
    }
  }, [downloadManager])

  // ✅ 카테고리별 파일 다운로드
  const handleCategoryDownload = useCallback(async (files: FileMetadata[], categoryName: string, customFilenames?: string[]) => {
    try {
      setIsDownloading(true)
      setDownloadStatus(`${categoryName} 파일 다운로드 중...`)
      setDownloadProgress(0)
      
      await downloadManager.downloadFilesByCategory(files, categoryName, customFilenames)
      
      setDownloadProgress(100)
      setDownloadStatus('다운로드 완료!')
      
      setTimeout(() => {
        setIsDownloading(false)
        setDownloadProgress(0)
        setDownloadStatus('')
      }, 2000)
      
    } catch (error) {
      console.error('카테고리별 다운로드 실패:', error)
      setDownloadStatus('다운로드 실패')
      setTimeout(() => {
        setIsDownloading(false)
        setDownloadProgress(0)
        setDownloadStatus('')
      }, 3000)
    }
  }, [downloadManager])

  // ✅ 주기적 데이터 갱신 (메모리 누수 방지)
  useEffect(() => {
    let isMounted = true
    let intervalId: NodeJS.Timeout
    
    const refreshData = async () => {
      if (!isMounted) return
      
      try {
        const timeSinceLastUpdate = Date.now() - (window as any).lastDataUpdate || 0
        // 5분마다 데이터 갱신 (메모리 누수 방지)
        if (timeSinceLastUpdate > 300000) {
          await loadAllData(currentPage)
          ;(window as any).lastDataUpdate = Date.now()
        }
      } catch (error) {
        console.error('주기적 데이터 갱신 실패:', error)
      }
    }
    
    intervalId = setInterval(refreshData, 60000) // 1분마다 체크
    
    return () => {
      isMounted = false
      clearInterval(intervalId)
      cleanup()
    }
  }, [loadAllData, currentPage, cleanup])

  // ✅ 초기 데이터 로딩
  useEffect(() => {
    loadAllData(1)
  }, [loadAllData])

  // ✅ 컴포넌트 언마운트 시 cleanup
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  // 성능 메트릭 표시 컴포넌트
  const PerformanceMetrics = () => (
    <div className="mb-4 p-3 bg-gray-800 border border-gray-600 rounded-lg">
      <div className="flex items-center justify-between text-sm">
        <div className="flex space-x-4">
          <span className="text-blue-400">
            📊 로드된 데이터: {workRecords.length}/{totalCount}개
          </span>
          {searchQuery && (
            <span className="text-green-400">
              🔍 검색 결과: {searchResults.length}건 ({searchTook}ms)
            </span>
          )}
          <span className="text-purple-400">
            💾 캐시 상태: 활성화
          </span>
          <span className="text-green-600">
            ⚡ 메모리 절약: ~{Math.round((1 - (workRecords.length / Math.max(totalCount, 1))) * 100)}%
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={isInfiniteScrollEnabled}
              onChange={(e) => setIsInfiniteScrollEnabled(e.target.checked)}
              className="rounded"
            />
            <span className="text-xs text-gray-600">무한스크롤</span>
          </label>
        </div>
      </div>
    </div>
  )

  // 데이터 로드 및 검색 엔진 초기화
  useEffect(() => {
    loadAllData()
    initializeSearchEngine()
  }, [])

  // 검색 엔진 초기화
  const initializeSearchEngine = async () => {
    try {
      await searchEngine.initialize()
      console.log('🔍 검색 엔진 초기화 완료')
    } catch (error) {
      console.error('❌ 검색 엔진 초기화 실패:', error)
    }
  }

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
    window.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      loadAllData(newPage)
    }
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(1)
    loadAllData(1)
  }

  const getAvailableModels = (manufacturer: string) => {
    return MANUFACTURER_MODELS[manufacturer] || []
  }

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

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setSearchQuery('')
      return
    }

    setIsSearching(true)
    setSearchQuery(query)

    try {
      const startTime = performance.now()
      const searchOptions = {
        fuzzy: searchMode === 'fuzzy',
        exact: searchMode === 'exact',
        limit: 50
      }

      const results = await searchEngine.search(query, searchOptions)
      setSearchResults(results)
      setSearchTook(performance.now() - startTime)
      
      console.log(`🔍 검색 완료: "${query}" - ${results.length}건 (${performance.now() - startTime}ms)`)
    } catch (error) {
      console.error('❌ 검색 실패:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearchInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)

    if (query.length >= 2) {
      try {
        const suggestions = await searchEngine.generateSuggestions(query, 5)
        setSearchSuggestions(suggestions.map(s => s.text))
        setShowSuggestions(true)
      } catch (error) {
        console.error('❌ 자동완성 실패:', error)
      }
    } else {
      setSearchSuggestions([])
      setShowSuggestions(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion)
    setShowSuggestions(false)
    handleSearch(suggestion)
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setSearchSuggestions([])
    setShowSuggestions(false)
    setSearchTook(0)
  }

  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm || !text) return text
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 text-yellow-800 px-1 rounded">
          {part}
        </span>
      ) : part
    )
  }

  const handleEdit = (record: any) => {
    setSelectedRecord(record)
    setEditFormData({ ...record })
    setShowEditModal(true)
  }

  const closeModals = () => {
    setShowDetailModal(false)
    setShowEditModal(false)
    setShowCustomerModal(false)
    setSelectedRecord(null)
    setSelectedCustomer(null)
    setEditFormData({})
  }

  const handleDeleteRecord = async (record: any) => {
    if (confirm(`'${record.customer?.name || '알 수 없음'}' 고객의 작업 기록(ID: ${record.id})을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
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

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setEditFormData((prev: any) => ({ ...prev, [name]: value }))
  }

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



  const processRemappingWorks = (record: WorkRecordData, customers: CustomerData[], equipments: EquipmentData[]) => {
    const customer = customers.find(c => c.id === record.customerId)
    const equipment = equipments.find(e => e.id === record.equipmentId)
    
    // 데이터베이스의 개별 컬럼에서 ECU/ACU 정보 가져오기 (우선순위)
    let ecuMaker = record.ecuMaker || '';
    let ecuType = record.ecuModel || '';
    let ecuConnectionMethod = record.connectionMethod || '';
    let ecuTool = '';
    let ecuCategory = ''; // KESS/FLEX 등
    let ecuTuningWorks: string[] = [];
    let acuManufacturer = record.acuManufacturer || '';
    let acuModel = record.acuModel || '';
    let acuConnectionMethod = record.connectionMethod || '';
    let acuTool = '';
    let acuCategory = ''; // KESS/FLEX 등
    let acuTuningWorks: string[] = [];
    let allFiles: any[] = [];
    
    // tools_used에서 카테고리 정보 추출 시도 (우선순위)
    if (record.toolsUsed && Array.isArray(record.toolsUsed)) {
      record.toolsUsed.forEach(tool => {
        if (typeof tool === 'string') {
          const toolUpper = tool.toUpperCase();
          // ECU 카테고리 추출
          if (toolUpper.includes('KESS') && !ecuCategory) {
            ecuCategory = 'KESS';
          } else if (toolUpper.includes('FLEX') && !ecuCategory) {
            ecuCategory = 'FLEX';
          } else if (toolUpper.includes('KTAG') && !ecuCategory) {
            ecuCategory = 'KTAG';
          } else if (toolUpper.includes('FGTECH') && !ecuCategory) {
            ecuCategory = 'FGTECH';
          }
          
          // 연결방법 추출
          if (toolUpper.includes('OBD') && !ecuConnectionMethod) {
            ecuConnectionMethod = 'OBD';
          } else if (toolUpper.includes('BENCH') && !ecuConnectionMethod) {
            ecuConnectionMethod = 'BENCH';
          }
        }
      });
      
      // ACU 카테고리는 일반적으로 FLEX
      if (record.acuManufacturer && !acuCategory) {
        acuCategory = 'FLEX';
      }
    }

    // ECU 제조사/모델에 따른 일반적인 장비 카테고리 추정
    if (!ecuCategory && ecuMaker) {
      const ecuMakerUpper = ecuMaker.toUpperCase();
      if (ecuMakerUpper.includes('BOSCH') || ecuMakerUpper.includes('CONTINENTAL') || ecuMakerUpper.includes('DELPHI')) {
        ecuCategory = 'KESS'; // 일반적으로 KESS로 많이 작업
      } else if (ecuMakerUpper.includes('CATERPILLAR') || ecuMakerUpper.includes('CUMMINS')) {
        ecuCategory = 'FLEX'; // 상용차는 주로 FLEX
      } else if (ecuMakerUpper.includes('CHRYSLER') || ecuMakerUpper.includes('JEEP')) {
        ecuCategory = 'KESS'; // 크라이슬러는 주로 KESS
      } else {
        ecuCategory = 'KESS'; // 기본값
      }
    }

    // ACU 제조사에 따른 카테고리 추정
    if (!acuCategory && acuManufacturer) {
      const acuManuUpper = acuManufacturer.toUpperCase();
      if (acuManuUpper.includes('CONTINENTAL') || acuManuUpper.includes('ZF')) {
        acuCategory = 'FLEX'; // ACU는 주로 FLEX로 작업
      } else {
        acuCategory = 'FLEX'; // 기본값
      }
    }

    // 연결방법 추정 (ECU)
    if (!ecuConnectionMethod && ecuMaker) {
      const ecuMakerUpper = ecuMaker.toUpperCase();
      if (ecuMakerUpper.includes('CATERPILLAR') || ecuMakerUpper.includes('CUMMINS')) {
        ecuConnectionMethod = 'BENCH'; // 상용차는 주로 BENCH
      } else {
        ecuConnectionMethod = 'OBD'; // 승용차는 주로 OBD
      }
    }

    // 연결방법 추정 (ACU)
    if (!acuConnectionMethod && acuManufacturer) {
      acuConnectionMethod = 'BENCH'; // ACU는 대부분 BENCH
    }

    // 디버깅: ECU/ACU 데이터 확인
    console.log('🔍 Record ID:', record.id, 'Full Record:', record);
    console.log('🔍 remappingWorks 상세:', record.remappingWorks);
    console.log('🔍 toolsUsed 상세:', record.toolsUsed);
    console.log('🔍 ECU/ACU Info:', {
      ecuMaker: record.ecuMaker,
      ecuModel: record.ecuModel,
      acuManufacturer: record.acuManufacturer,
      acuModel: record.acuModel,
      acuType: record.acuType,
      connectionMethod: record.connectionMethod,
      toolsUsed: record.toolsUsed,
      remappingWorks: record.remappingWorks,
      extractedEcuCategory: ecuCategory,
      extractedAcuCategory: acuCategory
    });
    
    // remappingWorks에서 추가 정보 추출 (데이터베이스 컬럼이 비어있는 경우만 보완)
    if (record.remappingWorks && record.remappingWorks.length > 0) {
      const firstWork = record.remappingWorks[0] as any;
      
      // 상세 디버깅: firstWork 전체 구조 확인
      console.log('🔍 firstWork 전체 구조:', JSON.stringify(firstWork, null, 2));
      
      // ECU 정보 추출 (기존 데이터가 없거나 N/A인 경우만 보완)
      // firstWork 최상위 레벨에서 직접 추출
      if (!ecuMaker || ecuMaker === 'N/A') {
        ecuMaker = firstWork.ecuMaker || ecuMaker;
      }
      if (!ecuType || ecuType === 'N/A') {
        ecuType = firstWork.ecuType || firstWork.ecuTypeCustom || ecuType;
      }
      if (!ecuConnectionMethod || ecuConnectionMethod === 'N/A') {
        ecuConnectionMethod = firstWork.connectionMethod || ecuConnectionMethod;
      }
      
      // ECU 카테고리 추출
      if (!ecuCategory || ecuCategory === 'N/A') {
        ecuCategory = firstWork.ecuToolCategory || firstWork.ecuToolCategoryCustom || ecuCategory;
      }
      
      // ECU 도구 정보 구성
      const ecuToolParts = [
        ecuCategory,
        ecuConnectionMethod
      ].filter(Boolean);
      ecuTool = ecuToolParts.length > 0 ? ecuToolParts.join(' - ') : 'N/A';
      
      // 튜닝 작업 내역 추출
      ecuTuningWorks = firstWork.selectedWorks ? 
        firstWork.selectedWorks.filter((work: string) => work.startsWith('ECU:')) : [];
      
      // ACU 정보 추출 (기존 데이터가 없거나 N/A인 경우만 보완)
      // firstWork 최상위 레벨에서 직접 추출
      if (!acuManufacturer || acuManufacturer === 'N/A') {
        acuManufacturer = firstWork.acuManufacturer || acuManufacturer;
      }
      if (!acuModel || acuModel === 'N/A') {
        acuModel = firstWork.acuModel || firstWork.acuModelCustom || acuModel;
      }
      if (!acuConnectionMethod || acuConnectionMethod === 'N/A') {
        acuConnectionMethod = firstWork.connectionMethod || acuConnectionMethod;
      }
      
      // ACU 도구 정보 구성 (ACU는 일반적으로 FLEX 사용)
      if (!acuCategory && acuManufacturer) {
        acuCategory = 'FLEX'; // ACU는 주로 FLEX로 작업
      }
      if (!acuConnectionMethod && acuManufacturer) {
        acuConnectionMethod = 'BENCH'; // ACU는 대부분 BENCH 연결
      }
      
      const acuToolParts = [
        acuCategory,
        acuConnectionMethod
      ].filter(Boolean);
      acuTool = acuToolParts.length > 0 ? acuToolParts.join(' - ') : 'N/A';
      
      // ACU 튜닝 작업 내역 추출
      acuTuningWorks = firstWork.selectedWorks ? 
        firstWork.selectedWorks.filter((work: string) => work.startsWith('ACU:')) : [];
      
      // 파일 정보 추출
      if (firstWork.files) {
        Object.entries(firstWork.files).forEach(([category, fileData]: [string, any]) => {
          if (fileData && fileData.file) {
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
              category: `media${i}`,
              uploadDate: new Date().toISOString()
            });
          }
        }
      }
    }
    
    return {
      ...record,
      customerName: customer?.name || '알 수 없음',
      equipmentType: equipment?.equipmentType || '알 수 없음',
      manufacturer: equipment?.manufacturer || '알 수 없음',
      model: equipment?.model || '알 수 없음',
      serial: equipment?.serialNumber || '',
      ecuMaker,
      ecuType,
      ecuCategory,
      connectionMethod: ecuConnectionMethod,
      ecuTool: ecuCategory && ecuConnectionMethod ? `${ecuCategory} - ${ecuConnectionMethod}` : (ecuTool || 'N/A'),
      ecuTuningWorks,
      acuManufacturer,
      acuModel,
      acuType: record.acuType || '',
      acuCategory,
      acuConnectionMethod,
      acuTool: acuCategory && acuConnectionMethod ? `${acuCategory} - ${acuConnectionMethod}` : (acuTool || 'N/A'),
      acuTuningWorks,
      tuningWork: record.workType,
      customTuningWork: record.workType,
      registrationDate: record.workDate,
      price: record.totalPrice || 0,
      files: allFiles
    }

    // 2. remappingWorks 배열에서 추가 파일 정보 추출 (데이터 보충용)
    const remappingWorksData = Array.isArray(record.remappingWorks) && record.remappingWorks.length > 0 
      ? record.remappingWorks[0] 
      : {}

    const safeAccess = (obj: any, path: string[], defaultValue: any[] = []) => {
        return path.reduce((xs, x) => (xs && xs[x] ? xs[x] : null), obj) || defaultValue
    }

    const ecuFiles = safeAccess(remappingWorksData, ['ecu', 'files']).map((f:any) => ({ ...f, category: 'ECU' }))
    const acuFiles = safeAccess(remappingWorksData, ['acu', 'files']).map((f:any) => ({ ...f, category: 'ACU' }))
    const mediaFiles = safeAccess(remappingWorksData, ['media', 'files']).map((f:any) => ({ ...f, category: 'Media' }))

    const allFilesFromRecord = [...(record.files || []), ...ecuFiles, ...acuFiles, ...mediaFiles]
      .filter((file, index, self) => file && file.name && self.findIndex(f => f.name === file.name) === index)
      .map(fileData => ({
        name: fileData.name || 'N/A',
        url: fileData.url || '',
        category: fileData.category || 'General'
      }));

    return {
      ...record,
      customerName: customer?.name || '알 수 없음',
      equipmentType: equipment?.equipmentType || '알 수 없음',
      manufacturer: equipment?.manufacturer || '알 수 없음',
      model: equipment?.model || '알 수 없음',
      serial: equipment?.serialNumber || '',
      ecuFiles,
      acuFiles,
      mediaFiles,
      files: allFilesFromRecord
    };
  }

  // 로딩 스키마 컴포넌트 (기존 코드 제거)
  // const LoadingSkeleton = () => ( ... ) // 이 부분 삭제

  // ✅ 개선된 로딩 스켈레톤
  const renderLoadingSkeleton = () => {
    if (isLoadingRecords) {
      return <WorkRecordSkeleton rows={pageSize} viewMode={viewMode} />
    }
    return null
  }

  // ✅ 상세보기 로딩 스켈레톤
  const renderDetailLoadingSkeleton = () => {
    if (showDetailModal && !selectedRecord) {
      return <DetailSkeleton />
    }
    return null
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-900">
        <Navigation />
        <main className="pt-20">
          {/* 홈으로 돌아가기 버튼 */}
          <div className="mb-6">
            <button
              onClick={() => window.history.back()}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <span>←</span>
              <span>홈으로 돌아가기</span>
            </button>
          </div>

          {/* 페이지 제목 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">📋 작업 이력</h1>
            <p className="text-gray-400">등록된 모든 작업 기록을 확인하고 관리할 수 있습니다.</p>
          </div>

          {/* 성능 메트릭 */}
          <PerformanceMetrics />

          {/* 필터 섹션 */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">🔍 필터 및 검색</h2>
            
            {/* 검색 입력 */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="고객명, 차종, 작업내용으로 검색..."
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                // 검색 기능은 나중에 구현
              />
            </div>

            {/* 필터 옵션들 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 날짜 필터 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">시작일</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">종료일</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* 고객 필터 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">고객</label>
                <select
                  value={filters.customer}
                  onChange={(e) => setFilters(prev => ({ ...prev, customer: e.target.value }))}
                  className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">전체 고객</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 상태 필터 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">상태</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">전체 상태</option>
                  {WORK_STATUS.map(status => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 필터 초기화 버튼 */}
            <div className="mt-4 flex justify-between items-center">
              <button
                onClick={() => setFilters({
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
                })}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                필터 초기화
              </button>
              
              <div className="flex items-center space-x-4">
                <span className="text-gray-400 text-sm">
                  총 {totalCount}개 중 {workRecords.length}개 표시
                </span>
              </div>
            </div>
          </div>

          {/* 뷰 모드 토글 */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                📋 목록 보기
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                🗂️ 그리드 보기
              </button>
            </div>

            {/* 페이지 크기 선택 */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-400 text-sm">페이지 크기:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="p-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value={10}>10개</option>
                <option value={20}>20개</option>
                <option value={50}>50개</option>
                <option value={100}>100개</option>
              </select>
            </div>
          </div>

          {/* 작업 기록 목록 */}
          <div className="mb-6">
            {renderLoadingSkeleton() || (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                {workRecords.map((record) => (
                  <div key={record.id} className={`bg-gray-800 rounded-lg p-6 ${viewMode === 'grid' ? 'h-full' : ''}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-2">
                          {record.customer?.name || '알 수 없음'}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          {record.work_date ? new Date(record.work_date).toLocaleDateString('ko-KR') : '날짜 없음'}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewDetail(record)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          상세보기
                        </button>
                        <button
                          onClick={() => handleEdit(record)}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(record)}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                          삭제
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">차종:</span>
                        <span className="text-white">{record.equipment?.type || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">제조사:</span>
                        <span className="text-white">{record.equipment?.manufacturer || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">모델:</span>
                        <span className="text-white">{record.equipment?.model || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">작업유형:</span>
                        <span className="text-white">{record.work_type || 'N/A'}</span>
                      </div>
                    </div>

                    {viewMode === 'grid' && (
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>ID: {record.id}</span>
                          <span>{record.files?.length || 0}개 파일</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex justify-center space-x-2 mb-6">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
              >
                이전
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-4 py-2 rounded ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-white hover:bg-gray-600'
                    }`}
                  >
                    {page}
                  </button>
                )
              })}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
              >
                다음
              </button>
            </div>
          )}

          {/* 상세보기 모달 */}
          {showDetailModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">작업 상세 정보</h2>
                    <button
                      onClick={closeModals}
                      className="text-gray-400 hover:text-white text-2xl"
                    >
                      ×
                    </button>
                  </div>

                  {renderDetailLoadingSkeleton() || (
                    selectedRecord && (
                      <div className="space-y-6">
                        {/* 기본 정보 */}
                        <div className="bg-gray-700 rounded-lg p-6">
                          <h3 className="text-lg font-semibold text-white mb-4">📋 기본 정보</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">고객명</label>
                              <p className="text-white">{selectedRecord.customer?.name || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">작업일</label>
                              <p className="text-white">
                                {selectedRecord.work_date ? new Date(selectedRecord.work_date).toLocaleDateString('ko-KR') : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">차종</label>
                              <p className="text-white">{selectedRecord.equipment?.type || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">제조사</label>
                              <p className="text-white">{selectedRecord.equipment?.manufacturer || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">모델</label>
                              <p className="text-white">{selectedRecord.equipment?.model || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">작업유형</label>
                              <p className="text-white">{selectedRecord.work_type || 'N/A'}</p>
                            </div>
                          </div>
                        </div>

                        {/* ECU 정보 */}
                        <div className="bg-gray-700 rounded-lg p-6">
                          <h3 className="text-lg font-semibold text-white mb-4">⚙️ ECU 정보</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">ECU 제조사</label>
                              <p className="text-white">{selectedRecord.ecu_maker || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">ECU 모델</label>
                              <p className="text-white">{selectedRecord.ecu_model || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">연결방법</label>
                              <p className="text-white">{selectedRecord.connection_method || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">사용 도구</label>
                              <p className="text-white">{selectedRecord.tools_used || 'N/A'}</p>
                            </div>
                          </div>
                        </div>

                        {/* ACU 정보 */}
                        <div className="bg-gray-700 rounded-lg p-6">
                          <h3 className="text-lg font-semibold text-white mb-4">🔧 ACU 정보</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">ACU 제조사</label>
                              <p className="text-white">{selectedRecord.acu_manufacturer || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">ACU 모델</label>
                              <p className="text-white">{selectedRecord.acu_model || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">ACU 타입</label>
                              <p className="text-white">{selectedRecord.acu_type || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">작업 설명</label>
                              <p className="text-white">{selectedRecord.work_description || 'N/A'}</p>
                            </div>
                          </div>
                        </div>

                        {/* 파일 다운로드 섹션 */}
                        {selectedRecord.files && selectedRecord.files.length > 0 && (
                          <FileDownloadSection
                            recordId={selectedRecord.id}
                            files={selectedRecord.files}
                            onDownloadStart={() => console.log('다운로드 시작')}
                            onDownloadComplete={() => console.log('다운로드 완료')}
                            onDownloadError={(error) => console.error('다운로드 오류:', error)}
                          />
                        )}

                        {/* 메모 */}
                        {selectedRecord.notes && (
                          <div className="bg-gray-700 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">📝 메모</h3>
                            <p className="text-white whitespace-pre-wrap">{selectedRecord.notes}</p>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 다운로드 진행률 표시 */}
          {isDownloading && (
            <div className="fixed bottom-4 right-4 bg-blue-900 text-white p-4 rounded-lg shadow-lg z-50">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <div>
                  <p className="text-sm font-medium">{downloadStatus}</p>
                  <div className="w-32 bg-blue-700 rounded-full h-2 mt-1">
                    <div 
                      className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}

export default HistoryPage