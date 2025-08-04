'use client'

import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { FileDownloadSection } from './FileDownloadSection'

// ✅ WorkRecord 타입 정의 (Task #3에서 개선된 버전)
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
  ecu_maker?: string
  ecu_model?: string
  tuning_stage?: string
  connection_method?: string
  tools_used?: string
  acu_manufacturer?: string
  acu_model?: string
  acu_type?: string
  is_active?: boolean
  work_type?: string
  work_description?: string
  notes?: string
  files?: any[]
  total_price?: number
  status?: string
}

interface WorkDetailModalProps {
  isOpen: boolean
  onClose: () => void
  record: WorkRecord | null
}

// ✅ ECU 데이터 변환 함수 (Task #3과 연동)
const transformECUData = (record: WorkRecord) => {
  if (!record.ecu_maker && !record.ecu_model) return null
  
  // 튜닝 단계 추출 (ecu_model에서 stage 정보 파싱 시도)
  const extractTuningStage = (model: string) => {
    if (!model) return null
    const stageMatch = model.match(/stage\s*(\d+)/i)
    return stageMatch ? stageMatch[1] : null
  }

  return {
    manufacturer: record.ecu_maker || 'Unknown',
    model: record.ecu_model || 'Unknown Model',
    tuning_stage: record.tuning_stage || extractTuningStage(record.ecu_model || ''),
    connection_method: record.connection_method,
    tools_used: record.tools_used
  }
}

// ✅ ACU 데이터 변환 함수 (Task #4와 연동)
const transformACUData = (record: WorkRecord) => {
  if (!record.acu_manufacturer && !record.acu_model) return null

  // ACU 활성화 상태 판단 (여러 조건 확인)
  const isActive = Boolean(
    record.acu_type && 
    record.acu_type !== 'N/A' && 
    record.acu_type !== '' &&
    record.acu_manufacturer &&
    record.acu_model
  )

  return {
    manufacturer: record.acu_manufacturer || 'Unknown',
    model: record.acu_model || 'Unknown Model',
    type: record.acu_type || 'Unknown Type',
    is_active: record.is_active ?? isActive
  }
}

const WorkDetailModal = ({ isOpen, onClose, record }: WorkDetailModalProps) => {
  if (!record) return null

  const ecuData = transformECUData(record)
  const acuData = transformACUData(record)

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-gray-800 text-left align-middle shadow-xl transition-all">
                <div className="p-6">
                  {/* 헤더 */}
                  <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                    <Dialog.Title as="h3" className="text-2xl font-bold text-white">
                      작업 상세 정보
                    </Dialog.Title>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-white text-2xl transition-colors"
                      onClick={onClose}
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* 기본 정보 섹션 */}
                    <div className="bg-gray-700 rounded-lg p-6">
                      <h4 className="font-medium text-white text-lg mb-4">📋 기본 정보</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-300 mb-1">작업일</p>
                          <p className="text-white">
                            {record.work_date ? new Date(record.work_date).toLocaleDateString('ko-KR') : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-300 mb-1">고객명</p>
                          <p className="text-white">{record.customer?.name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-300 mb-1">차종</p>
                          <p className="text-white">{record.equipment?.type || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-300 mb-1">제조사</p>
                          <p className="text-white">{record.equipment?.manufacturer || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-300 mb-1">모델</p>
                          <p className="text-white">{record.equipment?.model || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-300 mb-1">작업유형</p>
                          <p className="text-white">{record.work_type || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* ECU 정보 섹션 (파란색 계열) */}
                      <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-6">
                        <h4 className="font-medium text-blue-300 text-lg mb-4 flex items-center">
                          <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                          🔧 ECU 정보
                        </h4>
                        {ecuData ? (
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm text-blue-200 mb-1">제조사</p>
                              <p className="text-white font-medium">{ecuData.manufacturer}</p>
                            </div>
                            <div>
                              <p className="text-sm text-blue-200 mb-1">모델</p>
                              <p className="text-white">{ecuData.model}</p>
                            </div>
                            {ecuData.tuning_stage && (
                              <div>
                                <p className="text-sm text-blue-200 mb-1">튜닝 단계</p>
                                <span className="px-2 py-1 bg-blue-700 text-blue-100 rounded text-sm">
                                  Stage {ecuData.tuning_stage}
                                </span>
                              </div>
                            )}
                            {ecuData.connection_method && (
                              <div>
                                <p className="text-sm text-blue-200 mb-1">연결방법</p>
                                <span className="px-2 py-1 bg-blue-800 text-blue-200 rounded text-sm">
                                  {ecuData.connection_method}
                                </span>
                              </div>
                            )}
                            {ecuData.tools_used && (
                              <div>
                                <p className="text-sm text-blue-200 mb-1">사용 도구</p>
                                <p className="text-white">{ecuData.tools_used}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-blue-300 italic">ECU 정보 없음</p>
                        )}
                      </div>

                      {/* ACU 정보 섹션 (초록색 계열) */}
                      <div className="bg-green-900/30 border border-green-700 rounded-lg p-6">
                        <h4 className="font-medium text-green-300 text-lg mb-4 flex items-center">
                          <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                          ⚙️ ACU 정보
                        </h4>
                        {acuData ? (
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm text-green-200 mb-1">제조사</p>
                              <p className="text-white font-medium">{acuData.manufacturer}</p>
                            </div>
                            <div>
                              <p className="text-sm text-green-200 mb-1">모델</p>
                              <p className="text-white">{acuData.model}</p>
                            </div>
                            <div>
                              <p className="text-sm text-green-200 mb-1">타입</p>
                              <p className="text-white">{acuData.type}</p>
                            </div>
                            <div>
                              <p className="text-sm text-green-200 mb-1">상태</p>
                              <span className={`px-2 py-1 rounded text-sm ${
                                acuData.is_active 
                                  ? 'bg-green-700 text-green-100' 
                                  : 'bg-gray-700 text-gray-300'
                              }`}>
                                {acuData.is_active ? '✅ 활성화' : '❌ 비활성화'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-green-300 italic">ACU 정보 없음</p>
                        )}
                      </div>
                    </div>

                    {/* 작업 설명 */}
                    {record.work_description && (
                      <div className="bg-gray-700 rounded-lg p-6">
                        <h4 className="font-medium text-white text-lg mb-4">📝 작업 설명</h4>
                        <p className="text-gray-100 whitespace-pre-wrap">{record.work_description}</p>
                      </div>
                    )}

                    {/* 파일 다운로드 섹션 */}
                    {record.files && record.files.length > 0 && (
                      <div className="bg-gray-700 rounded-lg p-6">
                        <h4 className="font-medium text-white text-lg mb-4">📁 파일</h4>
                        <FileDownloadSection
                          recordId={parseInt(record.id, 10)}
                          files={record.files}
                          onDownloadStart={() => console.log('다운로드 시작')}
                          onDownloadComplete={() => console.log('다운로드 완료')}
                          onDownloadError={(error) => console.error('다운로드 오류:', error)}
                        />
                      </div>
                    )}

                    {/* 메모 */}
                    {record.notes && (
                      <div className="bg-gray-700 rounded-lg p-6">
                        <h4 className="font-medium text-white text-lg mb-4">📝 메모</h4>
                        <p className="text-gray-100 whitespace-pre-wrap">{record.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* 푸터 */}
                  <div className="mt-6 flex justify-end border-t border-gray-700 pt-4">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors"
                      onClick={onClose}
                    >
                      닫기
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default WorkDetailModal