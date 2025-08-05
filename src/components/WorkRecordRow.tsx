'use client'

import { useState } from 'react'

interface WorkRecord {
  id: string
  work_date: string
  customer?: {
    name: string
  }
  equipment?: {
    model?: string
    type?: string
    manufacturer?: string
  }
  // 새로운 데이터 구조 지원
  customer_name?: string
  equipment_model?: string
  equipment_type?: string
  equipment_manufacturer?: string
  ecu_maker?: string
  ecu_model?: string
  ecu_type?: string
  ecu_price?: number
  ecu_status?: string
  tuning_stage?: string
  connection_method?: string
  acu_manufacturer?: string
  acu_model?: string
  acu_type?: string
  acu_price?: number
  acu_status?: string
  is_active?: boolean
  status?: string
  total_price?: number
  // 추가 필드들
  ecu_data?: any
  acu_data?: any
  remapping_works?: any[]
}

interface WorkRecordRowProps {
  record: WorkRecord
  onRowClick: (record: WorkRecord) => void
  onEdit: (record: WorkRecord) => void
  onDelete: (record: WorkRecord) => void
}

// ✅ 개선된 상태별 색상 함수
const getStatusColor = (status: string) => {
  const statusLower = status.toLowerCase()
  
  if (statusLower.includes('완료') || statusLower.includes('complete')) {
    return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200'
  }
  if (statusLower.includes('진행') || statusLower.includes('progress')) {
    return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200'
  }
  if (statusLower.includes('대기') || statusLower.includes('pending')) {
    return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200'
  }
  if (statusLower.includes('취소') || statusLower.includes('cancel')) {
    return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200'
  }
  if (statusLower.includes('검토') || statusLower.includes('review')) {
    return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200'
  }
  
  return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200'
}

// ✅ 날짜 포맷팅 함수
const formatDate = (dateString: string) => {
  if (!dateString) return '날짜 없음'
  
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    })
  } catch (error) {
    console.error('날짜 포맷 오류:', error)
    return '잘못된 날짜'
  }
}

// ✅ 금액 포맷팅 함수
const formatPrice = (price: number | null | undefined) => {
  if (!price || price === 0) return 'N/A'
  
  try {
    return new Intl.NumberFormat('ko-KR', { 
      style: 'currency', 
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  } catch (error) {
    console.error('금액 포맷 오류:', error)
    return 'N/A'
  }
}

// ✅ 차종 정보 추출 함수
const getVehicleType = (record: WorkRecord): string => {
  // equipment_type에서 차종 추출
  if (record.equipment?.type || record.equipment_type) {
    const type = record.equipment?.type || record.equipment_type || ''
    
    // 차종 매핑
    const vehicleTypeMap: { [key: string]: string } = {
      'excavator': '굴삭기',
      'bulldozer': '불도저',
      'wheel_loader': '휠로더',
      'crane': '크레인',
      'dump_truck': '덤프트럭',
      'truck': '트럭',
      'car': '승용차',
      'bus': '버스',
      'tractor': '트랙터',
      'forklift': '지게차',
      'generator': '발전기',
      'compressor': '압축기'
    }
    
    const lowerType = type.toLowerCase()
    for (const [key, value] of Object.entries(vehicleTypeMap)) {
      if (lowerType.includes(key)) {
        return value
      }
    }
    
    // 매핑되지 않은 경우 원본 반환
    return type
  }
  
  // manufacturer에서 차종 추정
  const manufacturer = record.equipment?.manufacturer || record.equipment_manufacturer || ''
  if (manufacturer) {
    const lowerManufacturer = manufacturer.toLowerCase()
    if (lowerManufacturer.includes('caterpillar') || lowerManufacturer.includes('cat')) {
      return '굴삭기'
    }
    if (lowerManufacturer.includes('komatsu')) {
      return '굴삭기'
    }
    if (lowerManufacturer.includes('hitachi')) {
      return '굴삭기'
    }
    if (lowerManufacturer.includes('volvo')) {
      return '굴삭기'
    }
    if (lowerManufacturer.includes('hyundai')) {
      return '굴삭기'
    }
    if (lowerManufacturer.includes('doosan')) {
      return '굴삭기'
    }
  }
  
  return '알 수 없음'
}

// ✅ ECU 정보 추출 및 개선
const getECUInfo = (record: WorkRecord) => {
  // remapping_works에서 ECU 정보 추출
  let ecuInfo = {
    manufacturer: record.ecu_maker || 'Unknown',
    model: record.ecu_model || 'Unknown Model',
    type: record.ecu_type || '',
    price: record.ecu_price || 0,
    status: record.ecu_status || record.status || '알 수 없음',
    connectionMethod: record.connection_method || '',
    toolCategory: ''
  }
  
  // remapping_works에서 추가 정보 추출
  if (record.remapping_works && Array.isArray(record.remapping_works) && record.remapping_works.length > 0) {
    const firstWork = record.remapping_works[0]
    if (firstWork && firstWork.ecu) {
      ecuInfo = {
        ...ecuInfo,
        manufacturer: firstWork.ecu.maker || ecuInfo.manufacturer,
        model: firstWork.ecu.type || ecuInfo.model,
        type: firstWork.ecu.type || ecuInfo.type,
        price: parseFloat(firstWork.ecu.price) || ecuInfo.price,
        status: firstWork.ecu.status || ecuInfo.status,
        connectionMethod: firstWork.ecu.connectionMethod || ecuInfo.connectionMethod,
        toolCategory: firstWork.ecu.toolCategory || ecuInfo.toolCategory
      }
    }
  }
  
  return ecuInfo
}

// ✅ ACU 정보 추출 및 개선
const getACUInfo = (record: WorkRecord) => {
  // remapping_works에서 ACU 정보 추출
  let acuInfo = {
    manufacturer: record.acu_manufacturer || '',
    model: record.acu_model || '',
    type: record.acu_type || '',
    price: record.acu_price || 0,
    status: record.acu_status || record.status || '알 수 없음',
    connectionMethod: record.connection_method || '',
    toolCategory: ''
  }
  
  // remapping_works에서 추가 정보 추출
  if (record.remapping_works && Array.isArray(record.remapping_works) && record.remapping_works.length > 0) {
    const firstWork = record.remapping_works[0]
    if (firstWork && firstWork.acu) {
      acuInfo = {
        ...acuInfo,
        manufacturer: firstWork.acu.manufacturer || acuInfo.manufacturer,
        model: firstWork.acu.model || acuInfo.model,
        type: firstWork.acu.type || acuInfo.type,
        price: parseFloat(firstWork.acu.price) || acuInfo.price,
        status: firstWork.acu.status || acuInfo.status,
        connectionMethod: firstWork.acu.connectionMethod || acuInfo.connectionMethod,
        toolCategory: firstWork.acu.toolCategory || acuInfo.toolCategory
      }
    }
  }
  
  return acuInfo
}

// ✅ ECU 정보 셀 컴포넌트 (개선됨)
const ECUInfoCell = ({ record }: { record: WorkRecord }) => {
  const ecuInfo = getECUInfo(record)
  const statusColor = getStatusColor(ecuInfo.status)
  
  return (
    <div className="space-y-2">
      <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
        {ecuInfo.manufacturer}
      </div>
      <div className="text-xs text-gray-600 dark:text-gray-400">
        {ecuInfo.model}
      </div>
      {ecuInfo.type && (
        <div className="text-xs text-blue-600 dark:text-blue-400">
          {ecuInfo.type}
        </div>
      )}
      {ecuInfo.price > 0 && (
        <div className="text-xs font-medium text-green-600 dark:text-green-400">
          {formatPrice(ecuInfo.price)}
        </div>
      )}
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}>
        {ecuInfo.status}
      </span>
    </div>
  )
}

// ✅ ACU 정보 셀 컴포넌트 (개선됨)
const ACUInfoCell = ({ record }: { record: WorkRecord }) => {
  const acuInfo = getACUInfo(record)
  const statusColor = getStatusColor(acuInfo.status)
  
  if (!acuInfo.manufacturer && !acuInfo.model && !acuInfo.type) {
    return (
      <div className="text-gray-500 dark:text-gray-400 text-sm">
        ACU 정보 없음
      </div>
    )
  }
  
  return (
    <div className="space-y-2">
      {acuInfo.manufacturer && (
        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
          {acuInfo.manufacturer}
        </div>
      )}
      {acuInfo.model && (
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {acuInfo.model}
        </div>
      )}
      {acuInfo.type && (
        <div className="text-xs text-purple-600 dark:text-purple-400">
          {acuInfo.type}
        </div>
      )}
      {acuInfo.price > 0 && (
        <div className="text-xs font-medium text-green-600 dark:text-green-400">
          {formatPrice(acuInfo.price)}
        </div>
      )}
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}>
        {acuInfo.status}
      </span>
    </div>
  )
}

export default function WorkRecordRow({ record, onRowClick, onEdit, onDelete }: WorkRecordRowProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  const handleRowClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onRowClick(record)
  }
  
  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation()
    action()
  }
  
  const formattedDate = formatDate(record.work_date)
  const formattedPrice = formatPrice(record.total_price)
  const vehicleType = getVehicleType(record)
  
  return (
    <tr 
      className={`
        border-b border-gray-200 dark:border-gray-700 
        hover:bg-gray-50 dark:hover:bg-gray-800 
        transition-all duration-200 ease-in-out
        cursor-pointer
        ${isHovered ? 'transform scale-[1.01] shadow-md' : ''}
      `}
      onClick={handleRowClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="row"
      aria-label={`작업 기록: ${record.customer?.name || '알 수 없음'} - ${formattedDate}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onRowClick(record)
        }
      }}
    >
      {/* 작업일 - 모바일에서도 항상 표시 */}
      <td 
        className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100"
        role="cell"
        aria-label={`작업일: ${formattedDate}`}
      >
        <div className="font-medium">{formattedDate}</div>
      </td>
      
      {/* 고객/차량 정보 - 개선됨 */}
      <td 
        className="py-3 px-4"
        role="cell"
        aria-label={`고객: ${record.customer?.name || record.customer_name || '알 수 없음'}, 차량: ${record.equipment?.model || record.equipment_model || '알 수 없음'}`}
      >
        <div className="space-y-1">
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {record.customer?.name || record.customer_name || '알 수 없음'}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {record.equipment?.model || record.equipment_model || '모델 정보 없음'}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500">
            {vehicleType}
          </div>
        </div>
      </td>
      
      {/* ECU 정보 - 개선됨 */}
      <td 
        className="py-3 px-4 hidden md:table-cell"
        role="cell"
        aria-label="ECU 정보"
      >
        <ECUInfoCell record={record} />
      </td>
      
      {/* ACU 정보 - 개선됨 */}
      <td 
        className="py-3 px-4 hidden md:table-cell"
        role="cell"
        aria-label="ACU 정보"
      >
        <ACUInfoCell record={record} />
      </td>
      
      {/* 금액 - 전체 금액 표시 */}
      <td 
        className="py-3 px-4 hidden sm:table-cell"
        role="cell"
        aria-label={`전체 금액: ${formattedPrice}`}
      >
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {formattedPrice}
        </div>
      </td>
      
      {/* 액션 버튼 - 개선됨 */}
      <td 
        className="py-3 px-4"
        role="cell"
        aria-label="작업 버튼"
      >
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => handleButtonClick(e, () => onRowClick(record))}
            className="
              text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300
              font-medium text-sm transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              dark:focus:ring-offset-gray-800
              px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900
            "
            aria-label="상세보기"
          >
            상세보기
          </button>
          
          <div className="flex space-x-1">
            <button
              onClick={(e) => handleButtonClick(e, () => onEdit(record))}
              className="
                p-1 text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300
                transition-colors duration-200 rounded
                focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2
                dark:focus:ring-offset-gray-800
                hover:bg-yellow-50 dark:hover:bg-yellow-900
              "
              aria-label="수정"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            
            <button
              onClick={(e) => handleButtonClick(e, () => onDelete(record))}
              className="
                p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300
                transition-colors duration-200 rounded
                focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
                dark:focus:ring-offset-gray-800
                hover:bg-red-50 dark:hover:bg-red-900
              "
              aria-label="삭제"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </td>
    </tr>
  )
}