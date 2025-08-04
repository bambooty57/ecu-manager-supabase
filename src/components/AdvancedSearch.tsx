'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  advancedSearchEngine, 
  SearchFilter, 
  SearchSort, 
  SearchHistory, 
  SavedFilter,
  AdvancedSearchOptions 
} from '../lib/advanced-search-engine'

interface AdvancedSearchProps {
  onSearch: (results: any[]) => void
  onLoadingChange: (loading: boolean) => void
  initialQuery?: string
}

export default function AdvancedSearch({ onSearch, onLoadingChange, initialQuery = '' }: AdvancedSearchProps) {
  const [query, setQuery] = useState(initialQuery)
  const [filters, setFilters] = useState<SearchFilter[]>([])
  const [sort, setSort] = useState<SearchSort[]>([])
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showSavedFilters, setShowSavedFilters] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // 검색 엔진 초기화
  useEffect(() => {
    const initializeSearch = async () => {
      try {
        // 실제 데이터로 초기화 (여기서는 예시 데이터 사용)
        const sampleRecords = [
          { id: 1, customer_name: '김철수', vehicle_info: '현대 아반떼', work_type: 'ECU 튜닝' },
          { id: 2, customer_name: '이영희', vehicle_info: '기아 K5', work_type: 'ACU 튜닝' },
          { id: 3, customer_name: '박민수', vehicle_info: '현대 그랜저', work_type: 'ECU 튜닝' }
        ]
        
        await advancedSearchEngine.initialize(sampleRecords)
        
        // 검색 히스토리와 저장된 필터 로드
        setSearchHistory(advancedSearchEngine.getSearchHistory())
        setSavedFilters(advancedSearchEngine.getSavedFilters())
      } catch (error) {
        console.error('검색 엔진 초기화 실패:', error)
      }
    }

    initializeSearch()
  }, [])

  // 검색 실행
  const executeSearch = useCallback(async () => {
    if (!query.trim() && filters.length === 0) return

    setIsLoading(true)
    onLoadingChange(true)

    try {
      const searchOptions: AdvancedSearchOptions = {
        query: query.trim(),
        filters,
        sort,
        highlight: true,
        autocomplete: true,
        page: 1,
        pageSize: 20
      }

      const result = await advancedSearchEngine.search(searchOptions)
      onSearch(result.results)
      
      // 검색 히스토리와 저장된 필터 업데이트
      setSearchHistory(advancedSearchEngine.getSearchHistory())
      setSavedFilters(advancedSearchEngine.getSavedFilters())
      
    } catch (error) {
      console.error('검색 실행 실패:', error)
    } finally {
      setIsLoading(false)
      onLoadingChange(false)
    }
  }, [query, filters, sort, onSearch, onLoadingChange])

  // 자동완성 제안 생성
  const generateSuggestions = useCallback(async (input: string) => {
    if (input.length < 2) {
      setSuggestions([])
      return
    }

    try {
      const suggestions = await advancedSearchEngine.generateAutocompleteSuggestions(input, 5)
      setSuggestions(suggestions)
    } catch (error) {
      console.error('자동완성 제안 생성 실패:', error)
    }
  }, [])

  // 검색어 변경 처리
  const handleQueryChange = (value: string) => {
    setQuery(value)
    generateSuggestions(value)
  }

  // 필터 추가
  const addFilter = () => {
    const newFilter: SearchFilter = {
      field: 'customer_name',
      operator: 'contains',
      value: ''
    }
    setFilters([...filters, newFilter])
  }

  // 필터 업데이트
  const updateFilter = (index: number, field: string, value: any) => {
    const updatedFilters = [...filters]
    updatedFilters[index] = { ...updatedFilters[index], [field]: value }
    setFilters(updatedFilters)
  }

  // 필터 삭제
  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index))
  }

  // 정렬 추가
  const addSort = () => {
    const newSort: SearchSort = {
      field: 'created_at',
      direction: 'desc',
      priority: sort.length + 1
    }
    setSort([...sort, newSort])
  }

  // 정렬 업데이트
  const updateSort = (index: number, field: string, value: any) => {
    const updatedSort = [...sort]
    updatedSort[index] = { ...updatedSort[index], [field]: value }
    setSort(updatedSort)
  }

  // 정렬 삭제
  const removeSort = (index: number) => {
    setSort(sort.filter((_, i) => i !== index))
  }

  // 저장된 필터 사용
  const useSavedFilter = (filter: SavedFilter) => {
    setFilters(filter.filters)
    setSort(filter.sort)
    setShowSavedFilters(false)
  }

  // 검색 히스토리 사용
  const useSearchHistory = (history: SearchHistory) => {
    setQuery(history.query)
    setFilters(history.filters)
    setSort(history.sort)
    setShowHistory(false)
  }

  // 현재 검색 조건을 필터로 저장
  const saveCurrentAsFilter = () => {
    const name = prompt('저장할 필터의 이름을 입력하세요:')
    if (!name) return

    const description = prompt('필터에 대한 설명을 입력하세요 (선택사항):')

    try {
      advancedSearchEngine.saveFilter({
        name,
        description: description ?? undefined,
        filters,
        sort
      })
      
      setSavedFilters(advancedSearchEngine.getSavedFilters())
      alert('필터가 저장되었습니다!')
    } catch (error) {
      console.error('필터 저장 실패:', error)
      alert('필터 저장에 실패했습니다.')
    }
  }

  // 검색 히스토리 삭제
  const clearSearchHistory = () => {
    if (confirm('검색 히스토리를 모두 삭제하시겠습니까?')) {
      advancedSearchEngine.clearSearchHistory()
      setSearchHistory([])
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      {/* 검색 입력 */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="고객명, 차종, 작업유형 등을 검색하세요..."
            className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
            onKeyPress={(e) => e.key === 'Enter' && executeSearch()}
          />
          <button
            onClick={executeSearch}
            disabled={isLoading}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? '검색 중...' : '🔍'}
          </button>
        </div>

        {/* 자동완성 제안 */}
        {suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-gray-700 rounded-lg border border-gray-600 max-h-48 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => {
                  setQuery(suggestion)
                  setSuggestions([])
                }}
                className="w-full px-4 py-2 text-left text-white hover:bg-gray-600 focus:bg-gray-600 focus:outline-none"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 고급 옵션 버튼들 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
        >
          🔧 필터 {filters.length > 0 && `(${filters.length})`}
        </button>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
        >
          📜 히스토리 ({searchHistory.length})
        </button>
        <button
          onClick={() => setShowSavedFilters(!showSavedFilters)}
          className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
        >
          💾 저장된 필터 ({savedFilters.length})
        </button>
        <button
          onClick={saveCurrentAsFilter}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          💾 현재 조건 저장
        </button>
      </div>

      {/* 필터 패널 */}
      {showFilters && (
        <div className="mb-4 p-4 bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">🔧 검색 필터</h3>
            <button
              onClick={addFilter}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + 필터 추가
            </button>
          </div>

          <div className="space-y-3">
            {filters.map((filter, index) => (
              <div key={index} className="flex items-center space-x-2 p-3 bg-gray-600 rounded">
                <select
                  value={filter.field}
                  onChange={(e) => updateFilter(index, 'field', e.target.value)}
                  className="px-2 py-1 bg-gray-700 text-white rounded border border-gray-600"
                >
                  <option value="customer_name">고객명</option>
                  <option value="vehicle_info">차종</option>
                  <option value="work_type">작업유형</option>
                  <option value="ecu_maker">ECU 제조사</option>
                  <option value="ecu_model">ECU 모델</option>
                  <option value="acu_manufacturer">ACU 제조사</option>
                  <option value="acu_model">ACU 모델</option>
                  <option value="created_at">생성일</option>
                </select>

                <select
                  value={filter.operator}
                  onChange={(e) => updateFilter(index, 'operator', e.target.value)}
                  className="px-2 py-1 bg-gray-700 text-white rounded border border-gray-600"
                >
                  <option value="equals">정확히 일치</option>
                  <option value="contains">포함</option>
                  <option value="starts_with">시작</option>
                  <option value="ends_with">끝</option>
                  <option value="greater_than">보다 큼</option>
                  <option value="less_than">보다 작음</option>
                </select>

                <input
                  type="text"
                  value={filter.value}
                  onChange={(e) => updateFilter(index, 'value', e.target.value)}
                  placeholder="값 입력..."
                  className="flex-1 px-2 py-1 bg-gray-700 text-white rounded border border-gray-600"
                />

                <button
                  onClick={() => removeFilter(index)}
                  className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 정렬 패널 */}
      <div className="mb-4 p-4 bg-gray-700 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">📊 정렬 옵션</h3>
          <button
            onClick={addSort}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + 정렬 추가
          </button>
        </div>

        <div className="space-y-3">
          {sort.map((sortItem, index) => (
            <div key={index} className="flex items-center space-x-2 p-3 bg-gray-600 rounded">
              <select
                value={sortItem.field}
                onChange={(e) => updateSort(index, 'field', e.target.value)}
                className="px-2 py-1 bg-gray-700 text-white rounded border border-gray-600"
              >
                <option value="created_at">생성일</option>
                <option value="customer_name">고객명</option>
                <option value="vehicle_info">차종</option>
                <option value="work_type">작업유형</option>
              </select>

              <select
                value={sortItem.direction}
                onChange={(e) => updateSort(index, 'direction', e.target.value)}
                className="px-2 py-1 bg-gray-700 text-white rounded border border-gray-600"
              >
                <option value="asc">오름차순</option>
                <option value="desc">내림차순</option>
              </select>

              <input
                type="number"
                value={sortItem.priority}
                onChange={(e) => updateSort(index, 'priority', parseInt(e.target.value))}
                placeholder="우선순위"
                className="w-20 px-2 py-1 bg-gray-700 text-white rounded border border-gray-600"
              />

              <button
                onClick={() => removeSort(index)}
                className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 검색 히스토리 패널 */}
      {showHistory && (
        <div className="mb-4 p-4 bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">📜 검색 히스토리</h3>
            <button
              onClick={clearSearchHistory}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              전체 삭제
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {searchHistory.length === 0 ? (
              <p className="text-gray-400 text-center py-4">검색 히스토리가 없습니다.</p>
            ) : (
              searchHistory.map((history, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-600 rounded hover:bg-gray-500 cursor-pointer"
                  onClick={() => useSearchHistory(history)}
                >
                  <div className="flex-1">
                    <div className="text-white font-medium">{history.query || '전체 검색'}</div>
                    <div className="text-sm text-gray-400">
                      {new Date(history.timestamp).toLocaleString()} • {history.resultCount}개 결과
                    </div>
                  </div>
                  <button className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                    사용
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 저장된 필터 패널 */}
      {showSavedFilters && (
        <div className="mb-4 p-4 bg-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">💾 저장된 필터</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {savedFilters.length === 0 ? (
              <p className="text-gray-400 text-center py-4">저장된 필터가 없습니다.</p>
            ) : (
              savedFilters.map((filter) => (
                <div
                  key={filter.id}
                  className="flex items-center justify-between p-3 bg-gray-600 rounded hover:bg-gray-500 cursor-pointer"
                  onClick={() => useSavedFilter(filter)}
                >
                  <div className="flex-1">
                    <div className="text-white font-medium">{filter.name}</div>
                    <div className="text-sm text-gray-400">
                      {filter.description} • 사용 {filter.useCount}회
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(filter.lastUsed).toLocaleString()}
                    </div>
                  </div>
                  <button className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                    사용
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
} 