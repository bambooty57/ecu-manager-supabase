'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ACU_TYPES, ACU_MANUFACTURERS, ACU_MODELS_BY_MANUFACTURER, ECU_MODELS, ECU_MAKERS, CONNECTION_METHODS, ECU_TOOL_CATEGORIES, ECU_TOOLS, ECU_TOOLS_FLAT, TUNING_WORKS, TUNING_CATEGORIES, TUNING_WORKS_BY_CATEGORY, WORK_STATUS } from '@/constants'
import { getAllCustomers, CustomerData } from '@/lib/customers'
import { getEquipmentByCustomerId, EquipmentData } from '@/lib/equipment'
import { createWorkRecord, WorkRecordData } from '@/lib/work-records'
import Navigation from '@/components/Navigation'
import AuthGuard from '@/components/AuthGuard'

export default function WorkPage() {
  const router = useRouter()
  
  // ?§Ï†ú Í≥†Í∞ù ?∞Ïù¥??state
  const [customers, setCustomers] = useState<CustomerData[]>([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true)
  
  // ?§Îäò ?†ÏßúÎ•?YYYY-MM-DD ?ïÏãù?ºÎ°ú Í∞Ä?∏Ïò§Í∏?
  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  // Remapping ?ëÏóÖ ?ïÎ≥¥ ?∏ÌÑ∞?òÏù¥??
  interface RemappingWork {
    id: number
    // ECU ?ïÎ≥¥
    ecu: {
      toolCategory: string
      connectionMethod: string
      maker: string
      type: string
      typeCustom: string
      selectedWorks: string[]
      workDetails: string
      price: string
      status: string
    }
    // ACU ?ïÎ≥¥
    acu: {
      toolCategory: string
      connectionMethod: string
      manufacturer: string
      model: string
      modelCustom: string
      selectedWorks: string[]
      workDetails: string
      price: string
      status: string
    }
    notes: string
    files: {
      originalFiles?: File[]
      originalFileDescription?: string
      stage1File?: File
      stage1FileDescription?: string
      stage2File?: File
      stage2FileDescription?: string
      stage3File?: File
      stage3FileDescription?: string
      acuOriginalFiles?: File[]
      acuOriginalFileDescription?: string
      acuStage1File?: File
      acuStage1FileDescription?: string
      acuStage2File?: File
      acuStage2FileDescription?: string
      acuStage3File?: File
      acuStage3FileDescription?: string
      mediaFile1?: File
      mediaFile1Description?: string
      mediaFile2?: File
      mediaFile2Description?: string
      mediaFile3?: File
      mediaFile3Description?: string
      mediaFile4?: File
      mediaFile4Description?: string
      mediaFile5?: File
      mediaFile5Description?: string
    }
  }

  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    equipmentId: '',
    workDate: getTodayDate(),
    price: '',
    status: '?àÏïΩ' // Í∏∞Î≥∏Í∞íÏùÑ ?àÏïΩ?ºÎ°ú ?§Ï†ï
  })

  // ?§Ï§ë Remapping ?ëÏóÖ Î™©Î°ù
  const [remappingWorks, setRemappingWorks] = useState<RemappingWork[]>([])
  
  // ?ÑÏû¨ ?∏Ïßë Ï§ëÏù∏ Remapping ?ëÏóÖ
  const [currentRemappingWork, setCurrentRemappingWork] = useState({
    ecu: {
      toolCategory: '',
      connectionMethod: '',
      maker: '',
      type: '',
      typeCustom: '',
      selectedWorks: [] as string[],
      workDetails: '',
      price: '',
      status: '?àÏïΩ'
    },
    acu: {
      toolCategory: '',
      connectionMethod: '',
      manufacturer: '',
      model: '',
      modelCustom: '',
      selectedWorks: [] as string[],
      workDetails: '',
      price: '',
      status: '?àÏïΩ'
    },
    notes: '',
    files: {
      originalFiles: [] as File[],
      originalFileDescription: '',
      stage1File: undefined,
      stage1FileDescription: '',
      stage2File: undefined,
      stage2FileDescription: '',
      stage3File: undefined,
      stage3FileDescription: '',
      acuOriginalFiles: [] as File[],
      acuOriginalFileDescription: '',
      acuStage1File: undefined,
      acuStage1FileDescription: '',
      acuStage2File: undefined,
      acuStage2FileDescription: '',
      acuStage3File: undefined,
      acuStage3FileDescription: '',
      mediaFile1: undefined,
      mediaFile1Description: '',
      mediaFile2: undefined,
      mediaFile2Description: '',
      mediaFile3: undefined,
      mediaFile3Description: '',
      mediaFile4: undefined,
      mediaFile4Description: '',
      mediaFile5: undefined,
      mediaFile5Description: ''
    }
  })

  // ?ëÏóÖ Ïπ¥ÌÖåÍ≥†Î¶¨Î≥??†ÌÉù ?ÅÌÉú (?ÑÏû¨ ?∏Ïßë Ï§ëÏù∏ ?ëÏóÖ??
  const [workSelections, setWorkSelections] = useState<{[category: string]: string[]}>({
    'ECU/?úÎãù': [],
    'ACU/?úÎãù': []
  })

  // Remapping ?ëÏóÖ ?∏Ïßë Î™®Îìú
  const [isEditingRemapping, setIsEditingRemapping] = useState(false)
  const [editingRemappingId, setEditingRemappingId] = useState<number | null>(null)

  // ?†ÌÉù??Í≥†Í∞ù???•ÎπÑ Î™©Î°ù
  const [availableEquipment, setAvailableEquipment] = useState<EquipmentData[]>([])
  
  // Í≥†Í∞ù ?êÎèô?ÑÏÑ± Í¥Ä??state
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerData[]>([])

  // ?ôÏ†Å ECU Î™®Îç∏ Î™©Î°ù (Î°úÏª¨ ?§ÌÜ†Î¶¨Ï??êÏÑú Í∞Ä?∏Ïò§Í∏?
  const [ecuModels, setEcuModels] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ecuModels')
      return saved ? JSON.parse(saved) : [...ECU_MODELS]
    }
    return [...ECU_MODELS]
  })

  // ?ôÏ†Å ACU ?Ä??Î™©Î°ù (Î°úÏª¨ ?§ÌÜ†Î¶¨Ï??êÏÑú Í∞Ä?∏Ïò§Í∏? - Í∏∞Ï°¥ ?∏Ìôò?±Ïö©
  const [acuTypes, setAcuTypes] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('acuTypes')
      return saved ? JSON.parse(saved) : [...ACU_TYPES]
    }
    return [...ACU_TYPES]
  })

  // ?ôÏ†Å ACU ?úÏ°∞?¨Î≥Ñ Î™®Îç∏ Î™©Î°ù (Î°úÏª¨ ?§ÌÜ†Î¶¨Ï??êÏÑú Í∞Ä?∏Ïò§Í∏?
  const [acuModelsByManufacturer, setAcuModelsByManufacturer] = useState<Record<string, string[]>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('acuModelsByManufacturer')
      return saved ? JSON.parse(saved) : { ...ACU_MODELS_BY_MANUFACTURER }
    }
    return { ...ACU_MODELS_BY_MANUFACTURER }
  })

  // ?àÎ°ú??ECU ?Ä?ÖÏùÑ Î™©Î°ù??Ï∂îÍ?
  const addNewEcuType = (newType: string) => {
    if (newType.trim() && !ecuModels.includes(newType.trim())) {
      const newList = [...ecuModels, newType.trim()]
      setEcuModels(newList)
      localStorage.setItem('ecuModels', JSON.stringify(newList))
    }
  }

  // ?àÎ°ú??ACU ?Ä?ÖÏùÑ Î™©Î°ù??Ï∂îÍ? (Í∏∞Ï°¥ ?∏Ìôò?±Ïö©)
  const addNewAcuType = (newType: string) => {
    if (newType.trim() && !acuTypes.includes(newType.trim())) {
      const newList = [...acuTypes, newType.trim()]
      setAcuTypes(newList)
      localStorage.setItem('acuTypes', JSON.stringify(newList))
    }
  }

  // ?àÎ°ú??ACU Î™®Îç∏???úÏ°∞?¨Î≥Ñ Î™©Î°ù??Ï∂îÍ?
  const addNewAcuModel = (manufacturer: string, newModel: string) => {
    if (newModel.trim() && manufacturer) {
      const currentModels = acuModelsByManufacturer[manufacturer] || []
      if (!currentModels.includes(newModel.trim())) {
        const newModelsByManufacturer = {
          ...acuModelsByManufacturer,
          [manufacturer]: [...currentModels, newModel.trim()]
        }
        setAcuModelsByManufacturer(newModelsByManufacturer)
        localStorage.setItem('acuModelsByManufacturer', JSON.stringify(newModelsByManufacturer))
      }
    }
  }

  // ECU/ACU ?Ä??Í¥ÄÎ¶??ÅÌÉú
  const [showEcuManagement, setShowEcuManagement] = useState(false)
  const [showAcuManagement, setShowAcuManagement] = useState(false)
  const [selectedEcuModels, setSelectedEcuModels] = useState<string[]>([])
  const [selectedAcuTypes, setSelectedAcuTypes] = useState<string[]>([])
  const [newEcuModel, setNewEcuModel] = useState('')
  const [newAcuType, setNewAcuType] = useState('')

  // ECU Î™®Îç∏ ?†ÌÉù/?¥Ï†ú
  const handleEcuModelSelect = (model: string) => {
    setSelectedEcuModels(prev => 
      prev.includes(model) 
        ? prev.filter(m => m !== model)
        : [...prev, model]
    )
  }

  // ACU ?Ä???†ÌÉù/?¥Ï†ú
  const handleAcuTypeSelect = (type: string) => {
    setSelectedAcuTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  // ?†ÌÉù??ECU Î™®Îç∏ ??†ú
  const deleteSelectedEcuModels = () => {
    if (selectedEcuModels.length === 0) {
      alert('??†ú??ECU Î™®Îç∏???†ÌÉù?¥Ï£º?∏Ïöî.')
      return
    }

    if (confirm(`?†ÌÉù??${selectedEcuModels.length}Í∞úÏùò ECU Î™®Îç∏????†ú?òÏãúÍ≤†Ïäµ?àÍπå?`)) {
      const newEcuModels = ecuModels.filter(model => !selectedEcuModels.includes(model))
      setEcuModels(newEcuModels)
      localStorage.setItem('ecuModels', JSON.stringify(newEcuModels))
      setSelectedEcuModels([])
      alert('?†ÌÉù??ECU Î™®Îç∏????†ú?òÏóà?µÎãà??')
    }
  }

  // ?†ÌÉù??ACU ?Ä????†ú
  const deleteSelectedAcuTypes = () => {
    if (selectedAcuTypes.length === 0) {
      alert('??†ú??ACU ?Ä?ÖÏùÑ ?†ÌÉù?¥Ï£º?∏Ïöî.')
      return
    }

    if (confirm(`?†ÌÉù??${selectedAcuTypes.length}Í∞úÏùò ACU ?Ä?ÖÏùÑ ??†ú?òÏãúÍ≤†Ïäµ?àÍπå?`)) {
      const newAcuTypes = acuTypes.filter(type => !selectedAcuTypes.includes(type))
      setAcuTypes(newAcuTypes)
      localStorage.setItem('acuTypes', JSON.stringify(newAcuTypes))
      setSelectedAcuTypes([])
      alert('?†ÌÉù??ACU ?Ä?ÖÏù¥ ??†ú?òÏóà?µÎãà??')
    }
  }

  // ?àÎ°ú??ECU Î™®Îç∏ Ï∂îÍ? (Ï§ëÎ≥µ ?ïÏù∏)
  const handleAddNewEcuModel = () => {
    const trimmedModel = newEcuModel.trim()
    if (!trimmedModel) {
      alert('ECU Î™®Îç∏Î™ÖÏùÑ ?ÖÎ†•?¥Ï£º?∏Ïöî.')
      return
    }

    if (ecuModels.includes(trimmedModel)) {
      alert('?¥Î? Î™©Î°ù???àÎäî ECU Î™®Îç∏?ÖÎãà??')
      return
    }

    const newEcuModels = [...ecuModels, trimmedModel]
    setEcuModels(newEcuModels)
    localStorage.setItem('ecuModels', JSON.stringify(newEcuModels))
    setNewEcuModel('')
    alert('?àÎ°ú??ECU Î™®Îç∏??Ï∂îÍ??òÏóà?µÎãà??')
  }

  // ?àÎ°ú??ACU ?Ä??Ï∂îÍ? (Ï§ëÎ≥µ ?ïÏù∏)
  const handleAddNewAcuType = () => {
    const trimmedType = newAcuType.trim()
    if (!trimmedType) {
      alert('ACU ?Ä?ÖÎ™Ö???ÖÎ†•?¥Ï£º?∏Ïöî.')
      return
    }

    if (acuTypes.includes(trimmedType)) {
      alert('?¥Î? Î™©Î°ù???àÎäî ACU ?Ä?ÖÏûÖ?àÎã§.')
      return
    }

    const newAcuTypes = [...acuTypes, trimmedType]
    setAcuTypes(newAcuTypes)
    localStorage.setItem('acuTypes', JSON.stringify(newAcuTypes))
    setNewAcuType('')
    alert('?àÎ°ú??ACU ?Ä?ÖÏù¥ Ï∂îÍ??òÏóà?µÎãà??')
  }

  // ACU ?úÏ°∞?¨Î≥Ñ ?¨Ïö© Í∞Ä?•Ìïú Î™®Îç∏ Î™©Î°ù Í∞Ä?∏Ïò§Í∏?
  const getAvailableAcuModels = (manufacturer: string): string[] => {
    return acuModelsByManufacturer[manufacturer] || []
  }

  // Í≥†Í∞ù ?∞Ïù¥??Î°úÎìú
  useEffect(() => {
    loadCustomers()
  }, [])

  // ?òÏù¥ÏßÄ ?¨Ïª§????Í≥†Í∞ù Î™©Î°ù ?àÎ°úÍ≥†Ïπ®
  useEffect(() => {
    const handleFocus = () => {
      loadCustomers()
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadCustomers()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const loadCustomers = async () => {
    setIsLoadingCustomers(true)
    try {
      console.log('?îÑ Í≥†Í∞ù ?∞Ïù¥??Î°úÎî© ?úÏûë...')
      const data = await getAllCustomers()
      console.log('??Î°úÎìú??Í≥†Í∞ù ?∞Ïù¥??', data)
      setCustomers(data)
      setFilteredCustomers(data)
    } catch (error) {
      console.error('??Í≥†Í∞ù ?∞Ïù¥??Î°úÎî© ?§Ìå®:', error)
    } finally {
      setIsLoadingCustomers(false)
    }
  }
  
  // ?úÎ°≠?§Ïö¥ ?∏Î? ?¥Î¶≠ Í∞êÏ???ref
  const dropdownRef = useRef<HTMLDivElement>(null)

  // ?ëÏóÖ ?†ÌÉù/?¥Ï†ú ?∏Îì§??
  const handleWorkSelection = (category: string, work: string) => {
    setWorkSelections(prev => {
      const categoryWorks = prev[category] || []
      const isSelected = categoryWorks.includes(work)
      
      let newCategoryWorks
      if (isSelected) {
        // ?†ÌÉù ?¥Ï†ú
        newCategoryWorks = categoryWorks.filter(w => w !== work)
      } else {
        // ?†ÌÉù Ï∂îÍ?
        newCategoryWorks = [...categoryWorks, work]
      }
      
      const newSelections = { ...prev, [category]: newCategoryWorks }
      
      // ?ÑÏû¨ Remapping ?ëÏóÖ???†ÌÉù???ëÏóÖ Î™©Î°ù ?ÖÎç∞?¥Ìä∏ (ECU/ACU Î≥ÑÎ°ú)
      if (category === 'ECU/?úÎãù') {
        setCurrentRemappingWork(prev => ({
          ...prev,
          ecu: {
            ...prev.ecu,
            selectedWorks: newSelections['ECU/?úÎãù']
          }
        }))
      } else if (category === 'ACU/?úÎãù') {
        setCurrentRemappingWork(prev => ({
          ...prev,
          acu: {
            ...prev.acu,
            selectedWorks: newSelections['ACU/?úÎãù']
          }
        }))
      }
      
      return newSelections
    })
  }

  // Ïπ¥ÌÖåÍ≥†Î¶¨ ?ÑÏ≤¥ ?†ÌÉù/?¥Ï†ú
  const handleCategoryToggle = (category: string) => {
    const categoryWorks = TUNING_WORKS_BY_CATEGORY[category as keyof typeof TUNING_WORKS_BY_CATEGORY] || []
    const currentSelections = workSelections[category] || []
    const isAllSelected = categoryWorks.length > 0 && categoryWorks.every(work => currentSelections.includes(work))
    
    setWorkSelections(prev => {
      const newSelections = {
        ...prev,
        [category]: isAllSelected ? [] : [...categoryWorks]
      }
      
      // ?ÑÏû¨ Remapping ?ëÏóÖ???†ÌÉù???ëÏóÖ Î™©Î°ù ?ÖÎç∞?¥Ìä∏ (ECU/ACU Î≥ÑÎ°ú)
      if (category === 'ECU/?úÎãù') {
        setCurrentRemappingWork(prev => ({
          ...prev,
          ecu: {
            ...prev.ecu,
            selectedWorks: newSelections['ECU/?úÎãù']
          }
        }))
      } else if (category === 'ACU/?úÎãù') {
        setCurrentRemappingWork(prev => ({
          ...prev,
          acu: {
            ...prev.acu,
            selectedWorks: newSelections['ACU/?úÎãù']
          }
        }))
      }
      
      return newSelections
    })
  }

  // Remapping ?ëÏóÖ ?ÖÎ†• ?∏Îì§??
  const handleRemappingWorkInputChange = (section: 'ecu' | 'acu' | 'general', field: string, value: string) => {
    if (section === 'general') {
      setCurrentRemappingWork(prev => ({
        ...prev,
        [field]: value
      }))
    } else {
      // Í∏àÏï° ?ÖÎ†• ??ÎßåÏõê ?®ÏúÑÎ•????®ÏúÑÎ°?Î≥Ä??
      if (field === 'price') {
        const priceInWon = value ? parseFloat(value) * 10000 : ''
        setCurrentRemappingWork(prev => ({
          ...prev,
          [section]: {
            ...prev[section],
            [field]: priceInWon.toString()
          }
        }))
        return
      }
      
      setCurrentRemappingWork(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }))
    }
  }

  // ?åÏùº ?ÖÎ†• ?∏Îì§??
  const handleFileChange = (fileType: string, file: File | File[] | null, description?: string) => {
    setCurrentRemappingWork(prev => ({
      ...prev,
      files: {
        ...prev.files,
        ...(file !== null && { [fileType]: file }),
        ...(description !== undefined && { [`${fileType}Description`]: description })
      }
    }))
  }

  // ?åÏùº ?§Î™ÖÎß??ÖÎç∞?¥Ìä∏?òÎäî ?®Ïàò
  const handleFileDescriptionChange = (descriptionField: string, value: string) => {
    setCurrentRemappingWork(prev => ({
      ...prev,
      files: {
        ...prev.files,
        [descriptionField]: value
      }
    }))
  }

  // Remapping ?ëÏóÖ Ï∂îÍ?
  const handleAddRemappingWork = () => {
    // ECU ?êÎäî ACU Ï§?ÏµúÏÜå ?òÎÇò???§Ï†ï?òÏñ¥????
    const hasEcuWork = currentRemappingWork.ecu.toolCategory && currentRemappingWork.ecu.selectedWorks.length > 0
    const hasAcuWork = currentRemappingWork.acu.toolCategory && currentRemappingWork.acu.selectedWorks.length > 0
    
    if (!hasEcuWork && !hasAcuWork) {
      alert('ECU ?êÎäî ACU Ï§?ÏµúÏÜå ?òÎÇò ?¥ÏÉÅ???ëÏóÖ???§Ï†ï?¥Ï£º?∏Ïöî.')
      return
    }

    const newRemappingWork: RemappingWork = {
      id: Date.now(),
      ...currentRemappingWork
    }

    if (isEditingRemapping && editingRemappingId) {
      // ?∏Ïßë Î™®Îìú
      setRemappingWorks(prev => prev.map(work => 
        work.id === editingRemappingId ? newRemappingWork : work
      ))
      setIsEditingRemapping(false)
      setEditingRemappingId(null)
    } else {
      // Ï∂îÍ? Î™®Îìú
      setRemappingWorks(prev => [...prev, newRemappingWork])
    }

    // ?ÑÏû¨ Remapping ?ëÏóÖ Ï¥àÍ∏∞??
    setCurrentRemappingWork({
      ecu: {
        toolCategory: '',
        connectionMethod: '',
        maker: '',
        type: '',
        typeCustom: '',
        selectedWorks: [],
        workDetails: '',
        price: '',
        status: '?àÏïΩ'
      },
      acu: {
        toolCategory: '',
        connectionMethod: '',
        manufacturer: '',
        model: '',
        modelCustom: '',
        selectedWorks: [],
        workDetails: '',
        price: '',
        status: '?àÏïΩ'
      },
      notes: '',
      files: {
        originalFiles: [] as File[],
        originalFileDescription: '',
        stage1File: undefined,
        stage1FileDescription: '',
        stage2File: undefined,
        stage2FileDescription: '',
        stage3File: undefined,
        stage3FileDescription: '',
        acuOriginalFiles: [] as File[],
        acuOriginalFileDescription: '',
        acuStage1File: undefined,
        acuStage1FileDescription: '',
        acuStage2File: undefined,
        acuStage2FileDescription: '',
        acuStage3File: undefined,
        acuStage3FileDescription: '',
        mediaFile1: undefined,
        mediaFile1Description: '',
        mediaFile2: undefined,
        mediaFile2Description: '',
        mediaFile3: undefined,
        mediaFile3Description: '',
        mediaFile4: undefined,
        mediaFile4Description: '',
        mediaFile5: undefined,
        mediaFile5Description: ''
      }
    })

    setWorkSelections({
      'ECU/?úÎãù': [],
      'ACU/?úÎãù': []
    })
  }

  // Remapping ?ëÏóÖ ?∏Ïßë
  const handleEditRemappingWork = (work: RemappingWork) => {
    setCurrentRemappingWork({
      ecu: {
        toolCategory: work.ecu.toolCategory,
        connectionMethod: work.ecu.connectionMethod,
        maker: work.ecu.maker,
        type: work.ecu.type,
        typeCustom: work.ecu.typeCustom,
        selectedWorks: work.ecu.selectedWorks,
        workDetails: work.ecu.workDetails,
        price: work.ecu.price,
        status: work.ecu.status
      },
      acu: {
        toolCategory: work.acu.toolCategory,
        connectionMethod: work.acu.connectionMethod,
        manufacturer: work.acu.manufacturer,
        model: work.acu.model,
        modelCustom: work.acu.modelCustom,
        selectedWorks: work.acu.selectedWorks,
        workDetails: work.acu.workDetails,
        price: work.acu.price,
        status: work.acu.status
      },
      notes: work.notes,
      files: work.files as any
    })

    // ?ëÏóÖ ?†ÌÉù ?ÅÌÉú Î≥µÏõê
    setWorkSelections({
      'ECU/?úÎãù': work.ecu.selectedWorks,
      'ACU/?úÎãù': work.acu.selectedWorks
    })

    setIsEditingRemapping(true)
    setEditingRemappingId(work.id)
  }

  // Remapping ?ëÏóÖ ??†ú
  const handleDeleteRemappingWork = (id: number) => {
    if (confirm('??Remapping ?ëÏóÖ????†ú?òÏãúÍ≤†Ïäµ?àÍπå?')) {
      setRemappingWorks(prev => prev.filter(work => work.id !== id))
    }
  }

  // Remapping ?ëÏóÖ ?∏Ïßë Ï∑®ÏÜå
  const handleCancelRemappingEdit = () => {
    setCurrentRemappingWork({
      ecu: {
        toolCategory: '',
        connectionMethod: '',
        maker: '',
        type: '',
        typeCustom: '',
        selectedWorks: [],
        workDetails: '',
        price: '',
        status: '?àÏïΩ'
      },
      acu: {
        toolCategory: '',
        connectionMethod: '',
        manufacturer: '',
        model: '',
        modelCustom: '',
        selectedWorks: [],
        workDetails: '',
        price: '',
        status: '?àÏïΩ'
      },
      notes: '',
      files: {
        originalFiles: [] as File[],
        originalFileDescription: '',
        stage1File: undefined,
        stage1FileDescription: '',
        stage2File: undefined,
        stage2FileDescription: '',
        stage3File: undefined,
        stage3FileDescription: '',
        acuOriginalFiles: [] as File[],
        acuOriginalFileDescription: '',
        acuStage1File: undefined,
        acuStage1FileDescription: '',
        acuStage2File: undefined,
        acuStage2FileDescription: '',
        acuStage3File: undefined,
        acuStage3FileDescription: '',
        mediaFile1: undefined,
        mediaFile1Description: '',
        mediaFile2: undefined,
        mediaFile2Description: '',
        mediaFile3: undefined,
        mediaFile3Description: '',
        mediaFile4: undefined,
        mediaFile4Description: '',
        mediaFile5: undefined,
        mediaFile5Description: ''
      }
    })

    setWorkSelections({
      'ECU/?úÎãù': [],
      'ACU/?úÎãù': []
    })

    setIsEditingRemapping(false)
    setEditingRemappingId(null)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    // Í∏àÏï° ?ÖÎ†• ??ÎßåÏõê ?®ÏúÑÎ•????®ÏúÑÎ°?Î≥Ä??
    if (name === 'price') {
      const priceInWon = value ? parseFloat(value) * 10000 : ''
      setFormData(prev => ({ ...prev, [name]: priceInWon.toString() }))
      return
    }
    
    setFormData(prev => ({ ...prev, [name]: value }))

    // Í≥†Í∞ùÎ™?Í≤Ä??Ï≤òÎ¶¨
    if (name === 'customerName') {
      if (value.trim() === '') {
        setFilteredCustomers(customers)
        setShowCustomerDropdown(true) // Îπ?Í∞íÏùº ?åÎèÑ ?úÎ°≠?§Ïö¥ ?†Ï?
        // Í≥†Í∞ùÎ™ÖÏù¥ ÎπÑÏñ¥?àÏúºÎ©?Í≥†Í∞ù ID??Ï¥àÍ∏∞??
        setFormData(prev => ({ ...prev, customerId: '', equipmentId: '' }))
        setAvailableEquipment([])
      } else {
        const filtered = customers.filter(customer =>
          customer.name.toLowerCase().includes(value.toLowerCase()) ||
          customer.phone.includes(value) ||
          customer.roadAddress.toLowerCase().includes(value.toLowerCase())
        )
        setFilteredCustomers(filtered)
        setShowCustomerDropdown(true)
      }
    }

    // ?•ÎπÑ ?†ÌÉù Ï≤òÎ¶¨
    if (name === 'equipmentId') {
      setFormData(prev => ({ ...prev, [name]: value }))
    }

    // Í∏∞Ì? ?ÖÎ†• Ï≤òÎ¶¨
    if (!['customerName', 'equipmentId'].includes(name)) {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  // Í≥†Í∞ù ?†ÌÉù Ï≤òÎ¶¨
  const handleCustomerSelect = async (customer: CustomerData) => {
    setFormData(prev => ({
      ...prev,
      customerId: customer.id.toString(),
      customerName: customer.name,
      equipmentId: '' // Í≥†Í∞ù Î≥ÄÍ≤????•ÎπÑ ?†ÌÉù Ï¥àÍ∏∞??
    }))
    setShowCustomerDropdown(false)

    // ?†ÌÉù??Í≥†Í∞ù???•ÎπÑ Î™©Î°ù ?ÖÎç∞?¥Ìä∏ - ?§Ï†ú Supabase ?∞Ïù¥???¨Ïö©
    try {
      const customerEquipment = await getEquipmentByCustomerId(customer.id)
      setAvailableEquipment(customerEquipment)
    } catch (error) {
      console.error('Failed to load customer equipment:', error)
      setAvailableEquipment([])
    }
  }

  // ???úÏ∂ú ?∏Îì§??
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // ?ÑÏàò ?ÑÎìú Í≤ÄÏ¶?
    if (!formData.customerId) {
      alert('Í≥†Í∞ù???†ÌÉù?¥Ï£º?∏Ïöî.')
      return
    }
    
    if (!formData.equipmentId) {
      alert('?•ÎπÑÎ•??†ÌÉù?¥Ï£º?∏Ïöî.')
      return
    }
    
    if (remappingWorks.length === 0) {
      alert('ÏµúÏÜå ?òÎÇò ?¥ÏÉÅ??Remapping ?ëÏóÖ??Ï∂îÍ??¥Ï£º?∏Ïöî.')
      return
    }

    // ?†ÌÉù??Í≥†Í∞ùÍ≥??•ÎπÑ ?ïÎ≥¥ Í∞Ä?∏Ïò§Í∏?
    const selectedCustomer = customers.find(c => c.id.toString() === formData.customerId)
    const selectedEquipment = availableEquipment.find(e => e.id.toString() === formData.equipmentId)
    
    // ?åÏùº??Base64Î°?Î≥Ä?òÌïò???®Ïàò
    const convertFileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          resolve(result.split(',')[1]) // Base64 ?∞Ïù¥?∞Îßå Ï∂îÏ∂ú
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    }

    // ?ëÏóÖ ?¥Î†• ?∞Ïù¥???ùÏÑ± Î∞?Supabase???Ä??(Í∞?Remapping ?ëÏóÖÎ≥ÑÎ°ú Í∞úÎ≥Ñ ?¥Î†• ?ùÏÑ±)
    const workHistoryEntries = []
    
    for (const [index, remappingWork] of remappingWorks.entries()) {
      try {
        // ?åÏùº ?∞Ïù¥??Ï≤òÎ¶¨
        const files: any[] = []
        
        if (remappingWork.files.originalFiles && remappingWork.files.originalFiles.length > 0) {
          for (const originalFile of remappingWork.files.originalFiles) {
            const data = await convertFileToBase64(originalFile)
            files.push({
              name: originalFile.name,
              size: originalFile.size,
              type: originalFile.type,
              data: data,
              description: remappingWork.files.originalFileDescription || '?êÎ≥∏ ECU ?¥Îçî',
              category: 'original',
              uploadDate: new Date().toISOString()
            })
          }
        }

        if (remappingWork.files.stage1File) {
          const data = await convertFileToBase64(remappingWork.files.stage1File)
          files.push({
            name: remappingWork.files.stage1File.name,
            size: remappingWork.files.stage1File.size,
            type: remappingWork.files.stage1File.type,
            data: data,
            description: remappingWork.files.stage1FileDescription || 'Stage 1 ?úÎãù ?åÏùº',
            category: 'stage1',
            uploadDate: new Date().toISOString()
          })
        }

        if (remappingWork.files.stage2File) {
          const data = await convertFileToBase64(remappingWork.files.stage2File)
          files.push({
            name: remappingWork.files.stage2File.name,
            size: remappingWork.files.stage2File.size,
            type: remappingWork.files.stage2File.type,
            data: data,
            description: remappingWork.files.stage2FileDescription || 'Stage 2 ?úÎãù ?åÏùº',
            category: 'stage2',
            uploadDate: new Date().toISOString()
          })
        }

        if (remappingWork.files.stage3File) {
          const data = await convertFileToBase64(remappingWork.files.stage3File)
          files.push({
            name: remappingWork.files.stage3File.name,
            size: remappingWork.files.stage3File.size,
            type: remappingWork.files.stage3File.type,
            data: data,
            description: remappingWork.files.stage3FileDescription || 'Stage 3 ?úÎãù ?åÏùº',
            category: 'stage3',
            uploadDate: new Date().toISOString()
          })
        }

        // ACU ?åÏùº??Ï≤òÎ¶¨
        if (remappingWork.files.acuOriginalFiles && remappingWork.files.acuOriginalFiles.length > 0) {
          for (const acuOriginalFile of remappingWork.files.acuOriginalFiles) {
            const data = await convertFileToBase64(acuOriginalFile)
            files.push({
              name: acuOriginalFile.name,
              size: acuOriginalFile.size,
              type: acuOriginalFile.type,
              data: data,
              description: remappingWork.files.acuOriginalFileDescription || '?êÎ≥∏ ACU ?¥Îçî',
              category: 'acuOriginal',
              uploadDate: new Date().toISOString()
            })
          }
        }

        if (remappingWork.files.acuStage1File) {
          const data = await convertFileToBase64(remappingWork.files.acuStage1File)
          files.push({
            name: remappingWork.files.acuStage1File.name,
            size: remappingWork.files.acuStage1File.size,
            type: remappingWork.files.acuStage1File.type,
            data: data,
            description: remappingWork.files.acuStage1FileDescription || 'ACU Stage 1 ?úÎãù ?åÏùº',
            category: 'acuStage1',
            uploadDate: new Date().toISOString()
          })
        }

        if (remappingWork.files.acuStage2File) {
          const data = await convertFileToBase64(remappingWork.files.acuStage2File)
          files.push({
            name: remappingWork.files.acuStage2File.name,
            size: remappingWork.files.acuStage2File.size,
            type: remappingWork.files.acuStage2File.type,
            data: data,
            description: remappingWork.files.acuStage2FileDescription || 'ACU Stage 2 ?úÎãù ?åÏùº',
            category: 'acuStage2',
            uploadDate: new Date().toISOString()
          })
        }

        if (remappingWork.files.acuStage3File) {
          const data = await convertFileToBase64(remappingWork.files.acuStage3File)
          files.push({
            name: remappingWork.files.acuStage3File.name,
            size: remappingWork.files.acuStage3File.size,
            type: remappingWork.files.acuStage3File.type,
            data: data,
            description: remappingWork.files.acuStage3FileDescription || 'ACU Stage 3 ?úÎãù ?åÏùº',
            category: 'acuStage3',
            uploadDate: new Date().toISOString()
          })
        }

        // ÎØ∏Îîî???åÏùº??Ï≤òÎ¶¨ (5Í∞?
        for (let i = 1; i <= 5; i++) {
          const mediaFileKey = `mediaFile${i}` as keyof typeof remappingWork.files
          const mediaDescKey = `mediaFile${i}Description` as keyof typeof remappingWork.files
          const mediaFile = remappingWork.files[mediaFileKey] as File | undefined
          const mediaDesc = remappingWork.files[mediaDescKey] as string | undefined
          
          if (mediaFile) {
            const data = await convertFileToBase64(mediaFile)
            files.push({
              name: mediaFile.name,
              size: mediaFile.size,
              type: mediaFile.type,
              data: data,
              description: mediaDesc || `ÎØ∏Îîî???åÏùº ${i}`,
              category: `media${i}`,
              uploadDate: new Date().toISOString()
            })
          }
        }

        // Supabase???Ä?•Ìï† ?ëÏóÖ Í∏∞Î°ù ?∞Ïù¥???ùÏÑ±
        const allSelectedWorks = [...remappingWork.ecu.selectedWorks, ...remappingWork.acu.selectedWorks]
        const workDescription = allSelectedWorks.join(', ') + 
          (remappingWork.ecu.workDetails ? ` - ECU: ${remappingWork.ecu.workDetails}` : '') +
          (remappingWork.acu.workDetails ? ` - ACU: ${remappingWork.acu.workDetails}` : '')
        
        const workRecordData: Omit<WorkRecordData, 'id' | 'createdAt' | 'updatedAt'> = {
          customerId: parseInt(formData.customerId),
          equipmentId: parseInt(formData.equipmentId),
          workDate: formData.workDate,
          workType: 'ECU ?úÎãù',
          workDescription: workDescription,
          ecuModel: remappingWork.ecu.type || remappingWork.ecu.typeCustom,
          ecuMaker: remappingWork.ecu.maker || '',
          acuManufacturer: remappingWork.acu.manufacturer || '',
          acuModel: remappingWork.acu.model || remappingWork.acu.modelCustom || '',
          connectionMethod: remappingWork.ecu.connectionMethod || remappingWork.acu.connectionMethod,
          toolsUsed: [remappingWork.ecu.toolCategory, remappingWork.acu.toolCategory].filter(Boolean),
          price: (parseFloat(remappingWork.ecu.price) || 0) + (parseFloat(remappingWork.acu.price) || 0),
          status: remappingWork.ecu.status || remappingWork.acu.status,
          files: files
        }

        // Supabase???ëÏóÖ Í∏∞Î°ù ?Ä??
        const savedRecord = await createWorkRecord(workRecordData)
        
        if (savedRecord) {
          workHistoryEntries.push(savedRecord)
          console.log(`???ëÏóÖ Í∏∞Î°ù ${index + 1} ?Ä???ÑÎ£å:`, savedRecord)
        } else {
          console.error(`???ëÏóÖ Í∏∞Î°ù ${index + 1} ?Ä???§Ìå®`)
          alert(`?ëÏóÖ Í∏∞Î°ù ${index + 1} ?Ä??Ï§??§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§.`)
        }
      } catch (error) {
        console.error(`???ëÏóÖ Í∏∞Î°ù ${index + 1} Ï≤òÎ¶¨ Ï§??§Î•ò:`, error)
        alert(`?ëÏóÖ Í∏∞Î°ù ${index + 1} Ï≤òÎ¶¨ Ï§??§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§.`)
      }
    }
    
    console.log('=== ?ëÏóÖ ?±Î°ù ?îÎ≤ÑÍπ?===')
    console.log('remappingWorks Î∞∞Ïó¥:', remappingWorks)
    console.log('remappingWorks.length:', remappingWorks.length)
    console.log('Supabase???Ä?•Îêú workHistoryEntries:', workHistoryEntries)
    console.log('workHistoryEntries.length:', workHistoryEntries.length)
    console.log('=== ?îÎ≤ÑÍπ???===')
    
    const allWorks = remappingWorks.flatMap(work => [...work.ecu.selectedWorks, ...work.acu.selectedWorks])
    
    // ?Ä???±Í≥µ ?¨Î? ?ïÏù∏
    if (workHistoryEntries.length === 0) {
      alert('?ëÏóÖ ?±Î°ù Ï§??§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§. ?§Ïãú ?úÎèÑ?¥Ï£º?∏Ïöî.')
      return
    }
    
    // ?¨Ïö©?êÏóêÍ≤??ëÏóÖ?¥Î†• ?òÏù¥ÏßÄÎ°??¥Îèô?†Ï? ?ïÏù∏
    const goToHistory = confirm(`?ëÏóÖ???±Í≥µ?ÅÏúºÎ°??±Î°ù?òÏóà?µÎãà??\nÏ¥?${workHistoryEntries.length}Í∞úÏùò ?ëÏóÖ ?¥Î†•??Supabase???Ä?•Îêò?àÏäµ?àÎã§.\n(${remappingWorks.length}Í∞úÏùò Remapping ?ëÏóÖ)\n?†ÌÉù???ëÏóÖ: ${allWorks.join(', ')}\n\n?ëÏóÖ?¥Î†• ?òÏù¥ÏßÄÎ°??¥Îèô?òÏãúÍ≤†Ïäµ?àÍπå?`)
    
    if (goToHistory) {
      router.push('/history')
      return
    }
    
    // ??Ï¥àÍ∏∞??
    setFormData({
      customerId: '',
      customerName: '',
      equipmentId: '',
      workDate: getTodayDate(),
      price: '',
      status: '?àÏïΩ'
    })
    
    setRemappingWorks([])
    setCurrentRemappingWork({
      ecu: {
        toolCategory: '',
        connectionMethod: '',
        maker: '',
        type: '',
        typeCustom: '',
        selectedWorks: [],
        workDetails: '',
        price: '',
        status: '?àÏïΩ'
      },
      acu: {
        toolCategory: '',
        connectionMethod: '',
        manufacturer: '',
        model: '',
        modelCustom: '',
        selectedWorks: [],
        workDetails: '',
        price: '',
        status: '?àÏïΩ'
      },
      notes: '',
      files: {
        originalFiles: [] as File[],
        originalFileDescription: '',
        stage1File: undefined,
        stage1FileDescription: '',
        stage2File: undefined,
        stage2FileDescription: '',
        stage3File: undefined,
        stage3FileDescription: '',
        acuOriginalFiles: [] as File[],
        acuOriginalFileDescription: '',
        acuStage1File: undefined,
        acuStage1FileDescription: '',
        acuStage2File: undefined,
        acuStage2FileDescription: '',
        acuStage3File: undefined,
        acuStage3FileDescription: '',
        mediaFile1: undefined,
        mediaFile1Description: '',
        mediaFile2: undefined,
        mediaFile2Description: '',
        mediaFile3: undefined,
        mediaFile3Description: '',
        mediaFile4: undefined,
        mediaFile4Description: '',
        mediaFile5: undefined,
        mediaFile5Description: ''
      }
    })
    
    setWorkSelections({
      'ECU/?úÎãù': [],
      'ACU/?úÎãù': []
    })
    
    setIsEditingRemapping(false)
    setEditingRemappingId(null)
    
    setAvailableEquipment([])
  }

  // ?åÏùº URL ?ïÎ¶¨ (Î©îÎ™®Î¶??ÑÏàò Î∞©Ï?)
  useEffect(() => {
    return () => {
      // Ïª¥Ìè¨?åÌä∏ ?∏Îßà?¥Ìä∏ ???ùÏÑ±??URL???ïÎ¶¨
      for (let i = 1; i <= 5; i++) {
        const fileKey = `mediaFile${i}` as keyof typeof currentRemappingWork.files
        const file = currentRemappingWork.files[fileKey] as File | undefined
        if (file) {
          URL.revokeObjectURL(URL.createObjectURL(file))
        }
      }
    }
  }, [currentRemappingWork.files])

  // ?∏Î? ?¥Î¶≠ ???úÎ°≠?§Ïö¥ ?´Í∏∞
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowCustomerDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-900">
        <Navigation />
        <main className="pt-20 pb-8">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-6">
        {/* ?òÏù¥ÏßÄ ?§Îçî */}
        <div>
          <h1 className="text-3xl font-bold text-white">?ëÏóÖ ?±Î°ù</h1>
          <p className="mt-2 text-gray-300">
            ?àÎ°ú??ECU ?úÎãù ?ëÏóÖ???±Î°ù?òÍ≥† Í¥ÄÎ¶¨Ìï©?àÎã§.
          </p>
        </div>

        {/* ?ëÏóÖ ?±Î°ù ??*/}
        <div className="bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-white mb-6">???ëÏóÖ ?±Î°ù</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Í≥†Í∞ù Î∞??•ÎπÑ ?ïÎ≥¥ */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="relative" ref={dropdownRef}>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Í≥†Í∞ù ?†ÌÉù *
              </label>
              <input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleInputChange}
                onFocus={() => {
                  // ?¨Ïª§?????ÑÏ≤¥ Í≥†Í∞ù Î™©Î°ù ?úÏãú
                  setFilteredCustomers(customers)
                  setShowCustomerDropdown(true)
                }}
                className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Í≥†Í∞ù???†ÌÉù?òÍ±∞??Í≤Ä?âÌïò?∏Ïöî..."
                required
                autoComplete="off"
                style={{ imeMode: 'active' }}
                lang="ko"
              />
              
              {/* Í≥†Í∞ù ?êÎèô?ÑÏÑ± ?úÎ°≠?§Ïö¥ */}
              {showCustomerDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-gray-700 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                  {isLoadingCustomers ? (
                    <div className="px-4 py-3 text-gray-400 text-center">
                      Í≥†Í∞ù ?∞Ïù¥??Î°úÎî© Ï§?..
                    </div>
                  ) : filteredCustomers.length > 0 ? (
                    <>
                      {formData.customerName.trim() === '' && (
                        <div className="px-4 py-2 bg-gray-600 text-sm text-gray-300 border-b border-gray-600">
                          ?ÑÏ≤¥ Í≥†Í∞ù Î™©Î°ù ({filteredCustomers.length}Î™?
                        </div>
                      )}
                      {filteredCustomers.map((customer) => (
                        <div
                          key={customer.id}
                          onClick={() => handleCustomerSelect(customer)}
                          className="px-4 py-3 hover:bg-gray-600 cursor-pointer border-b border-gray-600 last:border-b-0"
                        >
                          <div className="font-medium text-white">{customer.name}</div>
                          <div className="text-sm text-gray-300">{customer.phone}</div>
                          <div className="text-xs text-gray-400">{customer.roadAddress}</div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="px-4 py-3 text-gray-400 text-center">
                      {formData.customerName.trim() === '' ? 'Í≥†Í∞ù ?∞Ïù¥?∞Î? Î∂àÎü¨?§Ï? Î™ªÌñà?µÎãà??' : 'Í≤Ä??Í≤∞Í≥ºÍ∞Ä ?ÜÏäµ?àÎã§.'}
                    </div>
                  )}
                </div>
              )}


              {formData.customerId && (
                <div className="mt-2 p-3 bg-blue-900 rounded-md">
                  <p className="text-sm text-blue-300">
                    ?ìç {customers.find(c => c.id.toString() === formData.customerId)?.roadAddress}
                  </p>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                ?•ÎπÑ ?†ÌÉù *
              </label>
              <select
                name="equipmentId"
                value={formData.equipmentId}
                onChange={handleInputChange}
                className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={!formData.customerId}
              >
                <option value="">
                  {formData.customerId ? '?•ÎπÑÎ•??†ÌÉù?òÏÑ∏?? : 'Î®ºÏ? Í≥†Í∞ù???†ÌÉù?òÏÑ∏??}
                </option>
                {availableEquipment.map((equipment) => (
                  <option key={equipment.id} value={equipment.id}>
                    {equipment.equipmentType} - {equipment.manufacturer} {equipment.model}
                  </option>
                ))}
              </select>
              {formData.equipmentId && (
                <div className="mt-2 p-3 bg-green-900 rounded-md">
                  <p className="text-sm text-green-300">
                    ?öú {availableEquipment.find(e => e.id.toString() === formData.equipmentId)?.serialNumber}
                  </p>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                ?ëÏóÖ ?†Ïßú *
              </label>
              <input
                type="date"
                name="workDate"
                value={formData.workDate}
                onChange={handleInputChange}
                className="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* ?±Î°ù??Remapping ?ëÏóÖ Î™©Î°ù */}
          {remappingWorks.length > 0 && (
            <div className="border-t border-gray-600 pt-6">
              <h3 className="text-lg font-medium text-white mb-4">?±Î°ù??Remapping ?ëÏóÖ ({remappingWorks.length}Í∞?</h3>
              <div className="space-y-4">
                {remappingWorks.map((work, index) => (
                  <div key={work.id} className="bg-gray-700 border border-gray-600 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-white">Remapping #{index + 1}</h4>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* ECU/?úÎãù ?πÏÖò */}
                          <div className="space-y-3">
                            <h5 className="font-medium text-blue-300">?îß ECU/?úÎãù</h5>
                            
                            {/* 1. ?úÏ°∞??Î™®Îç∏Î™?(?åÎ???Î∞ïÏä§) */}
                            <div className="bg-blue-100 border border-blue-300 rounded-lg p-3">
                              <div className="text-sm font-medium text-blue-900">
                                {work.ecu.maker && work.ecu.type ? (
                                  `${work.ecu.maker} - ${work.ecu.type}`
                                ) : work.ecu.maker ? (
                                  work.ecu.maker
                                ) : work.ecu.type ? (
                                  work.ecu.type
                                ) : (
                                  <span className="text-blue-500 italic">?úÏ°∞??Î™®Îç∏Î™?ÎØ∏ÏÑ§??/span>
                                )}
                              </div>
                              {work.ecu.typeCustom && (
                                <div className="text-xs text-blue-700 mt-1">
                                  Ï∂îÍ?: {work.ecu.typeCustom}
                                </div>
                              )}
                            </div>
                            
                            {/* 2. ?ëÏóÖ?¥Ïö© */}
                            <div className="bg-blue-900 border border-blue-700 rounded-lg p-3">
                              <div className="text-xs font-medium text-blue-300 mb-2">?ëÏóÖ?¥Ïö©</div>
                              <div className="flex flex-wrap gap-1">
                                {work.ecu.selectedWorks && work.ecu.selectedWorks.length > 0 ? (
                                  work.ecu.selectedWorks.map((workName, idx) => (
                                    <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-200 text-blue-300">
                                      {workName}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-blue-500 italic">?ëÏóÖ?¥Ïö© ÎØ∏ÏÑ§??/span>
                                )}
                              </div>
                              {work.ecu.workDetails && (
                                <div className="mt-2 text-xs text-blue-700">
                                  <span className="font-medium">?ÅÏÑ∏:</span> {work.ecu.workDetails}
                                </div>
                              )}
                            </div>
                            
                            {/* 3. ?∞Í≤∞Î∞©Î≤ï */}
                            <div className="bg-blue-900 border border-blue-700 rounded-lg p-3">
                              <div className="text-xs font-medium text-blue-300 mb-1">?∞Í≤∞Î∞©Î≤ï</div>
                              <div className="text-sm text-blue-900">
                                {work.ecu.connectionMethod || <span className="text-blue-500 italic">?∞Í≤∞Î∞©Î≤ï ÎØ∏ÏÑ§??/span>}
                              </div>
                            </div>
                            
                            {/* Ï∂îÍ? ?ïÎ≥¥ */}
                            <div className="text-xs text-gray-400 space-y-1">
                              {work.ecu.toolCategory && <div><span className="font-medium">Ïπ¥ÌÖåÍ≥†Î¶¨:</span> {work.ecu.toolCategory}</div>}
                              {work.ecu.price && <div><span className="font-medium">Í∏àÏï°:</span> {(parseFloat(work.ecu.price) / 10000).toFixed(1)}ÎßåÏõê</div>}
                              {work.ecu.status && <div><span className="font-medium">?ÅÌÉú:</span> <span className={`px-2 py-1 rounded-full text-xs ${work.ecu.status === '?ÑÎ£å' ? 'bg-green-100 text-green-300' : work.ecu.status === 'ÏßÑÌñâÏ§? ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{work.ecu.status}</span></div>}
                            </div>
                          </div>

                          {/* ACU/?úÎãù ?πÏÖò */}
                          <div className="space-y-3">
                            <h5 className="font-medium text-green-300">?ôÔ∏è ACU/?úÎãù</h5>
                            
                            {/* 1. ?úÏ°∞??Î™®Îç∏Î™?(Ï¥àÎ°ù??Î∞ïÏä§) */}
                            <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                              <div className="text-sm font-medium text-green-900">
                                {work.acu.manufacturer && work.acu.model ? (
                                  `${work.acu.manufacturer} - ${work.acu.model}`
                                ) : work.acu.manufacturer ? (
                                  work.acu.manufacturer
                                ) : work.acu.model ? (
                                  work.acu.model
                                ) : (
                                  <span className="text-green-500 italic">?úÏ°∞??Î™®Îç∏Î™?ÎØ∏ÏÑ§??/span>
                                )}
                              </div>
                              {work.acu.modelCustom && (
                                <div className="text-xs text-green-700 mt-1">
                                  Ï∂îÍ?: {work.acu.modelCustom}
                                </div>
                              )}
                            </div>
                            
                            {/* 2. ?ëÏóÖ?¥Ïö© */}
                            <div className="bg-green-900 border border-green-700 rounded-lg p-3">
                              <div className="text-xs font-medium text-green-300 mb-2">?ëÏóÖ?¥Ïö©</div>
                              <div className="flex flex-wrap gap-1">
                                {work.acu.selectedWorks && work.acu.selectedWorks.length > 0 ? (
                                  work.acu.selectedWorks.map((workName, idx) => (
                                    <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-200 text-green-300">
                                      {workName}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-green-500 italic">?ëÏóÖ?¥Ïö© ÎØ∏ÏÑ§??/span>
                                )}
                              </div>
                              {work.acu.workDetails && (
                                <div className="mt-2 text-xs text-green-700">
                                  <span className="font-medium">?ÅÏÑ∏:</span> {work.acu.workDetails}
                                </div>
                              )}
                            </div>
                            
                            {/* 3. ?∞Í≤∞Î∞©Î≤ï */}
                            <div className="bg-green-900 border border-green-700 rounded-lg p-3">
                              <div className="text-xs font-medium text-green-300 mb-1">?∞Í≤∞Î∞©Î≤ï</div>
                              <div className="text-sm text-green-900">
                                {work.acu.connectionMethod || <span className="text-green-500 italic">?∞Í≤∞Î∞©Î≤ï ÎØ∏ÏÑ§??/span>}
                              </div>
                            </div>
                            
                            {/* Ï∂îÍ? ?ïÎ≥¥ */}
                            <div className="text-xs text-gray-400 space-y-1">
                              {work.acu.toolCategory && <div><span className="font-medium">Ïπ¥ÌÖåÍ≥†Î¶¨:</span> {work.acu.toolCategory}</div>}
                              {work.acu.price && <div><span className="font-medium">Í∏àÏï°:</span> {(parseFloat(work.acu.price) / 10000).toFixed(1)}ÎßåÏõê</div>}
                              {work.acu.status && <div><span className="font-medium">?ÅÌÉú:</span> <span className={`px-2 py-1 rounded-full text-xs ${work.acu.status === '?ÑÎ£å' ? 'bg-green-100 text-green-300' : work.acu.status === 'ÏßÑÌñâÏ§? ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{work.acu.status}</span></div>}
                            </div>
                          </div>
                        </div>

                        {work.notes && (
                          <div className="mt-2">
                            <span className="font-medium text-gray-300">Î©îÎ™®:</span>
                            <p className="text-sm text-gray-400 mt-1">{work.notes}</p>
                          </div>
                        )}
                        {/* Ï≤®Î? ?åÏùº ?ïÎ≥¥ */}
                        <div className="mt-3">
                                                      <span className="font-medium text-gray-300">Ï≤®Î? ?åÏùº:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {/* ECU ?åÏùº??*/}
                            {work.files.originalFiles && work.files.originalFiles.length > 0 && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-300">?îß ECU?êÎ≥∏({work.files.originalFiles.length})</span>}
                            {work.files.stage1File && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-200 text-blue-900">?îß ECU Stage1</span>}
                            {work.files.stage2File && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-300 text-blue-900">?îß ECU Stage2</span>}
                            {work.files.stage3File && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-400 text-blue-900">?îß ECU Stage3</span>}
                            
                            {/* ACU ?åÏùº??*/}
                            {work.files.acuOriginalFiles && work.files.acuOriginalFiles.length > 0 && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-300">?ôÔ∏è ACU?êÎ≥∏({work.files.acuOriginalFiles.length})</span>}
                            {work.files.acuStage1File && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-200 text-green-900">?ôÔ∏è ACU Stage1</span>}
                            {work.files.acuStage2File && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-300 text-green-900">?ôÔ∏è ACU Stage2</span>}
                            {work.files.acuStage3File && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-400 text-green-900">?ôÔ∏è ACU Stage3</span>}
                            
                            {/* ÎØ∏Îîî???åÏùº???úÏãú */}
                            {(() => {
                              const mediaCount = [1, 2, 3, 4, 5].filter(i => {
                                const fileKey = `mediaFile${i}` as keyof typeof work.files
                                return work.files[fileKey]
                              }).length
                              return mediaCount > 0 && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">?ì∑ ÎØ∏Îîî??{mediaCount})</span>
                            })()}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          type="button"
                          onClick={() => handleEditRemappingWork(work)}
                          className="text-blue-600 hover:text-blue-300 text-sm font-medium"
                        >
                          ?∏Ïßë
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRemappingWork(work.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          ??†ú
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Remapping ?ëÏóÖ Ï∂îÍ?/?∏Ïßë */}
          <div className="border-t border-gray-600 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-white">
                {isEditingRemapping ? 'Remapping ?∏Ïßë' : 'Remapping Ï∂îÍ?'}
              </h3>
              {isEditingRemapping && (
                <button
                  type="button"
                  onClick={handleCancelRemappingEdit}
                  className="text-gray-400 hover:text-gray-200 text-sm"
                >
                  ?∏Ïßë Ï∑®ÏÜå
                </button>
              )}
            </div>
            
            <div className="space-y-6">
              {/* ECU ?πÏÖò */}
              <div className="bg-blue-900 border border-blue-700 rounded-lg p-6">
                <h4 className="text-lg font-medium text-blue-300 mb-4">?îß ECU ?ïÎ≥¥</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ECU ?•ÎπÑ Ïπ¥ÌÖåÍ≥†Î¶¨
                    </label>
                    <select
                      value={currentRemappingWork.ecu.toolCategory}
                      onChange={(e) => handleRemappingWorkInputChange('ecu', 'toolCategory', e.target.value)}
                      className="w-full border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">?•ÎπÑ Ïπ¥ÌÖåÍ≥†Î¶¨Î•??†ÌÉù?òÏÑ∏??/option>
                      {ECU_TOOL_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ?∞Í≤∞ Î∞©Î≤ï
                    </label>
                    <select
                      value={currentRemappingWork.ecu.connectionMethod}
                      onChange={(e) => handleRemappingWorkInputChange('ecu', 'connectionMethod', e.target.value)}
                      className="w-full border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">?∞Í≤∞ Î∞©Î≤ï???†ÌÉù?òÏÑ∏??/option>
                      {CONNECTION_METHODS.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ECU ?úÏ°∞??
                    </label>
                    <select
                      value={currentRemappingWork.ecu.maker}
                      onChange={(e) => handleRemappingWorkInputChange('ecu', 'maker', e.target.value)}
                      className="w-full border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">ECU ?úÏ°∞?¨Î? ?†ÌÉù?òÏÑ∏??/option>
                      {ECU_MAKERS.map((maker) => (
                        <option key={maker} value={maker}>
                          {maker}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-300">
                        ECU Î™®Îç∏
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowEcuManagement(true)}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                        title="ECU Î™®Îç∏ Í¥ÄÎ¶?
                      >
                        Í¥ÄÎ¶?
                      </button>
                    </div>
                    <select
                      value={currentRemappingWork.ecu.type}
                      onChange={(e) => handleRemappingWorkInputChange('ecu', 'type', e.target.value)}
                      className="w-full border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">ECU Î™®Îç∏???†ÌÉù?òÏÑ∏??/option>
                      {ecuModels.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <div className="mt-2 flex space-x-2">
                      <input
                        type="text"
                        value={currentRemappingWork.ecu.typeCustom}
                        onChange={(e) => handleRemappingWorkInputChange('ecu', 'typeCustom', e.target.value)}
                        className="flex-1 border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="?àÎ°ú??ECU Î™®Îç∏???ÖÎ†•?òÏó¨ Î™©Î°ù??Ï∂îÍ?"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (currentRemappingWork.ecu.typeCustom.trim()) {
                            addNewEcuType(currentRemappingWork.ecu.typeCustom.trim())
                            handleRemappingWorkInputChange('ecu', 'type', currentRemappingWork.ecu.typeCustom.trim())
                            handleRemappingWorkInputChange('ecu', 'typeCustom', '')
                          }
                        }}
                        className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
                        title="Î™©Î°ù??Ï∂îÍ??òÍ≥† ?†ÌÉù"
                      >
                        Ï∂îÍ?
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ECU ?ëÏóÖ ?ÅÌÉú
                    </label>
                    <select
                      value={currentRemappingWork.ecu.status}
                      onChange={(e) => handleRemappingWorkInputChange('ecu', 'status', e.target.value)}
                      className="w-full border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      {WORK_STATUS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ECU ?ëÏóÖ Í∏àÏï° (ÎßåÏõê)
                    </label>
                    <input
                      type="number"
                      value={currentRemappingWork.ecu.price ? (parseFloat(currentRemappingWork.ecu.price) / 10000).toString() : ''}
                      onChange={(e) => handleRemappingWorkInputChange('ecu', 'price', e.target.value)}
                      className="w-full border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="35 (35ÎßåÏõê)"
                      min="0"
                      step="0.1"
                    />
                  </div>
                </div>

                {/* ECU ?ëÏóÖ ?ÅÏÑ∏ ?ïÎ≥¥ */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    ECU ?ëÏóÖ ?ÅÏÑ∏ ?ïÎ≥¥
                  </label>
                  <textarea
                    value={currentRemappingWork.ecu.workDetails}
                    onChange={(e) => handleRemappingWorkInputChange('ecu', 'workDetails', e.target.value)}
                    rows={3}
                    className="w-full border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ECU ?ëÏóÖ ?¥Ïö©, ?πÏù¥?¨Ìï≠, Ï£ºÏùò?¨Ìï≠ ?±ÏùÑ ?ÅÏÑ∏???ÖÎ†•?òÏÑ∏??.."
                  />
                </div>
              </div>

              {/* ACU ?πÏÖò */}
              <div className="bg-green-900 border border-green-700 rounded-lg p-6">
                <h4 className="text-lg font-medium text-green-300 mb-4">?ôÔ∏è ACU ?ïÎ≥¥</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ACU ?•ÎπÑ Ïπ¥ÌÖåÍ≥†Î¶¨
                    </label>
                    <select
                      value={currentRemappingWork.acu.toolCategory}
                      onChange={(e) => handleRemappingWorkInputChange('acu', 'toolCategory', e.target.value)}
                      className="w-full border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">?•ÎπÑ Ïπ¥ÌÖåÍ≥†Î¶¨Î•??†ÌÉù?òÏÑ∏??/option>
                      {ECU_TOOL_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ?∞Í≤∞ Î∞©Î≤ï
                    </label>
                    <select
                      value={currentRemappingWork.acu.connectionMethod}
                      onChange={(e) => handleRemappingWorkInputChange('acu', 'connectionMethod', e.target.value)}
                      className="w-full border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">?∞Í≤∞ Î∞©Î≤ï???†ÌÉù?òÏÑ∏??/option>
                      {CONNECTION_METHODS.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ACU ?úÏ°∞??
                    </label>
                    <select
                      value={currentRemappingWork.acu.manufacturer}
                      onChange={(e) => handleRemappingWorkInputChange('acu', 'manufacturer', e.target.value)}
                      className="w-full border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">ACU ?úÏ°∞?¨Î? ?†ÌÉù?òÏÑ∏??/option>
                      {ACU_MANUFACTURERS.map((manufacturer) => (
                        <option key={manufacturer} value={manufacturer}>
                          {manufacturer}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-300">
                        ACU Î™®Îç∏
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAcuManagement(true)}
                        className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                        title="ACU ?Ä??Í¥ÄÎ¶?
                      >
                        Í¥ÄÎ¶?
                      </button>
                    </div>
                    <select
                      value={currentRemappingWork.acu.model}
                      onChange={(e) => handleRemappingWorkInputChange('acu', 'model', e.target.value)}
                      className="w-full border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                      disabled={!currentRemappingWork.acu.manufacturer}
                    >
                      <option value="">
                        {currentRemappingWork.acu.manufacturer ? 'ACU Î™®Îç∏???†ÌÉù?òÏÑ∏?? : 'Î®ºÏ? ?úÏ°∞?¨Î? ?†ÌÉù?òÏÑ∏??}
                      </option>
                      {currentRemappingWork.acu.manufacturer && getAvailableAcuModels(currentRemappingWork.acu.manufacturer).map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                    <div className="mt-2 flex space-x-2">
                      <input
                        type="text"
                        value={currentRemappingWork.acu.modelCustom}
                        onChange={(e) => handleRemappingWorkInputChange('acu', 'modelCustom', e.target.value)}
                        className="flex-1 border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                        placeholder="?àÎ°ú??ACU Î™®Îç∏???ÖÎ†•?òÏó¨ Î™©Î°ù??Ï∂îÍ?"
                        disabled={!currentRemappingWork.acu.manufacturer}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (currentRemappingWork.acu.modelCustom.trim() && currentRemappingWork.acu.manufacturer) {
                            addNewAcuModel(currentRemappingWork.acu.manufacturer, currentRemappingWork.acu.modelCustom.trim())
                            handleRemappingWorkInputChange('acu', 'model', currentRemappingWork.acu.modelCustom.trim())
                            handleRemappingWorkInputChange('acu', 'modelCustom', '')
                          }
                        }}
                        disabled={!currentRemappingWork.acu.manufacturer || !currentRemappingWork.acu.modelCustom.trim()}
                        className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm whitespace-nowrap disabled:bg-gray-400 disabled:cursor-not-allowed"
                        title="Î™©Î°ù??Ï∂îÍ??òÍ≥† ?†ÌÉù"
                      >
                        Ï∂îÍ?
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ACU ?ëÏóÖ ?ÅÌÉú
                    </label>
                    <select
                      value={currentRemappingWork.acu.status}
                      onChange={(e) => handleRemappingWorkInputChange('acu', 'status', e.target.value)}
                      className="w-full border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                    >
                      {WORK_STATUS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ACU ?ëÏóÖ Í∏àÏï° (ÎßåÏõê)
                    </label>
                    <input
                      type="number"
                      value={currentRemappingWork.acu.price ? (parseFloat(currentRemappingWork.acu.price) / 10000).toString() : ''}
                      onChange={(e) => handleRemappingWorkInputChange('acu', 'price', e.target.value)}
                      className="w-full border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                      placeholder="25 (25ÎßåÏõê)"
                      min="0"
                      step="0.1"
                    />
                  </div>
                </div>

                {/* ACU ?ëÏóÖ ?ÅÏÑ∏ ?ïÎ≥¥ */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    ACU ?ëÏóÖ ?ÅÏÑ∏ ?ïÎ≥¥
                  </label>
                  <textarea
                    value={currentRemappingWork.acu.workDetails}
                    onChange={(e) => handleRemappingWorkInputChange('acu', 'workDetails', e.target.value)}
                    rows={3}
                    className="w-full border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                    placeholder="ACU ?ëÏóÖ ?¥Ïö©, ?πÏù¥?¨Ìï≠, Ï£ºÏùò?¨Ìï≠ ?±ÏùÑ ?ÅÏÑ∏???ÖÎ†•?òÏÑ∏??.."
                  />
                </div>
              </div>

              {/* Í≥µÌÜµ ?ïÎ≥¥ ?πÏÖò */}
              <div className="bg-gray-700 border border-gray-600 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-800 mb-4">?ìù Í≥µÌÜµ ?ïÎ≥¥</h4>
                
                {/* ?ëÏóÖ Î©îÎ™® */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    ?ëÏóÖ Î©îÎ™®
                  </label>
                  <textarea
                    value={currentRemappingWork.notes}
                    onChange={(e) => handleRemappingWorkInputChange('general', 'notes', e.target.value)}
                    rows={2}
                    className="w-full border-gray-600 rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500"
                    placeholder="??Remapping ?ëÏóÖ???Ä??Í∞ÑÎã®??Î©îÎ™®Î•??ÖÎ†•?òÏÑ∏??.."
                  />
                </div>

                {/* ?úÎãù ?ëÏóÖ ?†ÌÉù */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-4">
                    ?úÎãù ?ëÏóÖ ?†ÌÉù (?§Ï§ë ?†ÌÉù Í∞Ä??
                  </label>
                  
                  {/* ?†ÌÉù???ëÏóÖ ?îÏïΩ */}
                  {(currentRemappingWork.ecu.selectedWorks.length > 0 || currentRemappingWork.acu.selectedWorks.length > 0) && (
                    <div className="mb-4 p-3 bg-gray-700 rounded-lg border border-gray-600">
                      <div className="text-sm font-medium text-white mb-2">
                        ?†ÌÉù???ëÏóÖ (ECU: {currentRemappingWork.ecu.selectedWorks.length}Í∞? ACU: {currentRemappingWork.acu.selectedWorks.length}Í∞?:
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <div className="text-xs font-medium text-blue-300 mb-1">?îß ECU ?ëÏóÖ:</div>
                          <div className="flex flex-wrap gap-1">
                            {currentRemappingWork.ecu.selectedWorks.map((work, index) => (
                              <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-300">
                                {work}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-green-300 mb-1">?ôÔ∏è ACU ?ëÏóÖ:</div>
                          <div className="flex flex-wrap gap-1">
                            {currentRemappingWork.acu.selectedWorks.map((work, index) => (
                              <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-300">
                                {work}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Ïπ¥ÌÖåÍ≥†Î¶¨Î≥??ëÏóÖ ?†ÌÉù */}
                  <div className="space-y-4">
                    {TUNING_CATEGORIES.map((category) => {
                      const categoryWorks = TUNING_WORKS_BY_CATEGORY[category as keyof typeof TUNING_WORKS_BY_CATEGORY] || []
                      const selectedInCategory = workSelections[category] || []
                      const isAllSelected = categoryWorks.length > 0 && categoryWorks.every(work => selectedInCategory.includes(work))
                      const isPartialSelected = selectedInCategory.length > 0 && !isAllSelected
                      const borderColor = category === 'ECU/?úÎãù' ? 'border-blue-700' : 'border-green-700'
                      const bgColor = category === 'ECU/?úÎãù' ? 'bg-blue-900' : 'bg-green-900'
                      const textColor = category === 'ECU/?úÎãù' ? 'text-blue-300' : 'text-green-300'
                      
                      return (
                        <div key={category} className={`border ${borderColor} ${bgColor} rounded-lg p-4`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id={`category-${category}`}
                                checked={isAllSelected}
                                ref={(el) => {
                                  if (el) el.indeterminate = isPartialSelected
                                }}
                                onChange={() => handleCategoryToggle(category)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded"
                              />
                              <label htmlFor={`category-${category}`} className={`ml-2 text-sm font-medium ${textColor}`}>
                                {category === 'ECU/?úÎãù' ? '?îß ' : '?ôÔ∏è '}{category}
                              </label>
                            </div>
                            <span className="text-xs text-gray-500">
                              {selectedInCategory.length}/{categoryWorks.length} ?†ÌÉù??
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 ml-6">
                            {categoryWorks.map((work) => {
                              return (
                                <label key={work} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={selectedInCategory.includes(work)}
                                    onChange={() => handleWorkSelection(category, work)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded"
                                  />
                                  <span className="ml-2 text-sm text-gray-300">{work}</span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* ?åÏùº Ï≤®Î? ?πÏÖò */}
              <div className="mt-8 border-t border-gray-600 pt-6">
                <h4 className="text-md font-medium text-white mb-4">?åÏùº Ï≤®Î?</h4>
                <div className="space-y-6">
                  {/* ?êÎ≥∏ ECU ?åÏùº */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ?êÎ≥∏ ECU ?¥Îçî
                    </label>
                    <div className="flex items-center space-x-3 mb-2">
                      <input
                        type="file"
                        id="original-folder"
                        className="hidden"
                        multiple
                        {...({ webkitdirectory: "", directory: "" } as any)}
                        onChange={(e) => {
                          const files = Array.from(e.target.files || [])
                          handleFileChange('originalFiles', files)
                        }}
                      />
                      <label
                        htmlFor="original-folder"
                        className="flex items-center justify-center px-4 py-2 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-900 transition-colors"
                      >
                        <svg className="w-6 h-6 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-sm text-gray-400">
                          {currentRemappingWork.files.originalFiles && currentRemappingWork.files.originalFiles.length > 0 
                            ? `?ìÅ ${currentRemappingWork.files.originalFiles.length}Í∞??åÏùº ?†ÌÉù?? 
                            : '?ìÅ ?êÎ≥∏ ?¥Îçî ?†ÌÉù'}
                        </span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={currentRemappingWork.files.originalFileDescription || ''}
                      onChange={(e) => handleFileDescriptionChange('originalFileDescription', e.target.value)}
                      placeholder="?¥Îçî ?§Î™Ö???ÖÎ†•?òÏÑ∏??(?? ?êÎ≥∏ Î∞±ÏóÖ ?¥Îçî, ?ΩÍ∏∞ ?ÑÏö© ??"
                      className="w-full border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    {/* ?†ÌÉù???åÏùº Î™©Î°ù ?úÏãú */}
                    {currentRemappingWork.files.originalFiles && currentRemappingWork.files.originalFiles.length > 0 && (
                      <div className="mt-2 p-3 bg-gray-700 rounded-lg">
                        <div className="text-sm font-medium text-gray-300 mb-2">?†ÌÉù???åÏùº:</div>
                        <div className="max-h-32 overflow-y-auto">
                          {currentRemappingWork.files.originalFiles.map((file, index) => (
                            <div key={index} className="text-xs text-gray-400 py-1 flex items-center">
                              <span className="mr-2">?ìÑ</span>
                              <span className="truncate">{file.name}</span>
                              <span className="ml-auto text-gray-400">
                                ({(file.size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stage ?åÏùº??*/}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 1Ï∞??úÎãù */}
                    <div className="border border-green-700 rounded-lg p-4 bg-green-900">
                      <label className="block text-sm font-medium text-green-300 mb-2">
                        ?ìà 1Ï∞??úÎãù
                      </label>
                      <div className="flex items-center space-x-3 mb-2">
                        <input
                          type="file"
                          id="stage1-file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null
                            handleFileChange('stage1File', file)
                          }}
                        />
                        <label
                          htmlFor="stage1-file"
                          className="flex items-center justify-center px-3 py-2 border-2 border-dashed border-green-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-100 transition-colors text-xs w-full"
                        >
                          <span className="text-green-700">
                            {currentRemappingWork.files.stage1File 
                              ? `?ìÑ ${(currentRemappingWork.files.stage1File as File).name} (${((currentRemappingWork.files.stage1File as File).size / 1024).toFixed(1)} KB)` 
                              : '?ìÑ 1Ï∞??úÎãù ?åÏùº ?†ÌÉù'}
                          </span>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={currentRemappingWork.files.stage1FileDescription || ''}
                        onChange={(e) => handleFileDescriptionChange('stage1FileDescription', e.target.value)}
                        placeholder="1Ï∞??úÎãù ?§Î™Ö???ÖÎ†•?òÏÑ∏??
                        className="w-full border-green-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-xs"
                      />
                    </div>

                    {/* 2Ï∞??úÎãù */}
                    <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                      <label className="block text-sm font-medium text-yellow-800 mb-2">
                        ?? 2Ï∞??úÎãù
                      </label>
                      <div className="flex items-center space-x-3 mb-2">
                        <input
                          type="file"
                          id="stage2-file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null
                            handleFileChange('stage2File', file)
                          }}
                        />
                        <label
                          htmlFor="stage2-file"
                          className="flex items-center justify-center px-3 py-2 border-2 border-dashed border-yellow-300 rounded-lg cursor-pointer hover:border-yellow-500 hover:bg-yellow-100 transition-colors text-xs w-full"
                        >
                          <span className="text-yellow-800">
                            {currentRemappingWork.files.stage2File 
                              ? `??${(currentRemappingWork.files.stage2File as File).name} (${((currentRemappingWork.files.stage2File as File).size / 1024).toFixed(1)} KB)` 
                              : '??2Ï∞??úÎãù ?åÏùº ?†ÌÉù'}
                          </span>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={currentRemappingWork.files.stage2FileDescription || ''}
                        onChange={(e) => handleFileDescriptionChange('stage2FileDescription', e.target.value)}
                        placeholder="2Ï∞??úÎãù ?§Î™Ö???ÖÎ†•?òÏÑ∏??
                        className="w-full border-yellow-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 text-xs"
                      />
                    </div>

                    {/* 3Ï∞??úÎãù */}
                    <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <label className="block text-sm font-medium text-red-800 mb-2">
                        ?î• 3Ï∞??úÎãù
                      </label>
                      <div className="flex items-center space-x-3 mb-2">
                        <input
                          type="file"
                          id="stage3-file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null
                            handleFileChange('stage3File', file)
                          }}
                        />
                        <label
                          htmlFor="stage3-file"
                          className="flex items-center justify-center px-3 py-2 border-2 border-dashed border-red-300 rounded-lg cursor-pointer hover:border-red-500 hover:bg-red-100 transition-colors text-xs w-full"
                        >
                          <span className="text-red-800">
                            {currentRemappingWork.files.stage3File 
                              ? `?î• ${(currentRemappingWork.files.stage3File as File).name} (${((currentRemappingWork.files.stage3File as File).size / 1024).toFixed(1)} KB)` 
                              : '?î• 3Ï∞??úÎãù ?åÏùº ?†ÌÉù'}
                          </span>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={currentRemappingWork.files.stage3FileDescription || ''}
                        onChange={(e) => handleFileDescriptionChange('stage3FileDescription', e.target.value)}
                        placeholder="3Ï∞??úÎãù ?§Î™Ö???ÖÎ†•?òÏÑ∏??
                        className="w-full border-red-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 text-xs"
                      />
                    </div>
                  </div>

                  {/* ACU ?åÏùº ?ÖÎ°ú???πÏÖò */}
                  <div className="border-t border-gray-600 pt-6">
                    <h5 className="text-md font-medium text-white mb-4">ACU ?åÏùº ?ÖÎ°ú??/h5>
                    
                    {/* ?êÎ≥∏ ACU ?åÏùº */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        ?êÎ≥∏ ACU ?¥Îçî
                      </label>
                      <div className="flex items-center space-x-3 mb-2">
                        <input
                          type="file"
                          id="acu-original-folder"
                          className="hidden"
                          multiple
                          {...({ webkitdirectory: "", directory: "" } as any)}
                          onChange={(e) => {
                            const files = Array.from(e.target.files || [])
                            handleFileChange('acuOriginalFiles', files)
                          }}
                        />
                        <label
                          htmlFor="acu-original-folder"
                          className="flex items-center justify-center px-4 py-2 border-2 border-dashed border-green-300 rounded-lg cursor-pointer hover:border-green-400 hover:bg-green-900 transition-colors"
                        >
                          <svg className="w-6 h-6 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="text-sm text-green-600">
                            {currentRemappingWork.files.acuOriginalFiles && currentRemappingWork.files.acuOriginalFiles.length > 0 
                              ? `?ôÔ∏è ${currentRemappingWork.files.acuOriginalFiles.length}Í∞??åÏùº ?†ÌÉù?? 
                              : '?ôÔ∏è ?êÎ≥∏ ACU ?¥Îçî ?†ÌÉù'}
                          </span>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={currentRemappingWork.files.acuOriginalFileDescription || ''}
                        onChange={(e) => handleFileDescriptionChange('acuOriginalFileDescription', e.target.value)}
                        placeholder="ACU ?¥Îçî ?§Î™Ö???ÖÎ†•?òÏÑ∏??(?? ?êÎ≥∏ Î∞±ÏóÖ ?¥Îçî, ?ΩÍ∏∞ ?ÑÏö© ??"
                        className="w-full border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                      />
                      {/* ?†ÌÉù??ACU ?åÏùº Î™©Î°ù ?úÏãú */}
                      {currentRemappingWork.files.acuOriginalFiles && currentRemappingWork.files.acuOriginalFiles.length > 0 && (
                        <div className="mt-2 p-3 bg-green-900 rounded-lg">
                          <div className="text-sm font-medium text-green-700 mb-2">?†ÌÉù??ACU ?åÏùº:</div>
                          <div className="max-h-32 overflow-y-auto">
                            {currentRemappingWork.files.acuOriginalFiles.map((file, index) => (
                              <div key={index} className="text-xs text-green-600 py-1 flex items-center">
                                <span className="mr-2">?ôÔ∏è</span>
                                <span className="truncate">{file.name}</span>
                                <span className="ml-auto text-green-400">
                                  ({(file.size / 1024).toFixed(1)} KB)
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ACU Stage ?åÏùº??*/}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      {/* ACU 1Ï∞??úÎãù */}
                      <div className="border border-green-700 rounded-lg p-4 bg-green-900">
                        <label className="block text-sm font-medium text-green-300 mb-2">
                          ?ôÔ∏è ACU 1Ï∞??úÎãù
                        </label>
                        <div className="flex items-center space-x-3 mb-2">
                          <input
                            type="file"
                            id="acu-stage1-file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null
                              handleFileChange('acuStage1File', file)
                            }}
                          />
                          <label
                            htmlFor="acu-stage1-file"
                            className="flex items-center justify-center px-3 py-2 border-2 border-dashed border-green-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-100 transition-colors text-xs w-full"
                          >
                            <span className="text-green-700">
                              {currentRemappingWork.files.acuStage1File 
                                ? `?ôÔ∏è ${(currentRemappingWork.files.acuStage1File as File).name} (${((currentRemappingWork.files.acuStage1File as File).size / 1024).toFixed(1)} KB)` 
                                : '?ôÔ∏è ACU 1Ï∞??úÎãù ?åÏùº ?†ÌÉù'}
                            </span>
                          </label>
                        </div>
                        <input
                          type="text"
                          value={currentRemappingWork.files.acuStage1FileDescription || ''}
                          onChange={(e) => handleFileDescriptionChange('acuStage1FileDescription', e.target.value)}
                          placeholder="ACU 1Ï∞??úÎãù ?§Î™Ö???ÖÎ†•?òÏÑ∏??
                          className="w-full border-green-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-xs"
                        />
                      </div>

                      {/* ACU 2Ï∞??úÎãù */}
                      <div className="border border-green-300 rounded-lg p-4 bg-green-100">
                        <label className="block text-sm font-medium text-green-300 mb-2">
                          ?ôÔ∏è ACU 2Ï∞??úÎãù
                        </label>
                        <div className="flex items-center space-x-3 mb-2">
                          <input
                            type="file"
                            id="acu-stage2-file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null
                              handleFileChange('acuStage2File', file)
                            }}
                          />
                          <label
                            htmlFor="acu-stage2-file"
                            className="flex items-center justify-center px-3 py-2 border-2 border-dashed border-green-400 rounded-lg cursor-pointer hover:border-green-600 hover:bg-green-200 transition-colors text-xs w-full"
                          >
                            <span className="text-green-300">
                              {currentRemappingWork.files.acuStage2File 
                                ? `?ôÔ∏è ${(currentRemappingWork.files.acuStage2File as File).name} (${((currentRemappingWork.files.acuStage2File as File).size / 1024).toFixed(1)} KB)` 
                                : '?ôÔ∏è ACU 2Ï∞??úÎãù ?åÏùº ?†ÌÉù'}
                            </span>
                          </label>
                        </div>
                        <input
                          type="text"
                          value={currentRemappingWork.files.acuStage2FileDescription || ''}
                          onChange={(e) => handleFileDescriptionChange('acuStage2FileDescription', e.target.value)}
                          placeholder="ACU 2Ï∞??úÎãù ?§Î™Ö???ÖÎ†•?òÏÑ∏??
                          className="w-full border-green-400 rounded-md shadow-sm focus:ring-green-600 focus:border-green-600 text-xs"
                        />
                      </div>

                      {/* ACU 3Ï∞??úÎãù */}
                      <div className="border border-green-400 rounded-lg p-4 bg-green-200">
                        <label className="block text-sm font-medium text-green-900 mb-2">
                          ?ôÔ∏è ACU 3Ï∞??úÎãù
                        </label>
                        <div className="flex items-center space-x-3 mb-2">
                          <input
                            type="file"
                            id="acu-stage3-file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null
                              handleFileChange('acuStage3File', file)
                            }}
                          />
                          <label
                            htmlFor="acu-stage3-file"
                            className="flex items-center justify-center px-3 py-2 border-2 border-dashed border-green-500 rounded-lg cursor-pointer hover:border-green-700 hover:bg-green-300 transition-colors text-xs w-full"
                          >
                            <span className="text-green-900">
                              {currentRemappingWork.files.acuStage3File 
                                ? `?ôÔ∏è ${(currentRemappingWork.files.acuStage3File as File).name} (${((currentRemappingWork.files.acuStage3File as File).size / 1024).toFixed(1)} KB)` 
                                : '?ôÔ∏è ACU 3Ï∞??úÎãù ?åÏùº ?†ÌÉù'}
                            </span>
                          </label>
                        </div>
                        <input
                          type="text"
                          value={currentRemappingWork.files.acuStage3FileDescription || ''}
                          onChange={(e) => handleFileDescriptionChange('acuStage3FileDescription', e.target.value)}
                          placeholder="ACU 3Ï∞??úÎãù ?§Î™Ö???ÖÎ†•?òÏÑ∏??
                          className="w-full border-green-500 rounded-md shadow-sm focus:ring-green-700 focus:border-green-700 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ?¨ÏßÑ/?ÅÏÉÅ Ï≤®Î? (5Í∞? */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-4">
                      ?¨ÏßÑ/?ÅÏÉÅ Ï≤®Î? (ÏµúÎ? 5Í∞?
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                      {[1, 2, 3, 4, 5].map((index) => {
                        const fileKey = `mediaFile${index}` as keyof typeof currentRemappingWork.files
                        const descKey = `mediaFile${index}Description` as keyof typeof currentRemappingWork.files
                        const file = currentRemappingWork.files[fileKey] as File | undefined
                        const description = currentRemappingWork.files[descKey] as string | undefined
                        
                        return (
                          <div key={index} className="border border-purple-200 rounded-lg p-3 bg-purple-50">
                            <label className="block text-xs font-medium text-purple-800 mb-2">
                              ?ì∑ ÎØ∏Îîî??{index}
                            </label>
                            
                            {/* ?åÏùº ?†ÌÉù Î∞?ÎØ∏Î¶¨Î≥¥Í∏∞ */}
                            <div className="mb-2">
                              <input
                                type="file"
                                id={`media-file-${index}`}
                                className="hidden"
                                accept="image/*,video/*"
                                onChange={(e) => {
                                  const selectedFile = e.target.files?.[0] || null
                                  handleFileChange(`mediaFile${index}`, selectedFile)
                                }}
                              />
                              
                              {/* ÎØ∏Î¶¨Î≥¥Í∏∞ ?ÅÏó≠ */}
                              {file ? (
                                <div className="relative">
                                  {file.type.startsWith('image/') ? (
                                    <div className="relative">
                                      <img
                                        src={URL.createObjectURL(file)}
                                        alt="ÎØ∏Î¶¨Î≥¥Í∏∞"
                                        className="w-full h-32 object-cover rounded-lg border border-purple-300"
                                      />
                                      <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center">
                                        <label
                                          htmlFor={`media-file-${index}`}
                                          className="text-white text-xs font-medium cursor-pointer px-2 py-1 bg-purple-600 rounded hover:bg-purple-700"
                                        >
                                          ?åÏùº Î≥ÄÍ≤?
                                        </label>
                                      </div>
                                    </div>
                                  ) : file.type.startsWith('video/') ? (
                                    <div className="relative">
                                      <video
                                        src={URL.createObjectURL(file)}
                                        className="w-full h-32 object-cover rounded-lg border border-purple-300"
                                        controls={false}
                                        muted
                                      />
                                      <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center">
                                        <label
                                          htmlFor={`media-file-${index}`}
                                          className="text-white text-xs font-medium cursor-pointer px-2 py-1 bg-purple-600 rounded hover:bg-purple-700"
                                        >
                                          ?åÏùº Î≥ÄÍ≤?
                                        </label>
                                      </div>
                                      <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-1 py-0.5 rounded">
                                        ?é• ?ôÏòÅ??
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="w-full h-32 bg-gray-100 rounded-lg border border-purple-300 flex items-center justify-center">
                                      <div className="text-center text-gray-500">
                                        <div className="text-lg">?ìÑ</div>
                                        <div className="text-xs">ÎØ∏Î¶¨Î≥¥Í∏∞ Î∂àÍ?</div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* ?åÏùº ?ïÎ≥¥ */}
                                  <div className="mt-1 text-xs text-purple-600 truncate" title={file.name}>
                                    ?ìÑ {file.name}
                                  </div>
                                  <div className="text-xs text-purple-500">
                                    ({(file.size / 1024).toFixed(1)} KB)
                                  </div>
                                </div>
                              ) : (
                                <label
                                  htmlFor={`media-file-${index}`}
                                  className="flex items-center justify-center px-2 py-2 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-100 transition-colors text-xs w-full h-32"
                                >
                                  <div className="text-center text-purple-700">
                                    <div className="text-2xl mb-1">?ì∑</div>
                                    <div>?åÏùº ?†ÌÉù</div>
                                    <div className="text-purple-500">?¥Î?ÏßÄ/?ôÏòÅ??/div>
                                  </div>
                                </label>
                              )}
                            </div>
                            
                            {/* ?§Î™Ö ?ÖÎ†• */}
                            <textarea
                              value={description || ''}
                              onChange={(e) => handleFileDescriptionChange(`mediaFile${index}Description`, e.target.value)}
                              placeholder={`ÎØ∏Îîî??${index} ?§Î™Ö`}
                              className="w-full border-purple-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-xs resize-none"
                              rows={2}
                              maxLength={100}
                            />
                            <div className="text-right text-xs text-purple-400 mt-1">
                              {(description || '').length}/100
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  onClick={handleAddRemappingWork}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {isEditingRemapping ? 'Remapping ?òÏ†ï' : 'Remapping Ï∂îÍ?'}
                </button>
              </div>
            </div>
          </div>





          {/* ?úÏ∂ú Î≤ÑÌäº */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-600">
            <button
              type="button"
              className="px-6 py-2 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Ï∑®ÏÜå
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              ?ëÏóÖ ?±Î°ù
            </button>
          </div>
        </form>
      </div>


          </div>
        </div>
      </main>

      {/* ECU Î™®Îç∏ Í¥ÄÎ¶?Î™®Îã¨ */}
      {showEcuManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-[9999]">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-white">?îß ECU Î™®Îç∏ Í¥ÄÎ¶?/h3>
              <button
                type="button"
                onClick={() => {
                  setShowEcuManagement(false)
                  setSelectedEcuModels([])
                  setNewEcuModel('')
                }}
                className="text-gray-400 hover:text-gray-400"
              >
                <span className="sr-only">?´Í∏∞</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* ??ECU Î™®Îç∏ Ï∂îÍ? */}
            <div className="mb-6 p-4 bg-blue-900 border border-blue-700 rounded-lg">
              <h4 className="text-md font-medium text-blue-300 mb-3">??ECU Î™®Îç∏ Ï∂îÍ?</h4>
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={newEcuModel}
                  onChange={(e) => setNewEcuModel(e.target.value)}
                  className="flex-1 border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="??ECU Î™®Îç∏Î™ÖÏùÑ ?ÖÎ†•?òÏÑ∏??
                  onKeyPress={(e) => e.key === 'Enter' && handleAddNewEcuModel()}
                />
                <button
                  type="button"
                  onClick={handleAddNewEcuModel}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Ï∂îÍ?
                </button>
              </div>
            </div>

            {/* ?†ÌÉù ??†ú */}
            <div className="mb-4 flex justify-between items-center">
              <div className="text-sm text-gray-400">
                Ï¥?{ecuModels.length}Í∞?Î™®Îç∏ | ?†ÌÉù?? {selectedEcuModels.length}Í∞?
              </div>
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedEcuModels.length === ecuModels.length) {
                      setSelectedEcuModels([])
                    } else {
                      setSelectedEcuModels([...ecuModels])
                    }
                  }}
                  className="px-3 py-1 bg-gray-7000 text-white rounded text-sm hover:bg-gray-600 transition-colors"
                >
                  {selectedEcuModels.length === ecuModels.length ? '?ÑÏ≤¥ ?¥Ï†ú' : '?ÑÏ≤¥ ?†ÌÉù'}
                </button>
                <button
                  type="button"
                  onClick={deleteSelectedEcuModels}
                  disabled={selectedEcuModels.length === 0}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  ?†ÌÉù ??†ú ({selectedEcuModels.length})
                </button>
              </div>
            </div>

            {/* ECU Î™®Îç∏ Î™©Î°ù */}
            <div className="max-h-96 overflow-y-auto border border-gray-600 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-4">
                {ecuModels.map((model, index) => (
                  <div
                    key={index}
                    className={`flex items-center p-2 rounded-lg border transition-colors cursor-pointer ${
                      selectedEcuModels.includes(model)
                        ? 'bg-blue-100 border-blue-300'
                        : 'bg-gray-700 border-gray-600 hover:bg-gray-700'
                    }`}
                    onClick={() => handleEcuModelSelect(model)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEcuModels.includes(model)}
                      onChange={() => handleEcuModelSelect(model)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded mr-3"
                    />
                    <span className="text-sm text-white flex-1 truncate" title={model}>
                      {model}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowEcuManagement(false)
                  setSelectedEcuModels([])
                  setNewEcuModel('')
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                ?ÑÎ£å
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACU ?Ä??Í¥ÄÎ¶?Î™®Îã¨ */}
      {showAcuManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-[9999]">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-white">?ôÔ∏è ACU ?Ä??Í¥ÄÎ¶?/h3>
              <button
                type="button"
                onClick={() => {
                  setShowAcuManagement(false)
                  setSelectedAcuTypes([])
                  setNewAcuType('')
                }}
                className="text-gray-400 hover:text-gray-400"
              >
                <span className="sr-only">?´Í∏∞</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* ??ACU ?Ä??Ï∂îÍ? */}
            <div className="mb-6 p-4 bg-green-900 border border-green-700 rounded-lg">
              <h4 className="text-md font-medium text-green-300 mb-3">??ACU ?Ä??Ï∂îÍ?</h4>
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={newAcuType}
                  onChange={(e) => setNewAcuType(e.target.value)}
                  className="flex-1 border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                  placeholder="??ACU ?Ä?ÖÎ™Ö???ÖÎ†•?òÏÑ∏??
                  onKeyPress={(e) => e.key === 'Enter' && handleAddNewAcuType()}
                />
                <button
                  type="button"
                  onClick={handleAddNewAcuType}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Ï∂îÍ?
                </button>
              </div>
            </div>

            {/* ?†ÌÉù ??†ú */}
            <div className="mb-4 flex justify-between items-center">
              <div className="text-sm text-gray-400">
                Ï¥?{acuTypes.length}Í∞??Ä??| ?†ÌÉù?? {selectedAcuTypes.length}Í∞?
              </div>
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedAcuTypes.length === acuTypes.length) {
                      setSelectedAcuTypes([])
                    } else {
                      setSelectedAcuTypes([...acuTypes])
                    }
                  }}
                  className="px-3 py-1 bg-gray-7000 text-white rounded text-sm hover:bg-gray-600 transition-colors"
                >
                  {selectedAcuTypes.length === acuTypes.length ? '?ÑÏ≤¥ ?¥Ï†ú' : '?ÑÏ≤¥ ?†ÌÉù'}
                </button>
                <button
                  type="button"
                  onClick={deleteSelectedAcuTypes}
                  disabled={selectedAcuTypes.length === 0}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  ?†ÌÉù ??†ú ({selectedAcuTypes.length})
                </button>
              </div>
            </div>

            {/* ACU ?Ä??Î™©Î°ù */}
            <div className="max-h-96 overflow-y-auto border border-gray-600 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-4">
                {acuTypes.map((type, index) => (
                  <div
                    key={index}
                    className={`flex items-center p-2 rounded-lg border transition-colors cursor-pointer ${
                      selectedAcuTypes.includes(type)
                        ? 'bg-green-100 border-green-300'
                        : 'bg-gray-700 border-gray-600 hover:bg-gray-700'
                    }`}
                    onClick={() => handleAcuTypeSelect(type)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAcuTypes.includes(type)}
                      onChange={() => handleAcuTypeSelect(type)}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-600 rounded mr-3"
                    />
                    <span className="text-sm text-white flex-1 truncate" title={type}>
                      {type}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAcuManagement(false)
                  setSelectedAcuTypes([])
                  setNewAcuType('')
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                ?ÑÎ£å
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  )
} 
