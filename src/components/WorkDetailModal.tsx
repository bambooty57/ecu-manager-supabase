'use client';

import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { supabase } from '@/lib/supabase';
import { TUNING_WORKS, WORK_STATUS } from '@/constants';

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
  remappingWorks?: any[]; // Assuming remappingWorks is an array of objects
}

interface WorkDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  workRecord: WorkRecord | null;
  onSave: () => void;
}

// 간단한 X 아이콘 컴포넌트
const XIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function WorkDetailModal({ isOpen, onClose, workRecord, onSave }: WorkDetailModalProps) {
  const [formData, setFormData] = useState<WorkRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ecuSelectedWorks, setEcuSelectedWorks] = useState<string[]>([]);
  const [acuSelectedWorks, setAcuSelectedWorks] = useState<string[]>([]);

  useEffect(() => {
    if (workRecord) {
      console.log('🔍 WorkRecord received:', workRecord);
      
      setFormData({
        ...workRecord,
        ecu_work_amount: workRecord.ecu_work_amount || 0,
        acu_work_amount: workRecord.acu_work_amount || 0,
        ecu_work_content: workRecord.ecu_work_content || '',
        acu_work_content: workRecord.acu_work_content || '',
        ecu_status: workRecord.ecu_status || '',
        acu_status: workRecord.acu_status || ''
      });

      // ECU 작업내용 추출 - remapping_works에서 가져오기
      let ecuWorks: string[] = [];
      let ecuAmount: number = workRecord.ecu_work_amount || 0;
      let ecuStatus: string = workRecord.ecu_status || '';
      
      if (workRecord.remappingWorks && Array.isArray(workRecord.remappingWorks) && workRecord.remappingWorks.length > 0) {
        const firstWork = workRecord.remappingWorks[0] as any;
        console.log('🔍 First work structure:', firstWork);
        
        if (firstWork.ecu && firstWork.ecu.selectedWorks && Array.isArray(firstWork.ecu.selectedWorks)) {
          ecuWorks = [...firstWork.ecu.selectedWorks]; // 배열 복사
          console.log('🔍 ECU selectedWorks found:', ecuWorks);
        } else {
          console.log('🔍 No ECU selectedWorks found in:', firstWork.ecu);
        }
        
        // ECU 금액과 상태도 remapping_works에서 가져오기
        if (firstWork.ecu) {
          if (firstWork.ecu.price && firstWork.ecu.price !== '') {
            ecuAmount = parseFloat(firstWork.ecu.price) || 0;
            console.log('🔍 ECU price from remapping_works:', ecuAmount);
          }
          if (firstWork.ecu.status && firstWork.ecu.status !== '') {
            ecuStatus = firstWork.ecu.status;
            console.log('🔍 ECU status from remapping_works:', ecuStatus);
          }
        }
      } else {
        console.log('🔍 No remappingWorks found or empty array');
      }

      // ACU 작업내용 추출 - remapping_works에서 가져오기
      let acuWorks: string[] = [];
      let acuAmount: number = workRecord.acu_work_amount || 0;
      let acuStatus: string = workRecord.acu_status || '';
      
      if (workRecord.remappingWorks && Array.isArray(workRecord.remappingWorks) && workRecord.remappingWorks.length > 0) {
        const firstWork = workRecord.remappingWorks[0] as any;
        
        if (firstWork.acu && firstWork.acu.selectedWorks && Array.isArray(firstWork.acu.selectedWorks)) {
          acuWorks = [...firstWork.acu.selectedWorks]; // 배열 복사
          console.log('🔍 ACU selectedWorks found:', acuWorks);
        } else {
          console.log('🔍 No ACU selectedWorks found in:', firstWork.acu);
        }
        
        // ACU 금액과 상태도 remapping_works에서 가져오기
        if (firstWork.acu) {
          if (firstWork.acu.price && firstWork.acu.price !== '') {
            acuAmount = parseFloat(firstWork.acu.price) || 0;
            console.log('🔍 ACU price from remapping_works:', acuAmount);
          }
          if (firstWork.acu.status && firstWork.acu.status !== '') {
            acuStatus = firstWork.acu.status;
            console.log('🔍 ACU status from remapping_works:', acuStatus);
          }
        }
      }

      console.log('🔍 Final ECU Works:', ecuWorks);
      console.log('🔍 Final ACU Works:', acuWorks);
      console.log('🔍 Final ECU Amount:', ecuAmount);
      console.log('🔍 Final ACU Amount:', acuAmount);

      // 상태 업데이트를 동기적으로 처리
      setEcuSelectedWorks(ecuWorks);
      setAcuSelectedWorks(acuWorks);
      
      // formData도 업데이트
      setFormData(prev => prev ? {
        ...prev,
        ecu_work_amount: ecuAmount,
        acu_work_amount: acuAmount,
        ecu_status: ecuStatus,
        acu_status: acuStatus
      } : null);
    } else {
      // workRecord가 null인 경우 상태 초기화
      setEcuSelectedWorks([]);
      setAcuSelectedWorks([]);
    }
  }, [workRecord]);

  const handleSave = async () => {
    if (!formData) return;

    setIsLoading(true);
    try {
      // 새로운 필드 업데이트
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

      // remappingWorks JSONB 데이터 업데이트
      if (workRecord?.remappingWorks && Array.isArray(workRecord.remappingWorks) && workRecord.remappingWorks.length > 0) {
        const updatedRemappingWorks = [...workRecord.remappingWorks];
        const firstWork = { ...updatedRemappingWorks[0] };
        
        // ECU selectedWorks 업데이트
        if (firstWork.ecu) {
          firstWork.ecu.selectedWorks = ecuSelectedWorks;
          firstWork.ecu.status = formData.ecu_status || firstWork.ecu.status;
          firstWork.ecu.price = formData.ecu_work_amount || firstWork.ecu.price || 0;
        }
        
        // ACU selectedWorks 업데이트
        if (firstWork.acu) {
          firstWork.acu.selectedWorks = acuSelectedWorks;
          firstWork.acu.status = formData.acu_status || firstWork.acu.status;
          firstWork.acu.price = formData.acu_work_amount || firstWork.acu.price || 0;
        }
        
        updatedRemappingWorks[0] = firstWork;
        updateData.remapping_works = updatedRemappingWorks;
      }

      console.log('🔍 Saving data:', updateData);

      const { error } = await supabase
        .from('work_records')
        .update(updateData)
        .eq('id', formData.id);

      if (error) {
        console.error('저장 오류:', error);
        alert('저장 중 오류가 발생했습니다.');
      } else {
        alert('작업 기록이 성공적으로 저장되었습니다.');
        onSave();
        onClose();
      }
    } catch (error) {
      console.error('저장 오류:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof WorkRecord, value: any) => {
    if (formData) {
      setFormData({
        ...formData,
        [field]: value
      });
    }
  };

  const handleEcuWorkToggle = (work: string) => {
    setEcuSelectedWorks(prev => 
      prev.includes(work) 
        ? prev.filter(item => item !== work)
        : [...prev, work]
    );
  };

  const handleAcuWorkToggle = (work: string) => {
    setAcuSelectedWorks(prev => 
      prev.includes(work) 
        ? prev.filter(item => item !== work)
        : [...prev, work]
    );
  };

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
              >
                <XIcon />
              </button>
            </div>

            {/* 작업일 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                작업일
              </label>
              <input
                type="date"
                value={formData.work_date}
                onChange={(e) => handleInputChange('work_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="금액을 만원 단위로 입력하세요"
                  />
                </div>

                {/* ECU 상태 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ECU 상태
                  </label>
                  <select
                    value={formData.ecu_status || ''}
                    onChange={(e) => handleInputChange('ecu_status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">선택하세요</option>
                    {WORK_STATUS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ECU 작업내용 - 다중선택 */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ECU 작업내용 (다중 선택 가능)
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
                      console.log(`🔍 ECU Checkbox "${work}": ${isChecked} (ecuSelectedWorks: ${ecuSelectedWorks.join(', ')})`);
                      return (
                        <label key={work} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleEcuWorkToggle(work)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                    placeholder="금액을 만원 단위로 입력하세요"
                  />
                </div>

                {/* ACU 상태 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ACU 상태
                  </label>
                  <select
                    value={formData.acu_status || ''}
                    onChange={(e) => handleInputChange('acu_status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">선택하세요</option>
                    {WORK_STATUS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ACU 작업내용 - 다중선택 */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ACU 작업내용 (다중 선택 가능)
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
                      console.log(`🔍 ACU Checkbox "${work}": ${isChecked} (acuSelectedWorks: ${acuSelectedWorks.join(', ')})`);
                      return (
                        <label key={work} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleAcuWorkToggle(work)}
                            className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{work}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
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