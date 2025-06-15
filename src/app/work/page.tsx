'use client'

import { useState, useEffect, useRef } from 'react'
import { ECU_CATEGORIES, ECU_TYPES, CONNECTION_METHODS, ECU_TOOL_CATEGORIES, ECU_TOOLS, ECU_TOOLS_FLAT, TUNING_WORKS, WORK_STATUS, CUSTOMERS_DATA, EQUIPMENT_DATA } from '@/constants'

export default function WorkPage() {
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
    ecuCategory: '',
    ecuToolCategory: '',
    connectionMethod: '',
    ecuType: '',
    ecuTypeCustom: '',
    tuningWork: '',
    customTuningWork: '',
    price: '',
    notes: '',
    status: '예약' // 기본값을 예약으로 설정
  })

  // 선택된 고객의 장비 목록
  const [availableEquipment, setAvailableEquipment] = useState<typeof EQUIPMENT_DATA>([])
  
  // 고객 자동완성 관련 state
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [filteredCustomers, setFilteredCustomers] = useState(CUSTOMERS_DATA)
  
  // 드롭다운 외부 클릭 감지용 ref
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    // 튜닝작업 변경 시 처리
    if (name === 'tuningWork') {
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        customTuningWork: value === '기타' ? prev.customTuningWork : '' // 기타가 아니면 초기화
      }))
      return
    }
    
    // 금액 입력 시 만원 단위를 원 단위로 변환
    if (name === 'price') {
      const priceInWon = value ? parseFloat(value) * 10000 : ''
      setFormData(prev => ({ ...prev, [name]: priceInWon.toString() }))
      return
    }
    
    setFormData(prev => ({ ...prev, [name]: value }))

    // 고객명 검색 처리
    if (name === 'customerName') {
      if (value.trim() === '') {
        setFilteredCustomers(CUSTOMERS_DATA)
        setShowCustomerDropdown(true) // 빈 값일 때도 드롭다운 유지
        // 고객명이 비어있으면 고객 ID도 초기화
        setFormData(prev => ({ ...prev, customerId: '', equipmentId: '' }))
        setAvailableEquipment([])
      } else {
        const filtered = CUSTOMERS_DATA.filter(customer =>
          customer.name.toLowerCase().includes(value.toLowerCase()) ||
          customer.phone.includes(value) ||
          customer.roadAddress.toLowerCase().includes(value.toLowerCase())
        )
        setFilteredCustomers(filtered)
        setShowCustomerDropdown(true)
      }
    }

    // 장비 선택 처리
    if (name === 'equipmentId') {
      setFormData(prev => ({ ...prev, [name]: value }))
    }

    // 기타 입력 처리
    if (!['customerName', 'equipmentId'].includes(name)) {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  // 고객 선택 처리
  const handleCustomerSelect = (customer: typeof CUSTOMERS_DATA[0]) => {
    setFormData(prev => ({
      ...prev,
      customerId: customer.id.toString(),
      customerName: customer.name,
      equipmentId: '' // 고객 변경 시 장비 선택 초기화
    }))
    setShowCustomerDropdown(false)

    // 선택된 고객의 장비 목록 업데이트
    const customerEquipment = EQUIPMENT_DATA.filter(equip => equip.customerId === customer.id)
    setAvailableEquipment(customerEquipment)
  }

  // 외부 클릭 시 드롭다운 닫기
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

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">작업 등록</h1>
        <p className="mt-2 text-gray-600">
          새로운 ECU 튜닝 작업을 등록하고 관리합니다.
        </p>
      </div>

      {/* 작업 등록 폼 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">새 작업 등록</h2>
        
        <form className="space-y-6">
          {/* 고객 및 장비 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="relative" ref={dropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                고객 선택 *
              </label>
              <input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleInputChange}
                onFocus={() => {
                  // 포커스 시 전체 고객 목록 표시
                  setFilteredCustomers(CUSTOMERS_DATA)
                  setShowCustomerDropdown(true)
                }}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="고객을 선택하거나 검색하세요..."
                required
                autoComplete="off"
                style={{ imeMode: 'active' }}
                lang="ko"
              />
              
              {/* 고객 자동완성 드롭다운 */}
              {showCustomerDropdown && filteredCustomers.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {formData.customerName.trim() === '' && (
                    <div className="px-4 py-2 bg-gray-50 text-sm text-gray-600 border-b border-gray-200">
                      전체 고객 목록 ({filteredCustomers.length}명)
                    </div>
                  )}
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => handleCustomerSelect(customer)}
                      className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">{customer.name}</div>
                      <div className="text-sm text-gray-500">{customer.phone}</div>
                      <div className="text-xs text-gray-400">{customer.roadAddress}</div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* 검색 결과가 없을 때 */}
              {showCustomerDropdown && filteredCustomers.length === 0 && formData.customerName.trim() !== '' && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
                  <div className="px-4 py-3 text-gray-500 text-center">
                    검색 결과가 없습니다.
                  </div>
                </div>
              )}

              {formData.customerId && (
                <div className="mt-2 p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-700">
                    📍 {CUSTOMERS_DATA.find(c => c.id.toString() === formData.customerId)?.roadAddress}
                  </p>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                장비 선택 *
              </label>
              <select
                name="equipmentId"
                value={formData.equipmentId}
                onChange={handleInputChange}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
                <div className="mt-2 p-3 bg-green-50 rounded-md">
                  <p className="text-sm text-green-700">
                    🚜 {availableEquipment.find(e => e.id.toString() === formData.equipmentId)?.serial}
                  </p>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                작업 날짜 *
              </label>
              <input
                type="date"
                name="workDate"
                value={formData.workDate}
                onChange={handleInputChange}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* ECU 정보 */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">ECU 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ECU 타입 *
                </label>
                <select
                  name="ecuCategory"
                  value={formData.ecuCategory}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">ECU 타입을 선택하세요</option>
                  {ECU_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ECU 장비 카테고리 *
                </label>
                <select
                  name="ecuToolCategory"
                  value={formData.ecuToolCategory}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">장비 카테고리를 선택하세요</option>
                  {ECU_TOOL_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  연결 방법 *
                </label>
                <select
                  name="connectionMethod"
                  value={formData.connectionMethod}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">연결 방법을 선택하세요</option>
                  {CONNECTION_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ECU 종류 *
                  </label>
                  <select
                    name="ecuType"
                    value={formData.ecuType}
                    onChange={handleInputChange}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">ECU 종류를 선택하세요</option>
                    {ECU_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    추가 정보 (직접 입력)
                  </label>
                  <input
                    type="text"
                    name="ecuTypeCustom"
                    value={formData.ecuTypeCustom}
                    onChange={handleInputChange}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="추가 ECU 정보나 세부 모델명을 입력하세요..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    선택한 ECU의 세부 모델명이나 추가 정보를 입력할 수 있습니다
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  튜닝 작업 *
                </label>
                <select
                  name="tuningWork"
                  value={formData.tuningWork}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">튜닝 작업을 선택하세요</option>
                  {TUNING_WORKS.map((work) => (
                    <option key={work} value={work}>
                      {work}
                    </option>
                  ))}
                </select>
                
                {/* 기타 선택 시 직접 입력란 */}
                {formData.tuningWork === '기타' && (
                  <div className="mt-3">
                    <input
                      type="text"
                      name="customTuningWork"
                      value={formData.customTuningWork}
                      onChange={handleInputChange}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="튜닝 작업 내용을 직접 입력하세요..."
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      예: 인젝터 튜닝, 터보 압력 조정, 커스텀 맵핑 등
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 작업 상세 정보 */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">작업 상세 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  작업 상태 *
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {WORK_STATUS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  작업의 현재 상태를 선택하세요
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  작업 금액 (만원)
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price ? (parseFloat(formData.price) / 10000).toString() : ''}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="35 (35만원)"
                  min="0"
                  step="0.1"
                />
                <p className="mt-1 text-xs text-gray-500">
                  만원 단위로 입력하세요 (예: 35 = 35만원)
                </p>
              </div>
            </div>
            
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                작업 노트
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={4}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="작업 내용, 특이사항, 주의사항 등을 입력하세요..."
              />
            </div>
          </div>

          {/* 파일 업로드 */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">파일 첨부</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  원본 ECU 파일
                </label>
                <div className="flex items-center space-x-3 mb-2">
                  <input
                    type="file"
                    id="original-file"
                    className="hidden"
                                           onChange={(e) => {
                         const fileName = e.target.files?.[0]?.name || '';
                         const label = document.querySelector('label[for="original-file"] .file-name');
                         if (label) label.textContent = fileName || '📁 파일을 선택하세요';
                       }}
                  />
                  <label
                    htmlFor="original-file"
                    className="flex items-center justify-center px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    <svg className="w-6 h-6 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="file-name text-sm text-gray-600">📁 파일을 선택하세요</span>
                  </label>
                </div>
                <input
                  type="text"
                  placeholder="파일 설명을 입력하세요 (예: 원본 백업 파일, 읽기 전용 등)"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  모든 파일 형식 지원
                </p>
              </div>

              {/* 튜닝된 ECU 파일 - Stage별 구분 */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">튜닝된 ECU 파일</h4>
                
                                 {/* Stage 1 */}
                 <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                   <label className="block text-sm font-medium text-green-800 mb-2">
                     📈 Stage 1 (경량 튜닝)
                   </label>
                   <div className="flex items-center space-x-3 mb-2">
                     <input
                       type="file"
                       id="stage1-file"
                       className="hidden"
                       onChange={(e) => {
                         const fileName = e.target.files?.[0]?.name || '';
                         const label = document.querySelector('label[for="stage1-file"] .file-name');
                         if (label) label.textContent = fileName || '📄 Stage 1 파일 선택';
                       }}
                     />
                     <label
                       htmlFor="stage1-file"
                       className="flex items-center justify-center px-4 py-2 border-2 border-dashed border-green-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-100 transition-colors"
                     >
                       <svg className="w-6 h-6 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                       </svg>
                       <span className="file-name text-sm text-green-700">📄 Stage 1 파일 선택</span>
                     </label>
                   </div>
                   <input
                     type="text"
                     placeholder="Stage 1 파일 설명 (예: 연비 최적화, DPF 제거 등)"
                     className="w-full border-green-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                   />
                 </div>

                 {/* Stage 2 */}
                 <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                   <label className="block text-sm font-medium text-yellow-800 mb-2">
                     🚀 Stage 2 (중간 튜닝)
                   </label>
                   <div className="flex items-center space-x-3 mb-2">
                     <input
                       type="file"
                       id="stage2-file"
                       className="hidden"
                       onChange={(e) => {
                         const fileName = e.target.files?.[0]?.name || '';
                         const label = document.querySelector('label[for="stage2-file"] .file-name');
                         if (label) label.textContent = fileName || '⚡ Stage 2 파일 선택';
                       }}
                     />
                     <label
                       htmlFor="stage2-file"
                       className="flex items-center justify-center px-4 py-2 border-2 border-dashed border-yellow-300 rounded-lg cursor-pointer hover:border-yellow-500 hover:bg-yellow-100 transition-colors"
                     >
                       <svg className="w-6 h-6 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                       </svg>
                       <span className="file-name text-sm text-yellow-800">⚡ Stage 2 파일 선택</span>
                     </label>
                   </div>
                   <input
                     type="text"
                     placeholder="Stage 2 파일 설명 (예: 파워업 + 연비, EGR+DPF 제거 등)"
                     className="w-full border-yellow-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500"
                   />
                 </div>

                 {/* Stage 3 */}
                 <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                   <label className="block text-sm font-medium text-red-800 mb-2">
                     🔥 Stage 3 (고성능 튜닝)
                   </label>
                   <div className="flex items-center space-x-3 mb-2">
                     <input
                       type="file"
                       id="stage3-file"
                       className="hidden"
                       onChange={(e) => {
                         const fileName = e.target.files?.[0]?.name || '';
                         const label = document.querySelector('label[for="stage3-file"] .file-name');
                         if (label) label.textContent = fileName || '🔥 Stage 3 파일 선택';
                       }}
                     />
                     <label
                       htmlFor="stage3-file"
                       className="flex items-center justify-center px-4 py-2 border-2 border-dashed border-red-300 rounded-lg cursor-pointer hover:border-red-500 hover:bg-red-100 transition-colors"
                     >
                       <svg className="w-6 h-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                       </svg>
                       <span className="file-name text-sm text-red-800">🔥 Stage 3 파일 선택</span>
                     </label>
                   </div>
                   <input
                     type="text"
                     placeholder="Stage 3 파일 설명 (예: 최대 파워업, 모든 제한 해제 등)"
                     className="w-full border-red-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500"
                   />
                 </div>

                                  <p className="text-sm text-gray-500 mt-2">
                   모든 파일 형식 지원
                 </p>
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   사진/영상 첨부
                 </label>
                 <div className="flex items-center space-x-3 mb-2">
                   <input
                     type="file"
                     id="media-files"
                     multiple
                     className="hidden"
                                            onChange={(e) => {
                         const fileCount = e.target.files?.length || 0;
                         const label = document.querySelector('label[for="media-files"] .file-name');
                         if (label) {
                           label.textContent = fileCount > 0 
                             ? `📷 ${fileCount}개 파일 선택됨` 
                             : '📷 사진/영상 선택';
                         }
                       }}
                   />
                   <label
                     htmlFor="media-files"
                     className="flex items-center justify-center px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                   >
                     <svg className="w-6 h-6 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                     </svg>
                     <span className="file-name text-sm text-gray-600">📷 사진/영상 선택</span>
                   </label>
                 </div>
                 <input
                   type="text"
                   placeholder="첨부 파일 설명 (예: 작업 전후 사진, 장비 상태 영상 등)"
                   className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                 />
                 <p className="mt-1 text-sm text-gray-500">
                   여러 파일 선택 가능 (모든 형식)
                 </p>
               </div>
            </div>
          </div>

          {/* 제출 버튼 */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* 추천 작업 가이드 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-3">
          📋 작업 가이드
        </h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>• 작업 전 반드시 원본 ECU 파일을 백업하세요.</p>
          <p>• 장비별 연결 방법을 확인하고 올바른 케이블을 사용하세요.</p>
          <p>• 작업 중 배터리 전압이 안정적인지 확인하세요.</p>
          <p>• 튜닝 후 테스트 드라이브를 통해 작동 상태를 확인하세요.</p>
          <p>• 모든 작업 과정을 사진/영상으로 기록하여 추후 참고하세요.</p>
        </div>
      </div>
    </div>
  )
} 