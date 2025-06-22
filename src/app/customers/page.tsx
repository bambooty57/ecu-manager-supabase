'use client'

import { useState, useRef, useEffect } from 'react'
import Script from 'next/script'
import { getAllCustomers, createCustomer, createMultipleCustomers, deleteCustomer, updateCustomer, CustomerData } from '@/lib/customers'
import { testSupabaseConnection } from '@/lib/supabase'
import Navigation from '@/components/Navigation'
import AuthGuard from '@/components/AuthGuard'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerData[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // 모달 상태 보호를 위한 ref
  const modalStateRef = useRef({ isFormOpen: false, isDetailModalOpen: false })
  
  const initialFormData: Omit<CustomerData, 'id' | 'registrationDate'> = {
    name: '',
    phone: '',
    zipCode: '',
    roadAddress: '',
    jibunAddress: '',
  };
  const [formData, setFormData] = useState(initialFormData)
  
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editFormData, setEditFormData] = useState<Omit<CustomerData, 'id' | 'registrationDate'>>(initialFormData)
  
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

  // 모달 상태 ref 동기화
  useEffect(() => {
    modalStateRef.current = { isFormOpen, isDetailModalOpen }
  }, [isFormOpen, isDetailModalOpen])

  // 고객 데이터 로드
  useEffect(() => {
    loadCustomers()
  }, [])

  // 페이지 포커스 시 고객 목록 새로고침 (모달이 열려있지 않을 때만)
  useEffect(() => {
    // 모달이 열려있을 때는 아예 이벤트 리스너를 등록하지 않음
    if (isFormOpen || isDetailModalOpen) {
      console.log('🔒 모달 열림 상태 - 포커스 이벤트 리스너 비활성화')
      return
    }

    let focusTimeout: NodeJS.Timeout

          const handleFocus = () => {
        // ref를 사용한 최신 모달 상태 체크 (안전장치)
        if (modalStateRef.current.isFormOpen || modalStateRef.current.isDetailModalOpen || isLoading) {
          console.log('🚫 포커스 이벤트 발생했지만 모달 열림으로 무시 (ref 체크)')
          return
        }
      
      focusTimeout = setTimeout(() => {
        // 마지막 체크
        if (!isFormOpen && !isDetailModalOpen && !isLoading) {
          console.log('🔄 페이지 포커스로 인한 고객 목록 새로고침')
          loadCustomers()
        }
      }, 50) // 지연 시간 단축
    }

          const handleVisibilityChange = () => {
        // ref를 사용한 최신 모달 상태 체크 (안전장치)
        if (modalStateRef.current.isFormOpen || modalStateRef.current.isDetailModalOpen || isLoading) {
          console.log('🚫 가시성 변경 이벤트 발생했지만 모달 열림으로 무시 (ref 체크)')
          return
        }

      if (!document.hidden) {
        focusTimeout = setTimeout(() => {
          // 마지막 체크
          if (!isFormOpen && !isDetailModalOpen && !isLoading) {
            console.log('🔄 페이지 가시성 변경으로 인한 고객 목록 새로고침')
            loadCustomers()
          }
        }, 50) // 지연 시간 단축
      }
    }

    console.log('✅ 포커스 이벤트 리스너 등록 - 모달 닫힘 상태')
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      console.log('🧹 포커스 이벤트 리스너 정리')
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (focusTimeout) {
        clearTimeout(focusTimeout)
      }
    }
  }, [isFormOpen, isDetailModalOpen, isLoading]) // 모달 상태 변경 시마다 재등록

  // 모달이 열린 상태에서 페이지 이탈 방지
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isFormOpen || isDetailModalOpen) {
        e.preventDefault()
        e.returnValue = '작성 중인 내용이 있습니다. 정말로 페이지를 떠나시겠습니까?'
        return e.returnValue
      }
    }

    const handlePopState = (e: PopStateEvent) => {
      if (isFormOpen || isDetailModalOpen) {
        e.preventDefault()
        const confirmLeave = confirm('작성 중인 내용이 있습니다. 정말로 페이지를 떠나시겠습니까?')
        if (!confirmLeave) {
          // 브라우저 히스토리를 다시 현재 페이지로 복원
          window.history.pushState(null, '', window.location.href)
        } else {
          // 사용자가 확인한 경우 모달 닫기
          setIsFormOpen(false)
          setIsDetailModalOpen(false)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [isFormOpen, isDetailModalOpen])

  const loadCustomers = async () => {
    // 모달이 열려있을 때는 데이터 로딩 자체를 차단
    if (isFormOpen || isDetailModalOpen) {
      console.log('🔒 모달 열림 상태로 인한 고객 데이터 로딩 차단')
      return
    }

    setIsLoading(true)
    try {
      // 로딩 중에도 모달 상태 재확인
      if (isFormOpen || isDetailModalOpen) {
        console.log('🔒 로딩 중 모달 열림 감지 - 로딩 중단')
        return
      }

      // 연결 테스트 먼저 실행
      const isConnected = await testSupabaseConnection()
      if (!isConnected) {
        console.warn('⚠️ Supabase 연결에 문제가 있습니다. 더미 데이터를 사용할 수 있습니다.')
      }
      
      // 데이터 로드 전 마지막 모달 상태 확인
      if (isFormOpen || isDetailModalOpen) {
        console.log('🔒 데이터 로드 직전 모달 열림 감지 - 로딩 중단')
        return
      }

      const data = await getAllCustomers()
      
      // 데이터 설정 전 최종 확인
      if (isFormOpen || isDetailModalOpen) {
        console.log('🔒 데이터 설정 직전 모달 열림 감지 - 데이터 설정 생략')
        return
      }

      setCustomers(data)
      console.log('✅ 고객 데이터 로드 완료:', data.length, '명')
    } catch (error) {
      console.error('❌ 고객 데이터 로드 실패:', error)
    } finally {
      // 모달이 열려있을 때는 로딩 상태도 변경하지 않음
      if (!isFormOpen && !isDetailModalOpen) {
        setIsLoading(false)
      }
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
      setFormData(prev => ({ ...prev, [name]: formatted }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }



  // 고객 등록 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 필수 필드 검증
    if (!formData.name.trim()) {
      alert('고객명을 입력해주세요.')
      return
    }
    
    if (!formData.phone.trim()) {
      alert('전화번호를 입력해주세요.')
      return
    }
    
    try {
      console.log('🔧 고객 등록 시도:', formData)
      
      const newCustomer = await createCustomer(formData)

      if (newCustomer) {
        console.log('✅ 고객 등록 성공:', newCustomer)
        setCustomers(prev => [newCustomer, ...prev])
        setFormData(initialFormData)
        setIsFormOpen(false)
        alert('고객이 성공적으로 등록되었습니다.')
      } else {
        console.error('❌ 고객 등록 실패: null 반환')
        alert('고객 등록 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('❌ 고객 등록 오류:', error)
      
      // 오류 메시지 표시
      const errorMessage = error instanceof Error ? error.message : '고객 등록 중 오류가 발생했습니다.'
      alert(errorMessage)
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

  // 상세보기 모달 열기
  const handleViewDetail = (customer: CustomerData) => {
    setSelectedCustomer(customer)
    setEditFormData(customer)
    setIsDetailModalOpen(true)
    setIsEditMode(false)
  }

  // 수정 모드 토글
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode)
  }

  // 수정 폼 입력 핸들러
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    
    if (name === 'phone') {
      const formatted = formatPhoneNumber(value)
      setEditFormData(prev => ({ ...prev, [name]: formatted }))
    } else {
      setEditFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  // 수정 저장 핸들러
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedCustomer) return

    try {
      const updatedCustomer = await updateCustomer(selectedCustomer.id, editFormData)

      if (updatedCustomer) {
        // 로컬 상태 업데이트
        setCustomers(prev => prev.map(customer => 
          customer.id === selectedCustomer.id 
            ? { ...customer, ...editFormData }
            : customer
        ))
        
        // 선택된 고객 정보도 업데이트
        setSelectedCustomer({ ...selectedCustomer, ...editFormData })
        setIsEditMode(false)
        alert('고객 정보가 성공적으로 수정되었습니다.')
      }
    } catch (error) {
      console.error('Failed to update customer:', error)
      alert('고객 정보 수정 중 오류가 발생했습니다.')
    }
  }

  // 수정 취소 핸들러
  const handleCancelEdit = () => {
    if (!selectedCustomer) return
    
    setEditFormData(initialFormData)
    setIsEditMode(false)
  }

  // 모달 닫기
  const closeModal = () => {
    setIsDetailModalOpen(false)
    setSelectedCustomer(null)
    setIsEditMode(false)
  }

  // 카카오맵에서 주소 보기
  const handleViewOnMap = (e: React.MouseEvent, address: string) => {
    // 이벤트 전파 방지
    e.preventDefault()
    e.stopPropagation()
    
    if (!address) {
      alert('주소 정보가 없습니다.')
      return
    }
    
    // 카카오맵 URL로 이동
    const mapUrl = `https://map.kakao.com/link/search/${encodeURIComponent(address)}`
    
    try {
      // 팝업 차단 감지를 위한 처리
      const newWindow = window.open(mapUrl, '_blank', 'noopener,noreferrer')
      
      if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
        // 팝업이 차단된 경우 사용자에게 알리고 직접 복사할 수 있도록 함
        const userChoice = confirm(
          `팝업이 차단되어 지도를 열 수 없습니다.\n\n` +
          `다음 중 하나를 선택해주세요:\n` +
          `확인: 주소를 클립보드에 복사\n` +
          `취소: 작업 취소`
        )
        
        if (userChoice) {
          // 클립보드에 주소 복사
          navigator.clipboard.writeText(address).then(() => {
            alert(`주소가 클립보드에 복사되었습니다:\n${address}\n\n직접 지도 앱에서 검색해주세요.`)
          }).catch(() => {
            // 클립보드 복사 실패 시 주소 표시
            alert(`주소: ${address}\n\n위 주소를 복사하여 지도 앱에서 검색해주세요.`)
          })
        }
      }
    } catch (error) {
      console.error('지도 열기 오류:', error)
      // 오류 발생 시에도 클립보드 복사로 대체
      const userChoice = confirm(
        `지도를 열 수 없습니다.\n\n` +
        `확인을 누르면 주소를 클립보드에 복사합니다.`
      )
      
      if (userChoice) {
        navigator.clipboard.writeText(address).then(() => {
          alert(`주소가 클립보드에 복사되었습니다:\n${address}\n\n직접 지도 앱에서 검색해주세요.`)
        }).catch(() => {
          alert(`주소: ${address}\n\n위 주소를 복사하여 지도 앱에서 검색해주세요.`)
        })
      }
    }
  }

  // 고객등록용 주소 검색 함수
  const handleAddressSearch = () => {
    // @ts-ignore
    if (typeof window !== 'undefined' && window.daum && window.daum.Postcode) {
      // @ts-ignore
      new window.daum.Postcode({
        oncomplete: (data: any) => {
          console.log('🔍 주소검색 결과:', data)
          
          let fullAddress = data.address
          let extraAddress = ''

          if (data.addressType === 'R') {
            if (data.bname !== '') {
              extraAddress += data.bname
            }
            if (data.buildingName !== '') {
              extraAddress += (extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName)
            }
            fullAddress += (extraAddress !== '' ? ` (${extraAddress})` : '')
          }

          // 도로명주소와 지번주소 모두 설정
          setFormData(prev => ({
            ...prev,
            zipCode: data.zonecode || '',
            roadAddress: fullAddress,
            jibunAddress: data.jibunAddress || '',
          }))
          
          console.log('✅ 주소 설정 완료:', {
            roadAddress: fullAddress,
            jibunAddress: data.jibunAddress || ''
          })
        }
      }).open();
    } else {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
    }
  }

  // 수정용 주소 검색 함수  
  const handleEditAddressSearch = () => {
    // @ts-ignore
    if (typeof window !== 'undefined' && window.daum && window.daum.Postcode) {
      // @ts-ignore
      new window.daum.Postcode({
        oncomplete: (data: any) => {
          console.log('🔍 수정용 주소검색 결과:', data)
          
          let fullAddress = data.address
          let extraAddress = ''

          if (data.addressType === 'R') {
            if (data.bname !== '') {
              extraAddress += data.bname
            }
            if (data.buildingName !== '') {
              extraAddress += (extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName)
            }
            fullAddress += (extraAddress !== '' ? ` (${extraAddress})` : '')
          }

          // 수정 폼 데이터 업데이트
          setEditFormData(prev => ({
            ...prev,
            zipCode: data.zonecode || '',
            roadAddress: fullAddress,
            jibunAddress: data.jibunAddress || '',
          }))
          
          console.log('✅ 수정용 주소 설정 완료:', {
            roadAddress: fullAddress,
            jibunAddress: data.jibunAddress || ''
          })
        }
      }).open();
    } else {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
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
      const newCustomers: CustomerData[] = []
      const errors: string[] = []

      dataRows.forEach((row, index) => {
        try {
          if (row.length < 2) {
            errors.push(`${index + 2}행: 필수 정보가 부족합니다. (이름, 전화번호 필요)`)
            return
          }

          const [name, phone, roadAddress, jibunAddress] = row.map(cell => 
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
            roadAddress: roadAddress || '',
            jibunAddress: jibunAddress || '',
          }

          newCustomers.push(customerData as any)
        } catch {
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
    <AuthGuard>
      <Script
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="lazyOnload"
      />
      
              <Navigation />
      <main className="pt-20 pb-8 min-h-screen bg-gray-900">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
        {/* 페이지 헤더 */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex justify-between items-center">
            <div className="animate-slideIn">
              <h1 className="text-3xl font-bold text-white flex items-center">
                <span className="text-4xl mr-3">👥</span>
                고객 관리
              </h1>
              <p className="mt-2 text-gray-300">고객 정보를 등록하고 관리합니다.</p>
            </div>
            <div className="flex space-x-3 animate-fadeIn">
              <button
                onClick={downloadSampleFile}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 font-medium transition-colors"
              >
                <span>📄</span>
                <span>샘플 다운로드</span>
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
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 font-medium disabled:opacity-50 transition-colors"
                >
                  <span>📤</span>
                  <span>{isUploading ? '업로드 중...' : '엑셀/CSV 업로드'}</span>
                </button>
              </div>
              <button
                onClick={() => setIsFormOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>고객 등록</span>
              </button>
            </div>
          </div>
        </div>

        {/* 검색 및 필터 */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="고객명, 전화번호, 주소로 검색..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="bg-gray-700 text-white w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  viewMode === 'table' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                테이블
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  viewMode === 'grid' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                그리드
              </button>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-300 flex items-center">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
              총 <span className="font-semibold text-blue-400 mx-1">{filteredCustomerList.length}</span>명의 고객이 등록되어 있습니다.
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-sm text-gray-400 hover:text-gray-200 flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                검색 초기화
              </button>
            )}
          </div>
        </div>

        {/* 고객 목록 */}
        {isLoading ? (
          <div className="bg-gray-800 rounded-xl p-12">
            <div className="text-center">
              <div className="spinner mx-auto"></div>
              <p className="mt-4 text-gray-300">고객 데이터를 불러오는 중...</p>
            </div>
          </div>
        ) : viewMode === 'table' ? (
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center">
                        <span className="mr-2">👤</span>
                        고객명
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center">
                        <span className="mr-2">📞</span>
                        전화번호
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center">
                        <span className="mr-2">📍</span>
                        주소
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center">
                        <span className="mr-2">📅</span>
                        등록일
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center">
                        <span className="mr-2">⚙️</span>
                        작업
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {currentCustomers.map((customer, index) => (
                    <tr key={customer.id} className="animate-fadeIn" style={{animationDelay: `${index * 0.05}s`}}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                            {customer.name.charAt(0)}
                          </div>
                          <div className="text-sm font-medium text-white">{customer.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white font-mono">{customer.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div 
                          className="text-sm text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
                          onClick={(e) => handleViewOnMap(e, customer.roadAddress)}
                          title="카카오맵에서 보기"
                        >
                          {customer.roadAddress}
                        </div>
                        {customer.jibunAddress && (
                          <div 
                            className="text-xs text-gray-400 hover:text-gray-300 hover:underline cursor-pointer mt-1"
                            onClick={(e) => handleViewOnMap(e, customer.jibunAddress)}
                            title="카카오맵에서 보기"
                          >
                            지번: {customer.jibunAddress}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {customer.registrationDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewDetail(customer)}
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-900 px-2 py-1 rounded transition-all duration-200 cursor-pointer font-medium"
                          >
                            상세보기
                          </button>
                          <button
                            onClick={() => handleDelete(customer.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900 p-1 rounded transition-all duration-200 cursor-pointer"
                            title="삭제"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {currentCustomers.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">👥</div>
                <p className="text-lg">등록된 고객이 없습니다.</p>
                <p className="text-sm mt-2">새 고객을 등록해보세요!</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentCustomers.map((customer, index) => (
              <div key={customer.id} className="card-modern rounded-xl p-6 animate-fadeIn" style={{animationDelay: `${index * 0.1}s`}}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg mr-3">
                      {customer.name.charAt(0)}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{customer.name}</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewDetail(customer)}
                      className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 px-2 py-1 rounded transition-all duration-200 cursor-pointer text-sm font-medium"
                    >
                      상세보기
                    </button>
                    <button
                      onClick={() => handleDelete(customer.id)}
                      className="text-red-600 hover:text-red-900 hover:bg-red-50 p-1 rounded transition-all duration-200 cursor-pointer"
                      title="삭제"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center">
                    <span className="text-lg mr-2">📞</span>
                    <span className="font-medium text-gray-600 mr-2">전화번호:</span>
                    <span className="font-mono">{customer.phone}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-lg mr-2 mt-0.5">📍</span>
                    <div>
                      <div>
                        <span className="font-medium text-gray-600">주소:</span> 
                        <span 
                          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer ml-1"
                          onClick={(e) => handleViewOnMap(e, customer.roadAddress)}
                          title="카카오맵에서 보기"
                        >
                          {customer.roadAddress}
                        </span>
                      </div>
                      {customer.jibunAddress && (
                        <div 
                          className="text-xs text-gray-500 hover:text-gray-700 hover:underline cursor-pointer mt-1"
                          onClick={(e) => handleViewOnMap(e, customer.jibunAddress)}
                          title="카카오맵에서 보기"
                        >
                          지번: {customer.jibunAddress}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="text-lg mr-2">📅</span>
                    <span className="font-medium text-gray-600 mr-2">등록일:</span>
                    <span>{customer.registrationDate}</span>
                  </div>
                </div>
              </div>
            ))}
            {currentCustomers.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">👥</div>
                <p className="text-lg">등록된 고객이 없습니다.</p>
                <p className="text-sm mt-2">새 고객을 등록해보세요!</p>
              </div>
            )}
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="card-modern rounded-xl p-4">
            <div className="flex justify-center items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white/50 border border-gray-300 rounded-lg hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                이전
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                    currentPage === page
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-600 bg-white/50 hover:bg-white/80 hover:scale-105'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white/50 border border-gray-300 rounded-lg hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                다음
                <svg className="w-4 h-4 inline ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
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
                      value={formData.name}
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
                      value={formData.phone}
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
                          value={formData.zipCode}
                          onChange={handleInputChange}
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
                        value={formData.roadAddress}
                        onChange={handleInputChange}
                        required
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="도로명 주소"
                      />
                      <input
                        type="text"
                        name="jibunAddress"
                        value={formData.jibunAddress}
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

        {/* 고객 상세보기 모달 */}
        {isDetailModalOpen && selectedCustomer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {isEditMode ? '고객 정보 수정' : '고객 상세 정보'}
                  </h2>
                  <div className="flex items-center space-x-2">
                    {!isEditMode && (
                      <button
                        onClick={toggleEditMode}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        수정
                      </button>
                    )}
                    <button
                      onClick={closeModal}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {isEditMode ? (
                  /* 수정 모드 */
                  <form onSubmit={handleSaveEdit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          고객명 *
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={editFormData.name}
                          onChange={handleEditInputChange}
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
                          value={editFormData.phone}
                          onChange={handleEditInputChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="전화번호를 입력하세요"
                        />
                      </div>
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
                            value={editFormData.zipCode}
                            onChange={handleEditInputChange}
                            readOnly
                            className="w-32 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="우편번호"
                          />
                          <button
                            type="button"
                            onClick={handleEditAddressSearch}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                          >
                            주소 검색
                          </button>
                        </div>
                        <input
                          type="text"
                          name="roadAddress"
                          value={editFormData.roadAddress}
                          onChange={handleEditInputChange}
                          required
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="도로명 주소"
                        />
                        <input
                          type="text"
                          name="jibunAddress"
                          value={editFormData.jibunAddress}
                          onChange={handleEditInputChange}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="지번 주소"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-4 pt-6 border-t">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        저장
                      </button>
                    </div>
                  </form>
                ) : (
                  /* 상세보기 모드 */
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center mb-3">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg mr-3">
                            {selectedCustomer.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{selectedCustomer.name}</h3>
                            <p className="text-sm text-gray-600">고객명</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">📞</span>
                          <div>
                            <p className="text-lg font-semibold text-gray-900 font-mono">{selectedCustomer.phone}</p>
                            <p className="text-sm text-gray-600">전화번호</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">📅</span>
                          <div>
                            <p className="text-lg font-semibold text-gray-900">{selectedCustomer.registrationDate}</p>
                            <p className="text-sm text-gray-600">등록일</p>
                          </div>
                        </div>
                      </div>

                      {selectedCustomer.zipCode && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center">
                            <span className="text-2xl mr-3">📮</span>
                            <div>
                              <p className="text-lg font-semibold text-gray-900 font-mono">{selectedCustomer.zipCode}</p>
                              <p className="text-sm text-gray-600">우편번호</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-start">
                          <span className="text-2xl mr-3">🏠</span>
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-gray-900 mb-2">도로명 주소</h4>
                            <p 
                              className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                              onClick={(e) => handleViewOnMap(e, selectedCustomer.roadAddress)}
                              title="카카오맵에서 보기"
                            >
                              {selectedCustomer.roadAddress}
                            </p>
                          </div>
                        </div>
                      </div>

                      {selectedCustomer.jibunAddress && (
                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="flex items-start">
                            <span className="text-2xl mr-3">📍</span>
                            <div className="flex-1">
                              <h4 className="text-lg font-semibold text-gray-900 mb-2">지번 주소</h4>
                              <p 
                                className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                onClick={(e) => handleViewOnMap(e, selectedCustomer.jibunAddress)}
                                title="카카오맵에서 보기"
                              >
                                {selectedCustomer.jibunAddress}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
        </div>
      </main>
    </AuthGuard>
  )
} 