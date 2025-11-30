'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import { ACU_TYPES, CONNECTION_METHODS, ECU_TOOLS_FLAT, TUNING_WORKS, EQUIPMENT_TYPES, MANUFACTURERS, MANUFACTURER_MODELS, WORK_STATUS, ECU_MODELS } from '@/constants'
import { 
  getAllWorkRecords, 
  getWorkRecordWithFiles, 
  getWorkRecordsPaginatedStable, 
  getWorkRecordDetailsStable,
  updateWorkRecord, 
  deleteWorkRecord, 
  WorkRecordData,
  getStatusColor
} from '@/lib/work-records'
import { getAllCustomers, CustomerData } from '@/lib/customers'
import { getAllEquipment, EquipmentData } from '@/lib/equipment'
import { searchEngine } from '@/lib/search-engine'
import { cacheManager, CacheKeys, CacheTTL } from '@/lib/cache-manager'
import { downloadSingleFile, downloadAllFilesAsZip } from '@/lib/file-download-manager'

// 파일 메타데이터 타입 정의
interface FileMetadata {
  id: number;
  work_record_id: number;
  file_name: string;
  original_name: string;
  file_size: number;
  file_type: string;
  category: string;
  bucket_name: string;
  storage_path: string;
  storage_url: string;
  description?: string;
  created_at: string;
}
import { supabase } from '@/lib/supabase'
import Navigation from '@/components/Navigation'
import WorkRecordRow from '@/components/WorkRecordRow'
import AuthGuard from '@/components/AuthGuard'
import WorkDetailModal from '@/components/WorkDetailModal'
import WorkDetailViewModal from '@/components/WorkDetailViewModal'
// import JSZip from 'jszip' // 임시 주석 처리
import { FileDownloadSection } from '@/components/FileDownloadSection'
import { LoadingSkeleton, WorkRecordSkeleton, DetailSkeleton } from '@/components/LoadingSkeleton'
import { LoadingIndicator, DataLoadingIndicator, FileLoadingIndicator, SearchLoadingIndicator, SaveLoadingIndicator, DeleteLoadingIndicator } from '@/components/LoadingIndicator'
import DarkModeToggle from '@/components/DarkModeToggle'

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
  
  // ✅ 페이지네이션 상태 개선
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(0)
  
  // ✅ 상세보기 및 수정 모달 상태 개선
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<any>(null)
  const [editFormData, setEditFormData] = useState<any>({})
  
  // ✅ 고객 정보 모달 상태
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)

  // ✅ 파일 다운로드 상태
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadStatus, setDownloadStatus] = useState('')

  // ✅ 에러 처리 및 사용자 피드백 상태
  const [isOffline, setIsOffline] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  
  // ✅ 로딩 상태 개선
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // ✅ 정렬 및 필터링 상태
  const [sortField, setSortField] = useState('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [filteredRecords, setFilteredRecords] = useState<any[]>([])
  
  // ✅ 고급 페이지네이션 상태
  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: 20,
    totalPages: 1,
    totalItems: 0,
    startIndex: 0,
    endIndex: 0
  })

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



  // ✅ 검색 관련 상태
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchTook, setSearchTook] = useState(0)
  const [searchMode, setSearchMode] = useState<'fuzzy' | 'exact'>('fuzzy')
  
  // ✅ 검색 디바운스를 위한 timeout
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)
  
  // ✅ 무한스크롤 상태
  const [isInfiniteScrollEnabled, setIsInfiniteScrollEnabled] = useState(false)

  // ✅ 메모리 누수 방지를 위한 cleanup 함수
  const cleanup = useCallback(() => {
    // 이벤트 리스너 정리
    // 타이머 정리
    // 구독 해제
  }, [])

  // ✅ 안정적인 데이터 로딩 함수 (에러 처리 개선)
  const loadAllData = useCallback(async (page: number = 1) => {
    try {
      setIsLoadingRecords(true)
      setLastError(null)
      
      // 1단계: 기본 메타데이터 로드 (빠른 초기 렌더링)
      const basicData = await getWorkRecordsPaginatedStable({ page, pageSize })
      console.log('기본 데이터:', basicData.data)
      
      // 2단계: 고객/장비 정보 병렬 로드
      const [customersData, equipmentsData] = await Promise.all([
        getAllCustomers(),
        getAllEquipment()
      ])
      
      console.log('고객 데이터:', customersData)
      console.log('장비 데이터:', equipmentsData)
      
      setCustomers(customersData)
      setEquipments(equipmentsData)
      
      // 3단계: 데이터 보강 (고객/장비 정보 연결)
      const enrichedData = basicData.data?.map(record => {
        const customer = customersData.find(c => c.id === record.customer_id)
        const equipment = equipmentsData.find(e => e.id === record.equipment_id)
        
        console.log(`레코드 ${record.id}:`, {
          customer_id: record.customer_id,
          equipment_id: record.equipment_id,
          found_customer: customer?.name,
          found_equipment: equipment?.model
        })
        
        // ECU/ACU 정보 추출
        let ecuInfo = {
          manufacturer: record.ecu_maker || 'Unknown',
          model: record.ecu_model || 'Unknown Model',
          type: '',
          price: record.ecu_price || 0,
          status: record.status || '알 수 없음'
        }
        
        let acuInfo = {
          manufacturer: record.acu_manufacturer || '',
          model: record.acu_model || '',
          type: record.acu_type || '',
          price: record.acu_price || 0,
          status: record.status || '알 수 없음'
        }
        
        // remapping_works에서 추가 정보 추출
        if (record.remapping_works && Array.isArray(record.remapping_works) && record.remapping_works.length > 0) {
          const firstWork = record.remapping_works[0] as any
          if (firstWork && firstWork.ecu && typeof firstWork.ecu === 'object') {
            ecuInfo = {
              ...ecuInfo,
              manufacturer: firstWork.ecu.maker || ecuInfo.manufacturer,
              model: firstWork.ecu.type || ecuInfo.model,
              type: firstWork.ecu.type || ecuInfo.type,
              price: parseFloat(firstWork.ecu.price) || ecuInfo.price,
              status: firstWork.ecu.status || ecuInfo.status
            }
          }
          if (firstWork && firstWork.acu && typeof firstWork.acu === 'object') {
            acuInfo = {
              ...acuInfo,
              manufacturer: firstWork.acu.manufacturer || acuInfo.manufacturer,
              model: firstWork.acu.model || acuInfo.model,
              type: firstWork.acu.type || acuInfo.type,
              price: parseFloat(firstWork.acu.price) || acuInfo.price,
              status: firstWork.acu.status || acuInfo.status
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
          ecuInfo,
          acuInfo,
          // remapping_works를 remappingWorks로 변환하여 WorkDetailModal에서 사용
          remappingWorks: record.remapping_works || []
        }
      }) || []
      
      console.log('보강된 데이터:', enrichedData)
      
      setWorkRecords(enrichedData)
              setTotalCount(basicData.total || 0)
      setTotalPages(basicData.totalPages || 0)
      setCurrentPage(page)
      
      // 성공 알림 (첫 로딩 시에만)
      if (page === 1 && workRecords.length === 0) {
        toast.success('작업 이력을 성공적으로 불러왔습니다.')
      }
      
    } catch (error) {
      console.error('데이터 로딩 실패:', error)
      setLastError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.')
      
      // 오류 유형에 따른 맞춤형 메시지
      let errorMessage = '작업 이력을 불러오는 중 오류가 발생했습니다.'
      
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = '네트워크 연결을 확인해주세요.'
        } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
          errorMessage = '접근 권한이 없습니다. 로그인 상태를 확인해주세요.'
        } else if (error.message.includes('timeout')) {
          errorMessage = '요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'
        }
      }
      
      toast.error(errorMessage)
      
      // 빈 배열로 설정하여 UI가 깨지지 않도록 함
      setWorkRecords([])
      setTotalCount(0)
      setTotalPages(0)
    } finally {
      setIsLoadingRecords(false)
    }
  }, [pageSize, workRecords.length])

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

  // ✅ 오프라인 상태 감지 및 처리
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      toast.success('온라인 상태로 전환되었습니다.')
      // 데이터 다시 로드
      loadAllData(currentPage)
    }

    const handleOffline = () => {
      setIsOffline(true)
      toast.error('오프라인 상태입니다. 네트워크 연결을 확인해주세요.')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // 초기 상태 확인
    setIsOffline(!navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [loadAllData, currentPage])

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

  // 검색 엔진 초기화
  const initializeSearchEngine = async () => {
    try {
      await searchEngine.initialize()
      console.log('🔍 검색 엔진 초기화 완료')
    } catch (error) {
      console.error('❌ 검색 엔진 초기화 실패:', error)
    }
  }

  // 데이터 로드 및 검색 엔진 초기화
  useEffect(() => {
    loadAllData(1)
    initializeSearchEngine()
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
    window.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // ✅ 고급 페이지네이션 핸들러들
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({
        ...prev,
        currentPage: newPage
      }))
    }
  }

  const handleItemsPerPageChange = (newSize: number) => {
    setPagination(prev => ({
      ...prev,
      itemsPerPage: newSize,
      currentPage: 1 // 항목 수 변경 시 첫 페이지로 이동
    }))
  }

  const handleFirstPage = () => {
    handlePageChange(1)
  }

  const handleLastPage = () => {
    handlePageChange(pagination.totalPages)
  }

  const handlePreviousPage = () => {
    if (pagination.currentPage > 1) {
      handlePageChange(pagination.currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (pagination.currentPage < pagination.totalPages) {
      handlePageChange(pagination.currentPage + 1)
    }
  }

  // 페이지 범위 계산
  const getPageRange = () => {
    const { currentPage, totalPages } = pagination
    const pageRange = 5 // 한 번에 표시할 페이지 버튼 수
    const startPage = Math.max(1, currentPage - Math.floor(pageRange / 2))
    const endPage = Math.min(totalPages, startPage + pageRange - 1)
    
    const pages = []
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }
    return pages
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
    
    // ✅ 고객명 필터링 - undefined 체크 추가
    if (filters.customer && record.customerName) {
      if (!record.customerName.toLowerCase().includes(filters.customer.toLowerCase())) return false
    } else if (filters.customer && !record.customerName) {
      // 고객명이 없는데 필터가 설정된 경우 제외
      return false
    }
    
    // ✅ 장비종류 필터링 - undefined 체크 추가
    if (filters.equipmentType && record.equipmentType && record.equipmentType !== filters.equipmentType) return false
    
    // ✅ 제조사 필터링 - undefined 체크 추가
    if (filters.manufacturer && record.manufacturer && record.manufacturer !== filters.manufacturer) return false
    
    // ✅ 모델명 필터링 - undefined 체크 추가
    if (filters.model && record.model && record.model !== filters.model) return false
    
    // ✅ ECU 타입 필터링 - undefined 체크 추가
    if (filters.ecuType && record.ecuType && record.ecuType !== filters.ecuType) return false
    
    // ACU 타입 필터링 (temporarily disabled - acuType field removed from WorkRecordData)
    // if (filters.acuType && record.acuType !== filters.acuType) return false
    
    // ✅ 튜닝작업 필터링 - undefined 체크 추가
    if (filters.tuningWork && record.tuningWork && record.tuningWork !== filters.tuningWork) {
      // "기타"가 선택된 경우 customTuningWork도 확인
      if (filters.tuningWork === '기타' && record.tuningWork === '기타') {
        // 통과 (기타끼리 매칭)
      } else {
        return false
      }
    }
    
    // ✅ 작업상태 필터링 - undefined 체크 추가
    if (filters.status && record.status && record.status !== filters.status) return false
    
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

    // 실시간 검색을 위한 디바운스
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    if (query.length >= 2) {
      searchTimeout.current = setTimeout(async () => {
        try {
          const suggestions = await searchEngine.generateSuggestions(query, 5)
          setSearchSuggestions(suggestions.map(s => s.text))
          setShowSuggestions(true)
        } catch (error) {
          console.error('❌ 자동완성 실패:', error)
        }
      }, 300) // 300ms 디바운스
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

  // ✅ 정렬 및 필터링 함수들
  const handleSort = (field: string) => {
    if (sortField === field) {
      // 같은 필드를 다시 클릭하면 정렬 방향 전환
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // 다른 필드를 클릭하면 해당 필드로 정렬하고 기본 내림차순 적용
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const applyFiltersAndSort = useCallback(() => {
    let result = [...workRecords]

    // 검색어 필터링 추가
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(record => {
        // 고객명 검색
        const customerName = record.customerName || record.customer?.name || ''
        if (customerName.toLowerCase().includes(query)) return true
        
        // 장비 정보 검색
        const equipmentModel = record.model || record.equipment?.model || ''
        const equipmentType = record.equipmentType || record.equipment?.type || ''
        const equipmentManufacturer = record.manufacturer || record.equipment?.manufacturer || ''
        
        if (equipmentModel.toLowerCase().includes(query)) return true
        if (equipmentType.toLowerCase().includes(query)) return true
        if (equipmentManufacturer.toLowerCase().includes(query)) return true
        
        // 작업내용 검색
        const ecuWorkContent = record.ecu_work_content || ''
        const acuWorkContent = record.acu_work_content || ''
        
        if (ecuWorkContent.toLowerCase().includes(query)) return true
        if (acuWorkContent.toLowerCase().includes(query)) return true
        
        // remapping_works에서 작업내용 검색
        if (record.remapping_works && Array.isArray(record.remapping_works) && record.remapping_works.length > 0) {
          const firstWork = record.remapping_works[0] as any
          if (firstWork.ecu && firstWork.ecu.selectedWorks) {
            const ecuWorks = firstWork.ecu.selectedWorks.join(' ')
            if (ecuWorks.toLowerCase().includes(query)) return true
          }
          if (firstWork.acu && firstWork.acu.selectedWorks) {
            const acuWorks = firstWork.acu.selectedWorks.join(' ')
            if (acuWorks.toLowerCase().includes(query)) return true
          }
        }
        
        return false
      })
    }

    // 필터 적용
    if (filters.dateFrom) {
      const startDate = new Date(filters.dateFrom)
      result = result.filter(record => new Date(record.work_date) >= startDate)
    }

    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo)
      endDate.setHours(23, 59, 59, 999) // 해당 일자의 마지막 시간으로 설정
      result = result.filter(record => new Date(record.work_date) <= endDate)
    }

    if (filters.customer) {
      // 고객 ID로 필터링
      result = result.filter(record => {
        return record.customer_id?.toString() === filters.customer
      })
    }

    if (filters.equipmentType) {
      result = result.filter(record => record.equipment_type === filters.equipmentType)
    }

    if (filters.manufacturer) {
      result = result.filter(record => record.manufacturer === filters.manufacturer)
    }

    if (filters.model) {
      result = result.filter(record => record.model === filters.model)
    }

    if (filters.ecuType) {
      result = result.filter(record => {
        if (filters.ecuType === 'with-ecu') {
          return record.ecu_data && Object.keys(record.ecu_data).length > 0
        } else if (filters.ecuType === 'without-ecu') {
          return !record.ecu_data || Object.keys(record.ecu_data).length === 0
        }
        return true
      })
    }

    if (filters.acuType) {
      result = result.filter(record => {
        if (filters.acuType === 'with-acu') {
          return record.acu_data && Object.keys(record.acu_data).length > 0
        } else if (filters.acuType === 'without-acu') {
          return !record.acu_data || Object.keys(record.acu_data).length === 0
        }
        return true
      })
    }

    if (filters.tuningWork) {
      result = result.filter(record => record.tuning_work === filters.tuningWork)
    }

    if (filters.status) {
      result = result.filter(record => {
        // remapping_works에서 ECU와 ACU 상태 확인
        if (record.remapping_works && Array.isArray(record.remapping_works) && record.remapping_works.length > 0) {
          const firstWork = record.remapping_works[0] as any
          const ecuInfo = firstWork?.ecu
          const acuInfo = firstWork?.acu
          
          // 화면 표시 로직과 동일하게 처리
          const ecuStatus = (ecuInfo && ecuInfo.maker) ? ecuInfo.status : 'N/A'
          const acuStatus = (acuInfo && acuInfo.manufacturer) ? acuInfo.status : 'N/A'
          
          // 화면에 표시되는 상태와 일치하는지 확인
          return ecuStatus === filters.status || acuStatus === filters.status
        }
        return false
      })
    }

    // 정렬 적용
    result.sort((a, b) => {
      let valueA = a[sortField]
      let valueB = b[sortField]

      // ✅ undefined 체크 추가
      if (valueA === undefined || valueA === null) valueA = ''
      if (valueB === undefined || valueB === null) valueB = ''

      // 날짜 필드인 경우 Date 객체로 변환
      if (sortField === 'created_at' || sortField === 'work_date') {
        valueA = new Date(valueA)
        valueB = new Date(valueB)
      }

      // 문자열인 경우 소문자로 변환하여 비교
      if (typeof valueA === 'string') valueA = valueA.toLowerCase()
      if (typeof valueB === 'string') valueB = valueB.toLowerCase()

      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    // 페이지네이션 계산
    const totalItems = result.length
    const totalPages = Math.ceil(totalItems / pagination.itemsPerPage)
    const currentPage = Math.min(pagination.currentPage, totalPages || 1)
    const startIndex = (currentPage - 1) * pagination.itemsPerPage
    const endIndex = Math.min(startIndex + pagination.itemsPerPage, totalItems)
    
    // 현재 페이지에 해당하는 항목만 선택
    const paginatedItems = result.slice(startIndex, endIndex)

    setFilteredRecords(paginatedItems)
    setPagination(prev => ({
      ...prev,
      currentPage,
      totalPages,
      totalItems,
      startIndex,
      endIndex
    }))
  }, [workRecords, filters, sortField, sortDirection, pagination.itemsPerPage, pagination.currentPage, searchQuery])

  // 필터링된 데이터가 변경될 때마다 적용
  useEffect(() => {
    applyFiltersAndSort()
  }, [applyFiltersAndSort])

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
    setShowEditModal(true)
  }

  const closeModals = () => {
    setShowDetailModal(false)
    setShowEditModal(false)
    setShowCustomerModal(false)
    setShowDeleteConfirmModal(false)
    setSelectedRecord(null)
    setSelectedCustomer(null)
    setRecordToDelete(null)
    setEditFormData({})
  }

  // 삭제 확인 모달 표시
  const showDeleteConfirm = (record: any) => {
    setRecordToDelete(record)
    setShowDeleteConfirmModal(true)
  }

  // 실제 삭제 실행
  const handleDeleteRecord = async () => {
    if (!recordToDelete) return

    try {
      setIsDeleting(true)
      await deleteWorkRecord(recordToDelete.id);

      // 성공적으로 삭제된 경우에만 UI 업데이트
      setWorkRecords(prev => prev.filter(r => r.id !== recordToDelete.id));
      
      // 필터링된 데이터도 업데이트
      setFilteredRecords(prev => prev.filter(r => r.id !== recordToDelete.id));
      
      // 페이지네이션 정보 업데이트
      setPagination(prev => ({
        ...prev,
        totalItems: Math.max(0, prev.totalItems - 1),
        totalPages: Math.ceil(Math.max(0, prev.totalItems - 1) / prev.itemsPerPage)
      }));
      
      toast.success('작업 기록이 성공적으로 삭제되었습니다.');
      closeModals();
      
    } catch (error) {
      console.error('Failed to delete work record:', error);
      toast.error('작업 기록 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false)
    }
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setEditFormData((prev: any) => ({ ...prev, [name]: value }))
  }

  const handleSaveEdit = async () => {
    try {
      setIsSaving(true)
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
        toast.success('작업이 수정되었습니다.')
      } else {
        toast.error('작업 수정 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Failed to update work record:', error)
      toast.error('작업 수정 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
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
      return <WorkRecordSkeleton rows={pageSize} />
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
        
        {/* 전역 로딩 인디케이터들 */}
        <DataLoadingIndicator isLoading={isLoadingRecords} />
        <FileLoadingIndicator isLoading={isDownloading} />
        <SearchLoadingIndicator isLoading={isSearching} />
        <SaveLoadingIndicator isLoading={isSaving} />
        <DeleteLoadingIndicator isLoading={isDeleting} />
        
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1f2937',
              color: '#fff',
              border: '1px solid #374151',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <main className="pt-24 pb-12 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-8">
              {/* 다크 모드 토글 */}
              <DarkModeToggle />
              
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
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
                <div className="flex justify-between items-center">
                  <div className="animate-slideIn">
                    <h1 className="text-5xl font-bold text-slate-800 flex items-center">
                      <span className="text-6xl mr-4">📋</span>
                      작업 이력
                    </h1>
                    <p className="mt-3 text-xl text-slate-600">등록된 모든 작업 기록을 확인하고 관리할 수 있습니다.</p>
                  </div>
                </div>
              </div>

              {/* 오프라인 상태 배너 */}
              {isOffline && (
                <div className="mb-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p>오프라인 상태입니다. 일부 기능이 제한될 수 있습니다.</p>
                  </div>
                </div>
              )}

              {/* 성능 메트릭 */}
              <PerformanceMetrics />

              {/* 필터 섹션 */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
                <h2 className="text-2xl font-semibold text-slate-800 mb-6">🔍 필터 및 검색</h2>
                
                {/* 검색 입력 */}
                <div className="mb-4">
                  <div className="flex space-x-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="고객명, 차종, 작업내용으로 검색..."
                        value={searchQuery}
                        onChange={handleSearchInputChange}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleSearch(searchQuery)
                          }
                        }}
                        className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors"
                      />
                      {searchQuery && (
                        <button
                          onClick={clearSearch}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => handleSearch(searchQuery)}
                      disabled={isSearching}
                      className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSearching ? '검색 중...' : '🔍 검색'}
                    </button>
                  </div>
                  
                  {/* 실시간 검색 결과 */}
                  {searchQuery && searchResults.length > 0 && (
                    <div className="mt-2 p-3 bg-gray-700 rounded-lg">
                      <div className="text-sm text-gray-300 mb-2">
                        검색 결과: {searchResults.length}건 ({searchTook.toFixed(0)}ms)
                      </div>
                      <div className="space-y-1">
                        {searchResults.slice(0, 3).map((result, index) => (
                          <div key={index} className="text-sm text-white p-2 bg-gray-600 rounded">
                            {result.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 자동완성 제안 */}
                  {showSuggestions && searchSuggestions.length > 0 && (
                    <div className="mt-2 p-3 bg-gray-700 rounded-lg">
                      <div className="text-sm text-gray-300 mb-2">추천 검색어:</div>
                      <div className="space-y-1">
                        {searchSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="block w-full text-left text-sm text-white p-2 bg-gray-600 rounded hover:bg-gray-500 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 필터 옵션들 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <div className="mt-4">
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
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors"
                  >
                    필터 초기화
                  </button>
                </div>
              </div>

              {/* 테이블 컨트롤 */}
              <div className="bg-gray-800 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                    <h2 className="text-xl font-semibold text-white">📊 작업 이력 테이블</h2>
                    <span className="text-gray-400 text-sm">
                      총 {pagination.totalItems}개 중 {pagination.startIndex + 1}-{pagination.endIndex}개 표시
                      {pagination.totalPages > 1 && ` (${pagination.currentPage}/${pagination.totalPages} 페이지)`}
                    </span>
                  </div>

                  {/* 페이지 크기 선택 */}
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 text-sm">페이지당 항목:</span>
                    <select
                      value={pagination.itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                      className="p-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors"
                    >
                      <option value={2}>2개</option>
                      <option value={5}>5개</option>
                      <option value={10}>10개</option>
                      <option value={20}>20개</option>
                      <option value={50}>50개</option>
                      <option value={100}>100개</option>
                    </select>
                  </div>
                </div>

                {/* 작업 기록 테이블 */}
                <div className="mb-6">
                  {renderLoadingSkeleton() || (
                    <div className="overflow-x-auto shadow-2xl rounded-xl border-2 border-gray-600 bg-gray-900">
                      <table 
                        className="min-w-full bg-gray-900 table-modern"
                        role="grid" 
                        aria-label="작업 이력 테이블"
                      >
                        <thead>
                          <tr className="bg-gradient-to-r from-gray-800 to-gray-700 border-b-2 border-gray-600" role="row">
                            <th 
                              className="py-3 px-4 text-left text-white font-bold cursor-pointer hover:bg-blue-900 transition-colors"
                              onClick={() => handleSort('work_date')}
                              role="columnheader"
                              aria-sort={sortField === 'work_date' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                            >
                              <div className="flex items-center space-x-1">
                                <span>📅 작업일</span>
                                {sortField === 'work_date' && (
                                  <span aria-hidden="true" className="text-yellow-300">
                                    {sortDirection === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="py-3 px-4 text-left text-white font-bold cursor-pointer hover:bg-blue-900 transition-colors"
                              onClick={() => handleSort('customer_name')}
                              role="columnheader"
                              aria-sort={sortField === 'customer_name' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                            >
                              <div className="flex items-center space-x-1">
                                <span>👤 고객명</span>
                                {sortField === 'customer_name' && (
                                  <span aria-hidden="true" className="text-yellow-300">
                                    {sortDirection === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="py-3 px-4 text-left text-white font-bold cursor-pointer hover:bg-blue-900 transition-colors"
                              onClick={() => handleSort('equipment_model')}
                              role="columnheader"
                              aria-sort={sortField === 'equipment_model' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                            >
                              <div className="flex items-center space-x-1">
                                <span>🚜 장비 정보</span>
                                {sortField === 'equipment_model' && (
                                  <span aria-hidden="true" className="text-yellow-300">
                                    {sortDirection === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="py-3 px-4 text-left text-white font-bold hidden md:table-cell"
                              role="columnheader"
                            >
                              🔧 ECU 정보
                            </th>
                            <th 
                              className="py-3 px-4 text-left text-white font-bold hidden md:table-cell"
                              role="columnheader"
                            >
                              ⚙️ ACU 정보
                            </th>
                            <th 
                              className="py-3 px-4 text-left text-white font-bold cursor-pointer hover:bg-blue-900 transition-colors hidden sm:table-cell"
                              onClick={() => handleSort('price')}
                              role="columnheader"
                              aria-sort={sortField === 'price' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                            >
                              <div className="flex items-center space-x-1">
                                <span>💰 전체 금액</span>
                                {sortField === 'price' && (
                                  <span aria-hidden="true" className="text-yellow-300">
                                    {sortDirection === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="py-3 px-4 text-left text-white font-bold"
                              role="columnheader"
                            >
                              ⚡ 작업
                            </th>
                          </tr>
                        </thead>
                        <tbody role="rowgroup">
                          {isLoadingRecords ? (
                            // 스켈레톤 로딩 (5개 행)
                            Array(5).fill(0).map((_, index) => (
                              <tr key={`skeleton-${index}`} className="animate-pulse bg-gray-900" role="row">
                                <td className="py-3 px-4" role="cell">
                                  <div className="h-6 bg-gray-700 rounded w-24"></div>
                                </td>
                                <td className="py-3 px-4" role="cell">
                                  <div className="h-6 bg-gray-700 rounded w-32"></div>
                                </td>
                                <td className="py-3 px-4" role="cell">
                                  <div className="h-6 bg-gray-700 rounded w-28 mb-2"></div>
                                  <div className="h-4 bg-gray-700 rounded w-24"></div>
                                </td>
                                <td className="py-3 px-4 hidden md:table-cell" role="cell">
                                  <div className="h-4 bg-gray-700 rounded w-28 mb-2"></div>
                                  <div className="h-3 bg-gray-700 rounded w-20 mb-2"></div>
                                  <div className="h-3 bg-gray-700 rounded w-16 mb-2"></div>
                                  <div className="h-4 bg-gray-700 rounded w-12"></div>
                                </td>
                                <td className="py-3 px-4 hidden md:table-cell" role="cell">
                                  <div className="h-4 bg-gray-700 rounded w-28 mb-2"></div>
                                  <div className="h-3 bg-gray-700 rounded w-20 mb-2"></div>
                                  <div className="h-3 bg-gray-700 rounded w-16 mb-2"></div>
                                  <div className="h-4 bg-gray-700 rounded w-12"></div>
                                </td>
                                <td className="py-3 px-4 hidden sm:table-cell" role="cell">
                                  <div className="h-4 bg-gray-700 rounded w-20"></div>
                                </td>
                                <td className="py-3 px-4" role="cell">
                                  <div className="flex space-x-3">
                                    <div className="h-8 w-8 bg-gray-700 rounded"></div>
                                    <div className="h-8 w-8 bg-gray-700 rounded"></div>
                                    <div className="h-8 w-8 bg-gray-700 rounded"></div>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : filteredRecords.length === 0 ? (
                            <tr role="row">
                              <td colSpan={8} className="py-12 text-center" role="cell">
                                <div className="flex flex-col items-center space-y-2">
                                  <div className="text-6xl mb-4">📋</div>
                                  <p className="text-lg font-medium text-gray-300">
                                    {workRecords.length === 0 ? '작업 이력이 없습니다.' : '검색 결과가 없습니다.'}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {workRecords.length === 0 ? '새로운 작업을 등록해보세요.' : '다른 검색어를 시도해보세요.'}
                                  </p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            filteredRecords.map((record, index) => {
                              // 고객명 추출
                              const customerName = record.customerName || record.customer?.name || record.customer_name || 'N/A'
                              
                              // 장비 정보 추출
                              const equipmentModel = record.model || record.equipment?.model || record.equipment_model || 'N/A'
                              const equipmentType = record.equipmentType || record.equipment?.type || record.equipment_type || 'N/A'
                              const equipmentManufacturer = record.manufacturer || record.equipment?.manufacturer || record.equipment_manufacturer || 'N/A'
                              
                              // remapping_works에서 ECU/ACU 정보 추출
                              const firstWork = record.remapping_works?.[0]
                              const ecuInfo = firstWork?.ecu
                              const acuInfo = firstWork?.acu
                              
                              // ECU와 ACU 각각의 개별 상태 추출
                              const ecuStatus = (ecuInfo && ecuInfo.maker) ? ecuInfo.status : 'N/A'
                              const acuStatus = (acuInfo && acuInfo.manufacturer) ? acuInfo.status : 'N/A'
                              
                              // ECU와 ACU 금액 계산
                              const ecuPrice = ecuInfo?.price ? parseInt(ecuInfo.price) : 0
                              const acuPrice = (acuInfo && acuInfo.manufacturer && acuInfo.price) ? parseInt(acuInfo.price) : 0
                              
                              // 총 가격 계산 (ECU + ACU)
                              const totalPrice = ecuPrice + acuPrice
                              
                              return (
                                <tr 
                                  key={record.id} 
                                  className={`${index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'} hover:bg-custom-dark-blue transition-colors border-b border-gray-700`} 
                                  role="row"
                                >
                                  {/* 작업일 */}
                                  <td className="py-3 px-4" role="cell">
                                    <div>
                                      <p className="text-base font-semibold text-white">
                                        {new Date(record.work_date).toLocaleDateString('ko-KR')}
                                      </p>
                                    </div>
                                  </td>
                                  
                                  {/* 고객명 */}
                                  <td className="py-3 px-4" role="cell">
                                    <div>
                                      <p className="text-base font-semibold text-white">{customerName}</p>
                                    </div>
                                  </td>
                                  
                                  {/* 장비 정보 */}
                                  <td className="py-3 px-4" role="cell">
                                    <div>
                                      <p className="text-base font-semibold text-white">{equipmentManufacturer} {equipmentModel}</p>
                                      <p className="text-sm text-gray-300">{equipmentType}</p>
                                    </div>
                                  </td>
                                  
                                  {/* ECU 정보 */}
                                  <td className="py-3 px-4 hidden md:table-cell" role="cell">
                                    {ecuInfo && ecuInfo.maker ? (
                                      <div>
                                        <p className="text-base font-semibold text-blue-300">
                                          {ecuInfo.maker} {ecuInfo.type}
                                        </p>
                                        <p className="text-sm text-gray-300">
                                          {ecuInfo.selectedWorks?.join(', ') || 'N/A'}
                                        </p>
                                        {ecuInfo.workDetails && (
                                          <p className="text-xs text-blue-400 truncate" title={ecuInfo.workDetails}>
                                            📝 {ecuInfo.workDetails.length > 20 ? `${ecuInfo.workDetails.substring(0, 20)}...` : ecuInfo.workDetails}
                                          </p>
                                        )}
                                        <p className="text-sm font-bold text-blue-200">
                                          ₩{(ecuInfo.price || 0).toLocaleString()}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                          <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
                                            ecuStatus === '완료' ? 'bg-green-500 border-green-400' :
                                            ecuStatus === '진행중' ? 'bg-blue-500 border-blue-400' :
                                            ecuStatus === '실패' ? 'bg-red-500 border-red-400' :
                                            ecuStatus === 'AS' ? 'bg-gray-600 border-gray-500' :
                                            'bg-gray-400 border-gray-300'
                                          } border-2 shadow-sm`}>
                                            <span className="text-xs font-medium">
                                              {ecuStatus === '완료' ? '✅' :
                                               ecuStatus === '진행중' ? '⏳' :
                                               ecuStatus === '실패' ? '❌' :
                                               ecuStatus === 'AS' ? '🔧' :
                                               '➖'}
                                            </span>
                                          </div>
                                          <span className={`text-xs font-medium ${
                                            ecuStatus === 'AS' ? 'text-white' :
                                            ecuStatus === 'N/A' ? 'text-white' :
                                            'text-white'
                                          }`}>
                                            {ecuStatus}
                                          </span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div>
                                        <p className="text-base text-gray-400">N/A</p>
                                        <p className="text-sm text-gray-300">N/A</p>
                                        <p className="text-sm font-bold text-blue-200">₩0</p>
                                        <div className="flex items-center gap-2 mt-1">
                                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-400 border-gray-300 border-2 shadow-sm">
                                            <span className="text-xs font-medium">➖</span>
                                          </div>
                                          <span className="text-xs font-medium text-white">
                                            N/A
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                  
                                  {/* ACU 정보 */}
                                  <td className="py-3 px-4 hidden md:table-cell" role="cell">
                                    {acuInfo && acuInfo.manufacturer ? (
                                      <div>
                                        <p className="text-base font-semibold text-green-300">
                                          {acuInfo.manufacturer} {acuInfo.model}
                                        </p>
                                        <p className="text-sm text-gray-300">
                                          {acuInfo.selectedWorks?.join(', ') || 'N/A'}
                                        </p>
                                        {acuInfo.workDetails && (
                                          <p className="text-xs text-green-400 truncate" title={acuInfo.workDetails}>
                                            📝 {acuInfo.workDetails.length > 20 ? `${acuInfo.workDetails.substring(0, 20)}...` : acuInfo.workDetails}
                                          </p>
                                        )}
                                        <p className="text-sm font-bold text-green-200">
                                          ₩{(acuInfo.price || 0).toLocaleString()}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                          <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
                                            acuStatus === '완료' ? 'bg-green-500 border-green-400' :
                                            acuStatus === '진행중' ? 'bg-blue-500 border-blue-400' :
                                            acuStatus === '실패' ? 'bg-red-500 border-red-400' :
                                            acuStatus === 'AS' ? 'bg-gray-600 border-gray-500' :
                                            'bg-gray-400 border-gray-300'
                                          } border-2 shadow-sm`}>
                                            <span className="text-xs font-medium">
                                              {acuStatus === '완료' ? '✅' :
                                               acuStatus === '진행중' ? '⏳' :
                                               acuStatus === '실패' ? '❌' :
                                               acuStatus === 'AS' ? '🔧' :
                                               '➖'}
                                            </span>
                                          </div>
                                          <span className={`text-xs font-medium ${
                                            acuStatus === 'AS' ? 'text-white' :
                                            acuStatus === 'N/A' ? 'text-white' :
                                            'text-white'
                                          }`}>
                                            {acuStatus}
                                          </span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div>
                                        <p className="text-base text-gray-400">N/A</p>
                                        <p className="text-sm text-gray-300">N/A</p>
                                        <p className="text-sm font-bold text-green-200">₩0</p>
                                        <div className="flex items-center gap-2 mt-1">
                                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-400 border-gray-300 border-2 shadow-sm">
                                            <span className="text-xs font-medium">➖</span>
                                          </div>
                                          <span className="text-xs font-medium text-white">
                                            N/A
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                  
                                  {/* 전체 금액 */}
                                  <td className="py-3 px-4 hidden sm:table-cell" role="cell">
                                    <p className="text-base font-bold text-yellow-300">
                                      ₩{totalPrice.toLocaleString()}
                                    </p>
                                  </td>
                                  
                                  {/* 작업 */}
                                  <td className="py-3 px-4" role="cell">
                                    <div className="flex items-center space-x-3">
                                      <button
                                        onClick={() => handleViewDetail(record)}
                                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-900 px-3 py-2 rounded transition-all duration-200 cursor-pointer text-sm"
                                        title="상세보기"
                                      >
                                        상세보기
                                      </button>
                                      <button
                                        onClick={() => handleEdit(record)}
                                        className="text-green-400 hover:text-green-300 hover:bg-green-900 p-2 rounded-lg transition-colors"
                                        title="수정"
                                      >
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => showDeleteConfirm(record)}
                                        className="text-red-400 hover:text-red-300 hover:bg-blue-900 p-2 rounded-lg transition-colors"
                                        title="삭제"
                                      >
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 고급 페이지네이션 */}
                {pagination.totalPages > 1 && (
                  <div className="bg-gray-800 rounded-xl p-4 mb-6 border border-gray-700">
                    <div className="flex flex-col lg:flex-row items-center justify-between space-y-4 lg:space-y-0">
                      {/* 페이지 정보 */}
                      <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
                        <span className="text-gray-400 text-sm">
                          총 {pagination.totalItems}개 항목 중 {pagination.startIndex + 1}-{pagination.endIndex}개 표시
                        </span>
                        <span className="text-gray-400 text-sm">
                          페이지 {pagination.currentPage} / {pagination.totalPages}
                        </span>
                      </div>

                      {/* 페이지네이션 컨트롤 */}
                      <div className="flex items-center space-x-2">
                        {/* 첫 페이지 버튼 */}
                        <button
                          onClick={handleFirstPage}
                          disabled={pagination.currentPage === 1}
                          className="px-3 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors"
                          title="첫 페이지"
                          aria-label="첫 페이지로 이동"
                        >
                          &lt;&lt;
                        </button>

                        {/* 이전 페이지 버튼 */}
                        <button
                          onClick={handlePreviousPage}
                          disabled={pagination.currentPage === 1}
                          className="px-3 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors"
                          title="이전 페이지"
                          aria-label="이전 페이지로 이동"
                        >
                          &lt;
                        </button>

                        {/* 페이지 번호 버튼들 */}
                        {getPageRange().map(page => (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                              pagination.currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-white hover:bg-gray-600'
                            }`}
                            aria-label={`${page} 페이지로 이동`}
                            aria-current={pagination.currentPage === page ? 'page' : undefined}
                          >
                            {page}
                          </button>
                        ))}

                        {/* 다음 페이지 버튼 */}
                        <button
                          onClick={handleNextPage}
                          disabled={pagination.currentPage === pagination.totalPages}
                          className="px-3 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors"
                          title="다음 페이지"
                          aria-label="다음 페이지로 이동"
                        >
                          &gt;
                        </button>

                        {/* 마지막 페이지 버튼 */}
                        <button
                          onClick={handleLastPage}
                          disabled={pagination.currentPage === pagination.totalPages}
                          className="px-3 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors"
                          title="마지막 페이지"
                          aria-label="마지막 페이지로 이동"
                        >
                          &gt;&gt;
                        </button>
                      </div>

                      {/* 페이지당 항목 수 선택 */}
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400 text-sm">페이지당:</span>
                        <select
                          value={pagination.itemsPerPage}
                          onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                          className="px-2 py-1 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors text-sm"
                        >
                          <option value={2}>2개</option>
                          <option value={5}>5개</option>
                          <option value={10}>10개</option>
                          <option value={20}>20개</option>
                          <option value={50}>50개</option>
                          <option value={100}>100개</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 작업 상세보기 모달 */}
          <WorkDetailViewModal 
            isOpen={showDetailModal}
            onClose={() => setShowDetailModal(false)}
            workRecord={selectedRecord}
          />

          {/* 수정하기 모달 */}
          <WorkDetailModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            workRecord={selectedRecord}
            onSave={() => {
              setShowEditModal(false)
              loadAllData()
              toast.success('작업이 수정되었습니다.')
            }}
          />

          {/* 삭제 확인 모달 */}
          {showDeleteConfirmModal && recordToDelete && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      작업 기록 삭제
                    </h3>
                  </div>
                </div>
                
                <div className="mb-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    다음 작업 기록을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                  </p>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        고객: {recordToDelete.customer?.name || recordToDelete.customer_name || '알 수 없음'}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        작업일: {new Date(recordToDelete.work_date).toLocaleDateString()}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        ID: {recordToDelete.id}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirmModal(false)}
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleDeleteRecord}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                  >
                    {isDeleting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        삭제 중...
                      </>
                    ) : (
                      '삭제'
                    )}
                  </button>
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