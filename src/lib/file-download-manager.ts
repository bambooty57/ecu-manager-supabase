import { SupabaseClient } from '@supabase/supabase-js'

export interface FileMetadata {
  id: number
  work_record_id: number
  original_name: string
  file_path: string
  file_size: number
  bucket: string
  uploaded_at: string
  file_type: string
  description?: string
}

export interface DownloadOptions {
  bucket?: string
  timeout?: number
  retryCount?: number
}

export class FileDownloadManager {
  private supabase: SupabaseClient
  private defaultTimeout = 30000 // 30초
  private defaultRetryCount = 3

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  // ✅ 개별 파일 다운로드 URL 생성
  async generateDownloadUrl(filePath: string, options: DownloadOptions = {}): Promise<string> {
    const { bucket = 'work-files', timeout = this.defaultTimeout } = options
    
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 3600) // 1시간 유효
      
      if (error) {
        console.error('다운로드 URL 생성 실패:', error)
        throw new Error(`다운로드 URL 생성 실패: ${error.message}`)
      }
      
      if (!data?.signedUrl) {
        throw new Error('다운로드 URL이 생성되지 않았습니다.')
      }
      
      return data.signedUrl
    } catch (error) {
      console.error('파일 다운로드 URL 생성 오류:', error)
      throw error
    }
  }

  // ✅ 개별 파일 다운로드 실행
  async downloadFile(fileMetadata: FileMetadata, options: DownloadOptions = {}): Promise<void> {
    const { retryCount = this.defaultRetryCount } = options
    
    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        console.log(`파일 다운로드 시도 ${attempt}/${retryCount}:`, fileMetadata.original_name)
        
        const downloadUrl = await this.generateDownloadUrl(fileMetadata.file_path, {
          bucket: fileMetadata.bucket,
          ...options
        })
        
        // 브라우저 다운로드 실행
        await this.executeBrowserDownload(downloadUrl, fileMetadata.original_name)
        
        console.log('파일 다운로드 성공:', fileMetadata.original_name)
        return
        
      } catch (error) {
        console.error(`파일 다운로드 실패 (시도 ${attempt}/${retryCount}):`, error)
        
        if (attempt === retryCount) {
          throw new Error(`파일 다운로드에 실패했습니다: ${fileMetadata.original_name}`)
        }
        
        // 재시도 전 잠시 대기
        await this.delay(1000 * attempt)
      }
    }
  }

  // ✅ 다중 파일 ZIP 다운로드
  async downloadMultipleFiles(files: FileMetadata[], zipName: string = 'files.zip'): Promise<void> {
    try {
      console.log('다중 파일 ZIP 다운로드 시작:', files.length, '개 파일')
      
      // JSZip 동적 import
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      
      // 각 파일을 ZIP에 추가
      for (const file of files) {
        try {
          const downloadUrl = await this.generateDownloadUrl(file.file_path, {
            bucket: file.bucket
          })
          
          const response = await fetch(downloadUrl)
          if (!response.ok) {
            throw new Error(`파일 다운로드 실패: ${response.statusText}`)
          }
          
          const blob = await response.blob()
          zip.file(file.original_name, blob)
          
          console.log('ZIP에 파일 추가됨:', file.original_name)
          
        } catch (error) {
          console.error('개별 파일 다운로드 실패:', file.original_name, error)
          // 개별 파일 실패해도 계속 진행
        }
      }
      
      // ZIP 파일 생성 및 다운로드
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      })
      
      await this.executeBrowserDownload(
        URL.createObjectURL(zipBlob),
        zipName,
        'application/zip'
      )
      
      console.log('ZIP 파일 다운로드 완료:', zipName)
      
    } catch (error) {
      console.error('다중 파일 다운로드 실패:', error)
      throw new Error('파일 다운로드에 실패했습니다.')
    }
  }

  // ✅ 카테고리별 파일 다운로드
  async downloadFilesByCategory(
    files: FileMetadata[], 
    categoryName: string, 
    customFilenames?: string[]
  ): Promise<void> {
    try {
      const zipName = `${categoryName}_files.zip`
      
      // 커스텀 파일명이 있는 경우 적용
      const filesWithCustomNames = files.map((file, index) => ({
        ...file,
        original_name: customFilenames?.[index] || file.original_name
      }))
      
      await this.downloadMultipleFiles(filesWithCustomNames, zipName)
      
    } catch (error) {
      console.error('카테고리별 파일 다운로드 실패:', error)
      throw error
    }
  }

  // ✅ 브라우저 다운로드 실행
  private async executeBrowserDownload(url: string, filename: string, mimeType?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const link = document.createElement('a')
        link.href = url
        link.download = this.sanitizeFilename(filename)
        link.target = '_blank'
        
        if (mimeType) {
          link.type = mimeType
        }
        
        // 다운로드 진행률 표시를 위한 이벤트 리스너
        link.addEventListener('click', () => {
          console.log('다운로드 시작:', filename)
        })
        
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        // 다운로드 완료 대기
        setTimeout(() => {
          resolve()
        }, 1000)
        
      } catch (error) {
        reject(error)
      }
    })
  }

  // ✅ 파일명 정리 (특수문자 제거)
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_') // Windows에서 허용되지 않는 문자 제거
      .replace(/\s+/g, '_') // 공백을 언더스코어로 변경
      .substring(0, 255) // 파일명 길이 제한
  }

  // ✅ 지연 함수
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // ✅ 파일 크기 포맷팅
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // ✅ 파일 타입별 아이콘 반환
  static getFileIcon(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase()
    const iconMap: Record<string, string> = {
      pdf: '📄',
      doc: '📝', docx: '📝',
      xls: '📊', xlsx: '📊',
      jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', webp: '🖼️',
      mp4: '🎥', avi: '🎥', mov: '🎥', wmv: '🎥',
      zip: '📦', rar: '📦', '7z': '📦',
      txt: '📄', log: '📄',
      json: '⚙️', xml: '⚙️',
      exe: '⚙️', dll: '⚙️',
      bin: '💾', dat: '💾'
    }
    return iconMap[ext || ''] || '📄'
  }

  // ✅ 파일 타입별 색상 반환
  static getFileColor(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase()
    const colorMap: Record<string, string> = {
      pdf: 'text-red-500',
      doc: 'text-blue-500', docx: 'text-blue-500',
      xls: 'text-green-500', xlsx: 'text-green-500',
      jpg: 'text-purple-500', jpeg: 'text-purple-500', png: 'text-purple-500',
      mp4: 'text-orange-500', avi: 'text-orange-500', mov: 'text-orange-500',
      zip: 'text-yellow-500', rar: 'text-yellow-500',
      txt: 'text-gray-500', log: 'text-gray-500'
    }
    return colorMap[ext || ''] || 'text-gray-400'
  }
} 