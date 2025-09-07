'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { getStatusColor } from '../lib/work-records'

interface WorkRecord {
  id: string
  work_date: string
  customer?: {
    name: string
    phone?: string
    roadAddress?: string
  }
  equipment?: {
    model?: string
    type?: string
    manufacturer?: string
    serialNumber?: string
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
  ecu_work_amount?: number
  acu_work_amount?: number
  ecu_work_content?: string
  acu_work_content?: string
  ecu_status?: string
  acu_status?: string
  // remapping_works 기반 데이터
  remapping_works?: any[]
  // 추가 필드들
  work_description?: string
  tools_used?: string[]
  files?: any
}

interface WorkRecordRowProps {
  record: WorkRecord
  onEdit?: (record: WorkRecord) => void
  onDelete?: (id: string) => void
}

// 🎨 최적화된 상태 표시 컴포넌트
const StatusBadge = React.memo(({ status, amount }: { status: string; amount: number }) => {
  const getStatusConfig = useCallback((status: string) => {
    switch (status) {
      case '완료':
        return {
          icon: '✅',
          bgColor: 'bg-green-500',
          textColor: 'text-white',
          borderColor: 'border-green-400'
        };
      case '진행중':
        return {
          icon: '⏳',
          bgColor: 'bg-blue-500',
          textColor: 'text-white',
          borderColor: 'border-blue-400'
        };
      case '실패':
        return {
          icon: '❌',
          bgColor: 'bg-red-500',
          textColor: 'text-white',
          borderColor: 'border-red-400'
        };
      case 'AS':
        return {
          icon: '🔧',
          bgColor: 'bg-gray-600',
          textColor: 'text-white',
          borderColor: 'border-gray-500'
        };
      case 'N/A':
        return {
          icon: '➖',
          bgColor: 'bg-gray-400',
          textColor: 'text-gray-700',
          borderColor: 'border-gray-300'
        };
      default:
        return {
          icon: '❓',
          bgColor: 'bg-gray-500',
          textColor: 'text-white',
          borderColor: 'border-gray-400'
        };
    }
  }, []);

  const config = getStatusConfig(status);

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${config.bgColor} ${config.borderColor} border-2 shadow-sm`}>
        <span className="text-sm font-medium">{config.icon}</span>
      </div>
      <div className="flex flex-col">
        <span className={`text-sm font-medium ${config.textColor}`}>
          {status}
        </span>
        {amount > 0 && (
          <span className="text-xs text-yellow-400 font-medium">
            ₩{amount.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
});

StatusBadge.displayName = 'StatusBadge';

// 🎨 최적화된 ECU/ACU 정보 컴포넌트
const EcuAcuInfo = React.memo(({ 
  model, 
  services, 
  amount, 
  status 
}: { 
  model: string; 
  services: string[]; 
  amount: number; 
  status: string; 
}) => {
  return (
    <div className="flex flex-col gap-2 p-3 bg-gray-800 rounded-lg border border-gray-700">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-200 mb-1">
            {model || 'N/A'}
          </h4>
          {services.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {services.map((service, index) => (
                <span
                  key={index}
                  className="inline-block px-2 py-1 text-xs bg-blue-600 text-white rounded-full"
                >
                  {service}
                </span>
              ))}
            </div>
          )}
        </div>
        <StatusBadge status={status} amount={amount} />
      </div>
    </div>
  );
});

EcuAcuInfo.displayName = 'EcuAcuInfo';

// 🚀 최적화된 메인 컴포넌트
const WorkRecordRow = React.memo(({ record, onEdit, onDelete }: WorkRecordRowProps) => {
  const [isExpanded, setIsExpanded] = useState(false)

  // 🎯 메모이제이션된 계산값들
  const overallStatus = useMemo(() => record.status || 'pending', [record.status]);

  const customerName = useMemo(() => 
    record.customer?.name || record.customer_name || 'N/A', 
    [record.customer?.name, record.customer_name]
  );

  const equipmentInfo = useMemo(() => ({
    model: record.equipment?.model || record.equipment_model || 'N/A',
    type: record.equipment?.type || record.equipment_type || 'N/A',
    manufacturer: record.equipment?.manufacturer || record.equipment_manufacturer || 'N/A',
    serialNumber: record.equipment?.serialNumber
  }), [record.equipment, record.equipment_model, record.equipment_type, record.equipment_manufacturer]);

  const remappingInfo = useMemo(() => {
    const firstWork = record.remapping_works?.[0];
    return {
      ecuInfo: firstWork?.ecu,
      acuInfo: firstWork?.acu,
      files: firstWork?.files
    };
  }, [record.remapping_works]);

  const totalPrice = useMemo(() => 
    record.total_price || 
    (record.ecu_work_amount || 0) + (record.acu_work_amount || 0) || 0, 
    [record.total_price, record.ecu_work_amount, record.acu_work_amount]
  );

  const statusColorClass = useMemo(() => 
    getStatusColor(record.status || overallStatus || 'pending'), 
    [record.status, overallStatus]
  );

  // 🔄 최적화된 이벤트 핸들러들
  const handleToggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const handleEdit = useCallback(() => {
    onEdit?.(record);
  }, [onEdit, record]);

  const handleDelete = useCallback(() => {
    onDelete?.(record.id);
  }, [onDelete, record.id]);

  // 📅 날짜 포맷팅
  const formattedDate = useMemo(() => {
    try {
      return new Date(record.work_date).toLocaleDateString('ko-KR');
    } catch {
      return record.work_date;
    }
  }, [record.work_date]);

  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow duration-200">
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
                {formattedDate}
              </p>
            </div>

            {/* 장비 정보 */}
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-900 dark:text-white truncate">
                {equipmentInfo.manufacturer} {equipmentInfo.model}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {equipmentInfo.type}
              </p>
            </div>

            {/* ECU 정보 */}
            {remappingInfo.ecuInfo && (
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900 dark:text-white truncate">
                  ECU: {remappingInfo.ecuInfo.maker} {remappingInfo.ecuInfo.type}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {remappingInfo.ecuInfo.selectedWorks?.join(', ') || 'N/A'}
                </p>
                {remappingInfo.ecuInfo.workDetails && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 truncate" title={remappingInfo.ecuInfo.workDetails}>
                    📝 {remappingInfo.ecuInfo.workDetails.length > 30 ? `${remappingInfo.ecuInfo.workDetails.substring(0, 30)}...` : remappingInfo.ecuInfo.workDetails}
                  </p>
                )}
              </div>
            )}

            {/* ACU 정보 */}
            {remappingInfo.acuInfo && (
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900 dark:text-white truncate">
                  ACU: {remappingInfo.acuInfo.manufacturer} {remappingInfo.acuInfo.model}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {remappingInfo.acuInfo.selectedWorks?.join(', ') || 'N/A'}
                </p>
                {remappingInfo.acuInfo.workDetails && (
                  <p className="text-xs text-green-600 dark:text-green-400 truncate" title={remappingInfo.acuInfo.workDetails}>
                    📝 {remappingInfo.acuInfo.workDetails.length > 30 ? `${remappingInfo.acuInfo.workDetails.substring(0, 30)}...` : remappingInfo.acuInfo.workDetails}
                  </p>
                )}
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
            onClick={handleToggleExpanded}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
            title={isExpanded ? '접기' : '펼치기'}
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
              onClick={handleEdit}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200"
              title="수정"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}

          {onDelete && (
            <button
              onClick={handleDelete}
              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200"
              title="삭제"
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
            {remappingInfo.ecuInfo && (
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">ECU 정보</h4>
                <div className="space-y-1 text-xs">
                  <p><span className="font-medium">제조사:</span> {remappingInfo.ecuInfo.maker}</p>
                  <p><span className="font-medium">모델:</span> {remappingInfo.ecuInfo.type}</p>
                  <p><span className="font-medium">연결방법:</span> {remappingInfo.ecuInfo.connectionMethod}</p>
                  <p><span className="font-medium">작업내용:</span> {remappingInfo.ecuInfo.selectedWorks?.join(', ')}</p>
                  <p><span className="font-medium">상세내용:</span> {remappingInfo.ecuInfo.workDetails}</p>
                  <p><span className="font-medium">가격:</span> ₩{parseInt(remappingInfo.ecuInfo.price || '0').toLocaleString()}</p>
                  <p>
                    <span className="font-medium">상태:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
                        remappingInfo.ecuInfo.status === '완료' ? 'bg-green-500 border-green-400' :
                        remappingInfo.ecuInfo.status === '진행중' ? 'bg-blue-500 border-blue-400' :
                        remappingInfo.ecuInfo.status === '실패' ? 'bg-red-500 border-red-400' :
                        remappingInfo.ecuInfo.status === 'AS' ? 'bg-gray-600 border-gray-500' :
                        'bg-gray-400 border-gray-300'
                      } border-2 shadow-sm`}>
                        <span className="text-xs font-medium">
                          {remappingInfo.ecuInfo.status === '완료' ? '✅' :
                           remappingInfo.ecuInfo.status === '진행중' ? '⏳' :
                           remappingInfo.ecuInfo.status === '실패' ? '❌' :
                           remappingInfo.ecuInfo.status === 'AS' ? '🔧' :
                           '➖'}
                        </span>
                      </div>
                      <span className={`text-xs font-medium ${
                        remappingInfo.ecuInfo.status === 'AS' ? 'text-white' :
                        remappingInfo.ecuInfo.status === 'N/A' ? 'text-gray-700' :
                        'text-white'
                      }`}>
                        {remappingInfo.ecuInfo.status}
                      </span>
                    </div>
                  </p>
                </div>
              </div>
            )}

            {/* ACU 상세 정보 */}
            {remappingInfo.acuInfo && (
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">ACU 정보</h4>
                <div className="space-y-1 text-xs">
                  <p><span className="font-medium">제조사:</span> {remappingInfo.acuInfo.manufacturer}</p>
                  <p><span className="font-medium">모델:</span> {remappingInfo.acuInfo.model}</p>
                  <p><span className="font-medium">연결방법:</span> {remappingInfo.acuInfo.connectionMethod}</p>
                  <p><span className="font-medium">작업내용:</span> {remappingInfo.acuInfo.selectedWorks?.join(', ')}</p>
                  <p><span className="font-medium">상세내용:</span> {remappingInfo.acuInfo.workDetails}</p>
                  <p><span className="font-medium">가격:</span> ₩{parseInt(remappingInfo.acuInfo.price || '0').toLocaleString()}</p>
                  <p>
                    <span className="font-medium">상태:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
                        remappingInfo.acuInfo.status === '완료' ? 'bg-green-500 border-green-400' :
                        remappingInfo.acuInfo.status === '진행중' ? 'bg-blue-500 border-blue-400' :
                        remappingInfo.acuInfo.status === '실패' ? 'bg-red-500 border-red-400' :
                        remappingInfo.acuInfo.status === 'AS' ? 'bg-gray-600 border-gray-500' :
                        'bg-gray-400 border-gray-300'
                      } border-2 shadow-sm`}>
                        <span className="text-xs font-medium">
                          {remappingInfo.acuInfo.status === '완료' ? '✅' :
                           remappingInfo.acuInfo.status === '진행중' ? '⏳' :
                           remappingInfo.acuInfo.status === '실패' ? '❌' :
                           remappingInfo.acuInfo.status === 'AS' ? '🔧' :
                           '➖'}
                        </span>
                      </div>
                      <span className={`text-xs font-medium ${
                        remappingInfo.acuInfo.status === 'AS' ? 'text-white' :
                        remappingInfo.acuInfo.status === 'N/A' ? 'text-gray-700' :
                        'text-white'
                      }`}>
                        {remappingInfo.acuInfo.status}
                      </span>
                    </div>
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

            {/* 공통 정보 */}
            {remappingInfo.ecuInfo?.workDetails || remappingInfo.acuInfo?.workDetails || record.ecu_work_content || record.acu_work_content ? (
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">📝 작업 상세 정보</h4>
                <div className="space-y-2 text-xs">
                  {remappingInfo.ecuInfo?.workDetails && (
                    <div>
                      <span className="font-medium text-blue-600 dark:text-blue-400">ECU 작업 상세:</span>
                      <p className="text-gray-700 dark:text-gray-300 mt-1 p-2 bg-blue-50 dark:bg-blue-900/30 rounded">
                        {remappingInfo.ecuInfo.workDetails}
                      </p>
                    </div>
                  )}
                  {remappingInfo.acuInfo?.workDetails && (
                    <div>
                      <span className="font-medium text-green-600 dark:text-green-400">ACU 작업 상세:</span>
                      <p className="text-gray-700 dark:text-gray-300 mt-1 p-2 bg-green-50 dark:bg-green-900/30 rounded">
                        {remappingInfo.acuInfo.workDetails}
                      </p>
                    </div>
                  )}
                  {record.ecu_work_content && (
                    <div>
                      <span className="font-medium text-blue-600 dark:text-blue-400">ECU 작업 내용:</span>
                      <p className="text-gray-700 dark:text-gray-300 mt-1 p-2 bg-blue-50 dark:bg-blue-900/30 rounded">
                        {record.ecu_work_content}
                      </p>
                    </div>
                  )}
                  {record.acu_work_content && (
                    <div>
                      <span className="font-medium text-green-600 dark:text-green-400">ACU 작업 내용:</span>
                      <p className="text-gray-700 dark:text-gray-300 mt-1 p-2 bg-green-50 dark:bg-green-900/30 rounded">
                        {record.acu_work_content}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* 공통 메모 정보 */}
            {remappingInfo.ecuInfo?.notes && (
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">📋 작업 메모</h4>
                <div className="space-y-1 text-xs">
                  <p className="text-gray-700 dark:text-gray-300 p-2 bg-gray-100 dark:bg-gray-600 rounded">
                    {remappingInfo.ecuInfo.notes}
                  </p>
                </div>
              </div>
            )}

            {/* 파일 정보 */}
            {remappingInfo.files && (
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">📁 파일 정보</h4>
                <div className="space-y-2 text-xs">
                  {Object.entries(remappingInfo.files).map(([key, value]) => {
                    if (value && typeof value === 'object' && Object.keys(value).length > 0) {
                      return (
                        <div key={key} className="border border-gray-200 dark:border-gray-600 rounded p-2">
                          <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {key === 'originalFile' ? '📄 원본 파일' :
                             key === 'stage1File' ? '🚀 1차 튜닝 파일' :
                             key === 'stage2File' ? '⚡ 2차 튜닝 파일' :
                             key === 'stage3File' ? '🔥 3차 튜닝 파일' :
                             key === 'acuOriginalFile' ? '📄 ACU 원본 파일' :
                             key === 'acuStage1File' ? '🚀 ACU 1차 튜닝 파일' :
                             key === 'acuStage2File' ? '⚡ ACU 2차 튜닝 파일' :
                             key === 'acuStage3File' ? '🔥 ACU 3차 튜닝 파일' :
                             key}: 파일 첨부됨
                          </p>
                          {/* 파일 설명 표시 */}
                          {value.description && (
                            <p className="text-gray-600 dark:text-gray-400 italic text-xs">
                              💬 {value.description}
                            </p>
                          )}
                        </div>
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
});

WorkRecordRow.displayName = 'WorkRecordRow';

export default WorkRecordRow;