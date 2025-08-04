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
  }
  ecu_maker?: string
  ecu_model?: string
  connection_method?: string
  acu_manufacturer?: string
  acu_model?: string
  acu_type?: string
  status?: string
  total_price?: number
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
    return 'bg-green-100 text-green-800 border-green-200'
  }
  if (statusLower.includes('진행') || statusLower.includes('progress')) {
    return 'bg-blue-100 text-blue-800 border-blue-200'
  }
  if (statusLower.includes('대기') || statusLower.includes('pending')) {
    return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  }
  if (statusLower.includes('취소') || statusLower.includes('cancel')) {
    return 'bg-red-100 text-red-800 border-red-200'
  }
  if (statusLower.includes('검토') || statusLower.includes('review')) {
    return 'bg-purple-100 text-purple-800 border-purple-200'
  }
  
  return 'bg-gray-100 text-gray-800 border-gray-200'
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

// ✅ ECU 정보 컴포넌트
const ECUInfoCell = ({ record }: { record: WorkRecord }) => {
  const hasECUInfo = record.ecu_maker || record.ecu_model

  if (!hasECUInfo) {
    return <span className="text-gray-500 italic">N/A</span>
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center">
        <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
        <span className="font-medium text-blue-300">
          {record.ecu_maker || 'Unknown'}
        </span>
      </div>
      <div className="text-sm text-gray-400 ml-4">
        {record.ecu_model || 'Unknown Model'}
      </div>
      {record.connection_method && (
        <div className="mt-1 px-2 py-0.5 bg-blue-900 text-blue-300 rounded text-xs inline-block ml-4">
          {record.connection_method}
        </div>
      )}
    </div>
  )
}

// ✅ ACU 정보 컴포넌트
const ACUInfoCell = ({ record }: { record: WorkRecord }) => {
  const hasACUInfo = record.acu_manufacturer || record.acu_model

  if (!hasACUInfo) {
    return <span className="text-gray-500 italic">N/A</span>
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center">
        <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
        <span className="font-medium text-green-300">
          {record.acu_manufacturer || 'Unknown'}
        </span>
      </div>
      <div className="text-sm text-gray-400 ml-4">
        {record.acu_model || 'Unknown Model'}
      </div>
      <div className="mt-1 ml-4">
        <span className="px-2 py-0.5 rounded text-xs bg-green-900 text-green-300">
          {record.acu_type ? '활성화' : '비활성화'}
        </span>
      </div>
    </div>
  )
}

export default function WorkRecordRow({ record, onRowClick, onEdit, onDelete }: WorkRecordRowProps) {
  const [isHovered, setIsHovered] = useState(false)

  // ✅ 안전한 클릭 핸들러
  const handleRowClick = (e: React.MouseEvent) => {
    // 버튼 클릭 시에는 행 클릭 이벤트 무시
    if ((e.target as Element).closest('button')) {
      return
    }
    onRowClick(record)
  }

  // ✅ 버튼 클릭 핸들러 (이벤트 전파 중단)
  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation()
    action()
  }

  return (
    <tr 
      className={`cursor-pointer border-b border-gray-700 transition-colors duration-150 ${
        isHovered ? 'bg-gray-700' : 'hover:bg-gray-700'
      }`}
      onClick={handleRowClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 작업일 */}
      <td className="py-3 px-4">
        <span className="text-white">
          {formatDate(record.work_date)}
        </span>
      </td>

      {/* 고객/장비 */}
      <td className="py-3 px-4">
        <div className="font-medium text-white">
          {record.customer?.name || '알 수 없음'}
        </div>
        <div className="text-sm text-gray-400">
          {record.equipment?.model || record.equipment?.type || 'N/A'}
        </div>
      </td>

      {/* ECU 정보 (파란색 계열) */}
      <td className="py-3 px-4">
        <ECUInfoCell record={record} />
      </td>

      {/* ACU 정보 (초록색 계열) */}
      <td className="py-3 px-4">
        <ACUInfoCell record={record} />
      </td>

      {/* 상태 */}
      <td className="py-3 px-4">
        <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(record.status || '진행중')}`}>
          {record.status || '진행중'}
        </span>
      </td>

      {/* 금액 */}
      <td className="py-3 px-4">
        <span className="text-white font-medium">
          {formatPrice(record.total_price)}
        </span>
      </td>

      {/* 작업 버튼들 */}
      <td className="py-3 px-4">
        <div className="flex space-x-1">
          <button
            onClick={(e) => handleButtonClick(e, () => onRowClick(record))}
            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
            title="상세보기"
          >
            상세
          </button>
          <button
            onClick={(e) => handleButtonClick(e, () => onEdit(record))}
            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
            title="수정"
          >
            수정
          </button>
          <button
            onClick={(e) => handleButtonClick(e, () => onDelete(record))}
            className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
            title="삭제"
          >
            삭제
          </button>
        </div>
      </td>
    </tr>
  )
}