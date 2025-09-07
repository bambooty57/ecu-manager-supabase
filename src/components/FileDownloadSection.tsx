import React, { useState, useCallback } from 'react'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { downloadSingleFile, downloadAllFilesAsZip } from '@/lib/file-download-manager'
import { getFileIcon } from '@/lib/work-records'

// 파일 메타데이터 타입 정의
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
import { supabase } from '@/lib/supabase'
import { FileSkeleton } from '@/components/LoadingSkeleton'

interface FileDownloadSectionProps {
  recordId: number
  files: FileMetadata[]
  isLoading?: boolean
  onDownloadStart?: () => void
  onDownloadComplete?: () => void
  onDownloadError?: (error: string) => void
}

export const FileDownloadSection: React.FC<FileDownloadSectionProps> = ({
  recordId,
  files,
  isLoading = false,
  onDownloadStart,
  onDownloadComplete,
  onDownloadError
}) => {
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadStatus, setDownloadStatus] = useState('')
  const [currentDownloadFile, setCurrentDownloadFile] = useState<string>('')
  const [isBulkDownloading, setIsBulkDownloading] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [previewFileName, setPreviewFileName] = useState<string>('')

  // 이미지 파일인지 확인
  const isImageFile = (fileName: string, fileType: string): boolean => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg']
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/svg+xml']
    
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
    return imageExtensions.includes(extension) || imageTypes.includes(fileType.toLowerCase())
  }

  // 이미지 미리보기 열기
  const openImagePreview = (file: FileMetadata) => {
    if (isImageFile(file.original_name, file.file_type)) {
      setPreviewImage(file.storage_url)
      setPreviewFileName(file.original_name)
    }
  }

  // 이미지 미리보기 닫기
  const closeImagePreview = () => {
    setPreviewImage(null)
    setPreviewFileName('')
  }

  // 파일 타입별 그룹화 (ECU, ACU, 미디어, 다큐멘트로 구분)
  const groupedFiles = React.useMemo(() => {
    const groups: Record<string, FileMetadata[]> = {
      ecu: [],
      acu: [],
      media: [],
      document: []
    }

    files.forEach(file => {
      const fileName = file.original_name.toLowerCase()
      const fileType = file.file_type.toLowerCase()
      
      // ECU 파일 판별 (더 정확한 구분)
      if (fileName.includes('ecu') || 
          fileName.includes('original') || 
          fileName.includes('stage') ||
          file.category === 'ecu' ||
          fileType.includes('ecu') ||
          // ECU 관련 파일명 패턴
          /ecu|original|stage|denso|bosch|siemens/i.test(fileName)) {
        groups.ecu.push(file)
      } 
      // ACU 파일 판별 (더 정확한 구분)
      else if (fileName.includes('acu') || 
               file.category === 'acu' ||
               fileType.includes('acu') ||
               // ACU 관련 파일명 패턴
               /acu|golf|vr6|volkswagen/i.test(fileName)) {
        groups.acu.push(file)
      } 
      // 다큐멘트 파일 판별 (PDF, DOC, XLS 등)
      else if (file.category === 'document' ||
               fileType.includes('pdf') ||
               fileType.includes('doc') ||
               fileType.includes('xls') ||
               fileType.includes('ppt') ||
               /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|rtf)$/i.test(fileName)) {
        groups.document.push(file)
      }
      // 미디어 파일 판별 (이미지, 동영상 등)
      else {
        groups.media.push(file)
      }
    })

    return groups
  }, [files])

  // ✅ 전체 파일 ZIP 다운로드 함수 (Task #7)
  const handleBulkDownload = useCallback(async () => {
    if (files.length === 0) {
      onDownloadError?.('다운로드할 파일이 없습니다.')
      return
    }

    try {
      setIsBulkDownloading(true)
      onDownloadStart?.()
      setDownloadStatus('ZIP 파일 준비 중...')

      const zip = new JSZip()
      const promises: Promise<void>[] = []

      // 각 파일에 대한 다운로드 Promise 생성
      files.forEach((file, index) => {
        const promise = new Promise<void>(async (resolve, reject) => {
          try {
            setDownloadStatus(`파일 처리 중: ${file.original_name} (${index + 1}/${files.length})`)
            setDownloadProgress(((index) / files.length) * 100)

            // 파일 다운로드
            let fileBlob: Blob
            
            if (file.storage_url && file.storage_url.startsWith('http')) {
              // HTTP URL에서 직접 다운로드
              const response = await fetch(file.storage_url)
              if (!response.ok) {
                throw new Error(`파일 다운로드 실패: ${response.statusText}`)
              }
              fileBlob = await response.blob()
            } else {
              // 기존 방식 사용
              const response = await fetch(file.storage_url)
              if (!response.ok) {
                throw new Error(`파일 다운로드 실패: ${response.statusText}`)
              }
              fileBlob = await response.blob()
            }
            
            // ZIP에 파일 추가
            zip.file(file.original_name, fileBlob)
            resolve()
          } catch (err) {
            console.error(`파일 '${file.original_name}' 처리 오류:`, err)
            // 개별 파일 오류는 무시하고 계속 진행
            resolve()
          }
        })
        promises.push(promise)
      })

      // 모든 파일 처리 완료 대기
      await Promise.all(promises)

      setDownloadStatus('ZIP 파일 생성 중...')
      setDownloadProgress(90)

      // ZIP 파일 생성 및 다운로드
      const content = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      })

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
      const fileName = `work-files-${recordId}-${timestamp}.zip`
      
      saveAs(content, fileName)

      setDownloadStatus(`ZIP 다운로드 완료: ${fileName}`)
      setDownloadProgress(100)
      onDownloadComplete?.()

    } catch (err) {
      console.error('전체 다운로드 오류:', err)
      const errorMsg = '파일 전체 다운로드 중 오류가 발생했습니다.'
      setDownloadStatus(errorMsg)
      onDownloadError?.(errorMsg)
    } finally {
      setIsBulkDownloading(false)
      setTimeout(() => {
        setDownloadStatus('')
        setDownloadProgress(0)
      }, 3000)
    }
  }, [files, recordId, onDownloadStart, onDownloadComplete, onDownloadError])

  // 개별 파일 다운로드
  const handleSingleDownload = useCallback(async (file: FileMetadata) => {
    try {
      setIsDownloading(true)
      setCurrentDownloadFile(file.original_name)
      setDownloadStatus(`다운로드 중: ${file.original_name}`)
      setDownloadProgress(0)
      
      onDownloadStart?.()

      // 파일 URL이 있는 경우 직접 다운로드
      if (file.storage_url && file.storage_url.startsWith('http')) {
        const response = await fetch(file.storage_url)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = file.original_name
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        
        setDownloadProgress(100)
        setDownloadStatus('다운로드 완료!')
        onDownloadComplete?.()
      } else {
        // 기존 downloadSingleFile 함수 사용
        const result = await downloadSingleFile(file.storage_url, file.original_name)
        
        if (!result.success) {
          throw new Error(result.error || '다운로드 실패')
        }
        
        setDownloadProgress(100)
        setDownloadStatus('다운로드 완료!')
        onDownloadComplete?.()
      }
      
      setTimeout(() => {
        setIsDownloading(false)
        setDownloadProgress(0)
        setDownloadStatus('')
        setCurrentDownloadFile('')
      }, 2000)
      
    } catch (error) {
      console.error('파일 다운로드 실패:', error)
      setDownloadStatus('다운로드 실패')
      onDownloadError?.(error instanceof Error ? error.message : '다운로드 실패')
      
      setTimeout(() => {
        setIsDownloading(false)
        setDownloadProgress(0)
        setDownloadStatus('')
        setCurrentDownloadFile('')
      }, 3000)
    }
  }, [onDownloadStart, onDownloadComplete, onDownloadError])

  // 카테고리별 다운로드
  const handleCategoryDownload = useCallback(async (categoryFiles: FileMetadata[], categoryName: string) => {
    try {
      setIsDownloading(true)
      setDownloadStatus(`${categoryName} 파일 ZIP 생성 중...`)
      setDownloadProgress(0)
      
      onDownloadStart?.()

      const zipName = `work_record_${recordId}_${categoryName}_files.zip`
      const result = await downloadAllFilesAsZip(categoryFiles.map(file => ({
        url: file.storage_url,
        name: file.original_name,
        description: file.description
      })))
      
      if (!result.success) {
        throw new Error(result.error || '다운로드 실패')
      }
      
      setDownloadProgress(100)
      setDownloadStatus('다운로드 완료!')
      
      onDownloadComplete?.()
      
      setTimeout(() => {
        setIsDownloading(false)
        setDownloadProgress(0)
        setDownloadStatus('')
      }, 2000)
      
    } catch (error) {
      console.error('카테고리별 다운로드 실패:', error)
      setDownloadStatus('다운로드 실패')
      onDownloadError?.(error instanceof Error ? error.message : '다운로드 실패')
      
      setTimeout(() => {
        setIsDownloading(false)
        setDownloadProgress(0)
        setDownloadStatus('')
      }, 3000)
    }
  }, [recordId, onDownloadStart, onDownloadComplete, onDownloadError])

  // 전체 파일 다운로드
  const handleAllFilesDownload = useCallback(async () => {
    try {
      setIsDownloading(true)
      setDownloadStatus('전체 파일 ZIP 생성 중...')
      setDownloadProgress(0)
      
      onDownloadStart?.()

      const zipName = `work_record_${recordId}_all_files.zip`
      const result = await downloadAllFilesAsZip(files.map(file => ({
        url: file.storage_url,
        name: file.original_name,
        description: file.description
      })))
      
      if (!result.success) {
        throw new Error(result.error || '다운로드 실패')
      }
      
      setDownloadProgress(100)
      setDownloadStatus('다운로드 완료!')
      
      onDownloadComplete?.()
      
      setTimeout(() => {
        setIsDownloading(false)
        setDownloadProgress(0)
        setDownloadStatus('')
      }, 2000)
      
    } catch (error) {
      console.error('전체 파일 다운로드 실패:', error)
      setDownloadStatus('다운로드 실패')
      onDownloadError?.(error instanceof Error ? error.message : '다운로드 실패')
      
      setTimeout(() => {
        setIsDownloading(false)
        setDownloadProgress(0)
        setDownloadStatus('')
      }, 3000)
    }
  }, [recordId, files, onDownloadStart, onDownloadComplete, onDownloadError])

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 날짜 포맷팅
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">📁 첨부 파일</h3>
        <FileSkeleton rows={3} />
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">📁 첨부 파일</h3>
        <p className="text-gray-400">첨부된 파일이 없습니다.</p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-gray-800 rounded-lg p-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">📁 첨부 파일 ({files.length}개)</h3>
        </div>

        {/* 다운로드 진행률 */}
        {isDownloading && (
          <div className="mb-4 p-4 bg-blue-900 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-200 text-sm">{downloadStatus}</span>
              <span className="text-blue-200 text-sm">{downloadProgress}%</span>
            </div>
            <div className="w-full bg-blue-700 rounded-full h-2">
              <div 
                className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              ></div>
            </div>
            {currentDownloadFile && (
              <p className="text-blue-300 text-xs mt-1">현재: {currentDownloadFile}</p>
            )}
          </div>
        )}

        {/* 파일 그룹별 표시 */}
        <div className="space-y-6">
          {Object.entries(groupedFiles).map(([category, categoryFiles]) => {
            if (categoryFiles.length === 0) return null

            const categoryLabels = {
              ecu: 'ECU 파일',
              acu: 'ACU 파일',
              media: '미디어 파일',
              document: '다큐멘트 파일'
            }

            const categoryIcons = {
              ecu: '⚙️',
              acu: '🔧',
              media: '📄',
              document: '📋'
            }

            return (
              <div key={category} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-md font-medium text-gray-200 flex items-center">
                    <span className="mr-2">{categoryIcons[category as keyof typeof categoryIcons]}</span>
                    {categoryLabels[category as keyof typeof categoryLabels]} ({categoryFiles.length}개)
                  </h4>
                </div>

                <div className="space-y-2">
                  {categoryFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3 flex-1">
                        <span className="text-2xl">
                          {getFileIcon(file.original_name)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{file.original_name}</p>
                          <div className="flex space-x-4 text-gray-400 text-sm">
                            <span>{formatFileSize(file.file_size)}</span>
                            <span>{formatDate(file.uploaded_at)}</span>
                          </div>
                          {/* 파일 설명을 별도로 표시 */}
                          {file.description && (
                            <div className="mt-2 p-2 bg-blue-900/30 rounded border-l-4 border-blue-400">
                              <p className="text-blue-200 text-sm">
                                <span className="font-medium">💬 설명:</span> {file.description}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-4 flex space-x-2">
                        {/* 이미지 미리보기 버튼 */}
                        {isImageFile(file.original_name, file.file_type) && (
                          <button
                            onClick={() => openImagePreview(file)}
                            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm whitespace-nowrap"
                            title="이미지 미리보기"
                          >
                            👁️
                          </button>
                        )}
                        {/* 다운로드 버튼 */}
                        <button
                          onClick={() => handleSingleDownload(file)}
                          disabled={isDownloading}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                        >
                          {isDownloading && currentDownloadFile === file.original_name ? '다운로드 중...' : '다운로드'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* 전체 파일 ZIP 다운로드 버튼 */}
        {files.length > 1 && (
          <div className="mt-6 pt-4 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-medium text-white mb-1">전체 파일 다운로드</h4>
                <p className="text-sm text-gray-400">모든 파일을 ZIP 형식으로 일괄 다운로드</p>
              </div>
              <button
                onClick={handleBulkDownload}
                disabled={isBulkDownloading || isDownloading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
              >
                {isBulkDownloading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>ZIP 생성 중...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>전체 다운로드</span>
                  </>
                )}
              </button>
            </div>
            
            {/* 전체 다운로드 진행 상태 */}
            {isBulkDownloading && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-300 mb-2">
                  <span>{downloadStatus}</span>
                  <span>{Math.round(downloadProgress)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${downloadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 파일 통계 */}
        <div className="mt-6 pt-4 border-t border-gray-700">
          <div className="flex justify-between text-sm text-gray-400">
            <span>총 파일 수: {files.length}개</span>
            <span>총 크기: {formatFileSize(files.reduce((sum, file) => sum + file.file_size, 0))}</span>
          </div>
        </div>
      </div>

      {/* 이미지 미리보기 모달 */}
      {previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">이미지 미리보기: {previewFileName}</h3>
              <button
                onClick={closeImagePreview}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-120px)]">
              <img
                src={previewImage}
                alt={previewFileName}
                className="max-w-full max-h-full object-contain mx-auto"
                onError={(e) => {
                  console.error('이미지 로드 실패:', e);
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
                onLoad={() => {
                  console.log('이미지 로드 성공:', previewImage);
                }}
              />
              <div className="hidden text-center text-gray-500 mt-4">
                <p>이미지를 불러올 수 없습니다.</p>
                <p className="text-sm text-gray-400 mt-2">URL: {previewImage}</p>
                <button
                  onClick={() => handleSingleDownload(files.find(f => f.original_name === previewFileName)!)}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  파일 다운로드
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 