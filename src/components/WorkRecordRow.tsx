'use client'

import { useState } from 'react'
import { getStatusColor } from '../lib/work-records'

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
  connection_method?: string
  is_active?: boolean
  status?: string
  total_price?: number
  // remapping_works 기반 데이터
  remapping_works?: any[]
}

interface WorkRecordRowProps {
  record: WorkRecord
  onEdit?: (record: WorkRecord) => void
  onDelete?: (id: string) => void
}

export default function WorkRecordRow({ record, onEdit, onDelete }: WorkRecordRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // 간단한 상태 표시
  const overallStatus = record.status || 'pending'

  // 고객명 추출
  const customerName = record.customer?.name || record.customer_name || 'N/A'

  // 장비 정보 추출
  const equipmentModel = record.equipment?.model || record.equipment_model || 'N/A'
  const equipmentType = record.equipment?.type || record.equipment_type || 'N/A'
  const equipmentManufacturer = record.equipment?.manufacturer || record.equipment_manufacturer || 'N/A'

  // remapping_works에서 ECU/ACU 정보 추출
  const firstWork = record.remapping_works?.[0]
  const ecuInfo = firstWork?.ecu
  const acuInfo = firstWork?.acu

  // 총 가격 계산
  const totalPrice = record.total_price || 0

  // 상태 색상 클래스
  const statusColorClass = getStatusColor(record.status || overallStatus || 'pending')

  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-white dark:bg-gray-800">
      {/* 기본 정보 행 */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-4">
            {/* 고객 정보 */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {customerName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(record.work_date).toLocaleDateString('ko-KR')}
              </p>
            </div>

            {/* 장비 정보 */}
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-900 dark:text-white truncate">
                {equipmentManufacturer} {equipmentModel}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {equipmentType}
              </p>
            </div>

            {/* ECU 정보 */}
            {ecuInfo && (
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900 dark:text-white truncate">
                  ECU: {ecuInfo.maker} {ecuInfo.type}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {ecuInfo.selectedWorks?.join(', ') || 'N/A'}
                </p>
              </div>
            )}

            {/* ACU 정보 */}
            {acuInfo && (
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900 dark:text-white truncate">
                  ACU: {acuInfo.manufacturer} {acuInfo.model}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {acuInfo.selectedWorks?.join(', ') || 'N/A'}
                </p>
              </div>
            )}

            {/* 가격 정보 */}
            <div className="min-w-0 flex-1 text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                ₩{totalPrice.toLocaleString()}
              </p>
            </div>

            {/* 상태 정보 */}
            <div className="min-w-0 flex-1 text-right">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColorClass}`}>
                {record.status || overallStatus || 'pending'}
              </span>
            </div>
          </div>
        </div>

        {/* 액션 버튼들 */}
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {isExpanded ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>

          {onEdit && (
            <button
              onClick={() => onEdit(record)}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(record.id)}
              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 확장된 상세 정보 */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ECU 상세 정보 */}
            {ecuInfo && (
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">ECU 정보</h4>
                <div className="space-y-1 text-xs">
                  <p><span className="font-medium">제조사:</span> {ecuInfo.maker}</p>
                  <p><span className="font-medium">모델:</span> {ecuInfo.type}</p>
                  <p><span className="font-medium">연결방법:</span> {ecuInfo.connectionMethod}</p>
                  <p><span className="font-medium">작업내용:</span> {ecuInfo.selectedWorks?.join(', ')}</p>
                  <p><span className="font-medium">상세내용:</span> {ecuInfo.workDetails}</p>
                  <p><span className="font-medium">가격:</span> ₩{parseInt(ecuInfo.price || '0').toLocaleString()}</p>
                  <p>
                    <span className="font-medium">상태:</span>
                    <span className={`ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(ecuInfo.status)}`}>
                      {ecuInfo.status}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* ACU 상세 정보 */}
            {acuInfo && (
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">ACU 정보</h4>
                <div className="space-y-1 text-xs">
                  <p><span className="font-medium">제조사:</span> {acuInfo.manufacturer}</p>
                  <p><span className="font-medium">모델:</span> {acuInfo.model}</p>
                  <p><span className="font-medium">연결방법:</span> {acuInfo.connectionMethod}</p>
                  <p><span className="font-medium">작업내용:</span> {acuInfo.selectedWorks?.join(', ')}</p>
                  <p><span className="font-medium">상세내용:</span> {acuInfo.workDetails}</p>
                  <p><span className="font-medium">가격:</span> ₩{parseInt(acuInfo.price || '0').toLocaleString()}</p>
                  <p>
                    <span className="font-medium">상태:</span>
                    <span className={`ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(acuInfo.status)}`}>
                      {acuInfo.status}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* 연결 방법 정보 */}
            {record.connection_method && (
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">연결 정보</h4>
                <div className="space-y-1 text-xs">
                  <p><span className="font-medium">연결방법:</span> {record.connection_method}</p>
                </div>
              </div>
            )}

            {/* 파일 정보 */}
            {firstWork?.files && (
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">파일 정보</h4>
                <div className="space-y-1 text-xs">
                  {Object.entries(firstWork.files).map(([key, value]) => {
                    if (value && typeof value === 'object' && Object.keys(value).length > 0) {
                      return (
                        <p key={key}>
                          <span className="font-medium">{key}:</span> 파일 첨부됨
                        </p>
                      )
                    }
                    return null
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}