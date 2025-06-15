'use client'

import { useState } from 'react'
import { ECU_TYPES, CONNECTION_METHODS, ECU_TOOLS, TUNING_WORKS, EQUIPMENT_TYPES, MANUFACTURERS, TRACTOR_MODELS, MANUFACTURER_MODELS, WORK_HISTORY_DATA, WORK_STATUS } from '@/constants'

export default function HistoryPage() {
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    customer: '',
    equipmentType: '',
    manufacturer: '',
    model: '',
    ecuType: '',
    tuningWork: '',
    status: ''
  })
  
  const [workRecords] = useState(WORK_HISTORY_DATA)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  // 제조사별 모델명 목록 가져오기
  const getAvailableModels = (manufacturer: string) => {
    return MANUFACTURER_MODELS[manufacturer] || []
  }

  // 필터링된 작업 목록
  const filteredWorkRecords = workRecords.filter(record => {
    // 날짜 필터링
    if (filters.dateFrom && record.workDate < filters.dateFrom) return false
    if (filters.dateTo && record.workDate > filters.dateTo) return false
    
    // 고객명 필터링
    if (filters.customer && !record.customerName.toLowerCase().includes(filters.customer.toLowerCase())) return false
    
    // 장비종류 필터링
    if (filters.equipmentType && record.equipmentType !== filters.equipmentType) return false
    
    // 제조사 필터링
    if (filters.manufacturer && record.manufacturer !== filters.manufacturer) return false
    
    // 모델명 필터링
    if (filters.model && record.model !== filters.model) return false
    
    // ECU 타입 필터링
    if (filters.ecuType && record.ecuType !== filters.ecuType) return false
    
    // 튜닝작업 필터링
    if (filters.tuningWork && record.tuningWork !== filters.tuningWork) {
      // "기타"가 선택된 경우 customTuningWork도 확인
      if (filters.tuningWork === '기타' && record.tuningWork === '기타') {
        // 통과 (기타끼리 매칭)
      } else {
        return false
      }
    }
    
    // 작업상태 필터링
    if (filters.status && record.status !== filters.status) return false
    
    return true
  })

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    if (name === 'manufacturer') {
      // 제조사 변경 시 모델명 초기화
      setFilters(prev => ({ 
        ...prev, 
        [name]: value,
        model: ''
      }))
    } else {
      setFilters(prev => ({ ...prev, [name]: value }))
    }
  }

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      customer: '',
      equipmentType: '',
      manufacturer: '',
      model: '',
      ecuType: '',
      tuningWork: '',
      status: ''
    })
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">작업 이력</h1>
          <p className="mt-2 text-gray-600">
            모든 ECU 튜닝 작업 이력을 조회하고 관리합니다.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 필터 섹션 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">검색 필터</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">고객명</label>
            <input
              type="text"
              name="customer"
              value={filters.customer}
              onChange={handleFilterChange}
              placeholder="고객명 검색"
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">장비 종류</label>
            <select
              name="equipmentType"
              value={filters.equipmentType}
              onChange={handleFilterChange}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">전체</option>
              {EQUIPMENT_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제조사</label>
            <select
              name="manufacturer"
              value={filters.manufacturer}
              onChange={handleFilterChange}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">전체</option>
              {MANUFACTURERS.map((manufacturer) => (
                <option key={manufacturer} value={manufacturer}>{manufacturer}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">모델명</label>
            <select
              name="model"
              value={filters.model}
              onChange={handleFilterChange}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              disabled={!filters.manufacturer}
            >
              <option value="">전체</option>
              {filters.manufacturer && getAvailableModels(filters.manufacturer).map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
            {!filters.manufacturer && (
              <p className="text-xs text-gray-500 mt-1">제조사를 먼저 선택하세요</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">튜닝 작업</label>
            <select
              name="tuningWork"
              value={filters.tuningWork}
              onChange={handleFilterChange}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">전체</option>
              {TUNING_WORKS.map((work) => (
                <option key={work} value={work}>{work}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ECU 타입</label>
            <select
              name="ecuType"
              value={filters.ecuType}
              onChange={handleFilterChange}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">전체</option>
              {ECU_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">작업 상태</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">전체</option>
              {WORK_STATUS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
            <input
              type="date"
              name="dateFrom"
              value={filters.dateFrom}
              onChange={handleFilterChange}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
            <input
              type="date"
              name="dateTo"
              value={filters.dateTo}
              onChange={handleFilterChange}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-gray-500">
            💡 기간을 입력하지 않으면 모든 기간의 자료를 검색합니다.
          </p>
          <div className="flex space-x-2">
            <button
              onClick={clearFilters}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              초기화
            </button>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              검색
            </button>
          </div>
        </div>
      </div>

      {/* 작업 목록 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">작업 목록</h2>
        </div>
        <div className="p-6">
          {filteredWorkRecords.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.712-3.714M14 40v-4a9.971 9.971 0 01.712-3.714m0 0A9.971 9.971 0 0118 32a9.971 9.971 0 013.288.714M14 36.286A9.971 9.971 0 0118 36c1.408 0 2.742.29 3.962.714" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">작업 이력이 없습니다</h3>
              <p className="mt-1 text-sm text-gray-500">
                새로운 작업을 등록하여 이력을 관리해보세요.
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  새 작업 등록
                </button>
              </div>
            </div>
          ) : (
            <>
              {viewMode === 'list' ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          작업일
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          고객/장비
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ECU/튜닝
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          상태
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          금액
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          작업
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredWorkRecords.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.workDate}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{record.customerName}</div>
                            <div className="text-sm text-gray-500">{record.equipmentType}</div>
                            <div className="text-xs text-gray-400">{record.manufacturer} {record.model}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{record.ecuType}</div>
                            <div className="text-sm text-gray-500">
                              {record.tuningWork === '기타' && record.customTuningWork 
                                ? record.customTuningWork 
                                : record.tuningWork}
                            </div>
                            <div className="text-xs text-gray-400">{record.connectionMethod}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              record.status === '완료' 
                                ? 'bg-green-100 text-green-800'
                                : record.status === '진행중'
                                ? 'bg-yellow-100 text-yellow-800'
                                : record.status === '예약'
                                ? 'bg-blue-100 text-blue-800'
                                : record.status === 'AS'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(record.price / 10000).toLocaleString()}만원
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-blue-600 hover:text-blue-900 mr-3">
                              상세보기
                            </button>
                            <button className="text-gray-600 hover:text-gray-900">
                              수정
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredWorkRecords.map((record) => (
                    <div key={record.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{record.customerName}</h3>
                          <p className="text-sm text-gray-500">{record.workDate}</p>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          record.status === '완료' 
                            ? 'bg-green-100 text-green-800'
                            : record.status === '진행중'
                            ? 'bg-yellow-100 text-yellow-800'
                            : record.status === '예약'
                            ? 'bg-blue-100 text-blue-800'
                            : record.status === 'AS'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {record.status}
                        </span>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">장비:</span>
                          <span className="text-sm text-gray-900">{record.equipmentType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">제조사:</span>
                          <span className="text-sm text-gray-900">{record.manufacturer}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">모델:</span>
                          <span className="text-sm text-gray-900">{record.model}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">ECU:</span>
                          <span className="text-sm text-gray-900">{record.ecuType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">작업:</span>
                          <span className="text-sm text-gray-900">
                            {record.tuningWork === '기타' && record.customTuningWork 
                              ? record.customTuningWork 
                              : record.tuningWork}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">금액:</span>
                          <span className="text-sm font-medium text-gray-900">{(record.price / 10000).toLocaleString()}만원</span>
                        </div>
                      </div>
                      
                      {record.notes && (
                        <div className="mb-4">
                          <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                            {record.notes}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex space-x-2">
                        <button className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700">
                          상세보기
                        </button>
                        <button className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200">
                          수정
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
} 