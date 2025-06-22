import { supabase } from './supabase'

// CDN 설정
const CDN_CONFIG = {
  // Cloudflare, AWS CloudFront, 또는 다른 CDN 서비스
  enabled: process.env.NEXT_PUBLIC_CDN_ENABLED === 'true',
  baseUrl: process.env.NEXT_PUBLIC_CDN_BASE_URL || '',
  cacheMaxAge: 86400, // 24시간
  staleWhileRevalidate: 31536000, // 1년
}

// 파일 타입별 CDN 캐시 설정
const CACHE_SETTINGS = {
  images: {
    maxAge: 2592000, // 30일
    staleWhileRevalidate: 31536000, // 1년
    immutable: true
  },
  documents: {
    maxAge: 86400, // 1일
    staleWhileRevalidate: 604800, // 1주일
    immutable: false
  },
  videos: {
    maxAge: 2592000, // 30일
    staleWhileRevalidate: 31536000, // 1년
    immutable: true
  },
  default: {
    maxAge: 3600, // 1시간
    staleWhileRevalidate: 86400, // 1일
    immutable: false
  }
}

// 파일 타입 감지
export const getFileTypeCategory = (mimeType: string): keyof typeof CACHE_SETTINGS => {
  if (mimeType.startsWith('image/')) return 'images'
  if (mimeType.startsWith('video/')) return 'videos'
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'documents'
  return 'default'
}

// CDN URL 생성
export const generateCDNUrl = (storagePath: string, bucketName: string): string => {
  if (!CDN_CONFIG.enabled || !CDN_CONFIG.baseUrl) {
    // CDN이 비활성화된 경우 Supabase 직접 URL 반환
    const { data } = supabase.storage.from(bucketName).getPublicUrl(storagePath)
    return data.publicUrl
  }

  // CDN URL 생성
  const cleanPath = storagePath.startsWith('/') ? storagePath.slice(1) : storagePath
  return `${CDN_CONFIG.baseUrl}/${bucketName}/${cleanPath}`
}

// 이미지 리사이징 및 최적화 URL 생성
export const generateOptimizedImageUrl = (
  storagePath: string, 
  bucketName: string,
  options: {
    width?: number
    height?: number
    quality?: number
    format?: 'webp' | 'avif' | 'jpeg' | 'png'
    fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside'
  } = {}
): string => {
  const baseUrl = generateCDNUrl(storagePath, bucketName)
  
  if (!CDN_CONFIG.enabled) {
    return baseUrl
  }

  // Cloudflare Image Resizing 또는 기타 CDN 이미지 최적화 서비스 URL 파라미터
  const params = new URLSearchParams()
  
  if (options.width) params.append('width', options.width.toString())
  if (options.height) params.append('height', options.height.toString())
  if (options.quality) params.append('quality', options.quality.toString())
  if (options.format) params.append('format', options.format)
  if (options.fit) params.append('fit', options.fit)

  const queryString = params.toString()
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}

// 캐시 헤더 생성
export const generateCacheHeaders = (mimeType: string): Record<string, string> => {
  const category = getFileTypeCategory(mimeType)
  const settings = CACHE_SETTINGS[category]
  
  return {
    'Cache-Control': `public, max-age=${settings.maxAge}, stale-while-revalidate=${settings.staleWhileRevalidate}${settings.immutable ? ', immutable' : ''}`,
    'X-Content-Type-Options': 'nosniff',
    'Content-Type': mimeType,
    'Vary': 'Accept-Encoding'
  }
}

// CDN 프리페치 (미리 로딩)
export const prefetchCDNResource = (url: string): void => {
  if (typeof window !== 'undefined') {
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = url
    document.head.appendChild(link)
  }
}

// 중요한 파일들 프리로드
export const preloadCriticalResources = (urls: string[]): void => {
  if (typeof window !== 'undefined') {
    urls.forEach(url => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.href = url
      link.as = 'fetch'
      link.crossOrigin = 'anonymous'
      document.head.appendChild(link)
    })
  }
}

// 브라우저 캐시 관리
export const manageBrowserCache = {
  // 캐시 저장
  set: (key: string, data: any, ttl: number = 3600000): void => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const expiry = Date.now() + ttl
      const cacheData = {
        data,
        expiry
      }
      localStorage.setItem(`cdn_cache_${key}`, JSON.stringify(cacheData))
    }
  },

  // 캐시 조회
  get: (key: string): any | null => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const cached = localStorage.getItem(`cdn_cache_${key}`)
      if (cached) {
        const { data, expiry } = JSON.parse(cached)
        if (Date.now() < expiry) {
          return data
        } else {
          localStorage.removeItem(`cdn_cache_${key}`)
        }
      }
    }
    return null
  },

  // 캐시 삭제
  remove: (key: string): void => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(`cdn_cache_${key}`)
    }
  },

  // 전체 캐시 정리
  clear: (): void => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('cdn_cache_')) {
          localStorage.removeItem(key)
        }
      })
    }
  }
}

// 이미지 레이지 로딩 옵저버
export class LazyImageLoader {
  private observer: IntersectionObserver | null = null
  private images: Set<HTMLImageElement> = new Set()

  constructor() {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement
              this.loadImage(img)
              this.observer?.unobserve(img)
            }
          })
        },
        {
          rootMargin: '50px 0px',
          threshold: 0.1
        }
      )
    }
  }

  observe(img: HTMLImageElement): void {
    if (this.observer) {
      this.images.add(img)
      this.observer.observe(img)
    }
  }

  private loadImage(img: HTMLImageElement): void {
    const dataSrc = img.dataset.src
    if (dataSrc) {
      img.src = dataSrc
      img.classList.remove('lazy-loading')
      img.classList.add('lazy-loaded')
    }
  }

  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect()
      this.images.clear()
    }
  }
}

// WebP 지원 감지
export const isWebPSupported = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false)
      return
    }

    const webP = new Image()
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2)
    }
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA'
  })
}

// AVIF 지원 감지
export const isAVIFSupported = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false)
      return
    }

    const avif = new Image()
    avif.onload = avif.onerror = () => {
      resolve(avif.height === 2)
    }
    avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A='
  })
} 