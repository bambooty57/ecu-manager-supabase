'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getAllCustomers } from '@/lib/customers'
import { getAllEquipment } from '@/lib/equipment'
import { getAllWorkRecords } from '@/lib/work-records'
import { cacheManager, CacheKeys, CacheTTL } from '@/lib/cache-manager'
import { logger } from '@/lib/logger'
import Navigation from '@/components/Navigation'
import AuthGuard from '@/components/AuthGuard'

export default function Home() {
  const [stats, setStats] = useState({
    customers: 0,
    equipment: 0,
    workRecords: 0,
    completedWorks: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [heroImageError, setHeroImageError] = useState(false)

  // 캐시된 데이터 로딩 함수
  const loadDashboardData = useCallback(async () => {
    try {
      // 캐시에서 먼저 확인
      const cacheKey = 'dashboard_stats'
      const cachedStats = await cacheManager.get<typeof stats>(cacheKey)
      
      if (cachedStats) {
        logger.log('⚡ 대시보드 통계를 캐시에서 로드')
        setStats(cachedStats)
        setIsLoading(false)
        return
      }

      logger.log('🔄 대시보드 데이터 로딩 중...')
      const [customers, equipment, workRecords] = await Promise.all([
        getAllCustomers(),
        getAllEquipment(),
        getAllWorkRecords()
      ])

      const newStats = {
        customers: customers.length,
        equipment: equipment.length,
        workRecords: workRecords.length,
        completedWorks: workRecords.filter(record => record.status === '완료').length
      }

      setStats(newStats)
      
      // 캐시에 저장 (5분간 유지)
      await cacheManager.set(cacheKey, newStats, CacheTTL.SHORT)
      logger.log('💾 대시보드 통계 캐시 저장 완료')
    } catch (error) {
      logger.error('대시보드 데이터 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // 통계 카드 데이터 메모이제이션
  const statsCards = useMemo(() => [
    {
      icon: '👥',
      value: stats.customers,
      label: '등록된 고객',
      borderColor: 'border-blue-100'
    },
    {
      icon: '🚜',
      value: stats.equipment,
      label: '등록된 장비',
      borderColor: 'border-green-100'
    },
    {
      icon: '⚙️',
      value: stats.workRecords,
      label: '총 작업 수',
      borderColor: 'border-orange-100'
    },
    {
      icon: '✅',
      value: stats.completedWorks,
      label: '완료된 작업',
      borderColor: 'border-purple-100'
    }
  ], [stats])

  // 빠른 작업 메뉴 메모이제이션
  const quickActions = useMemo(() => [
    {
      title: '고객 관리',
      description: '고객 정보를 등록하고 관리합니다',
      href: '/customers',
      icon: '👥',
      color: 'bg-gradient-to-br from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600'
    },
    {
      title: '장비 관리',
      description: '농기계 및 건설기계를 등록합니다',
      href: '/equipment',
      icon: '🚜',
      color: 'bg-gradient-to-br from-emerald-400 to-green-500 hover:from-emerald-500 hover:to-green-600'
    },
    {
      title: '작업 등록',
      description: 'ECU 튜닝 작업을 등록합니다',
      href: '/work',
      icon: '⚙️',
      color: 'bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600'
    },
    {
      title: '작업 이력',
      description: '모든 작업 기록을 조회합니다',
      href: '/history',
      icon: '📋',
      color: 'bg-gradient-to-br from-violet-400 to-purple-500 hover:from-violet-500 hover:to-purple-600'
    }
  ], [])

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navigation />
        <main className="pt-20 sm:pt-24 pb-8 sm:pb-12">
          <div className="max-w-full mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
            <div className="space-y-6 sm:space-y-8 md:space-y-10">
              {/* 헤더 섹션 */}
              <div className="text-center mb-6 sm:mb-8 md:mb-12">
                <div className="flex justify-center">
                  <div className="relative w-full max-w-5xl h-[250px] sm:h-[350px] md:h-[450px] lg:h-[500px] xl:h-[600px] rounded-xl sm:rounded-2xl md:rounded-3xl overflow-hidden shadow-xl sm:shadow-2xl border-2 sm:border-4 border-slate-200 bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 flex items-center justify-center p-3 sm:p-4 md:p-6 lg:p-8">
                    {/* Fallback UI - 에러 상태일 때만 표시 */}
                    {heroImageError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center h-full text-center p-8 z-10">
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-700 mb-4">Track-Force</h1>
                        <p className="text-xl sm:text-2xl text-slate-600">Power Tuning System</p>
                      </div>
                    )}
                    {/* Image 컴포넌트 - 항상 렌더링하여 복구 가능하게 함 */}
                    <div className={`relative w-full h-full ${heroImageError ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                      <Image
                        src="/track-force-hero.png"
                        alt="Track-Force Power Tuning"
                        fill
                        className="object-contain"
                        priority
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1280px"
                        onError={() => setHeroImageError(true)}
                        onLoad={() => setHeroImageError(false)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 통계 카드 섹션 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
                {statsCards.map((card, index) => (
                  <div
                    key={index}
                    className={`bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-lg border ${card.borderColor} text-center hover:shadow-xl transition-all duration-300`}
                  >
                    <div className="text-4xl sm:text-5xl mb-2 sm:mb-3 md:mb-4">{card.icon}</div>
                    <div className="text-3xl sm:text-4xl font-bold text-slate-700 mb-1 sm:mb-2">
                      {isLoading ? '...' : card.value}
                    </div>
                    <div className="text-sm sm:text-base md:text-lg text-slate-600 font-medium">{card.label}</div>
                  </div>
                ))}
              </div>

              {/* 빠른 작업 섹션 */}
              <div className="bg-white/70 backdrop-blur-sm rounded-xl sm:rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 lg:p-10 shadow-xl border border-slate-200">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-700 mb-6 sm:mb-8 md:mb-10 text-center">빠른 작업</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
                  {quickActions.map((action) => (
                    <Link
                      key={action.href}
                      href={action.href}
                      className={`${action.color} text-white p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-2xl transform hover:-translate-y-1 sm:hover:-translate-y-2`}
                    >
                      <div className="text-center">
                        <div className="text-4xl sm:text-5xl md:text-6xl mb-2 sm:mb-3 md:mb-4">{action.icon}</div>
                        <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3">{action.title}</h3>
                        <p className="text-sm sm:text-base md:text-lg opacity-95 leading-relaxed">{action.description}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}