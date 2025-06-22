'use client'

import { useState, useRef, useEffect } from 'react'

interface Option {
  value: string
  label: string
}

interface CustomDropdownProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  maxHeight?: string
  name?: string
  required?: boolean
}

export default function CustomDropdown({
  options,
  value,
  onChange,
  placeholder = "선택하세요",
  disabled = false,
  className = "",
  maxHeight = "200px",
  name,
  required = false
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 필터링된 옵션들
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.value.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 선택된 옵션 찾기
  const selectedOption = options.find(option => option.value === value)

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
    setSearchTerm('')
  }

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
      if (!isOpen) {
        // 드롭다운이 열릴 때 검색 입력에 포커스
        setTimeout(() => {
          inputRef.current?.focus()
        }, 100)
      }
    }
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* 선택된 값 표시 버튼 */}
      <button
        type="button"
        onClick={toggleDropdown}
        disabled={disabled}
        className={`w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 text-left shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-600 cursor-pointer'
        }`}
      >
        <div className="flex justify-between items-center">
          <span className={selectedOption ? 'text-white' : 'text-gray-400'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* 드롭다운 옵션들 */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg">
          {/* 검색 입력 */}
          {options.length > 5 && (
            <div className="p-2 border-b border-gray-600">
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="검색..."
                className="w-full bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {/* 옵션 목록 */}
          <div 
            className="overflow-y-auto custom-scrollbar"
            style={{ maxHeight }}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <button
                  key={`${option.value}-${index}`}
                  type="button"
                  onClick={() => handleOptionClick(option.value)}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-600 focus:bg-gray-600 focus:outline-none ${
                    option.value === value ? 'bg-blue-600 text-white' : 'text-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-gray-400 text-sm">검색 결과가 없습니다</div>
            )}
          </div>
        </div>
      )}

      {/* hidden input for form submission */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={value}
          required={required}
        />
      )}
    </div>
  )
} 