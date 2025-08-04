'use client'

import { useState, useEffect, useCallback } from 'react'
import { performanceMonitor, PerformanceMetrics } from '../../lib/performance-monitor'
import { advancedSearchEngine } from '../../lib/advanced-search-engine'
import Navigation from '../../components/Navigation'
import AuthGuard from '../../components/AuthGuard'

export default function PerformanceMonitoringPage() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    pageLoadTime: 0,
    memoryUsage: 0,
    cacheHitRate: 0,
    searchResponseTime: 0,
    imageOptimizationRate: 0,
    networkRequests: 0,
    bundleSize: 0,
    lighthouseScore: 0,
    userExperienceScore: 0,
    deploymentReadiness: {
      performance: false,
      security: false,
      accessibility: false,
      seo: false,
      mobileOptimization: false,
      browserCompatibility: false,
      errorHandling: false,
      monitoring: false
    }
  })
  const [alerts, setAlerts] = useState<any[]>([]) // PerformanceAlert[] 대신 any[]로 변경
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [performanceScore, setPerformanceScore] = useState(0)
  const [optimizationSuggestions, setOptimizationSuggestions] = useState<string[]>([])
  const [searchStats, setSearchStats] = useState<any>(null)

  // 성능 모니터링 시작/중지
  const toggleMonitoring = useCallback(() => {
    if (isMonitoring) {
      performanceMonitor.stopMonitoring()
      setIsMonitoring(false)
    } else {
      performanceMonitor.startAdvancedMonitoring()
      setIsMonitoring(true)
    }
  }, [isMonitoring])

  // 메트릭 업데이트 구독
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(performanceMonitor.getMetrics())
      setPerformanceScore(performanceMonitor.calculatePerformanceScore())
      setOptimizationSuggestions(performanceMonitor.generateRecommendations?.() ?? [])
    }, 2000)

    // const unsubscribeAlerts = performanceMonitor.subscribeToAlerts((alert) => {
    //   setAlerts(prev => [alert, ...prev.slice(0, 99)]) // 최근 100개만 유지
    // })

    return () => {
      clearInterval(interval)
      // unsubscribeAlerts()
    }
  }, [])

  // 검색 통계 로드
  useEffect(() => {
    const loadSearchStats = () => {
      const stats = advancedSearchEngine.getSearchStats()
      setSearchStats(stats)
    }

    loadSearchStats()
    const interval = setInterval(loadSearchStats, 10000) // 10초마다 업데이트

    return () => clearInterval(interval)
  }, [])

  // 성능 리포트 생성
  const generateReport = () => {
    const report = performanceMonitor.generatePerformanceReport()
    const reportBlob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(reportBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // 성능 점수에 따른 색상
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    if (score >= 40) return 'text-orange-400'
    return 'text-red-400'
  }

  // 성능 상태에 따른 아이콘
  const getPerformanceIcon = (score: number) => {
    if (score >= 80) return '🚀'
    if (score >= 60) return '⚡'
    if (score >= 40) return '⚠️'
    return '🚨'
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-900 text-white">
        <Navigation />
        <main className="pt-20 pb-8">
          <div className="container mx-auto px-4 py-8">
            {/* 헤더 */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">
                    📊 실시간 성능 모니터링
                  </h1>
                  <p className="text-gray-400">
                    시스템 성능을 실시간으로 모니터링하고 최적화 제안을 받아보세요.
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={toggleMonitoring}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                      isMonitoring
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {isMonitoring ? '⏹️ 모니터링 중지' : '▶️ 모니터링 시작'}
                  </button>
                  <button
                    onClick={generateReport}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    📄 리포트 생성
                  </button>
                </div>
              </div>
            </div>

            {/* 성능 점수 카드 */}
            <div className="mb-8">
              <div className="bg-gradient-to-r from-blue-900 to-purple-900 p-6 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      {getPerformanceIcon(performanceScore)} 전체 성능 점수
                    </h2>
                    <p className="text-gray-300">
                      모든 메트릭을 종합한 성능 점수입니다.
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-4xl font-bold ${getScoreColor(performanceScore)}`}>
                      {performanceScore.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-400">/ 100점</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 메트릭 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* 페이지 로딩 시간 */}
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">⏱️ 로딩 시간</h3>
                  <span className={`text-sm px-2 py-1 rounded ${
                    metrics.pageLoadTime < 1000 ? 'bg-green-600' :
                    metrics.pageLoadTime < 3000 ? 'bg-yellow-600' : 'bg-red-600'
                  }`}>
                    {metrics.pageLoadTime < 1000 ? '좋음' :
                     metrics.pageLoadTime < 3000 ? '보통' : '느림'}
                  </span>
                </div>
                <div className="text-2xl font-bold text-blue-400">
                  {metrics.pageLoadTime.toFixed(0)}ms
                </div>
                <div className="text-sm text-gray-400 mt-2">
                  페이지 완전 로딩 시간
                </div>
              </div>

              {/* 메모리 사용량 */}
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">💾 메모리</h3>
                  <span className={`text-sm px-2 py-1 rounded ${
                    metrics.memoryUsage < 50 * 1024 * 1024 ? 'bg-green-600' :
                    metrics.memoryUsage < 100 * 1024 * 1024 ? 'bg-yellow-600' : 'bg-red-600'
                  }`}>
                    {metrics.memoryUsage < 50 * 1024 * 1024 ? '좋음' :
                     metrics.memoryUsage < 100 * 1024 * 1024 ? '보통' : '높음'}
                  </span>
                </div>
                <div className="text-2xl font-bold text-green-400">
                  {(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB
                </div>
                <div className="text-sm text-gray-400 mt-2">
                  JavaScript 힙 사용량
                </div>
              </div>
            </div>

            {/* 상세 메트릭 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* 네트워크 및 캐시 */}
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">🌐 네트워크 & 캐시</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-300">캐시 적중률:</span>
                    <span className="text-green-400 font-mono">
                      {(metrics.cacheHitRate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">검색 응답시간:</span>
                    <span className="text-purple-400 font-mono">
                      {metrics.searchResponseTime.toFixed(0)}ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">이미지 최적화율:</span>
                    <span className="text-yellow-400 font-mono">
                      {metrics.imageOptimizationRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* 시스템 리소스 */}
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">⚙️ 시스템 리소스</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-300">검색 인덱스 크기:</span>
                    <span className="text-indigo-400 font-mono">
                      {searchStats?.totalIndexedTokens || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">저장된 필터:</span>
                    <span className="text-pink-400 font-mono">
                      {searchStats?.totalSavedFilters || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 최적화 제안 */}
            {optimizationSuggestions.length > 0 && (
              <div className="mb-8">
                <div className="bg-gradient-to-r from-orange-900 to-red-900 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-white mb-4">
                    💡 최적화 제안
                  </h3>
                  <div className="space-y-2">
                    {optimizationSuggestions.map((suggestion, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <span className="text-yellow-400 mt-1">•</span>
                        <span className="text-gray-200">{suggestion}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 알림 섹션 */}
            <div className="mb-8">
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">
                  🔔 실시간 알림 ({alerts.length})
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {alerts.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">
                      현재 알림이 없습니다.
                    </p>
                  ) : (
                    alerts.map((alert, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border-l-4 ${
                          alert.severity === 3
                            ? 'bg-red-900 border-red-500'
                            : alert.severity === 2
                            ? 'bg-yellow-900 border-yellow-500'
                            : 'bg-blue-900 border-blue-500'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className={`text-sm px-2 py-1 rounded ${
                                alert.severity === 3 ? 'bg-red-600' :
                                alert.severity === 2 ? 'bg-yellow-600' : 'bg-blue-600'
                              }`}>
                                {alert.severity === 3 ? '심각' :
                                 alert.severity === 2 ? '경고' : '정보'}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(alert.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-200">{alert.message}</p>
                            {alert.action && (
                              <p className="text-xs text-gray-400 mt-1">
                                권장 조치: {alert.action}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* 성능 트렌드 차트 */}
            <div className="mb-8">
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">
                  📈 성능 트렌드
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {searchStats?.averageSearchTime || 0}ms
                    </div>
                    <div className="text-sm text-gray-400">평균 검색 시간</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {searchStats?.totalSearchHistory || 0}
                    </div>
                    <div className="text-sm text-gray-400">검색 히스토리</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">
                      {searchStats?.popularFilters?.length || 0}
                    </div>
                    <div className="text-sm text-gray-400">인기 필터</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 홈으로 돌아가기 버튼 */}
            <div className="text-center">
              <a
                href="/"
                className="inline-flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>홈으로 돌아가기</span>
              </a>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
} 