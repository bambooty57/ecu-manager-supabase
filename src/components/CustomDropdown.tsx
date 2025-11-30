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
  // 삭제 기능 관련 (선택사항)
  onDelete?: (value: string) => void
  deletableOptions?: string[]  // 삭제 가능한 옵션들의 값 배열
  deleteButtonColor?: string
  // 색상 테마 (선택사항)
  colorTheme?: 'default' | 'green' | 'purple' | 'blue'
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
  required = false,
  onDelete,
  deletableOptions = [],
  deleteButtonColor = "text-red-400 hover:text-red-600",
  colorTheme = 'default'
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

  // 색상 테마에 따른 스타일 클래스
  const getThemeClasses = () => {
    switch (colorTheme) {
      case 'green':
        return {
          button: disabled 
            ? 'bg-green-50 border-2 border-green-200 text-slate-800 opacity-50 cursor-not-allowed' 
            : 'bg-green-50 border-2 border-green-300 text-slate-800 hover:border-green-400 cursor-pointer',
          dropdown: 'bg-white border-2 border-green-300',
          search: 'bg-green-50 border border-green-200 text-slate-800',
          option: 'hover:bg-green-50 text-slate-800',
          selected: 'bg-green-100 text-green-800'
        }
      case 'purple':
        return {
          button: disabled 
            ? 'bg-purple-50 border-2 border-purple-200 text-slate-800 opacity-50 cursor-not-allowed' 
            : 'bg-purple-50 border-2 border-purple-300 text-slate-800 hover:border-purple-400 cursor-pointer',
          dropdown: 'bg-white border-2 border-purple-300',
          search: 'bg-purple-50 border border-purple-200 text-slate-800',
          option: 'hover:bg-purple-50 text-slate-800',
          selected: 'bg-purple-100 text-purple-800'
        }
      case 'blue':
        return {
          button: disabled 
            ? 'bg-blue-50 border-2 border-blue-200 text-slate-800 opacity-50 cursor-not-allowed' 
            : 'bg-blue-50 border-2 border-blue-300 text-slate-800 hover:border-blue-400 cursor-pointer',
          dropdown: 'bg-white border-2 border-blue-300',
          search: 'bg-blue-50 border border-blue-200 text-slate-800',
          option: 'hover:bg-blue-50 text-slate-800',
          selected: 'bg-blue-100 text-blue-800'
        }
      default:
        return {
          button: disabled 
            ? 'bg-gray-700 border border-gray-600 text-white opacity-50 cursor-not-allowed' 
            : 'bg-gray-700 border border-gray-600 text-white hover:bg-gray-600 cursor-pointer',
          dropdown: 'bg-gray-700 border border-gray-600',
          search: 'bg-gray-600 border border-gray-500 text-white',
          option: 'hover:bg-gray-600 text-gray-300',
          selected: 'bg-blue-600 text-white'
        }
    }
  }

  const themeClasses = getThemeClasses()

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* 선택된 값 표시 버튼 */}
      <button
        type="button"
        onClick={toggleDropdown}
        disabled={disabled}
        className={`w-full rounded-2xl px-5 py-5 text-left shadow-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xl font-semibold transition-all duration-300 ${themeClasses.button}`}
      >
        <div className="flex justify-between items-center">
          <span className={selectedOption ? (colorTheme === 'default' ? 'text-white' : 'text-slate-800') : (colorTheme === 'default' ? 'text-gray-400' : 'text-slate-500')}>
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
        <div className={`absolute z-50 w-full mt-2 rounded-2xl shadow-2xl ${themeClasses.dropdown}`}>
          {/* 검색 입력 */}
          {options.length > 5 && (
            <div className={`p-3 border-b-2 ${colorTheme === 'default' ? 'border-gray-600' : 'border-slate-200'}`}>
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="검색..."
                className={`w-full rounded-xl px-3 py-2 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${themeClasses.search}`}
              />
            </div>
          )}

          {/* 옵션 목록 */}
          <div 
            className="overflow-y-auto custom-scrollbar"
            style={{ maxHeight }}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => {
                const isDeletable = onDelete && deletableOptions.includes(option.value)
                return (
                  <div
                    key={`${option.value}-${index}`}
                    className={`w-full flex items-center transition-colors duration-200 ${
                      option.value === value ? themeClasses.selected : themeClasses.option
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleOptionClick(option.value)}
                      className="flex-1 text-left px-5 py-4 focus:outline-none text-lg font-medium"
                    >
                      {option.label}
                    </button>
                    {isDeletable && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(option.value)
                        }}
                        className={`px-2 py-2 ${deleteButtonColor} transition-colors`}
                        title={`"${option.label}" 삭제`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                )
              })
            ) : (
              <div className={`px-5 py-4 text-center text-lg font-medium ${colorTheme === 'default' ? 'text-gray-400' : 'text-slate-500'}`}>검색 결과가 없습니다</div>
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