// 고급 검색 엔진 시스템
export interface SearchFilter {
  field: string
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in'
  value: any
  value2?: any // between 연산자용
}

export interface SearchSort {
  field: string
  direction: 'asc' | 'desc'
  priority: number
}

export interface SearchHistory {
  id: string
  query: string
  filters: SearchFilter[]
  sort: SearchSort[]
  timestamp: number
  resultCount: number
}

export interface SavedFilter {
  id: string
  name: string
  description?: string
  filters: SearchFilter[]
  sort: SearchSort[]
  createdAt: number
  lastUsed: number
  useCount: number
}

export interface AdvancedSearchOptions {
  query?: string
  filters?: SearchFilter[]
  sort?: SearchSort[]
  page?: number
  pageSize?: number
  includeDeleted?: boolean
  highlight?: boolean
  fuzzy?: boolean
  autocomplete?: boolean
}

export interface SearchResult {
  id: number
  record: any
  score: number
  highlights: { field: string; snippet: string }[]
  matchedFilters: string[]
}

export class AdvancedSearchEngine {
  private searchHistory: SearchHistory[] = []
  private savedFilters: SavedFilter[] = []
  private searchIndex: Map<string, any[]> = new Map()
  private fieldWeights: Map<string, number> = new Map()
  private isInitialized = false

  constructor() {
    this.initializeFieldWeights()
  }

  // 필드 가중치 초기화
  private initializeFieldWeights() {
    this.fieldWeights.set('customer_name', 3)
    this.fieldWeights.set('vehicle_info', 2.5)
    this.fieldWeights.set('work_type', 2)
    this.fieldWeights.set('ecu_maker', 2)
    this.fieldWeights.set('ecu_model', 2)
    this.fieldWeights.set('acu_manufacturer', 2)
    this.fieldWeights.set('acu_model', 2)
    this.fieldWeights.set('manufacturer', 1.5)
    this.fieldWeights.set('model', 1.5)
    this.fieldWeights.set('work_details', 1)
    this.fieldWeights.set('created_at', 0.5)
  }

  // 검색 엔진 초기화
  async initialize(records: any[] = []) {
    if (this.isInitialized) return

    console.log('🔍 고급 검색 엔진 초기화 중...')
    
    // 검색 인덱스 구축
    await this.buildSearchIndex(records)
    
    // 저장된 필터 로드
    this.loadSavedFilters()
    
    // 검색 히스토리 로드
    this.loadSearchHistory()
    
    this.isInitialized = true
    console.log('✅ 고급 검색 엔진 초기화 완료')
  }

  // 검색 인덱스 구축
  private async buildSearchIndex(records: any[]) {
    console.log(`📚 ${records.length}개 레코드 인덱싱 중...`)
    
    records.forEach(record => {
      // 각 검색 가능 필드에 대해 인덱스 생성
      Object.entries(record).forEach(([field, value]) => {
        if (value && typeof value === 'string') {
          const tokens = this.tokenize(value.toString())
          
          tokens.forEach(token => {
            if (!this.searchIndex.has(token)) {
              this.searchIndex.set(token, [])
            }
            
            this.searchIndex.get(token)!.push({
              record,
              field,
              weight: this.fieldWeights.get(field) || 1
            })
          })
        }
      })
    })
    
    console.log(`✅ 인덱스 구축 완료: ${this.searchIndex.size}개 토큰`)
  }

  // 텍스트 토큰화
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/[\s,.-]+/)
      .filter(token => token.length >= 2)
      .map(token => token.trim())
  }

  // 고급 검색 실행
  async search(options: AdvancedSearchOptions): Promise<{
    results: SearchResult[]
    totalCount: number
    suggestions: string[]
    filters: SearchFilter[]
    sort: SearchSort[]
  }> {
    const startTime = performance.now()
    
    try {
      // 1. 기본 검색 실행
      let results = await this.executeSearch(options)
      
      // 2. 필터 적용
      if (options.filters && options.filters.length > 0) {
        results = this.applyFilters(results, options.filters)
      }
      
      // 3. 정렬 적용
      if (options.sort && options.sort.length > 0) {
        results = this.applySorting(results, options.sort)
      } else {
        // 기본 정렬 (점수 기반)
        results.sort((a, b) => b.score - a.score)
      }
      
      // 4. 페이지네이션
      const page = options.page || 1
      const pageSize = options.pageSize || 20
      const start = (page - 1) * pageSize
      const end = start + pageSize
      
      const paginatedResults = results.slice(start, end)
      
      // 5. 하이라이팅 적용
      if (options.highlight) {
        paginatedResults.forEach(result => {
          result.highlights = this.generateHighlights(result.record, options.query || '')
        })
      }
      
      // 6. 검색 히스토리 저장
      this.addToSearchHistory({
        id: this.generateId(),
        query: options.query || '',
        filters: options.filters || [],
        sort: options.sort || [],
        timestamp: Date.now(),
        resultCount: results.length
      })
      
      // 7. 자동완성 제안 생성
      const suggestions = options.autocomplete ? 
        await this.generateAutocompleteSuggestions(options.query || '') : []
      
      const searchTime = performance.now() - startTime
      console.log(`🔍 검색 완료: ${results.length}개 결과, ${searchTime.toFixed(2)}ms`)
      
      return {
        results: paginatedResults,
        totalCount: results.length,
        suggestions,
        filters: options.filters || [],
        sort: options.sort || []
      }
      
    } catch (error) {
      console.error('검색 실행 실패:', error)
      throw error
    }
  }

  // 기본 검색 실행
  private async executeSearch(options: AdvancedSearchOptions): Promise<SearchResult[]> {
    const results = new Map<number, SearchResult>()
    
    if (!options.query) {
      // 쿼리가 없으면 모든 레코드 반환 (점수 1.0)
      const allRecords = Array.from(this.searchIndex.values())
        .flat()
        .map(item => item.record)
        .filter((record, index, arr) => arr.findIndex(r => r.id === record.id) === index)
      
      return allRecords.map(record => ({
        id: record.id,
        record,
        score: 1.0,
        highlights: [],
        matchedFilters: []
      }))
    }
    
    const queryTokens = this.tokenize(options.query)
    
    queryTokens.forEach(token => {
      const matches = this.searchIndex.get(token) || []
      
      matches.forEach(match => {
        const existing = results.get(match.record.id)
        const score = match.weight * (options.fuzzy ? 0.8 : 1.0)
        
        if (existing) {
          existing.score += score
          existing.matchedFilters.push(match.field)
        } else {
          results.set(match.record.id, {
            id: match.record.id,
            record: match.record,
            score,
            highlights: [],
            matchedFilters: [match.field]
          })
        }
      })
    })
    
    return Array.from(results.values())
  }

  // 필터 적용
  private applyFilters(results: SearchResult[], filters: SearchFilter[]): SearchResult[] {
    return results.filter(result => {
      return filters.every(filter => {
        const value = this.getNestedValue(result.record, filter.field)
        
        switch (filter.operator) {
          case 'equals':
            return value === filter.value
          case 'contains':
            return String(value).toLowerCase().includes(String(filter.value).toLowerCase())
          case 'starts_with':
            return String(value).toLowerCase().startsWith(String(filter.value).toLowerCase())
          case 'ends_with':
            return String(value).toLowerCase().endsWith(String(filter.value).toLowerCase())
          case 'greater_than':
            return Number(value) > Number(filter.value)
          case 'less_than':
            return Number(value) < Number(filter.value)
          case 'between':
            return Number(value) >= Number(filter.value) && Number(value) <= Number(filter.value2)
          case 'in':
            return Array.isArray(filter.value) ? filter.value.includes(value) : false
          case 'not_in':
            return Array.isArray(filter.value) ? !filter.value.includes(value) : false
          default:
            return true
        }
      })
    })
  }

  // 정렬 적용
  private applySorting(results: SearchResult[], sort: SearchSort[]): SearchResult[] {
    return results.sort((a, b) => {
      for (const sortItem of sort) {
        const aValue = this.getNestedValue(a.record, sortItem.field)
        const bValue = this.getNestedValue(b.record, sortItem.field)
        
        if (aValue === bValue) continue
        
        const comparison = aValue < bValue ? -1 : 1
        return sortItem.direction === 'asc' ? comparison : -comparison
      }
      return 0
    })
  }

  // 중첩 객체 값 가져오기
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  // 하이라이팅 생성
  private generateHighlights(record: any, query: string): { field: string; snippet: string }[] {
    const highlights: { field: string; snippet: string }[] = []
    const queryTokens = this.tokenize(query)
    
    Object.entries(record).forEach(([field, value]) => {
      if (typeof value === 'string') {
        const fieldValue = value.toLowerCase()
        const matchedTokens = queryTokens.filter(token => fieldValue.includes(token))
        
        if (matchedTokens.length > 0) {
          let snippet = value
          matchedTokens.forEach(token => {
            const regex = new RegExp(`(${token})`, 'gi')
            snippet = snippet.replace(regex, '<mark>$1</mark>')
          })
          
          highlights.push({ field, snippet })
        }
      }
    })
    
    return highlights
  }

  // 자동완성 제안 생성
  async generateAutocompleteSuggestions(query: string, limit: number = 5): Promise<string[]> {
    const suggestions: string[] = []
    const queryTokens = this.tokenize(query)
    
    // 각 필드별로 제안 생성
    const fields = ['customer_name', 'vehicle_info', 'work_type', 'ecu_maker', 'ecu_model']
    
    fields.forEach(field => {
      const fieldSuggestions = this.getFieldSuggestions(field, queryTokens, limit)
      suggestions.push(...fieldSuggestions)
    })
    
    return [...new Set(suggestions)].slice(0, limit)
  }

  // 필드별 제안 가져오기
  private getFieldSuggestions(field: string, queryTokens: string[], limit: number): string[] {
    const suggestions: string[] = []
    
    queryTokens.forEach(token => {
      const matches = this.searchIndex.get(token) || []
      const fieldMatches = matches
        .filter(match => match.field === field)
        .map(match => match.record[field])
        .filter(Boolean)
        .slice(0, limit)
      
      suggestions.push(...fieldMatches)
    })
    
    return suggestions
  }

  // 검색 히스토리 관리
  addToSearchHistory(history: SearchHistory) {
    this.searchHistory.unshift(history)
    
    // 최근 50개만 유지
    if (this.searchHistory.length > 50) {
      this.searchHistory = this.searchHistory.slice(0, 50)
    }
    
    this.saveSearchHistory()
  }

  getSearchHistory(): SearchHistory[] {
    return [...this.searchHistory]
  }

  clearSearchHistory() {
    this.searchHistory = []
    this.saveSearchHistory()
  }

  // 저장된 필터 관리
  saveFilter(filter: Omit<SavedFilter, 'id' | 'createdAt' | 'lastUsed' | 'useCount'>): string {
    const id = this.generateId()
    const savedFilter: SavedFilter = {
      ...filter,
      id,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      useCount: 0
    }
    
    this.savedFilters.push(savedFilter)
    this.saveSavedFilters()
    
    return id
  }

  getSavedFilters(): SavedFilter[] {
    return [...this.savedFilters]
  }

  updateSavedFilter(id: string, updates: Partial<SavedFilter>) {
    const index = this.savedFilters.findIndex(f => f.id === id)
    if (index !== -1) {
      this.savedFilters[index] = { ...this.savedFilters[index], ...updates }
      this.saveSavedFilters()
    }
  }

  deleteSavedFilter(id: string) {
    this.savedFilters = this.savedFilters.filter(f => f.id !== id)
    this.saveSavedFilters()
  }

  useSavedFilter(id: string) {
    const filter = this.savedFilters.find(f => f.id === id)
    if (filter) {
      filter.lastUsed = Date.now()
      filter.useCount++
      this.saveSavedFilters()
      return filter
    }
    return null
  }

  // 필터 템플릿 생성
  createFilterTemplates(): SavedFilter[] {
    return [
      {
        id: this.generateId(),
        name: '최근 작업',
        description: '최근 30일 내 작업',
        filters: [
          {
            field: 'created_at',
            operator: 'greater_than',
            value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
          }
        ],
        sort: [{ field: 'created_at', direction: 'desc', priority: 1 }],
        createdAt: Date.now(),
        lastUsed: Date.now(),
        useCount: 0
      },
      {
        id: this.generateId(),
        name: 'ECU 튜닝 작업',
        description: 'ECU 튜닝 관련 작업만',
        filters: [
          {
            field: 'work_type',
            operator: 'equals',
            value: 'ECU 튜닝'
          }
        ],
        sort: [{ field: 'created_at', direction: 'desc', priority: 1 }],
        createdAt: Date.now(),
        lastUsed: Date.now(),
        useCount: 0
      },
      {
        id: this.generateId(),
        name: 'ACU 튜닝 작업',
        description: 'ACU 튜닝 관련 작업만',
        filters: [
          {
            field: 'work_type',
            operator: 'equals',
            value: 'ACU 튜닝'
          }
        ],
        sort: [{ field: 'created_at', direction: 'desc', priority: 1 }],
        createdAt: Date.now(),
        lastUsed: Date.now(),
        useCount: 0
      }
    ]
  }

  // 고급 필터 빌더
  buildAdvancedFilter(field: string, operator: string, value: any, value2?: any): SearchFilter {
    return {
      field,
      operator: operator as any,
      value,
      value2
    }
  }

  // 복합 필터 생성
  createCompoundFilter(filters: SearchFilter[], logic: 'AND' | 'OR' = 'AND'): SearchFilter[] {
    // 현재는 단순히 필터 배열을 반환하지만, 향후 복합 로직 지원 가능
    return filters
  }

  // 검색 통계
  getSearchStats() {
    return {
      totalIndexedTokens: this.searchIndex.size,
      totalSearchHistory: this.searchHistory.length,
      totalSavedFilters: this.savedFilters.length,
      averageSearchTime: this.calculateAverageSearchTime(),
      popularFilters: this.getPopularFilters(),
      searchTrends: this.getSearchTrends()
    }
  }

  // 평균 검색 시간 계산
  private calculateAverageSearchTime(): number {
    // 실제 구현에서는 검색 시간을 기록해야 함
    return 150 // 예시 값 (ms)
  }

  // 인기 필터 가져오기
  private getPopularFilters(): any[] {
    const filterUsage = new Map<string, number>()
    
    this.searchHistory.forEach(history => {
      history.filters.forEach(filter => {
        const key = `${filter.field}_${filter.operator}`
        filterUsage.set(key, (filterUsage.get(key) || 0) + 1)
      })
    })
    
    return Array.from(filterUsage.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  // 검색 트렌드 가져오기
  private getSearchTrends(): any[] {
    const trends = new Map<string, number>()
    
    this.searchHistory.forEach(history => {
      const date = new Date(history.timestamp).toDateString()
      trends.set(date, (trends.get(date) || 0) + 1)
    })
    
    return Array.from(trends.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  // 유틸리티 함수들
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  private saveSearchHistory() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory))
    }
  }

  private loadSearchHistory() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('searchHistory')
      if (saved) {
        this.searchHistory = JSON.parse(saved)
      }
    }
  }

  private saveSavedFilters() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('savedFilters', JSON.stringify(this.savedFilters))
    }
  }

  private loadSavedFilters() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('savedFilters')
      if (saved) {
        this.savedFilters = JSON.parse(saved)
      } else {
        // 기본 필터 템플릿 생성
        this.savedFilters = this.createFilterTemplates()
        this.saveSavedFilters()
      }
    }
  }
}

// 싱글톤 인스턴스
export const advancedSearchEngine = new AdvancedSearchEngine() 