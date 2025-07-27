'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      title: '장비 관리',
      description: '농기계 및 건설기계를 등록합니다',
      href: '/equipment',
      icon: '🚜',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      title: '작업 등록',
      description: 'ECU 튜닝 작업을 등록합니다',
      href: '/work',
      icon: '⚙️',
      color: 'bg-orange-500 hover:bg-orange-600'
    },
    {
      title: '작업 이력',
      description: '모든 작업 기록을 조회합니다',
      href: '/history',
      icon: '📋',
      color: 'bg-purple-500 hover:bg-purple-600'
    }
  ]

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-900">
        <Navigation />
        <main className="pt-20 pb-8">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-8">
              {/* 헤더 섹션 */}
              <div className="text-center">
                <h1 className="text-4xl font-bold text-white mb-4">
                  Tuning Box
                </h1>
                <p className="text-xl text-gray-300">
                  농기계 및 건설기계 ECU 전문 튜닝 관리 시스템
                </p>
              </div>

              {/* 통계 카드 섹션 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gray-800 rounded-lg p-6 shadow-md text-center">
                  <div className="text-3xl mb-2">👥</div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {isLoading ? '...' : stats.customers}
                  </div>
                  <div className="text-sm text-gray-300">등록된 고객</div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6 shadow-md text-center">
                  <div className="text-3xl mb-2">🚜</div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {isLoading ? '...' : stats.equipment}
                  </div>
                  <div className="text-sm text-gray-300">등록된 장비</div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6 shadow-md text-center">
                  <div className="text-3xl mb-2">⚙️</div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {isLoading ? '...' : stats.workRecords}
                  </div>
                  <div className="text-sm text-gray-300">총 작업 수</div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6 shadow-md text-center">
                  <div className="text-3xl mb-2">✅</div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {isLoading ? '...' : stats.completedWorks}
                  </div>
                  <div className="text-sm text-gray-300">완료된 작업</div>
                </div>
              </div>

              {/* 빠른 작업 섹션 */}
              <div className="bg-gray-800 rounded-lg p-8 shadow-md">
                <h2 className="text-2xl font-bold text-white mb-6 text-center">빠른 작업</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {quickActions.map((action) => (
                    <Link
                      key={action.href}
                      href={action.href}
                      className={`${action.color} text-white p-6 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg`}
                    >
                      <div className="text-center">
                        <div className="text-4xl mb-3">{action.icon}</div>
                        <h3 className="text-lg font-semibold mb-2">{action.title}</h3>
                        <p className="text-sm opacity-90">{action.description}</p>
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