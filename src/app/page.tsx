'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getAllCustomers } from '@/lib/customers'
import { getAllEquipment } from '@/lib/equipment'
import { getAllWorkRecords } from '@/lib/work-records'

export default function Home() {
  const [stats, setStats] = useState({
    customers: 0,
    equipment: 0,
    workRecords: 0,
    completedWorks: 0
  })
  const [recentActivities, setRecentActivities] = useState<any[]>([])
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

      // 최근 5개 작업 기록
      const recent = workRecords
        .sort((a, b) => new Date(b.workDate).getTime() - new Date(a.workDate).getTime())
        .slice(0, 5)
        .map(record => {
          const customer = customers.find(c => c.id === record.customerId)
          const equip = equipment.find(e => e.id === record.equipmentId)
          return {
            ...record,
            customerName: customer?.name || '알 수 없음',
            equipmentInfo: `${equip?.manufacturer || ''} ${equip?.model || ''}`.trim() || '알 수 없음'
          }
        })

      setRecentActivities(recent)
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
      color: 'from-blue-500 to-blue-600',
      hoverColor: 'hover:from-blue-600 hover:to-blue-700'
    },
    {
      title: '장비 관리',
      description: '농기계 및 건설기계를 등록합니다',
      href: '/equipment',
      icon: '🚜',
      color: 'from-green-500 to-green-600',
      hoverColor: 'hover:from-green-600 hover:to-green-700'
    },
    {
      title: '작업 등록',
      description: 'ECU 튜닝 작업을 등록합니다',
      href: '/work',
      icon: '⚙️',
      color: 'from-orange-500 to-orange-600',
      hoverColor: 'hover:from-orange-600 hover:to-orange-700'
    },
    {
      title: '작업 이력',
      description: '모든 작업 기록을 조회합니다',
      href: '/history',
      icon: '📋',
      color: 'from-purple-500 to-purple-600',
      hoverColor: 'hover:from-purple-600 hover:to-purple-700'
    }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case '완료':
        return <span className="badge-success">{status}</span>
      case '진행중':
        return <span className="badge-warning">{status}</span>
      case '예약':
        return <span className="badge-info">{status}</span>
      default:
        return <span className="badge-danger">{status}</span>
    }
  }

  return (
    <div className="space-y-8">
      {/* 헤더 섹션 */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4 animate-fadeIn">
          ECU 관리 시스템
        </h1>
        <p className="text-xl text-white/80 animate-slideIn">
          농기계 및 건설기계 ECU 전문 튜닝 관리 시스템
        </p>
      </div>

      {/* 통계 카드 섹션 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-modern rounded-xl p-6 text-center animate-fadeIn">
          <div className="text-3xl mb-2">👥</div>
          <div className="text-2xl font-bold text-gray-800 mb-1">
            {isLoading ? <div className="spinner mx-auto w-6 h-6"></div> : stats.customers}
          </div>
          <div className="text-sm text-gray-600">등록된 고객</div>
        </div>

        <div className="card-modern rounded-xl p-6 text-center animate-fadeIn" style={{animationDelay: '0.1s'}}>
          <div className="text-3xl mb-2">🚜</div>
          <div className="text-2xl font-bold text-gray-800 mb-1">
            {isLoading ? <div className="spinner mx-auto w-6 h-6"></div> : stats.equipment}
          </div>
          <div className="text-sm text-gray-600">등록된 장비</div>
        </div>

        <div className="card-modern rounded-xl p-6 text-center animate-fadeIn" style={{animationDelay: '0.2s'}}>
          <div className="text-3xl mb-2">⚙️</div>
          <div className="text-2xl font-bold text-gray-800 mb-1">
            {isLoading ? <div className="spinner mx-auto w-6 h-6"></div> : stats.workRecords}
          </div>
          <div className="text-sm text-gray-600">총 작업 수</div>
        </div>

        <div className="card-modern rounded-xl p-6 text-center animate-fadeIn" style={{animationDelay: '0.3s'}}>
          <div className="text-3xl mb-2">✅</div>
          <div className="text-2xl font-bold text-gray-800 mb-1">
            {isLoading ? <div className="spinner mx-auto w-6 h-6"></div> : stats.completedWorks}
          </div>
          <div className="text-sm text-gray-600">완료된 작업</div>
        </div>
      </div>

      {/* 빠른 작업 섹션 */}
      <div className="card-modern rounded-xl p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">빠른 작업</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, index) => (
            <Link
              key={action.href}
              href={action.href}
              className={`bg-gradient-to-r ${action.color} ${action.hoverColor} text-white p-6 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl animate-fadeIn`}
              style={{animationDelay: `${index * 0.1}s`}}
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

      {/* 최근 활동 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card-modern rounded-xl p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="text-2xl mr-2">📈</span>
            최근 작업 활동
          </h3>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="spinner"></div>
            </div>
          ) : recentActivities.length > 0 ? (
            <div className="space-y-3">
              {recentActivities.map((activity, index) => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{activity.customerName}</div>
                    <div className="text-sm text-gray-600">{activity.equipmentInfo}</div>
                    <div className="text-xs text-gray-500">{new Date(activity.workDate).toLocaleDateString('ko-KR')}</div>
                  </div>
                  <div className="ml-4">
                    {getStatusBadge(activity.status)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📝</div>
              <p>아직 작업 기록이 없습니다</p>
            </div>
          )}
        </div>

        <div className="card-modern rounded-xl p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="text-2xl mr-2">🔧</span>
            시스템 정보
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-3 animate-pulse"></div>
                <span className="text-gray-700">데이터베이스 연결</span>
              </div>
              <span className="text-green-600 font-medium">정상</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-400 rounded-full mr-3"></div>
                <span className="text-gray-700">Supabase 연동</span>
              </div>
              <span className="text-blue-600 font-medium">활성</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-400 rounded-full mr-3"></div>
                <span className="text-gray-700">시스템 버전</span>
              </div>
              <span className="text-purple-600 font-medium">v1.0.0</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-orange-400 rounded-full mr-3"></div>
                <span className="text-gray-700">파일 업로드</span>
              </div>
              <span className="text-orange-600 font-medium">지원</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
