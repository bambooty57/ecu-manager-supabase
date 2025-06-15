'use client'

import { useState, useRef, useEffect } from 'react'
import Script from 'next/script'
import { getAllCustomers, createCustomer, createMultipleCustomers, deleteCustomer, CustomerData } from '@/lib/customers'

interface Customer {
  id: number
  name: string
  phone: string
  zipCode: string
  roadAddress: string
  jibunAddress: string
  registrationDate: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    zipCode: '',
    roadAddress: '',
    jibunAddress: ''
  })
  
  // 고객 목록 검색 및 페이지네이션 관련 state
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const itemsPerPage = 10
  
  // 엑셀 업로드 관련 state
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResults, setUploadResults] = useState<{success: number, errors: string[]}>({success: 0, errors: []})
  const [showUploadModal, setShowUploadModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 고객 데이터 로드
  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    setIsLoading(true)
    try {
      const data = await getAllCustomers()
      setCustomers(data)
    } catch (error) {
      console.error('Failed to load customers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 전화번호 자동 포맷팅 함수
  const formatPhoneNumber = (value: string) => {
    let numbers = value.replace(/[^0-9]/g, '')
    
    if (numbers.length === 0) {
      return ''
    }
    
    if (numbers.startsWith('010')) {
      numbers = numbers.slice(0, 11)
      
      if (numbers.length <= 3) {
        return numbers
      } else if (numbers.length <= 7) {
        return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
      } else {
        return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
      }
    } else {
      numbers = numbers.slice(0, 8)
      
      if (numbers.length <= 4) {
        return `010-${numbers}`
      } else {
        return `010-${numbers.slice(0, 4)}-${numbers.slice(4)}`
      }
    }
  }

  // 입력 값 변경 처리
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    
    if (name === 'phone') {
      const formatted = formatPhoneNumber(value)
      setCustomerForm(prev => ({ ...prev, [name]: formatted }))
    } else {
      setCustomerForm(prev => ({ ...prev, [name]: value }))
    }
  }

  // 카카오 주소 검색 함수
  const handleAddressSearch = () => {
    // @ts-ignore
    if (typeof window !== 'undefined' && window.daum && window.daum.Postcode) {
      // @ts-ignore
      new window.daum.Postcode({
        oncomplete: function(data: any) {
          console.log('Kakao Address Data:', data); // 디버깅용 로그
          
          // 도로명 주소 처리
          let roadAddr = data.roadAddress || '';
          let roadExtraAddr = '';
          
          // 도로명 주소 참고항목 조합
          if(data.bname !== '' && /[동|로|가]$/g.test(data.bname)){
            roadExtraAddr += data.bname;
          }
          if(data.buildingName !== '' && data.apartment === 'Y'){
            roadExtraAddr += (roadExtraAddr !== '' ? ', ' + data.buildingName : data.buildingName);
          }
          if(roadExtraAddr !== ''){
            roadAddr += ' (' + roadExtraAddr + ')';
          }

          // 지번 주소 처리 - 여러 필드를 확인하여 가장 적절한 주소 선택
          let jibunAddr = data.jibunAddress || data.autoJibunAddress || '';
          let jibunExtraAddr = '';
          
          // 지번주소가 없는 경우 기본 주소 정보로 구성
          if (!jibunAddr && data.sido && data.sigungu) {
            jibunAddr = data.sido + ' ' + data.sigungu;
            if (data.bname) {
              jibunAddr += ' ' + data.bname;
            }
            if (data.buildingName) {
              jibunAddr += ' ' + data.buildingName;
            }
          }
          
          // 지번 주소 참고항목 조합
          if(data.bname !== '' && /[동|로|가]$/g.test(data.bname) && !jibunAddr.includes(data.bname)){
            jibunExtraAddr += data.bname;
          }
          if(data.buildingName !== '' && data.apartment === 'Y' && !jibunAddr.includes(data.buildingName)){
            jibunExtraAddr += (jibunExtraAddr !== '' ? ', ' + data.buildingName : data.buildingName);
          }
          if(jibunExtraAddr !== ''){
            jibunAddr += ' (' + jibunExtraAddr + ')';
          }

          console.log('Processed addresses:', { roadAddr, jibunAddr }); // 디버깅용 로그

          // 우편번호, 도로명주소, 지번주소를 각각의 필드에 자동 입력
          setCustomerForm(prev => ({
            ...prev,
            zipCode: data.zonecode || '',
            roadAddress: roadAddr,
            jibunAddress: jibunAddr
          }))
        }
      }).open();
    } else {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
    }
  }

  // 고객 등록 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const newCustomer = await createCustomer({
        name: customerForm.name,
        phone: customerForm.phone,
        zipCode: customerForm.zipCode,
        roadAddress: customerForm.roadAddress,
        jibunAddress: customerForm.jibunAddress
      })

      if (newCustomer) {
        setCustomers(prev => [newCustomer, ...prev])
        setCustomerForm({
          name: '',
          phone: '',
          zipCode: '',
          roadAddress: '',
          jibunAddress: ''
        })
        setIsFormOpen(false)
      } else {
        alert('고객 등록 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Failed to create customer:', error)
      alert('고객 등록 중 오류가 발생했습니다.')
    }
  }

  // 검색 필터링된 고객 목록
  const filteredCustomerList = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    customer.roadAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.jibunAddress.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredCustomerList.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentCustomers = filteredCustomerList.slice(startIndex, endIndex)

  // 검색어 변경 시 첫 페이지로 이동
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

  // 고객 삭제
  const handleDelete = async (id: number) => {
    if (confirm('정말로 이 고객을 삭제하시겠습니까?')) {
      try {
        const success = await deleteCustomer(id)
        if (success) {
          setCustomers(prev => prev.filter(customer => customer.id !== id))
        } else {
          alert('고객 삭제 중 오류가 발생했습니다.')
        }
      } catch (error) {
        console.error('Failed to delete customer:', error)
        alert('고객 삭제 중 오류가 발생했습니다.')
      }
    }
  }

  // 엑셀/CSV 파일 처리 함수
  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadResults({success: 0, errors: []})

    try {
      let data: string[][]

      // 파일 확장자에 따른 처리
      const fileExtension = file.name.split('.').pop()?.toLowerCase()
      
      if (fileExtension === 'csv') {
        // CSV 파일 처리
        const text = await file.text()
        const lines = text.split('\n').filter(line => line.trim())
        
        if (lines.length === 0) {
          throw new Error('파일이 비어있습니다.')
        }

        data = lines.map(line => 
          line.split(',').map(col => col.trim().replace(/"/g, ''))
        )
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // 엑셀 파일 처리 (동적 import 사용)
        try {
          // xlsx 라이브러리를 동적으로 로드
          const XLSX = await import('xlsx')
          const arrayBuffer = await file.arrayBuffer()
          const workbook = XLSX.read(arrayBuffer, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]
        } catch (xlsxError) {
          console.error('XLSX Error:', xlsxError)
          throw new Error('엑셀 파일을 읽을 수 없습니다. xlsx 라이브러리가 설치되지 않았거나 파일이 손상되었을 수 있습니다.')
        }
      } else {
        throw new Error('지원하지 않는 파일 형식입니다. CSV, XLS, XLSX 파일만 업로드 가능합니다.')
      }

      if (data.length === 0) {
        throw new Error('파일이 비어있습니다.')
      }

      // 첫 번째 줄은 헤더로 간주하고 건너뛰기
      const dataRows = data.slice(1)
      const newCustomers: Customer[] = []
      const errors: string[] = []

      dataRows.forEach((row, index) => {
        try {
          if (row.length < 2) {
            errors.push(`${index + 2}행: 필수 정보가 부족합니다. (이름, 전화번호 필요)`)
            return
          }

          const [name, phone, zipCode, roadAddress, jibunAddress] = row.map(cell => 
            cell ? String(cell).trim() : ''
          )
          
          if (!name || !phone) {
            errors.push(`${index + 2}행: 이름과 전화번호는 필수입니다.`)
            return
          }

          // 전화번호 포맷팅
          const formattedPhone = formatPhoneNumber(phone)

          const customerData = {
            name: name,
            phone: formattedPhone,
            zipCode: zipCode || '',
            roadAddress: roadAddress || '',
            jibunAddress: jibunAddress || ''
          }

          newCustomers.push(customerData)
        } catch (error) {
          errors.push(`${index + 2}행: 데이터 처리 중 오류가 발생했습니다.`)
        }
      })

      // Supabase에 일괄 등록
      if (newCustomers.length > 0) {
        const result = await createMultipleCustomers(newCustomers)
        
        // 성공한 고객들을 목록에 추가
        if (result.success.length > 0) {
          setCustomers(prev => [...result.success, ...prev])
        }

        setUploadResults({
          success: result.success.length,
          errors: [...errors, ...result.errors]
        })
      } else {
        setUploadResults({
          success: 0,
          errors: errors
        })
      }

    } catch (error) {
      setUploadResults({
        success: 0,
        errors: [error instanceof Error ? error.message : '파일 처리 중 오류가 발생했습니다.']
      })
    } finally {
      setIsUploading(false)
      setShowUploadModal(true)
      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 샘플 파일 다운로드
  const downloadSampleFile = () => {
    const sampleData = [
      ['이름', '전화번호', '우편번호', '도로명주소', '지번주소'],
      ['김농부', '010-1234-5678', '18576', '경기도 화성시 농업로 123', '경기도 화성시 농업동 101-5'],
      ['이농장', '010-9876-5432', '31116', '충청남도 천안시 동남구 농장길 456', '충청남도 천안시 동남구 농장동 456-2'],
      ['박트랙터', '010-5555-1234', '54896', '전라북도 전주시 덕진구 기계로 789', '전라북도 전주시 덕진구 기계동 789-10']
    ]

    const csvContent = sampleData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', '고객_업로드_샘플.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <>
      <Script
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="lazyOnload"
      />
      
      <div className="space-y-6">
        {/* 페이지 헤더 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">고객 관리</h1>
            <p className="mt-2 text-gray-600">고객 정보를 등록하고 관리합니다.</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={downloadSampleFile}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              📄 샘플 다운로드
            </button>
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleExcelUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {isUploading ? '📤 업로드 중...' : '📤 엑셀/CSV 업로드'}
              </button>
            </div>
            <button
              onClick={() => setIsFormOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + 고객 등록
            </button>
          </div>
        </div>

        {/* 검색 및 필터 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="고객명, 전화번호, 주소로 검색..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
          <div className="mt-4 text-sm text-gray-600">
            총 {filteredCustomerList.length}명의 고객이 등록되어 있습니다.
          </div>
        </div>

        {/* 고객 목록 */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow p-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">고객 데이터를 불러오는 중...</p>
            </div>
          </div>
        ) : viewMode === 'table' ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">고객명</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">전화번호</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">주소</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">등록일</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{customer.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{customer.roadAddress}</div>
                        {customer.jibunAddress && (
                          <div className="text-sm text-gray-500">지번: {customer.jibunAddress}</div>
                        )}
                        <div className="text-sm text-gray-500">우편번호: {customer.zipCode}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.registrationDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleDelete(customer.id)}
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
            {currentCustomers.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                등록된 고객이 없습니다.
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentCustomers.map((customer) => (
              <div key={customer.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{customer.name}</h3>
                  <button
                    onClick={() => handleDelete(customer.id)}
                    className="text-red-600 hover:text-red-900 text-sm"
                  >
                    삭제
                  </button>
                </div>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">전화번호:</span> {customer.phone}</div>
                  <div><span className="font-medium">주소:</span> {customer.roadAddress}</div>
                  {customer.jibunAddress && (
                    <div><span className="font-medium">지번:</span> {customer.jibunAddress}</div>
                  )}
                  <div><span className="font-medium">우편번호:</span> {customer.zipCode}</div>
                  <div><span className="font-medium">등록일:</span> {customer.registrationDate}</div>
                </div>
              </div>
            ))}
            {currentCustomers.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500">
                등록된 고객이 없습니다.
              </div>
            )}
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  currentPage === page
                    ? 'text-white bg-blue-600 border border-blue-600'
                    : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        )}

        {/* 고객 등록 모달 */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">고객 등록</h2>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      고객명 *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={customerForm.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="고객명을 입력하세요"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      전화번호 *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={customerForm.phone}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="전화번호를 입력하세요 (자동 포맷팅)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      주소 *
                    </label>
                    <div className="space-y-3">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          name="zipCode"
                          value={customerForm.zipCode}
                          onChange={handleInputChange}
                          required
                          readOnly
                          className="w-32 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="우편번호"
                        />
                        <button
                          type="button"
                          onClick={handleAddressSearch}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          주소 검색
                        </button>
                      </div>
                      <input
                        type="text"
                        name="roadAddress"
                        value={customerForm.roadAddress}
                        onChange={handleInputChange}
                        required
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="도로명 주소"
                      />
                      <input
                        type="text"
                        name="jibunAddress"
                        value={customerForm.jibunAddress}
                        onChange={handleInputChange}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="지번 주소"
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

        {/* 엑셀 업로드 결과 모달 */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">업로드 결과</h2>
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  {/* 성공 결과 */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <h3 className="text-lg font-medium text-green-800">
                        성공적으로 등록된 고객: {uploadResults.success}명
                      </h3>
                    </div>
                  </div>

                  {/* 오류 결과 */}
                  {uploadResults.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-red-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-red-800 mb-2">
                            오류 발생: {uploadResults.errors.length}건
                          </h3>
                          <div className="max-h-40 overflow-y-auto">
                            <ul className="text-sm text-red-700 space-y-1">
                              {uploadResults.errors.map((error, index) => (
                                <li key={index} className="flex items-start">
                                  <span className="mr-2">•</span>
                                  <span>{error}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 안내 메시지 */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                                             <div className="text-sm text-blue-700">
                         <p className="font-medium mb-1">업로드 파일 형식 안내:</p>
                         <ul className="space-y-1">
                           <li>• CSV, XLS, XLSX 파일 형식을 지원합니다</li>
                           <li>• 첫 번째 줄은 헤더로 처리됩니다</li>
                           <li>• 컬럼 순서: 이름, 전화번호, 우편번호, 도로명주소, 지번주소</li>
                           <li>• 이름과 전화번호는 필수 항목입니다</li>
                           <li>• 우편번호, 도로명주소, 지번주소는 선택 항목입니다</li>
                           <li>• 중복된 고객(이름+전화번호)은 자동으로 제외됩니다</li>
                           <li>• 엑셀 파일의 경우 첫 번째 시트만 처리됩니다</li>
                         </ul>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <button
                    onClick={downloadSampleFile}
                    className="px-4 py-2 text-green-700 bg-green-100 rounded-md hover:bg-green-200 transition-colors"
                  >
                    📄 샘플 파일 다운로드
                  </button>
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    확인
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
} 