import { supabase } from './supabase'
import { Database } from './database.types'

type Customer = Database['public']['Tables']['customers']['Row']
type CustomerInsert = Database['public']['Tables']['customers']['Insert']
type CustomerUpdate = Database['public']['Tables']['customers']['Update']

export interface CustomerData {
  id: number
  name: string
  phone: string
  zipCode: string
  roadAddress: string
  jibunAddress: string
  registrationDate: string
}

// 데이터베이스 형식을 프론트엔드 형식으로 변환
const transformCustomerFromDB = (customer: Customer): CustomerData => ({
  id: customer.id,
  name: customer.name,
  phone: customer.phone,
  zipCode: customer.zip_code || '',
  roadAddress: customer.road_address || '',
  jibunAddress: customer.jibun_address || '',
  registrationDate: new Date(customer.created_at).toISOString().split('T')[0]
})

// 프론트엔드 형식을 데이터베이스 형식으로 변환
const transformCustomerToDB = (customer: Omit<CustomerData, 'id' | 'registrationDate'>): CustomerInsert => ({
  name: customer.name,
  phone: customer.phone,
  zip_code: customer.zipCode || null,
  road_address: customer.roadAddress || null,
  jibun_address: customer.jibunAddress || null
})

// 더미 고객 데이터 (환경변수가 placeholder일 때 사용)
let DUMMY_CUSTOMERS: CustomerData[] = [
  {
    id: 1,
    name: "김농부",
    phone: "010-1234-5678",
    zipCode: "12345",
    roadAddress: "경기도 안성시 죽산면 중앙로 69",
    jibunAddress: "경기도 안성시 죽산면 죽산리 123",
    registrationDate: "2024-01-15"
  },
  {
    id: 2,
    name: "이농장",
    phone: "010-2345-6789",
    zipCode: "54321",
    roadAddress: "충청남도 당진시 서부대로 중마트 등대로 1",
    jibunAddress: "충청남도 당진시 서부면 대로 123",
    registrationDate: "2024-02-20"
  },
  {
    id: 3,
    name: "박트랙터",
    phone: "010-3456-7890",
    zipCode: "67890",
    roadAddress: "전라북도 익산시 함라면 농기계로 456",
    jibunAddress: "전라북도 익산시 함라면 함라리 456",
    registrationDate: "2024-03-10"
  }
]

// 환경변수가 placeholder인지 확인
const isPlaceholderEnvironment = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  
  return url.includes('placeholder') || key.includes('placeholder')
}

// 모든 고객 조회
export const getAllCustomers = async (): Promise<CustomerData[]> => {
  // 환경변수가 placeholder면 더미 데이터 반환
  if (isPlaceholderEnvironment()) {
    console.log('🔄 환경변수가 placeholder입니다. 더미 고객 데이터를 사용합니다.')
    return DUMMY_CUSTOMERS
  }

  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching customers:', error)
      throw error
    }

    return data.map(transformCustomerFromDB)
  } catch (error) {
    console.error('Failed to fetch customers:', error)
    // 실패 시에도 더미 데이터 반환
    console.log('🔄 Supabase 연결 실패. 더미 고객 데이터를 사용합니다.')
    return DUMMY_CUSTOMERS
  }
}

// 고객 생성
export const createCustomer = async (customerData: Omit<CustomerData, 'id' | 'registrationDate'>): Promise<CustomerData | null> => {
  // 환경변수가 placeholder면 더미 데이터로 시뮬레이션
  if (isPlaceholderEnvironment()) {
    console.log('🔄 더미 모드: 고객 생성 시뮬레이션')
    
    // 새로운 ID 생성 (기존 최대 ID + 1)
    const maxId = DUMMY_CUSTOMERS.length > 0 ? Math.max(...DUMMY_CUSTOMERS.map(c => c.id)) : 0
    const newCustomer: CustomerData = {
      id: maxId + 1,
      ...customerData,
      registrationDate: new Date().toISOString().split('T')[0]
    }
    
    // 더미 데이터 배열에 추가
    DUMMY_CUSTOMERS.unshift(newCustomer) // 맨 앞에 추가
    
    console.log('✅ 더미 고객 생성 완료:', newCustomer)
    return newCustomer
  }

  try {
    console.log('🔧 Creating customer with data:', customerData)
    
    const insertData = transformCustomerToDB(customerData)
    console.log('🔧 Transformed data for DB:', insertData)
    
    const { data, error } = await supabase
      .from('customers')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('❌ Supabase error creating customer:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      
      // 특정 오류에 대한 사용자 친화적 메시지
      if (error.code === '23505') {
        throw new Error('이미 등록된 고객입니다.')
      } else if (error.code === '42P01') {
        throw new Error('데이터베이스 테이블을 찾을 수 없습니다.')
      } else if (error.code === '42501') {
        throw new Error('데이터베이스 접근 권한이 없습니다.')
      }
      
      throw error
    }

    console.log('✅ Customer created successfully:', data)
    return transformCustomerFromDB(data)
  } catch (error) {
    console.error('❌ Failed to create customer:', error)
    
    // 네트워크 오류나 연결 문제인 경우
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('❌ Network error - using fallback')
      throw new Error('네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인해주세요.')
    }
    
    throw error
  }
}

// 여러 고객 일괄 생성 (엑셀 업로드용)
export const createMultipleCustomers = async (customersData: Omit<CustomerData, 'id' | 'registrationDate'>[]): Promise<{
  success: CustomerData[]
  errors: string[]
}> => {
  const success: CustomerData[] = []
  const errors: string[] = []

  for (let i = 0; i < customersData.length; i++) {
    try {
      const customerData = customersData[i]
      
      // 중복 체크
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('name', customerData.name)
        .eq('phone', customerData.phone)
        .single()

      if (existingCustomer) {
        errors.push(`${i + 2}행: ${customerData.name}(${customerData.phone})는 이미 등록된 고객입니다.`)
        continue
      }

      const newCustomer = await createCustomer(customerData)
      if (newCustomer) {
        success.push(newCustomer)
      } else {
        errors.push(`${i + 2}행: ${customerData.name} 고객 등록 중 오류가 발생했습니다.`)
      }
    } catch (error) {
      errors.push(`${i + 2}행: 데이터 처리 중 오류가 발생했습니다.`)
    }
  }

  return { success, errors }
}

// 고객 수정
export const updateCustomer = async (id: number, customerData: Partial<Omit<CustomerData, 'id' | 'registrationDate'>>): Promise<CustomerData | null> => {
  // 더미 모드에서는 배열에서 수정
  if (isPlaceholderEnvironment()) {
    console.log('🔄 더미 모드: 고객 수정 시뮬레이션')
    const index = DUMMY_CUSTOMERS.findIndex(c => c.id === id)
    if (index !== -1) {
      DUMMY_CUSTOMERS[index] = {
        ...DUMMY_CUSTOMERS[index],
        ...customerData
      }
      console.log('✅ 더미 고객 수정 완료:', DUMMY_CUSTOMERS[index])
      return DUMMY_CUSTOMERS[index]
    }
    console.log('❌ 수정할 고객을 찾을 수 없습니다:', id)
    return null
  }

  try {
    const updateData: CustomerUpdate = {}
    
    if (customerData.name !== undefined) updateData.name = customerData.name
    if (customerData.phone !== undefined) updateData.phone = customerData.phone
    if (customerData.zipCode !== undefined) updateData.zip_code = customerData.zipCode || null
    if (customerData.roadAddress !== undefined) updateData.road_address = customerData.roadAddress || null
    if (customerData.jibunAddress !== undefined) updateData.jibun_address = customerData.jibunAddress || null
    
    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating customer:', error)
      throw error
    }

    return transformCustomerFromDB(data)
  } catch (error) {
    console.error('Failed to update customer:', error)
    return null
  }
}

// 고객 삭제
export const deleteCustomer = async (id: number): Promise<boolean> => {
  // 더미 모드에서는 배열에서 제거
  if (isPlaceholderEnvironment()) {
    console.log('🔄 더미 모드: 고객 삭제 시뮬레이션')
    const index = DUMMY_CUSTOMERS.findIndex(c => c.id === id)
    if (index !== -1) {
      DUMMY_CUSTOMERS.splice(index, 1)
      console.log('✅ 더미 고객 삭제 완료:', id)
      return true
    }
    console.log('❌ 삭제할 고객을 찾을 수 없습니다:', id)
    return false
  }

  try {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting customer:', error)
      throw error
    }

    return true
  } catch (error) {
    console.error('Failed to delete customer:', error)
    return false
  }
}

// ID로 고객 조회
export const getCustomerById = async (id: number): Promise<CustomerData | null> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching customer:', error)
      throw error
    }

    return transformCustomerFromDB(data)
  } catch (error) {
    console.error('Failed to fetch customer:', error)
    return null
  }
} 