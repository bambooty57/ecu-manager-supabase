import React, { useState, useCallback } from 'react'
import { FileDownloadManager, FileMetadata } from '@/lib/file-download-manager'

interface FileDownloadSectionProps {
  recordId: number
  files: FileMetadata[]
  onDownloadStart?: () => void
  onDownloadComplete?: () => void
  onDownloadError?: (error: string) => void
}

export const FileDownloadSection: React.FC<FileDownloadSectionProps> = ({
  recordId,
  files,
  onDownloadStart,
  onDownloadComplete,
  onDownloadError
}) => {
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadStatus, setDownloadStatus] = useState('')
  const [currentDownloadFile, setCurrentDownloadFile] = useState<string>('')

  // 파일 타입별 그룹화
  const groupedFiles = React.useMemo(() => {
    const groups: Record<string, FileMetadata[]> = {
      ecu: [],
      acu: [],
      media: [],
      documents: [],
      other: []
    }

    files.forEach(file => {
      const fileName = file.original_name.toLowerCase()
      if (fileName.includes('ecu') || fileName.includes('original') || fileName.includes('stage')) {
        groups.ecu.push(file)
      } else if (fileName.includes('acu')) {
        groups.acu.push(file)
      } else if (fileName.includes('media') || fileName.includes('image') || fileName.includes('video')) {
        groups.media.push(file)
      } else if (fileName.includes('document') || fileName.includes('pdf') || fileName.includes('doc')) {
        groups.documents.push(file)
      } else {
        groups.other.push(file)
      }
    })

    return groups
  }, [files])

  // 개별 파일 다운로드
  const handleSingleDownload = useCallback(async (file: FileMetadata) => {
    try {
      setIsDownloading(true)
      setCurrentDownloadFile(file.original_name)
      setDownloadStatus(`다운로드 중: ${file.original_name}`)
      setDownloadProgress(0)
      
      onDownloadStart?.()

      // 다운로드 매니저 인스턴스 생성
      const { supabase } = await import('@/lib/supabase')
      const downloadManager = new FileDownloadManager(supabase)
      
      await downloadManager.downloadFile(file)
      
      setDownloadProgress(100)
      setDownloadStatus('다운로드 완료!')
      
      onDownloadComplete?.()
      
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

      const { supabase } = await import('@/lib/supabase')
      const downloadManager = new FileDownloadManager(supabase)
      
      const zipName = `work_record_${recordId}_${categoryName}_files.zip`
      await downloadManager.downloadMultipleFiles(categoryFiles, zipName)
      
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

      const { supabase } = await import('@/lib/supabase')
      const downloadManager = new FileDownloadManager(supabase)
      
      const zipName = `work_record_${recordId}_all_files.zip`
      await downloadManager.downloadMultipleFiles(files, zipName)
      
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

  if (files.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">📁 첨부 파일</h3>
        <p className="text-gray-400">첨부된 파일이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">📁 첨부 파일 ({files.length}개)</h3>
        <div className="flex space-x-2">
          {files.length > 1 && (
            <button
              onClick={handleAllFilesDownload}
              disabled={isDownloading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isDownloading ? '다운로드 중...' : '전체 다운로드'}
            </button>
          )}
        </div>
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
            documents: '문서 파일',
            other: '기타 파일'
          }

          const categoryIcons = {
            ecu: '⚙️',
            acu: '🔧',
            media: '🎥',
            documents: '📄',
            other: '📁'
          }

          return (
            <div key={category} className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-medium text-gray-200 flex items-center">
                  <span className="mr-2">{categoryIcons[category as keyof typeof categoryIcons]}</span>
                  {categoryLabels[category as keyof typeof categoryLabels]} ({categoryFiles.length}개)
                </h4>
                {categoryFiles.length > 1 && (
                  <button
                    onClick={() => handleCategoryDownload(categoryFiles, category)}
                    disabled={isDownloading}
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                  >
                    {isDownloading ? '다운로드 중...' : '전체 다운로드'}
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {categoryFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3 flex-1">
                      <span className="text-2xl">
                        {FileDownloadManager.getFileIcon(file.original_name)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{file.original_name}</p>
                        <div className="flex space-x-4 text-gray-400 text-sm">
                          <span>{formatFileSize(file.file_size)}</span>
                          <span>{formatDate(file.uploaded_at)}</span>
                          {file.description && (
                            <span className="truncate" title={file.description}>
                              {file.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSingleDownload(file)}
                      disabled={isDownloading}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm ml-3"
                    >
                      {isDownloading && currentDownloadFile === file.original_name ? '다운로드 중...' : '다운로드'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* 파일 통계 */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="flex justify-between text-sm text-gray-400">
          <span>총 파일 수: {files.length}개</span>
          <span>총 크기: {formatFileSize(files.reduce((sum, file) => sum + file.file_size, 0))}</span>
        </div>
      </div>
    </div>
  )
} 