'use client'

import { useState } from 'react'
import { ECU_TYPES, CONNECTION_METHODS, ECU_EQUIPMENT, TUNING_WORK } from '@/constants'

export default function WorkPage() {
  const [formData, setFormData] = useState({
    customerId: '',
    equipmentId: '',
    ecuType: '',
    connectionMethod: '',
    ecuEquipment: '',
    tuningWork: '',
    price: '',
    notes: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                고객 선택 *
              </label>
              <select
                name="customerId"
                value={formData.customerId}
                onChange={handleInputChange}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">고객을 선택하세요</option>
                {/* 고객 목록 렌더링 */}
              </select>
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
              >
                <option value="">장비를 선택하세요</option>
                {/* 장비 목록 렌더링 */}
              </select>
            </div>
          </div>

          {/* ECU 정보 */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">ECU 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ECU 타입 *
                </label>
                <select
                  name="ecuType"
                  value={formData.ecuType}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">ECU 타입을 선택하세요</option>
                  {ECU_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ECU 장비 *
                </label>
                <select
                  name="ecuEquipment"
                  value={formData.ecuEquipment}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">ECU 장비를 선택하세요</option>
                  {ECU_EQUIPMENT.map((equipment) => (
                    <option key={equipment} value={equipment}>
                      {equipment}
                    </option>
                  ))}
                </select>
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
                  {TUNING_WORK.map((work) => (
                    <option key={work} value={work}>
                      {work}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 작업 상세 정보 */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">작업 상세 정보</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  작업 금액 (원)
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="100000"
                  min="0"
                />
              </div>

              <div>
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
          </div>

          {/* 파일 업로드 */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">파일 첨부</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  원본 ECU 파일
                </label>
                <input
                  type="file"
                  accept=".bin,.hex,.ecu,.ori"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  지원 형식: .bin, .hex, .ecu, .ori
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  튜닝된 ECU 파일
                </label>
                <input
                  type="file"
                  accept=".bin,.hex,.ecu,.tuned"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  지원 형식: .bin, .hex, .ecu, .tuned
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  사진/영상 첨부
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  여러 파일 선택 가능 (사진, 영상)
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