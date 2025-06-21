'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ACU_TYPES, ACU_MANUFACTURERS, ACU_MODELS_BY_MANUFACTURER, ECU_MODELS, ECU_MAKERS, CONNECTION_METHODS, ECU_TOOL_CATEGORIES, ECU_TOOLS, ECU_TOOLS_FLAT, TUNING_WORKS, TUNING_CATEGORIES, TUNING_WORKS_BY_CATEGORY, WORK_STATUS } from '@/constants'
import { getAllCustomers, CustomerData } from '@/lib/customers'
import { getEquipmentByCustomerId, EquipmentData } from '@/lib/equipment'
import { createWorkRecord, WorkRecordData } from '@/lib/work-records'
import Navigation from '@/components/Navigation'
import AuthGuard from '@/components/AuthGuard'

export default function WorkPage() {
  const router = useRouter()
  
  // 실제 고객 데이터 state
  const [customers, setCustomers] = useState<CustomerData[]>([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true)
  
  // 오늘 날짜를 YYYY-MM-DD 형식으로 가져오기
  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    equipmentId: '',
    workDate: getTodayDate(),
    price: '',
    status: '예약' // 기본값을 예약으로 설정
  })

  // 선택된 고객의 장비 목록
  const [availableEquipment, setAvailableEquipment] = useState<EquipmentData[]>([])
  
  // 고객 자동완성 관련 state
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerData[]>([])

  const dropdownRef = useRef<HTMLDivElement>(null)

  // 컴포넌트 마운트 시 고객 데이터 로드
  useEffect(() => {
    loadCustomers()
  }, [])

  // 클릭 외부 감지 및 키보드 이벤트 처리
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowCustomerDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const loadCustomers = async () => {
    try {
      setIsLoadingCustomers(true)
      const customerData = await getAllCustomers()
      setCustomers(customerData)
      setFilteredCustomers(customerData)
    } catch (error) {
      console.error('Failed to load customers:', error)
    } finally {
      setIsLoadingCustomers(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    if (name === 'customerName') {
      setFormData(prev => ({ ...prev, customerName: value, customerId: '' }))
      
      // 고객 이름으로 필터링
      if (value.trim() === '') {
        setFilteredCustomers(customers)
      } else {
        const filtered = customers.filter(customer =>
          customer.name.toLowerCase().includes(value.toLowerCase()) ||
          customer.phone.includes(value) ||
          customer.roadAddress.toLowerCase().includes(value.toLowerCase())
        )
        setFilteredCustomers(filtered)
      }
      setShowCustomerDropdown(true)
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleCustomerSelect = async (customer: CustomerData) => {
    setFormData(prev => ({
      ...prev,
      customerId: customer.id.toString(),
      customerName: customer.name
    }))
    setShowCustomerDropdown(false)
    
    // 선택된 고객의 장비 목록 로드
    try {
      const equipment = await getEquipmentByCustomerId(customer.id)
      setAvailableEquipment(equipment)
    } catch (error) {
      console.error('Failed to load equipment:', error)
      setAvailableEquipment([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.customerId || !formData.equipmentId) {
      alert('고객과 장비를 모두 선택해주세요.')
      return
    }

    try {
      const workRecordData = {
        customerId: parseInt(formData.customerId),
        equipmentId: parseInt(formData.equipmentId),
        workDate: formData.workDate,
        workType: 'ECU 튜닝',
        price: formData.price ? parseFloat(formData.price) : undefined,
        status: formData.status
      }

      await createWorkRecord(workRecordData)
      alert('작업이 성공적으로 등록되었습니다!')
      router.push('/history')
    } catch (error) {
      console.error('Failed to create work record:', error)
      alert('작업 등록 중 오류가 발생했습니다.')
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-900">
        <Navigation />
        <main className="pt-20 pb-8">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-6">
              {/* 페이지 헤더 */}
              <div>
                <h1 className="text-3xl font-bold text-white">작업 등록</h1>
                <p className="mt-2 text-gray-300">
                  새로운 ECU 튜닝 작업을 등록하고 관리합니다.
                </p>
              </div>

              {/* 작업 등록 폼 */}
              <div className="bg-gray-800 shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-white mb-6">새 작업 등록</h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* 고객 및 장비 정보 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="relative" ref={dropdownRef}>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        고객 선택 *
                      </label>
                      <input
                        type="text"
                        name="customerName"
                        value={formData.customerName}
                        onChange={handleInputChange}
                        onFocus={() => {
                          // 포커스 시 전체 고객 목록 표시
                          setFilteredCustomers(customers)
                          setShowCustomerDropdown(true)
                        }}
                        className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="고객을 선택하거나 검색하세요..."
                        required
                        autoComplete="off"
                      />
                      
                      {/* 고객 자동완성 드롭다운 */}
                      {showCustomerDropdown && (
                        <div className="absolute z-10 mt-1 w-full bg-gray-700 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                          {isLoadingCustomers ? (
                            <div className="px-4 py-3 text-gray-400 text-center">
                              고객 데이터 로딩 중...
                            </div>
                          ) : filteredCustomers.length > 0 ? (
                            <>
                              {formData.customerName.trim() === '' && (
                                <div className="px-4 py-2 bg-gray-600 text-sm text-gray-300 border-b border-gray-600">
                                  전체 고객 목록 ({filteredCustomers.length}명)
                                </div>
                              )}
                              {filteredCustomers.map((customer) => (
                                <div
                                  key={customer.id}
                                  onClick={() => handleCustomerSelect(customer)}
                                  className="px-4 py-3 hover:bg-gray-600 cursor-pointer border-b border-gray-600 last:border-b-0"
                                >
                                  <div className="font-medium text-white">{customer.name}</div>
                                  <div className="text-sm text-gray-400">{customer.phone}</div>
                                  <div className="text-xs text-gray-500">{customer.roadAddress}</div>
                                </div>
                              ))}
                            </>
                          ) : (
                            <div className="px-4 py-3 text-gray-400 text-center">
                              {formData.customerName.trim() === '' ? '고객 데이터를 불러오지 못했습니다.' : '검색 결과가 없습니다.'}
                            </div>
                          )}
                        </div>
                      )}

                      {formData.customerId && (
                        <div className="mt-2 p-3 bg-blue-900 border border-blue-700 rounded-md">
                          <p className="text-sm text-blue-300">
                            📍 {customers.find(c => c.id.toString() === formData.customerId)?.roadAddress}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        장비 선택 *
                      </label>
                      <select
                        name="equipmentId"
                        value={formData.equipmentId}
                        onChange={handleInputChange}
                        className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                        disabled={!formData.customerId}
                      >
                        <option value="">
                          {formData.customerId ? '장비를 선택하세요' : '먼저 고객을 선택하세요'}
                        </option>
                        {availableEquipment.map((equipment) => (
                          <option key={equipment.id} value={equipment.id}>
                            {equipment.equipmentType} - {equipment.manufacturer} {equipment.model}
                          </option>
                        ))}
                      </select>
                      {formData.equipmentId && (
                        <div className="mt-2 p-3 bg-green-900 border border-green-700 rounded-md">
                          <p className="text-sm text-green-300">
                            🚜 기대번호: {availableEquipment.find(e => e.id.toString() === formData.equipmentId)?.serialNumber}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        작업 날짜 *
                      </label>
                      <input
                        type="date"
                        name="workDate"
                        value={formData.workDate}
                        onChange={handleInputChange}
                        className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        작업 금액 (원)
                      </label>
                      <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="예: 500000"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        작업 상태 *
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        {WORK_STATUS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 제출 버튼 */}
                  <div className="flex justify-end space-x-4 pt-6 border-t border-gray-600">
                    <button
                      type="button"
                      onClick={() => router.push('/history')}
                      className="px-6 py-2 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      작업 등록
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
} 