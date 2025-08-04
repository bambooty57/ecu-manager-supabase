import React from 'react'

interface LoadingSkeletonProps {
  rows?: number
  viewMode?: 'list' | 'grid'
  type?: 'work-record' | 'detail' | 'file'
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  rows = 5, 
  viewMode = 'list',
  type = 'work-record'
}) => {
  const renderWorkRecordSkeleton = () => (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`bg-gray-700 rounded-lg p-6 ${viewMode === 'grid' ? 'max-w-sm' : ''}`}>
          <div className="flex space-x-4">
            <div className="rounded-full bg-gray-600 h-12 w-12 flex-shrink-0"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-gray-600 rounded w-3/4"></div>
              <div className="h-4 bg-gray-600 rounded w-1/2"></div>
              <div className="h-4 bg-gray-600 rounded w-2/3"></div>
              <div className="h-3 bg-gray-600 rounded w-1/4"></div>
            </div>
          </div>
          {viewMode === 'grid' && (
            <div className="mt-4 space-y-2">
              <div className="h-3 bg-gray-600 rounded w-full"></div>
              <div className="h-3 bg-gray-600 rounded w-3/4"></div>
            </div>
          )}
          <div className="flex justify-end space-x-2 mt-4">
            <div className="h-8 bg-gray-600 rounded w-16"></div>
            <div className="h-8 bg-gray-600 rounded w-12"></div>
            <div className="h-8 bg-gray-600 rounded w-12"></div>
          </div>
        </div>
      ))}
    </div>
  )

  const renderDetailSkeleton = () => (
    <div className="animate-pulse space-y-6">
      {/* 헤더 */}
      <div className="bg-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-gray-600 rounded w-1/3"></div>
          <div className="h-6 bg-gray-600 rounded w-16"></div>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-600 rounded w-1/4"></div>
          <div className="h-4 bg-gray-600 rounded w-1/2"></div>
          <div className="h-4 bg-gray-600 rounded w-1/3"></div>
        </div>
      </div>

      {/* 기본 정보 */}
      <div className="bg-gray-700 rounded-lg p-6">
        <div className="h-5 bg-gray-600 rounded w-24 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 bg-gray-600 rounded w-20"></div>
              <div className="h-4 bg-gray-600 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>

      {/* ECU 정보 */}
      <div className="bg-gray-700 rounded-lg p-6">
        <div className="h-5 bg-gray-600 rounded w-20 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 bg-gray-600 rounded w-16"></div>
              <div className="h-4 bg-gray-600 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>

      {/* ACU 정보 */}
      <div className="bg-gray-700 rounded-lg p-6">
        <div className="h-5 bg-gray-600 rounded w-20 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 bg-gray-600 rounded w-16"></div>
              <div className="h-4 bg-gray-600 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>

      {/* 파일 섹션 */}
      <div className="bg-gray-700 rounded-lg p-6">
        <div className="h-5 bg-gray-600 rounded w-24 mb-4"></div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3 p-3 bg-gray-600 rounded-lg">
              <div className="h-8 w-8 bg-gray-500 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-500 rounded w-3/4"></div>
                <div className="h-3 bg-gray-500 rounded w-1/2"></div>
              </div>
              <div className="h-8 bg-gray-500 rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderFileSkeleton = () => (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
          <div className="flex items-center space-x-3 flex-1">
            <div className="h-8 w-8 bg-gray-600 rounded"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-600 rounded w-3/4"></div>
              <div className="flex space-x-4">
                <div className="h-3 bg-gray-600 rounded w-16"></div>
                <div className="h-3 bg-gray-600 rounded w-20"></div>
              </div>
            </div>
          </div>
          <div className="h-8 bg-gray-600 rounded w-20"></div>
        </div>
      ))}
    </div>
  )

  switch (type) {
    case 'detail':
      return renderDetailSkeleton()
    case 'file':
      return renderFileSkeleton()
    default:
      return renderWorkRecordSkeleton()
  }
}

// 특화된 스켈레톤 컴포넌트들
export const WorkRecordSkeleton: React.FC<{ rows?: number; viewMode?: 'list' | 'grid' }> = ({ 
  rows = 5, 
  viewMode = 'list' 
}) => (
  <LoadingSkeleton rows={rows} viewMode={viewMode} type="work-record" />
)

export const DetailSkeleton: React.FC = () => (
  <LoadingSkeleton type="detail" />
)

export const FileSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <LoadingSkeleton rows={rows} type="file" />
)

// 검색 결과 스켈레톤
export const SearchResultSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="animate-pulse space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-gray-700 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-gray-600 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-600 rounded w-1/2"></div>
            <div className="h-3 bg-gray-600 rounded w-3/4"></div>
            <div className="h-3 bg-gray-600 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
)

// 필터 스켈레톤
export const FilterSkeleton: React.FC = () => (
  <div className="animate-pulse bg-gray-700 rounded-lg p-4 mb-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 bg-gray-600 rounded w-16"></div>
          <div className="h-10 bg-gray-600 rounded"></div>
        </div>
      ))}
    </div>
  </div>
)

// 페이지네이션 스켈레톤
export const PaginationSkeleton: React.FC = () => (
  <div className="animate-pulse flex justify-center space-x-2 mt-6">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="h-10 w-10 bg-gray-600 rounded"></div>
    ))}
  </div>
) 