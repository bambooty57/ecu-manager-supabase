'use client'

import { useState, useRef } from 'react'
import { EQUIPMENT_TYPES, MANUFACTURERS, MANUFACTURER_MODELS, ECU_TYPES, ACU_TYPES } from '@/constants'

interface Equipment {
  id: number
  customerName: string
  equipmentType: string
  manufacturer: string
  model: string
  serialNumber: string
  usageHours: number
  ecuType: string
  acuType: string
  registrationDate: string
  notes?: string
}

export default function EquipmentPage() {
  const [equipments, setEquipments] = useState<Equipment[]>([
    {
      id: 1,
      customerName: '김농부',
      equipmentType: '트랙터',
      manufacturer: 'John Deere',
      model: '6120M',
      serialNumber: 'JD2024001',
      usageHours: 1250,
      ecuType: 'Bosch EDC17',
      acuType: 'Bosch ACU',
      registrationDate: '2024-01-15',
      notes: '정기점검 완료'
    },
    {
      id: 2,
      customerName: '이농장',
      equipmentType: '콤바인',
      manufacturer: 'Case IH',
      model: 'Axial-Flow 8250',
      serialNumber: 'CI2024002',
      usageHours: 850,
      ecuType: 'Delphi DCM',
      acuType: 'Delphi ACU',
      registrationDate: '2024-02-20',
      notes: 'DPF 청소 필요'
    },
    {
      id: 3,
      customerName: '박목장',
      equipmentType: '굴삭기',
      manufacturer: 'Caterpillar',
      model: '320D',
      serialNumber: 'CAT2024003',
      usageHours: 2100,
      ecuType: 'Caterpillar ADEM ECU',
      acuType: 'Caterpillar ACU',
      registrationDate: '2024-03-10',
      notes: 'AdBlue 시스템 점검'
    }
  ])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterManufacturer, setFilterManufacturer] = useState('')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  
  const [formData, setFormData] = useState({
    customerName: '',
    equipmentType: '',
    manufacturer: '',
    model: '',
    customModel: '',
    serialNumber: '',
    usageHours: 0,
    ecuType: '',
    acuType: '',
    notes: ''
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  // 제조사별 모델명 목록 가져오기
  const getAvailableModels = (manufacturer: string) => {
    return MANUFACTURER_MODELS[manufacturer] || []
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    if (name === 'manufacturer') {
      // 제조사 변경 시 모델명 초기화
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        model: '',
        customModel: ''
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // 모델명 처리: CUSTOM 선택 시 customModel 사용, 아니면 model 사용
    const finalModel = formData.model === 'CUSTOM' ? formData.customModel : formData.model
    
    const newEquipment: Equipment = {
      id: Date.now(),
      ...formData,
      model: finalModel,
      registrationDate: new Date().toISOString().split('T')[0]
    }

    setEquipments(prev => [newEquipment, ...prev])
    setFormData({
      customerName: '',
      equipmentType: '',
      manufacturer: '',
      model: '',
      customModel: '',
      serialNumber: '',
      usageHours: 0,
      ecuType: '',
      acuType: '',
      notes: ''
    })
    setIsFormOpen(false)
  }

  const filteredEquipments = equipments.filter(equipment => {
    const matchesSearch = 
      equipment.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      equipment.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      equipment.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = !filterType || equipment.equipmentType === filterType
    const matchesManufacturer = !filterManufacturer || equipment.manufacturer === filterManufacturer
    
    return matchesSearch && matchesType && matchesManufacturer
  })

  const handleDelete = (id: number) => {
    if (confirm('정말로 이 장비를 삭제하시겠습니까?')) {
      setEquipments(prev => prev.filter(equipment => equipment.id !== id))
    }
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">장비 관리</h1>
          <p className="mt-2 text-gray-600">농기계 장비 정보를 등록하고 관리합니다.</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 장비 등록
        </button>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <input
              type="text"
              placeholder="고객명, 모델명, 시리얼번호 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 장비 종류</option>
              {EQUIPMENT_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={filterManufacturer}
              onChange={(e) => setFilterManufacturer(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 제조사</option>
              {MANUFACTURERS.map(manufacturer => (
                <option key={manufacturer} value={manufacturer}>{manufacturer}</option>
              ))}
            </select>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 rounded-md ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              테이블
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 rounded-md ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              그리드
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          총 {filteredEquipments.length}개의 장비가 등록되어 있습니다.
        </div>
      </div>

      {/* 장비 목록 */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">고객명</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">장비 정보</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">제조사/모델</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">사용시간</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ECU 타입</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ACU 타입</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">등록일</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEquipments.map((equipment) => (
                  <tr key={equipment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{equipment.customerName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{equipment.equipmentType}</div>
                      <div className="text-sm text-gray-500">S/N: {equipment.serialNumber}</div>
                    </td>
                                                              <td className="px-6 py-4 whitespace-nowrap">
                       <div className="text-sm text-gray-900">{equipment.manufacturer}</div>
                       <div className="text-sm text-gray-500">{equipment.model}</div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap">
                       <div className="text-sm text-gray-900">{equipment.usageHours.toLocaleString()}시간</div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap">
                       <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                         {equipment.ecuType}
                       </span>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap">
                       <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                         {equipment.acuType}
                       </span>
                     </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {equipment.registrationDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDelete(equipment.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredEquipments.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              등록된 장비가 없습니다.
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEquipments.map((equipment) => (
            <div key={equipment.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{equipment.customerName}</h3>
                <button
                  onClick={() => handleDelete(equipment.id)}
                  className="text-red-600 hover:text-red-900 text-sm"
                >
                  삭제
                </button>
              </div>
                               <div className="space-y-2 text-sm">
                   <div><span className="font-medium">장비:</span> {equipment.equipmentType}</div>
                   <div><span className="font-medium">제조사:</span> {equipment.manufacturer}</div>
                   <div><span className="font-medium">모델:</span> {equipment.model}</div>
                   <div><span className="font-medium">시리얼번호:</span> {equipment.serialNumber}</div>
                   <div><span className="font-medium">사용시간:</span> {equipment.usageHours.toLocaleString()}시간</div>
                   <div><span className="font-medium">ECU:</span> 
                     <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                       {equipment.ecuType}
                     </span>
                   </div>
                   <div><span className="font-medium">ACU:</span> 
                     <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                       {equipment.acuType}
                     </span>
                   </div>
                   <div><span className="font-medium">등록일:</span> {equipment.registrationDate}</div>
                   {equipment.notes && (
                     <div><span className="font-medium">메모:</span> {equipment.notes}</div>
                   )}
                 </div>
            </div>
          ))}
          {filteredEquipments.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              등록된 장비가 없습니다.
            </div>
          )}
        </div>
      )}

      {/* 장비 등록 모달 */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">장비 등록</h2>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      고객명 *
                    </label>
                    <input
                      type="text"
                      name="customerName"
                      value={formData.customerName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="고객명을 입력하세요"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      장비 종류 *
                    </label>
                    <select
                      name="equipmentType"
                      value={formData.equipmentType}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">선택하세요</option>
                      {EQUIPMENT_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      제조사 *
                    </label>
                    <select
                      name="manufacturer"
                      value={formData.manufacturer}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">선택하세요</option>
                      {MANUFACTURERS.map(manufacturer => (
                        <option key={manufacturer} value={manufacturer}>{manufacturer}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      모델명 *
                    </label>
                    {formData.manufacturer && getAvailableModels(formData.manufacturer).length > 0 ? (
                      <select
                        name="model"
                        value={formData.model}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">모델을 선택하세요</option>
                        {getAvailableModels(formData.manufacturer).map((model) => (
                          <option key={model} value={model}>{model}</option>
                        ))}
                        <option value="CUSTOM">직접 입력</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        name="model"
                        value={formData.model}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={formData.manufacturer ? "모델명을 직접 입력하세요" : "제조사를 먼저 선택하세요"}
                        disabled={!formData.manufacturer}
                      />
                    )}
                    {formData.model === 'CUSTOM' && (
                      <input
                        type="text"
                        name="customModel"
                        value={formData.customModel || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, customModel: e.target.value }))}
                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="모델명을 직접 입력하세요"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      시리얼번호 *
                    </label>
                    <input
                      type="text"
                      name="serialNumber"
                      value={formData.serialNumber}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="시리얼번호를 입력하세요"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      사용시간 (시간) *
                    </label>
                    <input
                      type="number"
                      name="usageHours"
                      value={formData.usageHours}
                      onChange={handleInputChange}
                      required
                      min="0"
                      step="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="사용시간을 입력하세요 (예: 1500)"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      장비의 총 사용시간을 시간 단위로 입력하세요
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ECU 타입 *
                    </label>
                    <select
                      name="ecuType"
                      value={formData.ecuType}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">선택하세요</option>
                      {ECU_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ACU 타입 *
                    </label>
                    <select
                      name="acuType"
                      value={formData.acuType}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">선택하세요</option>
                      {ACU_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      메모
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="추가 정보나 특이사항을 입력하세요"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    등록
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 