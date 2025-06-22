// 전문 검색 엔진 및 인덱싱 시스템
import { supabase } from './supabase'
import { cacheManager, CacheKeys, CacheTTL } from './cache-manager'

// 검색 가능한 필드 정의
export interface SearchableFields {
  // 기본 정보
  customerName?: string
  vehicleModel?: string
  licenseNumber?: string
  engineCode?: string
  
  // 작업 정보
  workType?: string
  description?: string
  notes?: string
  tuningStage?: string
  
  // ECU 정보
  ecuMaker?: string
  ecuModel?: string
  swVersion?: string
  hwVersion?: string
  
  // 날짜 정보
  workDate?: string
  createdAt?: string
}

// 검색 결과 타입
export interface SearchResult {
  id: number
  score: number
  matchedFields: string[]
  highlightedContent: Record<string, string>
  originalData: any
}

// 검색 인덱스 항목
interface IndexedDocument {
  id: number
  content: string
  fields: SearchableFields
  keywords: string[]
  ngrams: string[]
  createdAt: Date
  updatedAt: Date
}

// 검색 엔진 클래스
export class SearchEngine {
  private index: Map<number, IndexedDocument> = new Map()
  private invertedIndex: Map<string, Set<number>> = new Map()
  private ngramIndex: Map<string, Set<number>> = new Map()
  private initialized = false

  // 초기화
  async initialize(): Promise<void> {
    if (this.initialized) return

    console.log('🔍 검색 엔진 초기화 시작...')
    
    try {
      // 캐시에서 인덱스 복원
      const cachedIndex = await cacheManager.get<any>('search_index')
      if (cachedIndex) {
        this.restoreFromCache(cachedIndex)
        console.log('📦 캐시에서 검색 인덱스 복원 완료')
      } else {
        // 전체 데이터 인덱싱
        await this.rebuildIndex()
      }

      this.initialized = true
      console.log('✅ 검색 엔진 초기화 완료')
    } catch (error) {
      console.error('❌ 검색 엔진 초기화 실패:', error)
    }
  }

  // 전체 인덱스 재구축
  async rebuildIndex(): Promise<void> {
    console.log('🔨 검색 인덱스 재구축 시작...')
    
    try {
      // 기존 인덱스 초기화
      this.index.clear()
      this.invertedIndex.clear()
      this.ngramIndex.clear()

      // 모든 작업 기록 조회
      const { data: workRecords, error } = await supabase
        .from('work_records')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // 각 레코드 인덱싱
      for (const record of workRecords || []) {
        await this.indexDocument(record)
      }

      // 인덱스를 캐시에 저장
      await this.saveToCache()
      
      console.log(`✅ 검색 인덱스 재구축 완료: ${this.index.size}개 문서`)
    } catch (error) {
      console.error('❌ 인덱스 재구축 실패:', error)
    }
  }

  // 문서 인덱싱
  async indexDocument(data: any): Promise<void> {
    try {
      const fields = this.extractSearchableFields(data)
      const content = this.buildSearchableContent(fields)
      const keywords = this.extractKeywords(content)
      const ngrams = this.generateNgrams(content)

      const document: IndexedDocument = {
        id: data.id,
        content,
        fields,
        keywords,
        ngrams,
        createdAt: new Date(data.created_at),
        updatedAt: new Date()
      }

      // 메인 인덱스에 저장
      this.index.set(data.id, document)

      // 역 인덱스 구축 (키워드 → 문서 ID)
      keywords.forEach(keyword => {
        if (!this.invertedIndex.has(keyword)) {
          this.invertedIndex.set(keyword, new Set())
        }
        this.invertedIndex.get(keyword)!.add(data.id)
      })

      // N-gram 인덱스 구축
      ngrams.forEach(ngram => {
        if (!this.ngramIndex.has(ngram)) {
          this.ngramIndex.set(ngram, new Set())
        }
        this.ngramIndex.get(ngram)!.add(data.id)
      })

    } catch (error) {
      console.error(`문서 인덱싱 실패 (ID: ${data.id}):`, error)
    }
  }

  // 검색 실행
  async search(
    query: string,
    options: {
      limit?: number
      offset?: number
      fields?: (keyof SearchableFields)[]
      fuzzy?: boolean
      exact?: boolean
      dateRange?: { from: Date, to: Date }
    } = {}
  ): Promise<{ results: SearchResult[], total: number, took: number }> {
    const startTime = Date.now()
    
    if (!this.initialized) {
      await this.initialize()
    }

    const {
      limit = 20,
      offset = 0,
      fields,
      fuzzy = true,
      exact = false,
      dateRange
    } = options

    try {
      // 캐시 확인
      const cacheKey = CacheKeys.SEARCH_RESULTS(JSON.stringify({ query, options }))
      const cached = await cacheManager.get<any>(cacheKey)
      if (cached) {
        return {
          ...cached,
          took: Date.now() - startTime
        }
      }

      let candidateIds: Set<number> = new Set()

      if (exact) {
        // 정확한 매칭 검색
        candidateIds = this.exactSearch(query)
      } else if (fuzzy) {
        // 퍼지 검색 (오타 허용)
        candidateIds = this.fuzzySearch(query)
      } else {
        // 일반 키워드 검색
        candidateIds = this.keywordSearch(query)
      }

      // 필드 필터링
      if (fields && fields.length > 0) {
        candidateIds = this.filterByFields(candidateIds, fields)
      }

      // 날짜 범위 필터링
      if (dateRange) {
        candidateIds = this.filterByDateRange(candidateIds, dateRange)
      }

      // 스코어링 및 정렬
      const scoredResults = this.scoreAndRank(Array.from(candidateIds), query)

      // 페이지네이션
      const paginatedResults = scoredResults.slice(offset, offset + limit)

      // 하이라이팅
      const resultsWithHighlights = paginatedResults.map(result => ({
        ...result,
        highlightedContent: this.highlightMatches(result.originalData, query)
      }))

      const searchResult = {
        results: resultsWithHighlights,
        total: scoredResults.length,
        took: Date.now() - startTime
      }

      // 결과 캐싱
      await cacheManager.set(cacheKey, searchResult, CacheTTL.SHORT)

      return searchResult

    } catch (error) {
      console.error('검색 실행 오류:', error)
      return {
        results: [],
        total: 0,
        took: Date.now() - startTime
      }
    }
  }

  // 자동완성 제안
  async suggest(
    query: string,
    limit: number = 10
  ): Promise<string[]> {
    if (!this.initialized) {
      await this.initialize()
    }

    const suggestions = new Set<string>()
    const normalizedQuery = this.normalizeText(query).toLowerCase()

    // 키워드에서 제안 찾기
    for (const keyword of this.invertedIndex.keys()) {
      if (keyword.toLowerCase().startsWith(normalizedQuery)) {
        suggestions.add(keyword)
        if (suggestions.size >= limit) break
      }
    }

    // N-gram에서 추가 제안 찾기
    if (suggestions.size < limit) {
      for (const ngram of this.ngramIndex.keys()) {
        if (ngram.includes(normalizedQuery)) {
          // 원본 키워드 복원 로직 (간단화)
          suggestions.add(ngram)
          if (suggestions.size >= limit) break
        }
      }
    }

    return Array.from(suggestions).slice(0, limit)
  }

  // 검색 가능한 필드 추출
  private extractSearchableFields(data: any): SearchableFields {
    const remappingWork = data.remapping_works?.[0] || {}
    
    return {
      customerName: data.customer_name,
      vehicleModel: data.vehicle_model,
      licenseNumber: data.license_number,
      engineCode: data.engine_code,
      workType: data.work_type,
      description: data.description,
      notes: data.notes,
      tuningStage: remappingWork.tuning_stage,
      ecuMaker: remappingWork.ecu_maker,
      ecuModel: remappingWork.ecu_model,
      swVersion: remappingWork.sw_version,
      hwVersion: remappingWork.hw_version,
      workDate: data.work_date,
      createdAt: data.created_at
    }
  }

  // 검색 가능한 컨텐츠 생성
  private buildSearchableContent(fields: SearchableFields): string {
    return Object.values(fields)
      .filter(value => value != null)
      .join(' ')
      .toLowerCase()
  }

  // 키워드 추출
  private extractKeywords(text: string): string[] {
    // 텍스트 정규화
    const normalized = this.normalizeText(text)
    
    // 단어 분리 (공백, 특수문자 기준)
    const words = normalized
      .toLowerCase()
      .split(/[\s\-_.,!?;:()[\]{}'"]+/)
      .filter(word => word.length >= 2) // 2글자 이상만
      .filter(word => !/^\d+$/.test(word)) // 숫자만인 경우 제외

    // 중복 제거
    return Array.from(new Set(words))
  }

  // N-gram 생성 (한글/영문 부분 문자열 검색용)
  private generateNgrams(text: string, n: number = 3): string[] {
    const ngrams: string[] = []
    const cleanText = this.normalizeText(text).replace(/\s+/g, '')

    for (let i = 0; i <= cleanText.length - n; i++) {
      const ngram = cleanText.slice(i, i + n)
      if (ngram.length === n) {
        ngrams.push(ngram)
      }
    }

    return Array.from(new Set(ngrams))
  }

  // 텍스트 정규화
  private normalizeText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ') // 연속 공백을 하나로
      .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/g, ' ') // 특수문자 제거
  }

  // 정확한 매칭 검색
  private exactSearch(query: string): Set<number> {
    const results = new Set<number>()
    const normalizedQuery = this.normalizeText(query).toLowerCase()

    for (const [id, doc] of this.index) {
      if (doc.content.includes(normalizedQuery)) {
        results.add(id)
      }
    }

    return results
  }

  // 키워드 검색
  private keywordSearch(query: string): Set<number> {
    const keywords = this.extractKeywords(query)
    const results = new Set<number>()

    keywords.forEach(keyword => {
      const docIds = this.invertedIndex.get(keyword)
      if (docIds) {
        docIds.forEach(id => results.add(id))
      }
    })

    return results
  }

  // 퍼지 검색 (오타 허용)
  private fuzzySearch(query: string): Set<number> {
    const results = new Set<number>()
    const ngrams = this.generateNgrams(query)

    ngrams.forEach(ngram => {
      const docIds = this.ngramIndex.get(ngram)
      if (docIds) {
        docIds.forEach(id => results.add(id))
      }
    })

    return results
  }

  // 필드별 필터링
  private filterByFields(candidateIds: Set<number>, fields: (keyof SearchableFields)[]): Set<number> {
    const filtered = new Set<number>()

    candidateIds.forEach(id => {
      const doc = this.index.get(id)
      if (doc) {
        const hasMatchInFields = fields.some(field => 
          doc.fields[field] != null && doc.fields[field] !== ''
        )
        if (hasMatchInFields) {
          filtered.add(id)
        }
      }
    })

    return filtered
  }

  // 날짜 범위 필터링
  private filterByDateRange(candidateIds: Set<number>, dateRange: { from: Date, to: Date }): Set<number> {
    const filtered = new Set<number>()

    candidateIds.forEach(id => {
      const doc = this.index.get(id)
      if (doc && doc.createdAt >= dateRange.from && doc.createdAt <= dateRange.to) {
        filtered.add(id)
      }
    })

    return filtered
  }

  // 스코어링 및 순위 매기기
  private scoreAndRank(candidateIds: number[], query: string): SearchResult[] {
    const keywords = this.extractKeywords(query)
    
    return candidateIds
      .map(id => {
        const doc = this.index.get(id)!
        const score = this.calculateScore(doc, keywords)
        
        return {
          id,
          score,
          matchedFields: this.getMatchedFields(doc, keywords),
          highlightedContent: {},
          originalData: doc
        }
      })
      .sort((a, b) => b.score - a.score)
  }

  // 점수 계산
  private calculateScore(doc: IndexedDocument, keywords: string[]): number {
    let score = 0

    keywords.forEach(keyword => {
      // 키워드 빈도
      const frequency = (doc.content.match(new RegExp(keyword, 'gi')) || []).length
      score += frequency * 1

      // 필드별 가중치
      Object.entries(doc.fields).forEach(([field, value]) => {
        if (value && value.toLowerCase().includes(keyword)) {
          // 중요한 필드에 높은 점수
          const fieldWeight = this.getFieldWeight(field)
          score += fieldWeight
        }
      })
    })

    // 문서 나이에 따른 가중치 (최신 문서 우선)
    const daysSinceCreated = (Date.now() - doc.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    const recencyBonus = Math.max(0, 30 - daysSinceCreated) * 0.1

    return score + recencyBonus
  }

  // 필드별 가중치
  private getFieldWeight(field: string): number {
    const weights: Record<string, number> = {
      customerName: 5,
      vehicleModel: 4,
      licenseNumber: 5,
      ecuMaker: 3,
      ecuModel: 3,
      workType: 2,
      description: 1,
      notes: 1
    }
    return weights[field] || 1
  }

  // 매칭된 필드 찾기
  private getMatchedFields(doc: IndexedDocument, keywords: string[]): string[] {
    const matchedFields: string[] = []

    Object.entries(doc.fields).forEach(([field, value]) => {
      if (value) {
        const hasMatch = keywords.some(keyword => 
          value.toLowerCase().includes(keyword)
        )
        if (hasMatch) {
          matchedFields.push(field)
        }
      }
    })

    return matchedFields
  }

  // 검색어 하이라이팅
  private highlightMatches(data: any, query: string): Record<string, string> {
    const keywords = this.extractKeywords(query)
    const highlighted: Record<string, string> = {}

    const fields = this.extractSearchableFields(data)
    Object.entries(fields).forEach(([field, value]) => {
      if (value) {
        let highlightedValue = value
        keywords.forEach(keyword => {
          const regex = new RegExp(`(${keyword})`, 'gi')
          highlightedValue = highlightedValue.replace(regex, '<mark>$1</mark>')
        })
        if (highlightedValue !== value) {
          highlighted[field] = highlightedValue
        }
      }
    })

    return highlighted
  }

  // 캐시에 저장
  private async saveToCache(): Promise<void> {
    try {
      const cacheData = {
        index: Array.from(this.index.entries()),
        invertedIndex: Array.from(this.invertedIndex.entries()).map(([k, v]) => [k, Array.from(v)]),
        ngramIndex: Array.from(this.ngramIndex.entries()).map(([k, v]) => [k, Array.from(v)])
      }
      await cacheManager.set('search_index', cacheData, CacheTTL.VERY_LONG)
    } catch (error) {
      console.error('검색 인덱스 캐시 저장 실패:', error)
    }
  }

  // 캐시에서 복원
  private restoreFromCache(cacheData: any): void {
    try {
      // 메인 인덱스 복원
      this.index = new Map(cacheData.index)

      // 역 인덱스 복원  
      this.invertedIndex = new Map(
        cacheData.invertedIndex.map(([k, v]: [string, number[]]) => [k, new Set(v)])
      )

      // N-gram 인덱스 복원
      this.ngramIndex = new Map(
        cacheData.ngramIndex.map(([k, v]: [string, number[]]) => [k, new Set(v)])
      )
    } catch (error) {
      console.error('검색 인덱스 캐시 복원 실패:', error)
    }
  }

  // 인덱스 통계
  getStats(): {
    totalDocuments: number
    totalKeywords: number
    totalNgrams: number
    indexSize: number
  } {
    return {
      totalDocuments: this.index.size,
      totalKeywords: this.invertedIndex.size,
      totalNgrams: this.ngramIndex.size,
      indexSize: JSON.stringify({
        index: Array.from(this.index.entries()),
        invertedIndex: Array.from(this.invertedIndex.entries()),
        ngramIndex: Array.from(this.ngramIndex.entries())
      }).length
    }
  }
}

// 글로벌 검색 엔진 인스턴스
export const searchEngine = new SearchEngine() 