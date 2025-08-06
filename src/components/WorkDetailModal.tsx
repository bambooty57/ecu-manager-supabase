'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog } from '@headlessui/react';
import { supabase } from '@/lib/supabase';
import { TUNING_WORKS, WORK_STATUS } from '@/constants';
import { cacheManager, CacheKeys, CacheTTL } from '@/lib/cache-manager';

interface WorkRecord {
  id: number;
  work_date: string;
  ecu_work_amount?: number;
  acu_work_amount?: number;
  ecu_work_content?: string;
  acu_work_content?: string;
  ecu_status?: string;
  acu_status?: string;
  customer_id: number;
  equipment_id: number;
  remappingWorks?: any[];
  customer?: {
    name: string;
    phone: string;
    roadAddress: string;
  };
  equipment?: {
    model?: string;
    type?: string;
    manufacturer?: string;
    serialNumber?: string;
  };
}

interface WorkDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  workRecord: WorkRecord | null;
  onSave: () => void;
}

// 🎨 최적화된 X 아이콘 컴포넌트
const XIcon = React.memo(() => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
));

XIcon.displayName = 'XIcon';

export default function WorkDetailModal({ isOpen, onClose, workRecord, onSave }: WorkDetailModalProps) {
  // 🚀 성능 최적화된 상태 관리
  const [formData, setFormData] = useState<WorkRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ecuSelectedWorks, setEcuSelectedWorks] = useState<string[]>([]);
  const [acuSelectedWorks, setAcuSelectedWorks] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [saveProgress, setSaveProgress] = useState<{
    isSaving: boolean;
    progress: number;
    currentStep: string;
  }>({
    isSaving: false,
    progress: 0,
    currentStep: ''
  });

  // 🎯 메모이제이션된 계산값들
  const totalAmount = useMemo(() => {
    if (!formData) return 0;
    return (formData.ecu_work_amount || 0) + (formData.acu_work_amount || 0);
  }, [formData]);

  const isFormValid = useMemo(() => {
    if (!formData) return false;
    // 기본 필수 항목만 체크 (작업일)
    const hasRequiredFields = formData.work_date;
    // 작업 내용은 선택사항으로 변경 (최소 하나는 선택하도록)
    const hasWorkContent = ecuSelectedWorks.length > 0 || acuSelectedWorks.length > 0;
    const hasNoErrors = Object.keys(validationErrors).length === 0;
    
    return hasRequiredFields && hasNoErrors;
  }, [formData, ecuSelectedWorks, acuSelectedWorks, validationErrors]);

  // 🔄 최적화된 데이터 초기화
  const initializeFormData = useCallback(async (record: WorkRecord) => {
    console.log('🔍 WorkRecord received:', record);
    
    try {
      // 기본 데이터 설정
      const enhancedRecord = {
        ...record,
        ecu_work_amount: record.ecu_work_amount || 0,
        acu_work_amount: record.acu_work_amount || 0,
        ecu_work_content: record.ecu_work_content || '',
        acu_work_content: record.acu_work_content || '',
        ecu_status: record.ecu_status || '',
        acu_status: record.acu_status || ''
      };

      setFormData(enhancedRecord);

      // 고객 및 장비 정보 로드 (오류 발생 시 무시)
      try {
        const customerKey = `${CacheKeys.CUSTOMER}_${record.customer_id}`;
        const equipmentKey = `${CacheKeys.EQUIPMENT}_${record.equipment_id}`;
        
        let customerData = await cacheManager.get(customerKey);
        let equipmentData = await cacheManager.get(equipmentKey);
        
        if (!customerData) {
          const { data: customer } = await supabase
            .from('customers')
            .select('*')
            .eq('id', record.customer_id)
            .single();
          customerData = customer;
          if (customerData) {
            await cacheManager.set(customerKey, customerData, CacheTTL.SHORT);
          }
        }
        
        if (!equipmentData) {
          const { data: equipment } = await supabase
            .from('equipment')
            .select('*')
            .eq('id', record.equipment_id)
            .single();
          equipmentData = equipment;
          if (equipmentData) {
            await cacheManager.set(equipmentKey, equipmentData, CacheTTL.SHORT);
          }
        }

        if (customerData && equipmentData) {
          setFormData(prev => prev ? {
            ...prev,
            customer: customerData as { name: string; phone: string; roadAddress: string },
            equipment: equipmentData as { model?: string; type?: string; manufacturer?: string; serialNumber?: string }
          } : null);
        }
      } catch (error) {
        console.warn('⚠️ 고객/장비 정보 로드 실패:', error);
        // 고객/장비 정보 로드 실패는 치명적이지 않음
      }

      // ECU 작업내용 추출 - remapping_works에서 가져오기
      let ecuWorks: string[] = [];
      let ecuAmount: number = record.ecu_work_amount || 0;
      let ecuStatus: string = record.ecu_status || '';
      
      if (record.remappingWorks && Array.isArray(record.remappingWorks) && record.remappingWorks.length > 0) {
        const firstWork = record.remappingWorks[0] as any;
        console.log('🔍 First work structure:', firstWork);
        
        if (firstWork.ecu && firstWork.ecu.selectedWorks && Array.isArray(firstWork.ecu.selectedWorks)) {
          ecuWorks = [...firstWork.ecu.selectedWorks];
          console.log('🔍 ECU selectedWorks found:', ecuWorks);
        }
        
        if (firstWork.ecu) {
          if (firstWork.ecu.price && firstWork.ecu.price !== '') {
            ecuAmount = parseFloat(firstWork.ecu.price) || 0;
          }
          if (firstWork.ecu.status && firstWork.ecu.status !== '') {
            ecuStatus = firstWork.ecu.status;
          }
        }
      }

      // ACU 작업내용 추출
      let acuWorks: string[] = [];
      let acuAmount: number = record.acu_work_amount || 0;
      let acuStatus: string = record.acu_status || '';
      
      if (record.remappingWorks && Array.isArray(record.remappingWorks) && record.remappingWorks.length > 0) {
        const firstWork = record.remappingWorks[0] as any;
        
        if (firstWork.acu && firstWork.acu.selectedWorks && Array.isArray(firstWork.acu.selectedWorks)) {
          acuWorks = [...firstWork.acu.selectedWorks];
        }
        
        if (firstWork.acu) {
          if (firstWork.acu.price && firstWork.acu.price !== '') {
            acuAmount = parseFloat(firstWork.acu.price) || 0;
          }
          if (firstWork.acu.status && firstWork.acu.status !== '') {
            acuStatus = firstWork.acu.status;
          }
        }
      }

      setEcuSelectedWorks(ecuWorks);
      setAcuSelectedWorks(acuWorks);
      
      setFormData(prev => prev ? {
        ...prev,
        ecu_work_amount: ecuAmount,
        acu_work_amount: acuAmount,
        ecu_status: ecuStatus,
        acu_status: acuStatus
      } : null);

    } catch (error) {
      console.error('❌ 데이터 초기화 오류:', error);
      setValidationErrors({ general: '데이터 로드 중 오류가 발생했습니다.' });
    }
  }, []);

  // 🔄 useEffect 최적화
  useEffect(() => {
    if (workRecord) {
      initializeFormData(workRecord);
    } else {
      setEcuSelectedWorks([]);
      setAcuSelectedWorks([]);
      setFormData(null);
      setValidationErrors({});
    }
  }, [workRecord, initializeFormData]);

  // ✅ 입력 검증 시스템
  const validateInput = useCallback((field: string, value: any): string => {
    switch (field) {
      case 'work_date':
        if (!value) return '작업일을 선택해주세요.';
        if (new Date(value) > new Date()) return '작업일은 오늘 이후일 수 없습니다.';
        break;
      case 'ecu_work_amount':
      case 'acu_work_amount':
        if (value && value < 0) return '금액은 0 이상이어야 합니다.';
        if (value && value > 100000000) return '금액이 너무 큽니다.';
        break;
      case 'ecu_status':
      case 'acu_status':
        if (value && !WORK_STATUS.includes(value)) return '유효하지 않은 상태입니다.';
        break;
    }
    return '';
  }, []);

  // 🔄 입력 변경 핸들러 최적화
  const handleInputChange = useCallback((field: keyof WorkRecord, value: any) => {
    if (formData) {
      // 입력 검증
      const error = validateInput(field, value);
      setValidationErrors(prev => ({
        ...prev,
        [field]: error
      }));

      setFormData(prev => prev ? {
        ...prev,
        [field]: value
      } : null);
    }
  }, [formData, validateInput]);

  // 🔄 작업 선택 토글 최적화
  const handleEcuWorkToggle = useCallback((work: string) => {
    setEcuSelectedWorks(prev => 
      prev.includes(work) 
        ? prev.filter(item => item !== work)
        : [...prev, work]
    );
  }, []);

  const handleAcuWorkToggle = useCallback((work: string) => {
    setAcuSelectedWorks(prev => 
      prev.includes(work) 
        ? prev.filter(item => item !== work)
        : [...prev, work]
    );
  }, []);

  // 💾 최적화된 저장 핸들러
  const handleSave = useCallback(async () => {
    if (!formData) {
      alert('데이터가 로드되지 않았습니다.');
      return;
    }

    // 기본 유효성 검사
    if (!formData.work_date) {
      alert('작업일을 선택해주세요.');
      return;
    }

    setIsLoading(true);
    setSaveProgress({
      isSaving: true,
      progress: 0,
      currentStep: '데이터 검증 중...'
    });

    try {
      // 1단계: 데이터 검증
      setSaveProgress(prev => ({ ...prev, progress: 20, currentStep: '데이터 검증 중...' }));
      
      const errors: {[key: string]: string} = {};
      Object.keys(formData).forEach(key => {
        const error = validateInput(key, formData[key as keyof WorkRecord]);
        if (error) errors[key] = error;
      });

      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        throw new Error('입력 데이터에 오류가 있습니다.');
      }

      // 2단계: 업데이트 데이터 준비
      setSaveProgress(prev => ({ ...prev, progress: 40, currentStep: '데이터 준비 중...' }));

      const updateData: any = {
        work_date: formData.work_date,
        ecu_work_amount: formData.ecu_work_amount || null,
        acu_work_amount: formData.acu_work_amount || null,
        ecu_work_content: ecuSelectedWorks.join(', '),
        acu_work_content: acuSelectedWorks.join(', '),
        ecu_status: formData.ecu_status || null,
        acu_status: formData.acu_status || null,
        updated_at: new Date().toISOString()
      };

      // 3단계: remappingWorks JSONB 데이터 업데이트
      setSaveProgress(prev => ({ ...prev, progress: 60, currentStep: '작업 데이터 업데이트 중...' }));

      if (workRecord?.remappingWorks && Array.isArray(workRecord.remappingWorks) && workRecord.remappingWorks.length > 0) {
        const updatedRemappingWorks = [...workRecord.remappingWorks];
        const firstWork = { ...updatedRemappingWorks[0] };
        
        if (firstWork.ecu) {
          firstWork.ecu.selectedWorks = ecuSelectedWorks;
          firstWork.ecu.status = formData.ecu_status || firstWork.ecu.status;
          firstWork.ecu.price = formData.ecu_work_amount || firstWork.ecu.price || 0;
        }
        
        if (firstWork.acu) {
          firstWork.acu.selectedWorks = acuSelectedWorks;
          firstWork.acu.status = formData.acu_status || firstWork.acu.status;
          firstWork.acu.price = formData.acu_work_amount || firstWork.acu.price || 0;
        }
        
        updatedRemappingWorks[0] = firstWork;
        updateData.remapping_works = updatedRemappingWorks;
      }

      // 4단계: Supabase 업데이트
      setSaveProgress(prev => ({ ...prev, progress: 80, currentStep: '데이터베이스 저장 중...' }));

      const { error } = await supabase
        .from('work_records')
        .update(updateData)
        .eq('id', formData.id);

      if (error) {
        console.error('저장 오류:', error);
        throw new Error(`저장 중 오류가 발생했습니다: ${error.message}`);
      }

      // 5단계: 캐시 무효화 (오류 발생 시 무시)
      setSaveProgress(prev => ({ ...prev, progress: 90, currentStep: '캐시 업데이트 중...' }));
      
      try {
        await cacheManager.deleteByPattern('work_records_*');
        await cacheManager.deleteByPattern('customers_*');
        await cacheManager.deleteByPattern('equipment_*');
      } catch (cacheError) {
        console.warn('⚠️ 캐시 무효화 실패:', cacheError);
        // 캐시 오류는 치명적이지 않음
      }

      // 6단계: 완료
      setSaveProgress(prev => ({ ...prev, progress: 100, currentStep: '완료!' }));

      console.log('✅ 작업 기록 저장 완료');
      alert('작업 기록이 성공적으로 저장되었습니다.');
      onSave();
      onClose();

    } catch (error) {
      console.error('저장 오류:', error);
      alert(`저장 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsLoading(false);
      setSaveProgress({
        isSaving: false,
        progress: 0,
        currentStep: ''
      });
    }
  }, [formData, ecuSelectedWorks, acuSelectedWorks, validateInput, workRecord, onSave, onClose]);

  // 🎨 최적화된 렌더링
  if (!formData) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black bg-opacity-50" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                작업 기록 수정
              </Dialog.Title>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                disabled={isLoading}
              >
                <XIcon />
              </button>
            </div>

            {/* 저장 진행 상황 */}
            {saveProgress.isSaving && (
              <div className="mb-6 p-4 bg-blue-900/20 border border-blue-600 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                    <span className="text-blue-300 font-medium">저장 중...</span>
                  </div>
                  <span className="text-blue-400 text-sm">
                    {saveProgress.progress}%
                  </span>
                </div>
                
                <div className="mb-2">
                  <div className="text-sm text-blue-300 mb-1">
                    {saveProgress.currentStep}
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${saveProgress.progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* 고객 및 장비 정보 */}
            {formData.customer && formData.equipment && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">고객 정보</h4>
                    <p className="text-sm text-gray-900 dark:text-white">{formData.customer.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formData.customer.phone}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formData.customer.roadAddress}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">장비 정보</h4>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {formData.equipment.manufacturer} {formData.equipment.model}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formData.equipment.type}</p>
                    {formData.equipment.serialNumber && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">S/N: {formData.equipment.serialNumber}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 작업일 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                작업일 *
              </label>
              <input
                type="date"
                value={formData.work_date}
                onChange={(e) => handleInputChange('work_date', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                  validationErrors.work_date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                disabled={isLoading}
              />
              {validationErrors.work_date && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.work_date}</p>
              )}
            </div>

            {/* ECU 섹션 */}
            <div className="mb-6 p-4 border-2 border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-4">
                🚜 ECU 작업
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ECU 작업금액 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ECU 작업금액 (만원)
                  </label>
                  <input
                    type="number"
                    value={formData.ecu_work_amount ? Math.floor(formData.ecu_work_amount / 10000) : ''}
                    onChange={(e) => handleInputChange('ecu_work_amount', (parseFloat(e.target.value) || 0) * 10000)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                      validationErrors.ecu_work_amount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="금액을 만원 단위로 입력하세요"
                    disabled={isLoading}
                  />
                  {validationErrors.ecu_work_amount && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.ecu_work_amount}</p>
                  )}
                </div>

                {/* ECU 상태 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ECU 상태
                  </label>
                  <select
                    value={formData.ecu_status || ''}
                    onChange={(e) => handleInputChange('ecu_status', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                      validationErrors.ecu_status ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    disabled={isLoading}
                  >
                    <option value="">선택하세요</option>
                    {WORK_STATUS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {validationErrors.ecu_status && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.ecu_status}</p>
                  )}
                </div>
              </div>

              {/* ECU 작업내용 - 다중선택 */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ECU 작업내용 (다중 선택 가능) *
                </label>
                <div className="p-4 border border-blue-200 bg-white dark:bg-gray-700 dark:border-blue-600 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      ECU/튜닝 🔧
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {ecuSelectedWorks.length}/{TUNING_WORKS.length} 선택됨
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {TUNING_WORKS.map((work) => {
                      const isChecked = ecuSelectedWorks.includes(work);
                      return (
                        <label key={work} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleEcuWorkToggle(work)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            disabled={isLoading}
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{work}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* ACU 섹션 */}
            <div className="mb-6 p-4 border-2 border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/20 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-4">
                ⚙️ ACU 작업
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ACU 작업금액 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ACU 작업금액 (만원)
                  </label>
                  <input
                    type="number"
                    value={formData.acu_work_amount ? Math.floor(formData.acu_work_amount / 10000) : ''}
                    onChange={(e) => handleInputChange('acu_work_amount', (parseFloat(e.target.value) || 0) * 10000)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white ${
                      validationErrors.acu_work_amount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="금액을 만원 단위로 입력하세요"
                    disabled={isLoading}
                  />
                  {validationErrors.acu_work_amount && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.acu_work_amount}</p>
                  )}
                </div>

                {/* ACU 상태 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ACU 상태
                  </label>
                  <select
                    value={formData.acu_status || ''}
                    onChange={(e) => handleInputChange('acu_status', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white ${
                      validationErrors.acu_status ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    disabled={isLoading}
                  >
                    <option value="">선택하세요</option>
                    {WORK_STATUS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {validationErrors.acu_status && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.acu_status}</p>
                  )}
                </div>
              </div>

              {/* ACU 작업내용 - 다중선택 */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ACU 작업내용 (다중 선택 가능) *
                </label>
                <div className="p-4 border border-green-200 bg-white dark:bg-gray-700 dark:border-green-600 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      ACU/튜닝 ⚙️
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {acuSelectedWorks.length}/{TUNING_WORKS.length} 선택됨
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {TUNING_WORKS.map((work) => {
                      const isChecked = acuSelectedWorks.includes(work);
                      return (
                        <label key={work} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleAcuWorkToggle(work)}
                            className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            disabled={isLoading}
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{work}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 총 금액 표시 */}
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">총 작업 금액</span>
                <span className="text-lg font-bold text-yellow-900 dark:text-yellow-100">
                  ₩{Math.floor(totalAmount / 10000).toLocaleString()}만원
                </span>
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading || !formData?.work_date}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}