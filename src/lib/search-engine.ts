// 전문 검색 엔진 및 인덱싱 시스템
import { WorkRecordData } from './work-records'

export interface SearchResult {
  record: WorkRecordData
  score: number
  matches: Array<{ field: string; token: string }>
  type: 'keyword' | 'fuzzy' | 'ngram'
}

export interface SearchOptions {
  limit?: number
  field?: string
  fuzzy?: boolean
  ngram?: boolean
}

export class SearchEngine {
  private index = new Map<string, any[]>()
  private searchableFields = {
    customer_name: { weight: 3, searchable: true, fuzzy: true },
    equipment_type: { weight: 2, searchable: true, fuzzy: true },
    manufacturer: { weight: 2, searchable: true, fuzzy: true },
    model: { weight: 2, searchable: true, fuzzy: true },
    work_type: { weight: 1, searchable: true, fuzzy: false },
    ecu_maker: { weight: 2, searchable: true, fuzzy: true },
    ecu_model: { weight: 2, searchable: true, fuzzy: true },
    acu_manufacturer: { weight: 2, searchable: true, fuzzy: true },
    acu_model: { weight: 2, searchable: true, fuzzy: true },
    work_description: { weight: 1, searchable: true, fuzzy: true },
    notes: { weight: 1, searchable: true, fuzzy: true }
  }

  // ✅ 검색 엔진 초기화
  async initialize() {
    console.log('🔍 검색 엔진 초기화 시작')
    // 초기화 로직은 buildIndex에서 처리됨
    console.log('✅ 검색 엔진 초기화 완료')
  }

  // ✅ 검색 인덱스 구축
  async buildIndex(records: WorkRecordData[]) {
    console.log('🔍 검색 인덱스 구축 시작:', records.length, '개 레코드')
    
    // 기존 인덱스 초기화
    this.index.clear()
    
    records.forEach(record => {
      // 각 검색 가능 필드에 대해 인덱스 생성
      Object.entries(this.searchableFields).forEach(([field, config]) => {
        if (config.searchable && record[field as keyof WorkRecordData]) {
          const value = record[field as keyof WorkRecordData]?.toString().toLowerCase() || ''
          if (value.trim()) {
            const tokens = this.tokenize(value)
            
            tokens.forEach(token => {
              if (!this.index.has(token)) {
                this.index.set(token, [])
              }
              this.index.get(token)!.push({
                record,
                field,
                weight: config.weight,
                exact: token === value,
                fuzzy: config.fuzzy
              })
            })
          }
        }
      })
    })
    
    console.log('✅ 검색 인덱스 구축 완료:', this.index.size, '개 토큰')
  }

  // ✅ 토큰화 함수
  private tokenize(text: string): string[] {
    // 한글, 영문, 숫자 토큰화
    return text
      .split(/[\s,.-]+/)
      .filter(token => token.length >= 2)
      .map(token => token.toLowerCase())
      .filter(token => token.length > 0)
  }

  // ✅ 통합 검색
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const startTime = performance.now()
    
    if (!query.trim()) {
      return []
    }

    const tokens = this.tokenize(query)
    const results = new Map<number, SearchResult>()
    
    // 1. 키워드 검색
    const keywordResults = await this.keywordSearch(tokens, options)
    keywordResults.forEach(result => {
      results.set(result.record.id, {
        ...result,
        score: result.score * 1.0,
        type: 'keyword'
      })
    })
    
    // 2. 퍼지 검색 (옵션)
    if (options.fuzzy !== false) {
      const fuzzyResults = await this.fuzzySearch(tokens, options)
      fuzzyResults.forEach(result => {
        const existing = results.get(result.record.id)
        if (existing) {
          existing.score += result.score * 0.8
          existing.matches.push(...result.matches)
        } else {
          results.set(result.record.id, {
            ...result,
            score: result.score * 0.8,
            type: 'fuzzy'
          })
        }
      })
    }
    
    // 3. N-gram 검색 (옵션)
    if (options.ngram !== false) {
      const ngramResults = await this.ngramSearch(tokens, options)
      ngramResults.forEach(result => {
        const existing = results.get(result.record.id)
        if (existing) {
          existing.score += result.score * 0.6
          existing.matches.push(...result.matches)
        } else {
          results.set(result.record.id, {
            ...result,
            score: result.score * 0.6,
            type: 'ngram'
          })
        }
      })
    }
    
    // 중복 제거 및 점수 기반 정렬
    const sortedResults = Array.from(results.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || 50)
    
    const endTime = performance.now()
    console.log(`🔍 검색 완료: ${sortedResults.length}개 결과 (${(endTime - startTime).toFixed(2)}ms)`)
    
    return sortedResults
  }

  // ✅ 키워드 검색
  private async keywordSearch(tokens: string[], options: SearchOptions): Promise<SearchResult[]> {
    const results = new Map<number, SearchResult>()
    
    tokens.forEach(token => {
      const matches = this.index.get(token) || []
      
      matches.forEach(match => {
        if (options.field && match.field !== options.field) return
        
        const existing = results.get(match.record.id)
        const score = match.weight * (match.exact ? 2 : 1)
        
        if (existing) {
          existing.score += score
          existing.matches.push({ field: match.field, token })
        } else {
          results.set(match.record.id, {
            record: match.record,
            score,
            matches: [{ field: match.field, token }],
            type: 'keyword'
          })
        }
      })
    })
    
    return Array.from(results.values())
  }

  // ✅ 퍼지 검색
  private async fuzzySearch(tokens: string[], options: SearchOptions): Promise<SearchResult[]> {
    const results = new Map<number, SearchResult>()
    
    tokens.forEach(token => {
      // 유사한 토큰 찾기 (편집 거리 기반)
      const similarTokens = this.findSimilarTokens(token, 2)
      
      similarTokens.forEach(similarToken => {
        const matches = this.index.get(similarToken) || []
        
        matches.forEach(match => {
          if (options.field && match.field !== options.field) return
          if (!match.fuzzy) return
          
          const existing = results.get(match.record.id)
          const similarity = this.calculateSimilarity(token, similarToken)
          const score = match.weight * similarity * 0.8
          
          if (existing) {
            existing.score += score
            existing.matches.push({ field: match.field, token: similarToken })
          } else {
            results.set(match.record.id, {
              record: match.record,
              score,
              matches: [{ field: match.field, token: similarToken }],
              type: 'fuzzy'
            })
          }
        })
      })
    })
    
    return Array.from(results.values())
  }

  // ✅ N-gram 검색
  private async ngramSearch(tokens: string[], options: SearchOptions): Promise<SearchResult[]> {
    const results = new Map<number, SearchResult>()
    
    tokens.forEach(token => {
      const ngrams = this.generateNGrams(token, 2)
      
      ngrams.forEach(ngram => {
        const matches = this.index.get(ngram) || []
        
        matches.forEach(match => {
          if (options.field && match.field !== options.field) return
          
          const existing = results.get(match.record.id)
          const score = match.weight * 0.6
          
          if (existing) {
            existing.score += score
            existing.matches.push({ field: match.field, token: ngram })
          } else {
            results.set(match.record.id, {
              record: match.record,
              score,
              matches: [{ field: match.field, token: ngram }],
              type: 'ngram'
            })
          }
        })
      })
    })
    
    return Array.from(results.values())
  }

  // ✅ 유사한 토큰 찾기
  private findSimilarTokens(token: string, maxDistance: number): string[] {
    const similarTokens: string[] = []
    
    for (const [indexToken] of this.index) {
      const distance = this.levenshteinDistance(token, indexToken)
      if (distance <= maxDistance && distance > 0) {
        similarTokens.push(indexToken)
      }
    }
    
    return similarTokens
  }

  // ✅ 편집 거리 계산
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        )
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  // ✅ 유사도 계산
  private calculateSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2)
    const maxLength = Math.max(str1.length, str2.length)
    return maxLength === 0 ? 1 : (maxLength - distance) / maxLength
  }

  // ✅ N-gram 생성
  private generateNGrams(text: string, n: number): string[] {
    const ngrams: string[] = []
    for (let i = 0; i <= text.length - n; i++) {
      ngrams.push(text.substring(i, i + n))
    }
    return ngrams
  }

  // ✅ 자동완성 제안
  async generateSuggestions(query: string, limit: number = 5): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = []
    
    if (!query.trim()) return suggestions
    
    const tokens = this.tokenize(query)
    const results = new Map<string, { count: number; type: string }>()
    
    tokens.forEach(token => {
      const matches = this.index.get(token) || []
      
      matches.forEach(match => {
        const value = match.record[match.field as keyof WorkRecordData]?.toString() || ''
        if (value && value.toLowerCase().includes(query.toLowerCase())) {
          const key = `${match.field}:${value}`
          const existing = results.get(key)
          
          if (existing) {
            existing.count++
          } else {
            results.set(key, {
              count: 1,
              type: this.getFieldType(match.field)
            })
          }
        }
      })
    })
    
    // 점수 기반 정렬
    const sortedSuggestions = Array.from(results.entries())
      .map(([key, data]) => ({
        text: key.split(':')[1],
        type: data.type,
        count: data.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
    
    return sortedSuggestions.map(suggestion => ({
      text: suggestion.text,
      type: suggestion.type,
      icon: this.getFieldIcon(suggestion.type)
    }))
  }

  // ✅ 필드 타입 반환
  private getFieldType(field: string): string {
    const fieldTypes: Record<string, string> = {
      customer_name: 'customer',
      equipment_type: 'equipment',
      manufacturer: 'manufacturer',
      model: 'model',
      work_type: 'work',
      ecu_maker: 'ecu',
      ecu_model: 'ecu',
      acu_manufacturer: 'acu',
      acu_model: 'acu',
      work_description: 'description',
      notes: 'note'
    }
    return fieldTypes[field] || 'other'
  }

  // ✅ 필드 아이콘 반환
  private getFieldIcon(type: string): string {
    const icons: Record<string, string> = {
      customer: '👤',
      equipment: '🚗',
      manufacturer: '🏭',
      model: '📋',
      work: '🔧',
      ecu: '⚙️',
      acu: '🔧',
      description: '📝',
      note: '📄',
      other: '📁'
    }
    return icons[type] || '📁'
  }

  // ✅ 검색 결과 하이라이팅
  highlightSearchTerm(text: string, searchTerm: string): string {
    if (!searchTerm.trim()) return text
    
    const regex = new RegExp(`(${searchTerm})`, 'gi')
    return text.replace(regex, '<mark class="bg-yellow-200 text-black px-1 rounded">$1</mark>')
  }

  // ✅ 검색 통계
  getSearchStats(): { indexSize: number; tokenCount: number; fieldCount: number } {
    return {
      indexSize: this.index.size,
      tokenCount: Array.from(this.index.values()).flat().length,
      fieldCount: Object.keys(this.searchableFields).length
    }
  }
}

export interface Suggestion {
  text: string
  type: string
  icon: string
}

// 싱글톤 인스턴스
export const searchEngine = new SearchEngine() 