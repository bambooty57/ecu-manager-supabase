'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabase';
import { TUNING_WORKS, WORK_STATUS } from '@/constants';
import { getWorkRecordFiles, getFileIcon, formatFileSize, updateWorkRecord } from '@/lib/work-records';
import { downloadSingleFile, downloadAllFilesAsZip, getImagePreviewUrl } from '@/lib/file-download-manager';
import { getAllCustomers, CustomerData } from '@/lib/customers';
import { getAllEquipment, EquipmentData } from '@/lib/equipment';
import { FileDownloadSection } from '@/components/FileDownloadSection';
import { toast } from 'react-hot-toast';

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
  work_description?: string;
  remappingWorks?: any[];
  customerName?: string;
  equipmentType?: string;
  manufacturer?: string;
  model?: string;
  serial?: string;
  ecuInfo?: any;
  acuInfo?: any;
  ecu_maker?: string;
  ecu_model?: string;
  ecu_price?: number;
  acu_manufacturer?: string;
  acu_model?: string;
  acu_price?: number;
  totalPrice?: number;
  remapping_works?: any[];
}

interface FileMetadata {
  id: number;
  work_record_id: number;
  file_name: string;
  original_name: string;
  file_size: number;
  file_type: string;
  category: string;
  bucket_name: string;
  storage_path: string;
  storage_url: string;
  description?: string;
  created_at: string;
  uploaded_at: string;
}

// 데이터베이스 파일 메타데이터를 프론트엔드 형식으로 변환
const transformFileMetadata = (dbFile: any): FileMetadata => ({
  id: dbFile.id,
  work_record_id: dbFile.work_record_id || 0,
  file_name: dbFile.file_name || 'Unknown',
  original_name: dbFile.original_name || dbFile.file_name || 'Unknown',
  file_size: dbFile.file_size || 0,
  file_type: dbFile.file_type || 'application/octet-stream',
  category: dbFile.category || '',
  bucket_name: dbFile.bucket_name || 'default',
  storage_path: dbFile.storage_path || '',
  storage_url: dbFile.storage_url || '',
  description: dbFile.description || undefined, // description 컬럼이 없으면 undefined
  created_at: dbFile.created_at,
  uploaded_at: dbFile.created_at
});

interface EcuAcuInfo {
  manufacturer: string;
  model: string;
  price: number;
  status: string;
  selectedWorks?: string[];
  workDetails?: string;
}

interface WorkDetailViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  workRecord: WorkRecord | null;
}

export default function WorkDetailViewModal({ isOpen, onClose, workRecord }: WorkDetailViewModalProps) {
  const [fileMetadata, setFileMetadata] = useState<FileMetadata[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [equipmentData, setEquipmentData] = useState<EquipmentData | null>(null);
  const [ecuInfo, setEcuInfo] = useState<EcuAcuInfo | null>(null);
  const [acuInfo, setAcuInfo] = useState<EcuAcuInfo | null>(null);

  // 인쇄 기능
  const handlePrint = () => {
    const printContent = document.getElementById('print-content');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>T-Box 작업 상세보기</title>
              <style>
                @page { 
                  size: A4; 
                  margin: 15mm; 
                }
                body { 
                  font-family: Arial, sans-serif; 
                  margin: 0; 
                  padding: 0; 
                  font-size: 16px; 
                  line-height: 1.5; 
                }
                
                .section { 
                  margin-bottom: 15px; 
                  page-break-inside: avoid; 
                }
                .section h3 { 
                  color: #333; 
                  border-bottom: 2px solid #ccc; 
                  padding-bottom: 6px; 
                  margin: 0 0 10px 0; 
                  font-size: 20px; 
                  font-weight: bold;
                }
                .info-grid { 
                  display: grid; 
                  grid-template-columns: 1fr 1fr; 
                  gap: 10px; 
                  margin-bottom: 15px; 
                }
                .info-item { 
                  margin-bottom: 8px; 
                  font-size: 14px; 
                }
                .info-label { 
                  font-weight: bold; 
                  color: #555; 
                  font-size: 14px;
                }
                .info-value { 
                  margin-left: 10px; 
                  font-size: 14px;
                }
                .ecu-acu-grid { 
                  display: grid; 
                  grid-template-columns: 1fr 1fr; 
                  gap: 15px; 
                  margin-bottom: 15px; 
                }
                .ecu-box, .acu-box { 
                  border: 2px solid #ddd; 
                  padding: 15px; 
                  border-radius: 8px; 
                  font-size: 14px; 
                }
                .ecu-box { 
                  background-color: #f0f8ff; 
                }
                .acu-box { 
                  background-color: #f0fff0; 
                }
                .ecu-box h4, .acu-box h4 { 
                  margin: 0 0 10px 0; 
                  font-size: 16px; 
                  font-weight: bold; 
                }
                .price { 
                  font-weight: bold; 
                  color: #0066cc; 
                  font-size: 15px;
                }
                .status { 
                  padding: 4px 10px; 
                  border-radius: 5px; 
                  font-size: 13px; 
                  font-weight: bold;
                }
                .status-complete { 
                  background-color: #d4edda; 
                  color: #155724; 
                }
                .status-progress { 
                  background-color: #d1ecf1; 
                  color: #0c5460; 
                }
                .status-failed { 
                  background-color: #f8d7da; 
                  color: #721c24; 
                }
                .files-section { 
                  margin-top: 15px; 
                }
                .file-item { 
                  border: 2px solid #eee; 
                  padding: 10px; 
                  margin-bottom: 8px; 
                  border-radius: 5px; 
                  font-size: 13px; 
                }
                .file-name { 
                  font-weight: bold; 
                  font-size: 14px; 
                }
                .file-details { 
                  color: #666; 
                  font-size: 12px; 
                }
                .total-price { 
                  text-align: right; 
                  font-size: 18px; 
                  font-weight: bold; 
                  color: #d4af37; 
                  margin-top: 10px; 
                }
                .footer { 
                  text-align: center; 
                  margin-top: 20px; 
                  padding-top: 10px; 
                  border-top: 2px solid #ccc; 
                  color: #666; 
                  font-size: 13px; 
                }
                .work-description { 
                  font-size: 14px; 
                  line-height: 1.6; 
                  margin-top: 8px; 
                }
                @media print {
                  body { 
                    margin: 0; 
                    -webkit-print-color-adjust: exact; 
                    print-color-adjust: exact; 
                  }
                  .no-print { 
                    display: none; 
                  }
                  .section { 
                    page-break-inside: avoid; 
                  }
                }
              </style>
            </head>
                         <body>
               <div class="section">
                <h3>📋 기본 정보</h3>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">작업일:</span>
                    <span class="info-value">${workRecord?.work_date ? new Date(workRecord.work_date).toLocaleDateString('ko-KR') : 'N/A'}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">고객명:</span>
                    <span class="info-value">${customerData?.name || workRecord?.customerName || 'N/A'}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">장비:</span>
                    <span class="info-value">${equipmentData?.equipmentType || workRecord?.equipmentType || 'N/A'} - ${equipmentData?.manufacturer || workRecord?.manufacturer || 'N/A'} ${equipmentData?.model || workRecord?.model || 'N/A'}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">시리얼:</span>
                    <span class="info-value">${equipmentData?.serialNumber || workRecord?.serial || 'N/A'}</span>
                  </div>
                </div>
              </div>
              
              ${ecuInfo || acuInfo ? `
              <div class="section">
                <h3>🔧 ECU/ACU 정보</h3>
                <div class="ecu-acu-grid">
                  ${ecuInfo ? `
                  <div class="ecu-box">
                    <h4>⚡ ECU 정보</h4>
                    <div class="info-item">
                      <span class="info-label">제조사:</span>
                      <span class="info-value">${ecuInfo.manufacturer}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">모델:</span>
                      <span class="info-value">${ecuInfo.model}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">가격:</span>
                      <span class="info-value price">₩${ecuInfo.price?.toLocaleString() || '0'}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">상태:</span>
                      <span class="info-value status ${ecuInfo.status === '완료' ? 'status-complete' : 
                        ecuInfo.status === '진행중' ? 'status-progress' : 
                        ecuInfo.status === '실패' ? 'status-failed' : ''}">${ecuInfo.status}</span>
                    </div>
                    ${workRecord?.ecu_work_content ? `
                    <div class="info-item">
                      <span class="info-label">작업내용:</span>
                      <span class="info-value work-description">${workRecord.ecu_work_content}</span>
                    </div>
                    ` : ''}
                  </div>
                  ` : ''}
                  
                  ${acuInfo ? `
                  <div class="acu-box">
                    <h4>⚙️ ACU 정보</h4>
                    <div class="info-item">
                      <span class="info-label">제조사:</span>
                      <span class="info-value">${acuInfo.manufacturer}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">모델:</span>
                      <span class="info-value">${acuInfo.model}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">가격:</span>
                      <span class="info-value price">₩${acuInfo.price?.toLocaleString() || '0'}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">상태:</span>
                      <span class="info-value status ${acuInfo.status === '완료' ? 'status-complete' : 
                        acuInfo.status === '진행중' ? 'status-progress' : 
                        acuInfo.status === '실패' ? 'status-failed' : ''}">${acuInfo.status}</span>
                    </div>
                    ${workRecord?.acu_work_content ? `
                    <div class="info-item">
                      <span class="info-label">작업내용:</span>
                      <span class="info-value work-description">${workRecord.acu_work_content}</span>
                    </div>
                    ` : ''}
                  </div>
                  ` : ''}
                </div>
                
                <div class="total-price">
                  총 작업 금액: ₩${((ecuInfo?.price || 0) + (acuInfo?.price || 0)).toLocaleString()}원
                </div>
              </div>
              ` : ''}
              
              ${workRecord?.work_description ? `
              <div class="section">
                <h3>📝 공통정보 - 작업메모</h3>
                <div class="info-item">
                  <span class="info-value work-description">${workRecord.work_description}</span>
                </div>
              </div>
              ` : ''}
              
              ${fileMetadata.length > 0 ? `
              <div class="section files-section">
                <h3>📁 첨부 파일</h3>
                ${fileMetadata.map(file => `
                <div class="file-item">
                  <div class="file-name">${file.original_name}</div>
                  <div class="file-details">
                    크기: ${formatFileSize(file.file_size)} | 
                    타입: ${file.file_type} | 
                    업로드: ${new Date(file.created_at).toLocaleDateString('ko-KR')}
                    ${file.description ? ` | 설명: ${file.description}` : ''}
                  </div>
                </div>
                `).join('')}
              </div>
              ` : ''}
              
              <div class="footer">
                <p>출력일시: ${new Date().toLocaleString('ko-KR')}</p>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  // 파일 메타데이터 로드
  const loadFileMetadata = async () => {
    if (!workRecord?.id) return;
    
    setIsLoadingFiles(true);
    try {
      console.log('파일 메타데이터 로드 시작:', workRecord.id);
      const files = await getWorkRecordFiles(workRecord.id);
      console.log('로드된 파일:', files);
      const transformedFiles = files.map(transformFileMetadata);
      console.log('변환된 파일:', transformedFiles);
      
      // 디버그: description 필드 확인
      transformedFiles.forEach(file => {
        console.log(`파일: ${file.original_name}, 설명: "${file.description}", 카테고리: "${file.category}"`);
      });
      
      setFileMetadata(transformedFiles);
    } catch (error) {
      console.error('파일 메타데이터 로드 실패:', error);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // 고객 및 장비 데이터 로드
  const loadCustomerAndEquipmentData = async () => {
    if (!workRecord) return;
    
    try {
      // 고객 데이터 로드
      const customers = await getAllCustomers();
      const customer = customers.find(c => c.id === workRecord.customer_id);
      if (customer) {
        setCustomerData(customer);
      }
      
      // 장비 데이터 로드
      if (workRecord.customer_id) {
        const equipment = await getAllEquipment();
        const equipmentItem = equipment.find(e => e.id === workRecord.equipment_id);
        if (equipmentItem) {
          setEquipmentData(equipmentItem);
        }
      }
    } catch (error) {
      console.error('고객/장비 데이터 로드 실패:', error);
    }
  };

  // ECU/ACU 정보 추출 (개선된 버전)
  const extractEcuAcuInfo = () => {
    if (!workRecord) return;

    console.log('ECU/ACU 정보 추출 시작:', workRecord.remapping_works);

    // 기본 정보 설정
    let ecuData: EcuAcuInfo = {
      manufacturer: workRecord.ecu_maker || 'N/A',
      model: workRecord.ecu_model || 'N/A',
      price: workRecord.ecu_price || 0,
      status: workRecord.ecu_status || 'N/A',
      selectedWorks: [],
      workDetails: workRecord.ecu_work_content || ''
    };

    let acuData: EcuAcuInfo = {
      manufacturer: workRecord.acu_manufacturer || 'N/A',
      model: workRecord.acu_model || 'N/A',
      price: workRecord.acu_price || 0,
      status: workRecord.acu_status || 'N/A',
      selectedWorks: [],
      workDetails: workRecord.acu_work_content || ''
    };

    // remapping_works에서 정보 추출
    if (workRecord.remapping_works && Array.isArray(workRecord.remapping_works) && workRecord.remapping_works.length > 0) {
      const firstWork = workRecord.remapping_works[0];
      console.log('첫 번째 작업 정보:', firstWork);

      if (firstWork.ecu && typeof firstWork.ecu === 'object') {
        ecuData = {
          manufacturer: firstWork.ecu.maker || firstWork.ecu.manufacturer || ecuData.manufacturer,
          model: firstWork.ecu.model || firstWork.ecu.type || ecuData.model,
          price: parseFloat(firstWork.ecu.price) || ecuData.price,
          status: firstWork.ecu.status || ecuData.status,
          selectedWorks: firstWork.ecu.selectedWorks || [],
          workDetails: firstWork.ecu.workDetails || ecuData.workDetails
        };
      }

      if (firstWork.acu && typeof firstWork.acu === 'object') {
        acuData = {
          manufacturer: firstWork.acu.manufacturer || acuData.manufacturer,
          model: firstWork.acu.model || acuData.model,
          price: parseFloat(firstWork.acu.price) || acuData.price,
          status: firstWork.acu.status || acuData.status,
          selectedWorks: firstWork.acu.selectedWorks || [],
          workDetails: firstWork.acu.workDetails || acuData.workDetails
        };
      }

      // 작업 내용 추출 (remapping_works에서)
      if (firstWork.ecu && firstWork.ecu.workDetails) {
        workRecord.ecu_work_content = firstWork.ecu.workDetails;
      }
      if (firstWork.acu && firstWork.acu.workDetails) {
        workRecord.acu_work_content = firstWork.acu.workDetails;
      }
    }

    console.log('추출된 ECU 정보:', ecuData);
    console.log('추출된 ACU 정보:', acuData);

    setEcuInfo(ecuData);
    setAcuInfo(acuData);
  };

  // 작업 내용 렌더링 (태그 형태로)
  const renderWorkContent = (content: string) => {
    if (!content) return null;
    
    const works = content.split(',').map(work => work.trim());
    return (
      <div className="flex flex-wrap gap-1">
        {works.map((work, index) => (
          <span
            key={index}
            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
          >
            {work}
          </span>
        ))}
      </div>
    );
  };

  // 데이터 로드
  useEffect(() => {
    if (workRecord && isOpen) {
      loadFileMetadata();
      loadCustomerAndEquipmentData();
      extractEcuAcuInfo();
    }
  }, [workRecord, isOpen]);

  // ECU/ACU 정보 렌더링
  const renderEcuAcuInfo = () => {
    if (!ecuInfo && !acuInfo) return null;

    return (
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">🔧 ECU/ACU 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ECU 정보 */}
          {ecuInfo && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="text-md font-semibold text-blue-800 mb-3">⚡ ECU 정보</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-700">제조사:</span>
                  <span className="ml-2 text-sm text-gray-900">{ecuInfo.manufacturer}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">모델:</span>
                  <span className="ml-2 text-sm text-gray-900">{ecuInfo.model}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">가격:</span>
                  <span className="ml-2 text-sm font-bold text-blue-600">₩{ecuInfo.price?.toLocaleString() || '0'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">상태:</span>
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                    ecuInfo.status === '완료' ? 'bg-green-100 text-green-800' :
                    ecuInfo.status === '진행중' ? 'bg-blue-100 text-blue-800' :
                    ecuInfo.status === '실패' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {ecuInfo.status}
                  </span>
                </div>
                {/* ECU 작업 상세 정보 */}
                {(ecuInfo.workDetails || workRecord?.ecu_work_content) && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">작업 상세:</span>
                    <div className="mt-1 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">
                        {ecuInfo.workDetails || workRecord?.ecu_work_content || ''}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ACU 정보 */}
          {acuInfo && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="text-md font-semibold text-green-800 mb-3">⚙️ ACU 정보</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-700">제조사:</span>
                  <span className="ml-2 text-sm text-gray-900">{acuInfo.manufacturer}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">모델:</span>
                  <span className="ml-2 text-sm text-gray-900">{acuInfo.model}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">가격:</span>
                  <span className="ml-2 text-sm font-bold text-green-600">₩{acuInfo.price?.toLocaleString() || '0'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">상태:</span>
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                    acuInfo.status === '완료' ? 'bg-green-100 text-green-800' :
                    acuInfo.status === '진행중' ? 'bg-blue-100 text-blue-800' :
                    acuInfo.status === '실패' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {acuInfo.status}
                  </span>
                </div>
                {/* ACU 작업 상세 정보 */}
                {(acuInfo.workDetails || workRecord?.acu_work_content) && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">작업 상세:</span>
                    <div className="mt-1 p-2 bg-green-50 rounded border-l-4 border-green-400">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">
                        {acuInfo.workDetails || workRecord?.acu_work_content || ''}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* 공통 메모 정보 */}
        {workRecord?.remapping_works?.[0]?.notes && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-md font-semibold text-gray-700 mb-2">📝 공통 작업 메모</h4>
            <div className="bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {workRecord.remapping_works[0].notes}
              </p>
            </div>
          </div>
        )}

        {/* 총 가격 */}
        {(ecuInfo || acuInfo) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-700">총 작업 금액:</span>
              <span className="text-xl font-bold text-yellow-600">
                ₩{((ecuInfo?.price || 0) + (acuInfo?.price || 0)).toLocaleString()}원
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel 
          className="mx-auto max-w-6xl w-full bg-white rounded-lg shadow-xl"
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <Dialog.Title className="text-xl font-semibold text-gray-900">
              작업 상세 보기
            </Dialog.Title>
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrint}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                인쇄
              </button>
              <button
                onClick={onClose}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                닫기
              </button>
            </div>
          </div>

          {/* 내용 */}
          <div className="p-6 max-h-[80vh] overflow-y-auto" id="print-content">
            {/* 기본 정보 */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">📋 기본 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">작업일</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {workRecord?.work_date ? new Date(workRecord.work_date).toLocaleDateString('ko-KR') : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">고객명</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {customerData?.name || workRecord?.customerName || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">장비</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {equipmentData?.equipmentType || workRecord?.equipmentType || 'N/A'} - {equipmentData?.manufacturer || workRecord?.manufacturer || 'N/A'} {equipmentData?.model || workRecord?.model || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">시리얼 번호</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {equipmentData?.serialNumber || workRecord?.serial || '등록되지 않음'}
                  </p>
                </div>
              </div>
            </div>

            {/* ECU/ACU 정보 */}
            {renderEcuAcuInfo()}



            {/* 파일 다운로드 섹션 */}
            <div className="mt-6">
              <FileDownloadSection 
                recordId={workRecord?.id || 0}
                files={fileMetadata}
                isLoading={isLoadingFiles}
              />
            </div>
          </div>

          {/* 하단 푸터 */}
          <div className="flex items-center justify-end p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              닫기
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
