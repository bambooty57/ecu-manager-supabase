'use client';

import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { supabase } from '@/lib/supabase';
import { TUNING_WORKS, WORK_STATUS } from '@/constants';
import { getWorkRecordFiles, getFileIcon, formatFileSize, updateWorkRecord } from '@/lib/work-records';
import { downloadSingleFile, downloadAllFilesAsZip, getImagePreviewUrl } from '@/lib/file-download-manager';
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
  work_memo?: string;
  remappingWorks?: any[];
}

interface FileMetadata {
  id: number;
  work_record_id: number | null;
  file_name: string;
  original_name: string | null;
  file_size: number | null;
  file_type: string | null;
  category: string | null;
  bucket_name: string | null;
  storage_path: string | null;
  storage_url: string | null;
  description?: string | null;
  created_at: string;
  is_migrated?: boolean | null;
}

interface WorkDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  workRecord: WorkRecord | null;
  onSave: () => void;
  isReadOnly?: boolean;
}

// X 아이콘 컴포넌트
const XIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// 다운로드 아이콘 컴포넌트
const DownloadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

// 미리보기 아이콘 컴포넌트
const PreviewIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

export default function WorkDetailModal({ isOpen, onClose, workRecord, onSave, isReadOnly = false }: WorkDetailModalProps) {
  const [formData, setFormData] = useState({
    ecu_work_amount: '',
    acu_work_amount: '',
    ecu_work_content: '',
    acu_work_content: '',
    ecu_status: '',
    acu_status: '',
    work_memo: ''
  });

  const [fileMetadata, setFileMetadata] = useState<FileMetadata[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 작업 기록 데이터 로드
  useEffect(() => {
    if (workRecord) {
      setFormData({
        ecu_work_amount: workRecord.ecu_work_amount?.toString() || '',
        acu_work_amount: workRecord.acu_work_amount?.toString() || '',
        ecu_work_content: workRecord.ecu_work_content || '',
        acu_work_content: workRecord.acu_work_content || '',
        ecu_status: workRecord.ecu_status || '',
        acu_status: workRecord.acu_status || '',
        work_memo: workRecord.work_memo || ''
      });

      // 파일 메타데이터 로드
      loadFileMetadata();
    }
  }, [workRecord]);

  // 파일 메타데이터 로드
  const loadFileMetadata = async () => {
    if (!workRecord?.id) return;

    setIsLoadingFiles(true);
    try {
      const files = await getWorkRecordFiles(workRecord.id);
      setFileMetadata(files);
    } catch (error) {
      console.error('파일 메타데이터 로드 실패:', error);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // 개별 파일 다운로드
  const handleFileDownload = async (file: FileMetadata) => {
    if (!file.storage_url || !file.original_name) {
      toast.error('파일 정보가 불완전합니다.');
      return;
    }
    
    try {
      setIsDownloading(true);
      const result = await downloadSingleFile(file.storage_url, file.original_name);
      if (result.success) {
        toast.success('파일이 다운로드되었습니다.');
      } else {
        toast.error(`다운로드 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('파일 다운로드 실패:', error);
      toast.error('파일 다운로드에 실패했습니다.');
    } finally {
      setIsDownloading(false);
    }
  };

  // 전체 파일 ZIP 다운로드
  const handleZipDownload = async () => {
    if (fileMetadata.length === 0) {
      toast.error('다운로드할 파일이 없습니다.');
      return;
    }

    try {
      setIsDownloading(true);
      const files = fileMetadata
        .filter(file => file.storage_url && file.original_name)
        .map(file => ({
          url: file.storage_url!,
          name: file.original_name!,
          description: file.description || ''
        }));

      const result = await downloadAllFilesAsZip(files);
      if (result.success) {
        toast.success('모든 파일이 ZIP으로 다운로드되었습니다.');
      } else {
        toast.error(`ZIP 다운로드 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('ZIP 다운로드 실패:', error);
      toast.error('ZIP 다운로드에 실패했습니다.');
    } finally {
      setIsDownloading(false);
    }
  };

  // 이미지 미리보기
  const handleImagePreview = (file: FileMetadata) => {
    if (file.file_type?.startsWith('image/') && file.storage_url) {
      const previewUrl = getImagePreviewUrl(file.storage_url);
      if (previewUrl) {
        setPreviewImage(previewUrl);
      } else {
        toast.error('이미지 미리보기에 실패했습니다.');
      }
    }
  };

  // 작업 내용을 태그로 변환
  const renderWorkContent = (content: string) => {
    if (!content) return null;
    
    const works = content.split(',').map(work => work.trim()).filter(work => work);
    
    return (
      <div className="flex flex-wrap gap-2">
        {works.map((work, index) => (
          <span
            key={index}
            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
          >
            {work}
          </span>
        ))}
      </div>
    );
  };

  // 수정 저장 처리
  const handleSave = async () => {
    if (!workRecord?.id) {
      toast.error('작업 기록을 찾을 수 없습니다.');
      return;
    }

    try {
      setIsSaving(true);
      
      // 데이터베이스 업데이트 - WorkRecordData 타입에 맞게 변환
      const updateData = {
        ecuMaker: formData.ecu_work_content || undefined,
        ecuModel: formData.ecu_work_content || undefined,
        ecuPrice: formData.ecu_work_amount ? parseFloat(formData.ecu_work_amount) : undefined,
        ecuStatus: formData.ecu_status || undefined,
        acuManufacturer: formData.acu_work_content || undefined,
        acuModel: formData.acu_work_content || undefined,
        acuPrice: formData.acu_work_amount ? parseFloat(formData.acu_work_amount) : undefined,
        acuStatus: formData.acu_status || undefined,
        workDescription: formData.work_memo || undefined
      };

      const updatedRecord = await updateWorkRecord(workRecord.id, updateData);
      
      if (updatedRecord) {
        toast.success('작업이 성공적으로 수정되었습니다.');
        onSave(); // 부모 컴포넌트에 저장 완료 알림
        onClose(); // 모달 닫기
      } else {
        toast.error('작업 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('작업 수정 실패:', error);
      toast.error('작업 수정 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-4xl w-full bg-white rounded-lg shadow-xl">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-6 border-b">
            <Dialog.Title className="text-lg font-semibold">
              {isReadOnly ? '📋 작업 상세보기' : '✏️ 작업 수정'}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XIcon />
            </button>
          </div>

          {/* 콘텐츠 */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {isReadOnly ? (
              // 상세보기 모드
              <div className="space-y-6">
                {/* 기본 정보 */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">📋 기본 정보</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">작업일</label>
                      <p className="mt-1 text-sm text-gray-900">{workRecord?.work_date}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">고객 ID</label>
                      <p className="mt-1 text-sm text-gray-900">{workRecord?.customer_id}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">장비 ID</label>
                      <p className="mt-1 text-sm text-gray-900">{workRecord?.equipment_id}</p>
                    </div>
                  </div>
                </div>

                {/* 작업 내용 */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">🔧 작업 내용</h3>
                  <div className="space-y-4">
                    {workRecord?.ecu_work_content && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">ECU 작업</label>
                        <div className="mt-1">
                          {renderWorkContent(workRecord.ecu_work_content)}
                        </div>
                      </div>
                    )}
                    {workRecord?.acu_work_content && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">ACU 작업</label>
                        <div className="mt-1">
                          {renderWorkContent(workRecord.acu_work_content)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 파일 관리 섹션 */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">📁 파일 관리</h3>
                  {isLoadingFiles ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-600">파일 목록을 불러오는 중...</p>
                    </div>
                  ) : fileMetadata.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-gray-700">첨부된 파일 ({fileMetadata.length}개)</h4>
                        <button
                          onClick={handleZipDownload}
                          disabled={isDownloading}
                          className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          <DownloadIcon />
                          <span>전체 다운로드</span>
                        </button>
                      </div>
                      <div className="grid gap-2">
                        {fileMetadata.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-3 bg-white rounded border">
                            <div className="flex items-center space-x-3">
                              <span className="text-lg">{getFileIcon(file.original_name || file.file_name || 'unknown')}</span>
                              <div>
                                <p className="font-medium text-sm">{file.original_name || file.file_name}</p>
                                <p className="text-xs text-gray-500">{file.file_size ? formatFileSize(file.file_size) : '크기 알 수 없음'}</p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              {file.file_type?.startsWith('image/') && (
                                <button
                                  onClick={() => handleImagePreview(file)}
                                  className="p-1 text-gray-600 hover:text-gray-800"
                                  title="미리보기"
                                >
                                  <PreviewIcon />
                                </button>
                              )}
                              <button
                                onClick={() => handleFileDownload(file)}
                                disabled={isDownloading}
                                className="p-1 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                                title="다운로드"
                              >
                                <DownloadIcon />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">첨부된 파일이 없습니다.</p>
                  )}
                </div>

                {/* 작업 메모 */}
                {formData.work_memo && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">📝 공통 정보</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">작업 메모</label>
                      <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{formData.work_memo}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // 수정 모드
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ECU 작업 금액</label>
                    <input
                      type="number"
                      value={formData.ecu_work_amount}
                      onChange={(e) => setFormData({ ...formData, ecu_work_amount: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ACU 작업 금액</label>
                    <input
                      type="number"
                      value={formData.acu_work_amount}
                      onChange={(e) => setFormData({ ...formData, acu_work_amount: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ECU 작업 내용</label>
                    <textarea
                      value={formData.ecu_work_content}
                      onChange={(e) => setFormData({ ...formData, ecu_work_content: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ACU 작업 내용</label>
                    <textarea
                      value={formData.acu_work_content}
                      onChange={(e) => setFormData({ ...formData, acu_work_content: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ECU 상태</label>
                    <select
                      value={formData.ecu_status}
                      onChange={(e) => setFormData({ ...formData, ecu_status: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">상태 선택</option>
                      {WORK_STATUS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ACU 상태</label>
                    <select
                      value={formData.acu_status}
                      onChange={(e) => setFormData({ ...formData, acu_status: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">상태 선택</option>
                      {WORK_STATUS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">작업 메모</label>
                  <textarea
                    value={formData.work_memo}
                    onChange={(e) => setFormData({ ...formData, work_memo: e.target.value })}
                    rows={4}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 푸터 */}
          <div className="flex justify-end space-x-3 p-6 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              닫기
            </button>
            {!isReadOnly && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    저장 중...
                  </>
                ) : (
                  '저장'
                )}
              </button>
            )}
          </div>
        </Dialog.Panel>
      </div>

      {/* 이미지 미리보기 모달 */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="relative max-w-4xl max-h-4xl">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors"
            >
              <XIcon />
            </button>
            <img src={previewImage} alt="미리보기" className="max-w-full max-h-full object-contain" />
          </div>
        </div>
      )}
    </Dialog>
  );
}
