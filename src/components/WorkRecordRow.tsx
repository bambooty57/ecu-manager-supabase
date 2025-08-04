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
  tuning_stage?: string
  connection_method?: string
  acu_manufacturer?: string
  acu_model?: string
  acu_type?: string
  is_active?: boolean
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
    return 'bg-success-100 text-success-800 border-success-200 dark:bg-success-900 dark:text-success-200'
  }
  if (statusLower.includes('진행') || statusLower.includes('progress')) {
    return 'bg-primary-100 text-primary-800 border-primary-200 dark:bg-primary-900 dark:text-primary-200'
  }
  if (statusLower.includes('대기') || statusLower.includes('pending')) {
    return 'bg-warning-100 text-warning-800 border-warning-200 dark:bg-warning-900 dark:text-warning-200'
  }
  if (statusLower.includes('취소') || statusLower.includes('cancel')) {
    return 'bg-danger-100 text-danger-800 border-danger-200 dark:bg-danger-900 dark:text-danger-200'
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

// ✅ 데이터 변환 로직 (Task #3 요구사항)
const transformECUData = (record: WorkRecord) => {
  return {
    manufacturer: record.ecu_maker || 'Unknown',
    model: record.ecu_model || 'Unknown Model',
    tuning_stage: record.tuning_stage || extractTuningStageFromModel(record.ecu_model || '')
  }
}

// ✅ ECU 모델에서 튜닝 스테이지 추출
const extractTuningStageFromModel = (model: string): string | null => {
  const stagePatterns = [
    { pattern: /stage\s*(\d+)/i, name: 'Stage' },
    { pattern: /tune\s*(\d+)/i, name: 'Tune' },
    { pattern: /level\s*(\d+)/i, name: 'Level' }
  ]
  
  for (const { pattern, name } of stagePatterns) {
    const match = model.match(pattern)
    if (match) {
      return `${name} ${match[1]}`
    }
  }
  
  return null
}

// ✅ ECU 정보 셀 컴포넌트
const ECUInfoCell = ({ record }: { record: WorkRecord }) => {
  const ecuData = transformECUData(record)
  
  return (
    <div className="space-y-1">
      <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
        {ecuData.manufacturer}
      </div>
      <div className="text-xs text-gray-600 dark:text-gray-400">
        {ecuData.model}
      </div>
      {ecuData.tuning_stage && (
        <div className="text-xs text-primary-600 dark:text-primary-400">
          {ecuData.tuning_stage}
        </div>
      )}
    </div>
  )
}

// ✅ ACU 정보 셀 컴포넌트
const ACUInfoCell = ({ record }: { record: WorkRecord }) => {
  if (!record.acu_manufacturer && !record.acu_model && !record.acu_type) {
    return (
      <div className="text-gray-500 dark:text-gray-400 text-sm">
        ACU 정보 없음
      </div>
    )
  }
  
  return (
    <div className="space-y-1">
      {record.acu_manufacturer && (
        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
          {record.acu_manufacturer}
        </div>
      )}
      {record.acu_model && (
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {record.acu_model}
        </div>
      )}
      {record.acu_type && (
        <div className="text-xs text-secondary-600 dark:text-secondary-400">
          {record.acu_type}
        </div>
      )}
    </div>
  )
}

export default function WorkRecordRow({ record, onRowClick, onEdit, onDelete }: WorkRecordRowProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  const handleRowClick = (e: React.MouseEvent) => {
    e.preventDefault()
    onRowClick(record)
  }
  
  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation()
    action()
  }
  
  const formattedDate = formatDate(record.work_date)
  const statusColor = getStatusColor(record.status || '')
  const formattedPrice = formatPrice(record.total_price)
  
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
      
      {/* 고객/차량 정보 - 모바일에서도 항상 표시 */}
      <td 
        className="py-3 px-4"
        role="cell"
        aria-label={`고객: ${record.customer?.name || '알 수 없음'}, 차량: ${record.equipment?.model || '알 수 없음'}`}
      >
        <div className="space-y-1">
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {record.customer?.name || '알 수 없음'}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {record.equipment?.model || '모델 정보 없음'}
          </div>
          {record.equipment?.type && (
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {record.equipment.type}
            </div>
          )}
        </div>
      </td>
      
      {/* ECU 정보 - 태블릿 이상에서만 표시 */}
      <td 
        className="py-3 px-4 hidden md:table-cell"
        role="cell"
        aria-label="ECU 정보"
      >
        <ECUInfoCell record={record} />
      </td>
      
      {/* ACU 정보 - 태블릿 이상에서만 표시 */}
      <td 
        className="py-3 px-4 hidden md:table-cell"
        role="cell"
        aria-label="ACU 정보"
      >
        <ACUInfoCell record={record} />
      </td>
      
      {/* 상태 - 모바일에서도 항상 표시 */}
      <td 
        className="py-3 px-4"
        role="cell"
        aria-label={`상태: ${record.status || '알 수 없음'}`}
      >
        <span className={`
          inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
          ${statusColor}
        `}>
          {record.status || '알 수 없음'}
        </span>
      </td>
      
      {/* 금액 - 작은 모바일에서는 숨김 */}
      <td 
        className="py-3 px-4 hidden sm:table-cell"
        role="cell"
        aria-label={`금액: ${formattedPrice}`}
      >
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {formattedPrice}
        </div>
      </td>
      
      {/* 액션 버튼 - 모바일에서도 항상 표시 */}
      <td 
        className="py-3 px-4"
        role="cell"
        aria-label="작업 버튼"
      >
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => handleButtonClick(e, () => onRowClick(record))}
            className="
              text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300
              font-medium text-sm transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
              dark:focus:ring-offset-gray-800
            "
            aria-label="상세보기"
          >
            상세보기
          </button>
          
          <div className="flex space-x-1">
            <button
              onClick={(e) => handleButtonClick(e, () => onEdit(record))}
              className="
                p-1 text-accent-600 hover:text-accent-800 dark:text-accent-400 dark:hover:text-accent-300
                transition-colors duration-200 rounded
                focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2
                dark:focus:ring-offset-gray-800
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
                p-1 text-danger-600 hover:text-danger-800 dark:text-danger-400 dark:hover:text-danger-300
                transition-colors duration-200 rounded
                focus:outline-none focus:ring-2 focus:ring-danger-500 focus:ring-offset-2
                dark:focus:ring-offset-gray-800
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