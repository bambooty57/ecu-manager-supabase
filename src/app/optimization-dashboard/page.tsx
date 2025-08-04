'use client'

import { useState, useEffect } from 'react'
import { 
  migrateAllFilesToStorage, 
  checkMigrationStatus,
  analyzeSpecificWorkRecord,
  getDatabaseSummary,
  analyzeLatestWorkRecordWithFiles
} from '../../lib/migration-utils'
import { cacheManager } from '../../lib/cache-manager'
import { searchEngine } from '../../lib/search-engine'
import { 
  generateCDNUrl, 
  manageBrowserCache,
  LazyImageLoader,
  isWebPSupported,
  isAVIFSupported 
} from '../../lib/cdn-utils'
import { 
  advancedPerformanceMonitor, 
  PerformanceMetrics,
  DeploymentReadiness 
} from '../../lib/performance-monitor'
import Navigation from '../../components/Navigation'
import AuthGuard from '../../components/AuthGuard'

export default function OptimizationDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [migrationStatus, setMigrationStatus] = useState<any>(null)
  const [cacheStats, setCacheStats] = useState<any>(null)
  const [searchStats, setSearchStats] = useState<any>(null)
  const [cdnStatus, setCdnStatus] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [migrationProgress, setMigrationProgress] = useState({ current: 0, total: 0, recordId: 0 as string | number })
  
  // Phase 4: 고급 성능 모니터링 상태
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null)
  const [deploymentReadiness, setDeploymentReadiness] = useState<DeploymentReadiness | null>(null)
  const [deploymentChecklist, setDeploymentChecklist] = useState<any>(null)
  const [optimizationSuggestions, setOptimizationSuggestions] = useState<string[]>([])
  const [lighthouseScore, setLighthouseScore] = useState<number>(0)
  const [userExperienceScore, setUserExperienceScore] = useState<number>(0)
  const [improvementEffect, setImprovementEffect] = useState<any>(null)

  useEffect(() => {
    // Phase 4: 고급 성능 모니터링 시작
    advancedPerformanceMonitor.startAdvancedMonitoring()
    
    // 페이지 로드 시 모든 데이터 로드
    loadDashboardData()
    
    // 실시간 성능 메트릭 업데이트 (5초마다)
    const metricsInterval = setInterval(() => {
      updatePerformanceMetrics()
    }, 5000)

    // 배포 준비 상태 업데이트 (30초마다)
    const readinessInterval = setInterval(() => {
      updateDeploymentReadiness()
    }, 30000)

    return () => {
      clearInterval(metricsInterval)
      clearInterval(readinessInterval)
      advancedPerformanceMonitor.stopMonitoring()
    }
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // 병렬로 모든 통계 정보 로드
      const [migration, cache, search] = await Promise.all([
        checkMigrationStatus(),
        cacheManager.getStats(),
        searchEngine.getSearchStats()
      ])

      setMigrationStatus(migration)
      setCacheStats(cache)
      setSearchStats(search)
      
      // Phase 4: 성능 메트릭 및 배포 준비 상태 로드
      updatePerformanceMetrics()
      updateDeploymentReadiness()
      
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Phase 4: 성능 메트릭 업데이트
  const updatePerformanceMetrics = () => {
    const metrics = advancedPerformanceMonitor.getMetrics()
    setPerformanceMetrics(metrics)
    
    // Lighthouse 점수 계산
    advancedPerformanceMonitor.simulateLighthouseScore().then(score => {
      setLighthouseScore(score)
    })
    
    // 사용자 경험 점수 계산
    const uxScore = advancedPerformanceMonitor.calculateUserExperienceScore()
    setUserExperienceScore(uxScore)
    
    // 개선 효과 계산
    const effect = advancedPerformanceMonitor.calculateImprovementEffect()
    setImprovementEffect(effect)
  }

  // Phase 4: 배포 준비 상태 업데이트
  const updateDeploymentReadiness = () => {
    const checklist = advancedPerformanceMonitor.getDeploymentChecklist()
    setDeploymentChecklist(checklist)
    
    const metrics = advancedPerformanceMonitor.getMetrics()
    setDeploymentReadiness(metrics.deploymentReadiness)
    
    // 배포 준비 완료 확인
    if (advancedPerformanceMonitor.isReadyForDeployment()) {
      console.log('✅ 배포 준비 완료! 모든 체크리스트 통과')
    }
  }

  const detectBrowserSupport = async () => {
    const [webpSupported, avifSupported] = await Promise.all([
      isWebPSupported(),
      isAVIFSupported()
    ])

    setCdnStatus({
      webpSupported,
      avifSupported,
      lazyLoadingSupported: 'IntersectionObserver' in window,
      serviceWorkerSupported: 'serviceWorker' in navigator
    })
  }

  // 파일 마이그레이션 실행
  const handleMigration = async () => {
    try {
      setIsLoading(true)
      
      const result = await migrateAllFilesToStorage(
        (current, total, recordId) => {
          setMigrationProgress({ current, total, recordId })
        }
      )

      alert(`✅ 마이그레이션 완료!\n성공: ${result.success}개\n실패: ${result.failed}개`)
      await loadDashboardData()
    } catch (error) {
      console.error('마이그레이션 실패:', error)
      alert('❌ 마이그레이션 실패')
    } finally {
      setIsLoading(false)
      setMigrationProgress({ current: 0, total: 0, recordId: 0 })
    }
  }

  // 데이터 구조 분석
  const handleDataAnalysis = async () => {
    try {
      setIsLoading(true)
      console.log('🔍 데이터 구조 분석을 시작합니다...')
      console.log('브라우저 개발자 도구의 콘솔을 확인하세요.')
      
      const analysis = await analyzeLatestWorkRecordWithFiles()
      console.log('📊 데이터 구조 분석 결과:', analysis)
      
      alert('✅ 데이터 구조 분석 완료!\n브라우저 콘솔을 확인하세요.')
    } catch (error) {
      console.error('데이터 분석 실패:', error)
      alert('❌ 데이터 분석 실패')
    } finally {
      setIsLoading(false)
    }
  }

  // 데이터베이스 요약
  const handleDatabaseSummary = async () => {
    try {
      setIsLoading(true)
      console.log('📊 데이터베이스 요약을 생성합니다...')
      
      const summary = await getDatabaseSummary()
      console.log('📈 데이터베이스 요약:', summary)
      
      alert('✅ 데이터베이스 요약 완료!\n브라우저 콘솔을 확인하세요.')
    } catch (error) {
      console.error('데이터베이스 요약 실패:', error)
      alert('❌ 데이터베이스 요약 실패')
    } finally {
      setIsLoading(false)
    }
  }

  // 특정 레코드 분석
  const handleSpecificRecordAnalysis = async (recordId: number) => {
    try {
      setIsLoading(true)
      console.log(`🔍 레코드 ${recordId} 분석을 시작합니다...`)
      
      const analysis = await analyzeSpecificWorkRecord(recordId)
      console.log(`📊 레코드 ${recordId} 분석 결과:`, analysis)
      
      alert(`✅ 레코드 ${recordId} 분석 완료!\n브라우저 콘솔을 확인하세요.`)
    } catch (error) {
      console.error('레코드 분석 실패:', error)
      alert('❌ 레코드 분석 실패')
    } finally {
      setIsLoading(false)
    }
  }

  // 캐시 액션
  const handleCacheAction = async (action: string) => {
    try {
      setIsLoading(true)
      
      switch (action) {
        case 'clear':
          await cacheManager.flush()
          alert('✅ 캐시가 모두 정리되었습니다.')
          break
        case 'stats':
          const stats = await cacheManager.getStats()
          console.log('📊 캐시 통계:', stats)
          alert('✅ 캐시 통계를 확인했습니다.\n브라우저 콘솔을 확인하세요.')
          break
      }
      
      await loadDashboardData()
    } catch (error) {
      console.error('캐시 액션 실패:', error)
      alert('❌ 캐시 액션 실패')
    } finally {
      setIsLoading(false)
    }
  }

  // 검색 액션
  const handleSearchAction = async (action: string) => {
    try {
      setIsLoading(true)
      
      switch (action) {
        case 'rebuild':
          await searchEngine.buildIndex([])
          alert('✅ 검색 인덱스가 재구성되었습니다.')
          break
        case 'stats':
          const stats = await searchEngine.getSearchStats()
          console.log('📊 검색 통계:', stats)
          alert('✅ 검색 통계를 확인했습니다.\n브라우저 콘솔을 확인하세요.')
          break
      }
      
      await loadDashboardData()
    } catch (error) {
      console.error('검색 액션 실패:', error)
      alert('❌ 검색 액션 실패')
    } finally {
      setIsLoading(false)
    }
  }

  // Phase 4: 성능 리포트 생성
  const generatePerformanceReport = () => {
    const report = advancedPerformanceMonitor.generatePerformanceReport()
    const blob = new Blob([report], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Phase 4: 배포 준비 확인
  const checkDeploymentReadiness = () => {
    const isReady = advancedPerformanceMonitor.isReadyForDeployment()
    if (isReady) {
      alert('✅ 배포 준비 완료! 모든 체크리스트를 통과했습니다.')
    } else {
      alert('⚠️ 배포 준비가 완료되지 않았습니다. 체크리스트를 확인하세요.')
    }
  }

  // Phase 4: 개요 탭 렌더링
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Phase 4: 성능 개선 효과 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <h3 className="text-xl font-bold mb-4">🚀 Phase 4: 성능 개선 효과</h3>
        {improvementEffect && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {improvementEffect.improvement.pageLoadTime.toFixed(1)}%
              </div>
              <div className="text-sm">로딩 시간 개선</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {improvementEffect.improvement.memoryUsage.toFixed(1)}%
              </div>
              <div className="text-sm">메모리 사용량 감소</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {improvementEffect.improvement.searchResponseTime.toFixed(1)}%
              </div>
              <div className="text-sm">검색 성능 개선</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {improvementEffect.improvement.cacheHitRate.toFixed(1)}%
              </div>
              <div className="text-sm">캐시 적중률 향상</div>
            </div>
          </div>
        )}
      </div>

      {/* Phase 4: 실시간 성능 메트릭 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {performanceMetrics && (
          <>
            <div className="bg-gray-800 rounded-lg p-6">
              <h4 className="text-lg font-semibold mb-4">⚡ 성능 메트릭</h4>
              <div className="space-y-2 text-sm">
                <div>페이지 로딩: {performanceMetrics.pageLoadTime.toFixed(0)}ms</div>
                <div>메모리 사용량: {(performanceMetrics.memoryUsage / 1024 / 1024).toFixed(1)}MB</div>
                <div>캐시 적중률: {(performanceMetrics.cacheHitRate * 100).toFixed(1)}%</div>
                <div>검색 응답: {performanceMetrics.searchResponseTime.toFixed(0)}ms</div>
                <div>네트워크 요청: {performanceMetrics.networkRequests}개</div>
                <div>번들 크기: {(performanceMetrics.bundleSize / 1024).toFixed(1)}KB</div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h4 className="text-lg font-semibold mb-4">📊 점수</h4>
              <div className="space-y-2 text-sm">
                <div>Lighthouse: {lighthouseScore.toFixed(0)}/100</div>
                <div>사용자 경험: {userExperienceScore.toFixed(0)}/100</div>
                <div>이미지 최적화: {(performanceMetrics.imageOptimizationRate * 100).toFixed(1)}%</div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h4 className="text-lg font-semibold mb-4">🎯 배포 준비</h4>
              <div className="space-y-2 text-sm">
                <div>성능: {deploymentReadiness?.performance ? '✅' : '❌'}</div>
                <div>보안: {deploymentReadiness?.security ? '✅' : '❌'}</div>
                <div>접근성: {deploymentReadiness?.accessibility ? '✅' : '❌'}</div>
                <div>SEO: {deploymentReadiness?.seo ? '✅' : '❌'}</div>
                <div>모바일: {deploymentReadiness?.mobileOptimization ? '✅' : '❌'}</div>
                <div>브라우저: {deploymentReadiness?.browserCompatibility ? '✅' : '❌'}</div>
                <div>에러 처리: {deploymentReadiness?.errorHandling ? '✅' : '❌'}</div>
                <div>모니터링: {deploymentReadiness?.monitoring ? '✅' : '❌'}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Phase 4: 액션 버튼들 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={generatePerformanceReport}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          📊 성능 리포트 생성
        </button>
        <button
          onClick={checkDeploymentReadiness}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          ✅ 배포 준비 확인
        </button>
        <button
          onClick={() => handleCacheAction('optimize')}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
        >
          ⚡ 캐시 최적화
        </button>
        <button
          onClick={() => handleSearchAction('optimize')}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
        >
          🔍 검색 최적화
        </button>
      </div>
    </div>
  )

  // Phase 4: 배포 준비 탭 렌더링
  const renderDeploymentReadiness = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-6 text-white">
        <h3 className="text-xl font-bold mb-4">🚀 Phase 4: 배포 준비 체크리스트</h3>
        <p className="text-sm opacity-90">
          모든 체크리스트를 통과하면 배포 준비가 완료됩니다.
        </p>
      </div>

      {deploymentChecklist && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(deploymentChecklist).map(([category, data]: [string, any]) => (
            <div key={category} className="bg-gray-800 rounded-lg p-6">
              <h4 className="text-lg font-semibold mb-4 flex items-center">
                {data.status ? '✅' : '❌'} {category}
              </h4>
              <div className="space-y-2">
                {data.checks.map((check: any, index: number) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span>{check.name}</span>
                    <span className={check.status ? 'text-green-400' : 'text-red-400'}>
                      {check.status ? '✅' : '❌'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Phase 4: 배포 준비 액션 */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h4 className="text-lg font-semibold mb-4">🎯 배포 준비 액션</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={checkDeploymentReadiness}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            배포 준비 확인
          </button>
          <button
            onClick={generatePerformanceReport}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            성능 리포트
          </button>
          <button
            onClick={() => handleCacheAction('clear')}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            캐시 정리
          </button>
          <button
            onClick={() => handleSearchAction('rebuild')}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            검색 인덱스 재구성
          </button>
        </div>
      </div>
    </div>
  )

  // 기존 탭들 렌더링
  const renderMigration = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-yellow-600 to-orange-600 rounded-lg p-6 text-white">
        <h3 className="text-xl font-bold mb-4">📁 파일 마이그레이션</h3>
        <p className="text-sm opacity-90">
          Base64 데이터를 Supabase Storage로 마이그레이션합니다.
        </p>
      </div>

      {migrationStatus && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h4 className="text-lg font-semibold mb-4">📊 마이그레이션 상태</h4>
            <div className="space-y-2 text-sm">
              <div>총 레코드: {migrationStatus.totalRecords}</div>
              <div>마이그레이션 완료: {migrationStatus.migratedRecords}</div>
              <div>남은 레코드: {migrationStatus.remainingRecords}</div>
              <div>진행률: {((migrationStatus.migratedRecords / migrationStatus.totalRecords) * 100).toFixed(1)}%</div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h4 className="text-lg font-semibold mb-4">💾 저장소 사용량</h4>
            <div className="space-y-2 text-sm">
              <div>총 파일: {migrationStatus.totalFiles}</div>
              <div>업로드된 파일: {migrationStatus.uploadedFiles}</div>
              <div>실패한 파일: {migrationStatus.failedFiles}</div>
              <div>저장소 크기: {(migrationStatus.storageSize / 1024 / 1024).toFixed(2)}MB</div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h4 className="text-lg font-semibold mb-4">⚡ 성능 개선</h4>
            <div className="space-y-2 text-sm">
              <div>데이터베이스 크기 감소: {migrationStatus.databaseSizeReduction}%</div>
              <div>쿼리 성능 향상: {migrationStatus.queryPerformanceImprovement}%</div>
              <div>로딩 시간 단축: {migrationStatus.loadingTimeReduction}%</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <h4 className="text-lg font-semibold mb-4">🔧 마이그레이션 액션</h4>
          <div className="space-y-4">
            <button
              onClick={handleMigration}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? '마이그레이션 중...' : '🚀 마이그레이션 시작'}
            </button>
            
            {migrationProgress.total > 0 && (
              <div className="space-y-2">
                <div className="text-sm">진행률: {migrationProgress.current} / {migrationProgress.total}</div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(migrationProgress.current / migrationProgress.total) * 100}%` }}
                  ></div>
                </div>
                {Number(migrationProgress.recordId) > 0 && (
                  <div className="text-xs text-gray-400">
                    현재 처리 중: 레코드 {migrationProgress.recordId}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h4 className="text-lg font-semibold mb-4">📊 데이터 분석</h4>
          <div className="space-y-4">
            <button
              onClick={handleDataAnalysis}
              disabled={isLoading}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              🔍 데이터 구조 분석
            </button>
            <button
              onClick={handleDatabaseSummary}
              disabled={isLoading}
              className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              📈 데이터베이스 요약
            </button>
            <div className="flex space-x-2">
              <input
                type="number"
                placeholder="레코드 ID"
                className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg"
                id="recordIdInput"
              />
              <button
                onClick={() => {
                  const recordId = parseInt((document.getElementById('recordIdInput') as HTMLInputElement).value)
                  if (recordId) handleSpecificRecordAnalysis(recordId)
                }}
                disabled={isLoading}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                분석
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderCaching = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg p-6 text-white">
        <h3 className="text-xl font-bold mb-4">💾 캐싱 시스템</h3>
        <p className="text-sm opacity-90">
          메모리 및 Redis 캐시를 통한 성능 최적화
        </p>
      </div>

      {cacheStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h4 className="text-lg font-semibold mb-4">📊 캐시 통계</h4>
            <div className="space-y-2 text-sm">
              <div>캐시 적중률: {(cacheStats.hitRate * 100).toFixed(1)}%</div>
              <div>캐시 미스율: {(cacheStats.missRate * 100).toFixed(1)}%</div>
              <div>캐시된 항목: {cacheStats.cachedItems}</div>
              <div>캐시 크기: {(cacheStats.cacheSize / 1024).toFixed(2)}KB</div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h4 className="text-lg font-semibold mb-4">⚡ 성능 개선</h4>
            <div className="space-y-2 text-sm">
              <div>평균 응답 시간: {cacheStats.averageResponseTime.toFixed(0)}ms</div>
              <div>캐시 히트 시간: {cacheStats.hitResponseTime.toFixed(0)}ms</div>
              <div>캐시 미스 시간: {cacheStats.missResponseTime.toFixed(0)}ms</div>
              <div>성능 향상: {cacheStats.performanceImprovement.toFixed(1)}%</div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h4 className="text-lg font-semibold mb-4">🔧 캐시 관리</h4>
            <div className="space-y-4">
              <button
                onClick={() => handleCacheAction('stats')}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                📊 통계 확인
              </button>
              <button
                onClick={() => handleCacheAction('clear')}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                🗑️ 캐시 정리
              </button>
              <button
                onClick={() => handleCacheAction('optimize')}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                ⚡ 최적화
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderSearch = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-6 text-white">
        <h3 className="text-xl font-bold mb-4">🔍 검색 엔진</h3>
        <p className="text-sm opacity-90">
          고급 검색 기능 및 자동완성 시스템
        </p>
      </div>

      {searchStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h4 className="text-lg font-semibold mb-4">📊 검색 통계</h4>
            <div className="space-y-2 text-sm">
              <div>인덱스된 항목: {searchStats.indexedItems}</div>
              <div>검색 요청: {searchStats.searchRequests}</div>
              <div>평균 응답 시간: {searchStats.averageResponseTime.toFixed(0)}ms</div>
              <div>검색 정확도: {(searchStats.accuracy * 100).toFixed(1)}%</div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h4 className="text-lg font-semibold mb-4">⚡ 성능 개선</h4>
            <div className="space-y-2 text-sm">
              <div>검색 속도 향상: {searchStats.speedImprovement.toFixed(1)}%</div>
              <div>메모리 사용량: {(searchStats.memoryUsage / 1024).toFixed(2)}KB</div>
              <div>인덱스 크기: {(searchStats.indexSize / 1024).toFixed(2)}KB</div>
              <div>자동완성 제안: {searchStats.autocompleteSuggestions}</div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h4 className="text-lg font-semibold mb-4">🔧 검색 관리</h4>
            <div className="space-y-4">
              <button
                onClick={() => handleSearchAction('stats')}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                📊 통계 확인
              </button>
              <button
                onClick={() => handleSearchAction('rebuild')}
                className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
              >
                🔄 인덱스 재구성
              </button>
              <button
                onClick={() => handleSearchAction('optimize')}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                ⚡ 최적화
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const tabs = [
    { id: 'overview', label: '📊 개요', component: renderOverview },
    { id: 'deployment', label: '🚀 배포 준비', component: renderDeploymentReadiness },
    { id: 'migration', label: '📁 마이그레이션', component: renderMigration },
    { id: 'caching', label: '💾 캐싱', component: renderCaching },
    { id: 'search', label: '🔍 검색', component: renderSearch }
  ]

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-900">
        <Navigation />
        <main className="pt-20">
          {/* 홈으로 돌아가기 버튼 */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-6">
              <a
                href="/"
                className="inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                ← 홈으로 돌아가기
              </a>
            </div>

            {/* 타이틀 */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">
                🚀 Phase 4: 최종 최적화 및 배포 준비
              </h1>
              <p className="text-gray-400">
                고급 성능 모니터링, 배포 체크리스트, 자동 최적화 제안
              </p>
            </div>

            {/* 로딩 상태 */}
            {isLoading && (
              <div className="mb-6 p-4 bg-blue-600 text-white rounded-lg">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  처리 중...
                </div>
              </div>
            )}

            {/* 탭 네비게이션 */}
            <div className="mb-6">
              <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 탭 내용 */}
            <div className="bg-gray-800 rounded-lg p-6">
              {tabs.find(tab => tab.id === activeTab)?.component()}
            </div>

            {/* Phase 4: 성능 개선 효과 표시 */}
            {improvementEffect && (
              <div className="mt-6 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-6 text-white">
                <h3 className="text-xl font-bold mb-4">🎉 Phase 4 완료 효과</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-300">
                      {improvementEffect.improvement.pageLoadTime.toFixed(1)}%
                    </div>
                    <div className="text-sm">로딩 시간 개선</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-300">
                      {improvementEffect.improvement.memoryUsage.toFixed(1)}%
                    </div>
                    <div className="text-sm">메모리 사용량 감소</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-300">
                      {improvementEffect.improvement.searchResponseTime.toFixed(1)}%
                    </div>
                    <div className="text-sm">검색 성능 개선</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-300">
                      {improvementEffect.improvement.cacheHitRate.toFixed(1)}%
                    </div>
                    <div className="text-sm">캐시 적중률 향상</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  )
} 