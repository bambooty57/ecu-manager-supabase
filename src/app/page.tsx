'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getAllCustomers } from '@/lib/customers'
import { getAllEquipment } from '@/lib/equipment'
import { getAllWorkRecords } from '@/lib/work-records'
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

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [customers, equipment, workRecords] = await Promise.all([
        getAllCustomers(),
        getAllEquipment(),
        getAllWorkRecords()
      ])

      setStats({
        customers: customers.length,
        equipment: equipment.length,
        workRecords: workRecords.length,
        completedWorks: workRecords.filter(record => record.status === '완료').length
      })
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const quickActions = [
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
  ]

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navigation />
        <main className="pt-24 pb-12">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-10">
              {/* 헤더 섹션 */}
              <div className="text-center mb-12">
                <div className="mb-10 flex justify-center">
                  <div className="relative w-full max-w-7xl h-[600px] md:h-[700px] lg:h-[800px] rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-200 bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 flex items-center justify-center p-6 md:p-8 lg:p-10">
                    <div className="relative w-full h-full">
                      <Image
                        src="/track-force-hero.png"
                        alt="Track-Force Power Tuning"
                        fill
                        className="object-contain"
                        priority
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1280px"
                        onError={(e) => {
                          // 이미지 로드 실패 시 숨김 처리
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  </div>
                </div>
                <h1 className="text-7xl md:text-8xl font-bold text-slate-800 mb-6 tracking-tight drop-shadow-lg">
                  Track-Force
                </h1>
                <p className="text-3xl md:text-4xl text-slate-700 font-bold mb-2">
                  Power Tuning
                </p>
                <p className="text-xl md:text-2xl text-slate-600 font-medium">
                  농기계 및 건설기계 ECU 전문 튜닝 관리 시스템
                </p>
              </div>

              {/* 통계 카드 섹션 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-blue-100 text-center hover:shadow-xl transition-all duration-300">
                  <div className="text-5xl mb-4">👥</div>
                  <div className="text-4xl font-bold text-slate-700 mb-2">
                    {isLoading ? '...' : stats.customers}
                  </div>
                  <div className="text-lg text-slate-600 font-medium">등록된 고객</div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-green-100 text-center hover:shadow-xl transition-all duration-300">
                  <div className="text-5xl mb-4">🚜</div>
                  <div className="text-4xl font-bold text-slate-700 mb-2">
                    {isLoading ? '...' : stats.equipment}
                  </div>
                  <div className="text-lg text-slate-600 font-medium">등록된 장비</div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-orange-100 text-center hover:shadow-xl transition-all duration-300">
                  <div className="text-5xl mb-4">⚙️</div>
                  <div className="text-4xl font-bold text-slate-700 mb-2">
                    {isLoading ? '...' : stats.workRecords}
                  </div>
                  <div className="text-lg text-slate-600 font-medium">총 작업 수</div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-purple-100 text-center hover:shadow-xl transition-all duration-300">
                  <div className="text-5xl mb-4">✅</div>
                  <div className="text-4xl font-bold text-slate-700 mb-2">
                    {isLoading ? '...' : stats.completedWorks}
                  </div>
                  <div className="text-lg text-slate-600 font-medium">완료된 작업</div>
                </div>
              </div>

              {/* 빠른 작업 섹션 */}
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-10 shadow-xl border border-slate-200">
                <h2 className="text-4xl font-bold text-slate-700 mb-10 text-center">빠른 작업</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {quickActions.map((action) => (
                    <Link
                      key={action.href}
                      href={action.href}
                      className={`${action.color} text-white p-8 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-2xl transform hover:-translate-y-2`}
                    >
                      <div className="text-center">
                        <div className="text-6xl mb-4">{action.icon}</div>
                        <h3 className="text-2xl font-bold mb-3">{action.title}</h3>
                        <p className="text-lg opacity-95 leading-relaxed">{action.description}</p>
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