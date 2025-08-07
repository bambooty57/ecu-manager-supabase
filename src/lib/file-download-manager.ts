import { supabase } from './supabase'
import JSZip from 'jszip'

// 파일 다운로드 결과 타입
export interface FileDownloadResult {
  success: boolean
  error?: string
  fileName?: string
}

// 개별 파일 다운로드
export const downloadSingleFile = async (fileUrl: string, fileName: string): Promise<FileDownloadResult> => {
  try {
    console.log(`⬇️ 파일 다운로드 시작: ${fileName}`)
    
    // 파일 다운로드
    const response = await fetch(fileUrl)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const blob = await response.blob()
    
    // 다운로드 링크 생성
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    console.log(`✅ 파일 다운로드 완료: ${fileName}`)
    return { success: true, fileName }
  } catch (error) {
    console.error(`❌ 파일 다운로드 실패: ${fileName}`, error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// 전체 파일 ZIP 다운로드
export const downloadAllFilesAsZip = async (files: Array<{ url: string; name: string; description?: string }>): Promise<FileDownloadResult> => {
  try {
    console.log(`📦 ZIP 다운로드 시작: ${files.length}개 파일`)
    
    const zip = new JSZip()
    
    // 각 파일을 ZIP에 추가
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        console.log(`📥 파일 추가 중: ${file.name} (${i + 1}/${files.length})`)
        
        const response = await fetch(file.url)
        if (!response.ok) {
          console.warn(`⚠️ 파일 다운로드 실패: ${file.name}`)
          continue
        }
        
        const blob = await response.blob()
        zip.file(file.name, blob)
        
        // 파일 설명이 있으면 별도 파일로 추가
        if (file.description) {
          zip.file(`${file.name}.description.txt`, file.description)
        }
        
      } catch (error) {
        console.warn(`⚠️ 파일 처리 실패: ${file.name}`, error)
        continue
      }
    }
    
    // ZIP 파일 생성
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    
    // 다운로드
    const url = window.URL.createObjectURL(zipBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `work_files_${new Date().toISOString().split('T')[0]}.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    console.log(`✅ ZIP 다운로드 완료`)
    return { success: true, fileName: `work_files_${new Date().toISOString().split('T')[0]}.zip` }
  } catch (error) {
    console.error(`❌ ZIP 다운로드 실패:`, error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// 이미지 파일 미리보기 URL 생성
export const getImagePreviewUrl = (fileUrl: string): string => {
  // 이미지 파일인지 확인
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'svg']
  const ext = fileUrl.split('.').pop()?.toLowerCase()
  
  if (ext && imageExtensions.includes(ext)) {
    return fileUrl
  }
  
  return ''
} 