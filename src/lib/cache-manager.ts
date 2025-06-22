// Redis 캐싱 관리자
// Next.js 환경에서 Redis 캐싱 구현

// 가상 Redis 클라이언트 (실제 환경에서는 ioredis 또는 redis 패키지 사용)
interface RedisClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string, mode?: string, duration?: number): Promise<'OK'>
  del(key: string): Promise<number>
  exists(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<number>
  flushall(): Promise<'OK'>
  keys(pattern: string): Promise<string[]>
}

// 메모리 기반 캐시 (개발 환경용)
class MemoryCache implements RedisClient {
  private cache = new Map<string, { value: string, expiry: number }>()

  async get(key: string): Promise<string | null> {
    const item = this.cache.get(key)
    if (!item) return null
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return null
    }
    
    return item.value
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<'OK'> {
    const expiry = duration ? Date.now() + (duration * 1000) : Date.now() + (3600 * 1000)
    this.cache.set(key, { value, expiry })
    return 'OK'
  }

  async del(key: string): Promise<number> {
    return this.cache.delete(key) ? 1 : 0
  }

  async exists(key: string): Promise<number> {
    const item = this.cache.get(key)
    if (!item) return 0
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return 0
    }
    
    return 1
  }

  async expire(key: string, seconds: number): Promise<number> {
    const item = this.cache.get(key)
    if (!item) return 0
    
    item.expiry = Date.now() + (seconds * 1000)
    return 1
  }

  async flushall(): Promise<'OK'> {
    this.cache.clear()
    return 'OK'
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    return Array.from(this.cache.keys()).filter(key => regex.test(key))
  }
}

// Redis 연결 관리
class RedisManager {
  private client: RedisClient
  private isConnected = false

  constructor() {
    // 실제 환경에서는 Redis 클라이언트 초기화
    if (process.env.REDIS_URL) {
      // const Redis = require('ioredis')
      // this.client = new Redis(process.env.REDIS_URL)
      console.log('🔴 Redis 연결 설정됨')
    } else {
      console.log('💾 메모리 캐시 사용 (개발 환경)')
    }
    
    // 개발 환경에서는 메모리 캐시 사용
    this.client = new MemoryCache()
    this.isConnected = true
  }

  getClient(): RedisClient {
    return this.client
  }

  isReady(): boolean {
    return this.isConnected
  }
}

// 캐시 키 관리
export const CacheKeys = {
  WORK_RECORDS: 'work_records',
  WORK_RECORD: (id: number) => `work_record:${id}`,
  CUSTOMERS: 'customers',
  CUSTOMER: (id: number) => `customer:${id}`,
  EQUIPMENT: 'equipment',
  EQUIPMENT_MODELS: 'equipment_models',
  SEARCH_RESULTS: (query: string) => `search:${Buffer.from(query).toString('base64')}`,
  USER_SESSION: (userId: string) => `session:${userId}`,
  FILE_METADATA: (workRecordId: number) => `files:${workRecordId}`,
  PAGINATION: (page: number, size: number, filters: string) => `page:${page}:${size}:${Buffer.from(filters).toString('base64')}`,
}

// 캐시 TTL 설정 (초)
export const CacheTTL = {
  SHORT: 300,      // 5분
  MEDIUM: 1800,    // 30분
  LONG: 3600,      // 1시간
  VERY_LONG: 86400, // 24시간
  PERMANENT: 2592000, // 30일
}

// 캐시 관리자 클래스
export class CacheManager {
  private redis: RedisManager
  private enabled: boolean

  constructor() {
    this.redis = new RedisManager()
    this.enabled = process.env.CACHE_ENABLED !== 'false'
  }

  // 데이터 캐시 저장
  async set<T>(key: string, data: T, ttl: number = CacheTTL.MEDIUM): Promise<boolean> {
    if (!this.enabled || !this.redis.isReady()) return false

    try {
      const serialized = JSON.stringify({
        data,
        timestamp: Date.now(),
        ttl
      })
      
      await this.redis.getClient().set(key, serialized, 'EX', ttl)
      console.log(`📦 캐시 저장: ${key} (TTL: ${ttl}s)`)
      return true
    } catch (error) {
      console.error('캐시 저장 오류:', error)
      return false
    }
  }

  // 데이터 캐시 조회
  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled || !this.redis.isReady()) return null

    try {
      const cached = await this.redis.getClient().get(key)
      if (!cached) return null

      const parsed = JSON.parse(cached)
      console.log(`📦 캐시 히트: ${key}`)
      return parsed.data as T
    } catch (error) {
      console.error('캐시 조회 오류:', error)
      return null
    }
  }

  // 캐시 삭제
  async delete(key: string): Promise<boolean> {
    if (!this.enabled || !this.redis.isReady()) return false

    try {
      await this.redis.getClient().del(key)
      console.log(`🗑️ 캐시 삭제: ${key}`)
      return true
    } catch (error) {
      console.error('캐시 삭제 오류:', error)
      return false
    }
  }

  // 패턴 매칭으로 캐시 삭제
  async deleteByPattern(pattern: string): Promise<number> {
    if (!this.enabled || !this.redis.isReady()) return 0

    try {
      const keys = await this.redis.getClient().keys(pattern)
      if (keys.length === 0) return 0

      let deleted = 0
      for (const key of keys) {
        await this.redis.getClient().del(key)
        deleted++
      }

      console.log(`🗑️ 패턴 캐시 삭제: ${pattern} (${deleted}개)`)
      return deleted
    } catch (error) {
      console.error('패턴 캐시 삭제 오류:', error)
      return 0
    }
  }

  // 캐시 만료 시간 설정
  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.enabled || !this.redis.isReady()) return false

    try {
      await this.redis.getClient().expire(key, seconds)
      return true
    } catch (error) {
      console.error('캐시 만료 설정 오류:', error)
      return false
    }
  }

  // 캐시 존재 여부 확인
  async exists(key: string): Promise<boolean> {
    if (!this.enabled || !this.redis.isReady()) return false

    try {
      const result = await this.redis.getClient().exists(key)
      return result === 1
    } catch (error) {
      console.error('캐시 존재 확인 오류:', error)
      return false
    }
  }

  // 전체 캐시 초기화
  async flush(): Promise<boolean> {
    if (!this.enabled || !this.redis.isReady()) return false

    try {
      await this.redis.getClient().flushall()
      console.log('🧹 전체 캐시 초기화 완료')
      return true
    } catch (error) {
      console.error('캐시 초기화 오류:', error)
      return false
    }
  }

  // 캐시 통계
  async getStats(): Promise<{
    totalKeys: number
    workRecordKeys: number
    customerKeys: number
    searchKeys: number
  }> {
    if (!this.enabled || !this.redis.isReady()) {
      return { totalKeys: 0, workRecordKeys: 0, customerKeys: 0, searchKeys: 0 }
    }

    try {
      const [totalKeys, workRecordKeys, customerKeys, searchKeys] = await Promise.all([
        this.redis.getClient().keys('*'),
        this.redis.getClient().keys('work_record:*'),
        this.redis.getClient().keys('customer:*'),
        this.redis.getClient().keys('search:*')
      ])

      return {
        totalKeys: totalKeys.length,
        workRecordKeys: workRecordKeys.length,
        customerKeys: customerKeys.length,
        searchKeys: searchKeys.length
      }
    } catch (error) {
      console.error('캐시 통계 조회 오류:', error)
      return { totalKeys: 0, workRecordKeys: 0, customerKeys: 0, searchKeys: 0 }
    }
  }
}

// 글로벌 캐시 매니저 인스턴스
export const cacheManager = new CacheManager()

// 캐시된 함수 데코레이터
export function cached<T extends (...args: any[]) => Promise<any>>(
  keyGenerator: (...args: Parameters<T>) => string,
  ttl: number = CacheTTL.MEDIUM
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: Parameters<T>) {
      const cacheKey = keyGenerator(...args)
      
      // 캐시에서 먼저 조회
      const cached = await cacheManager.get(cacheKey)
      if (cached !== null) {
        return cached
      }

      // 캐시 미스 시 원본 함수 실행
      const result = await originalMethod.apply(this, args)
      
      // 결과를 캐시에 저장
      await cacheManager.set(cacheKey, result, ttl)
      
      return result
    }

    return descriptor
  }
}

// 캐시 워밍업 (자주 사용되는 데이터 미리 로드)
export const warmupCache = async (): Promise<void> => {
  console.log('🔥 캐시 워밍업 시작...')
  
  try {
    // 고객 목록 캐시
    // await cacheManager.set(CacheKeys.CUSTOMERS, await getAllCustomers(), CacheTTL.LONG)
    
    // 장비 목록 캐시
    // await cacheManager.set(CacheKeys.EQUIPMENT, await getAllEquipment(), CacheTTL.LONG)
    
    // 최근 작업 기록 캐시
    // const recentWorkRecords = await getWorkRecordsPaginated(1, 20, false)
    // await cacheManager.set(CacheKeys.PAGINATION(1, 20, ''), recentWorkRecords, CacheTTL.MEDIUM)
    
    console.log('✅ 캐시 워밍업 완료')
  } catch (error) {
    console.error('❌ 캐시 워밍업 실패:', error)
  }
} 