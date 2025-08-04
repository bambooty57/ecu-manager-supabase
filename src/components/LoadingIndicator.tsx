import React from 'react'

interface LoadingIndicatorProps {
  isLoading: boolean
  message?: string
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center'
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  isLoading, 
  message = '데이터 로딩 중...',
  position = 'top-right'
}) => {
  if (!isLoading) return null

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'center':
        return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
      default:
        return 'top-4 right-4'
    }
  }

  return (
    <div className={`fixed ${getPositionClasses()} bg-blue-500 text-white px-4 py-2 rounded-md shadow-lg z-50 flex items-center animate-pulse`}>
      <svg 
        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24"
      >
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        />
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {message}
    </div>
  )
}

// 특화된 로딩 인디케이터들
export const DataLoadingIndicator: React.FC<{ isLoading: boolean }> = ({ isLoading }) => (
  <LoadingIndicator isLoading={isLoading} message="데이터 로딩 중..." />
)

export const FileLoadingIndicator: React.FC<{ isLoading: boolean }> = ({ isLoading }) => (
  <LoadingIndicator isLoading={isLoading} message="파일 처리 중..." />
)

export const SearchLoadingIndicator: React.FC<{ isLoading: boolean }> = ({ isLoading }) => (
  <LoadingIndicator isLoading={isLoading} message="검색 중..." />
)

export const SaveLoadingIndicator: React.FC<{ isLoading: boolean }> = ({ isLoading }) => (
  <LoadingIndicator isLoading={isLoading} message="저장 중..." />
)

export const DeleteLoadingIndicator: React.FC<{ isLoading: boolean }> = ({ isLoading }) => (
  <LoadingIndicator isLoading={isLoading} message="삭제 중..." />
) 