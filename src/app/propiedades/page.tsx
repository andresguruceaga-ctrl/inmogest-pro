'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Building2, Plus, Search, MoreHorizontal, Eye, Edit, Trash2, MapPin, Bed, Bath, Car, Ruler, Loader2, User, Upload, Image as ImageIcon, X, Camera, LayoutGrid, List } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface Property {
  id: string
  title: string
  description?: string | null
  propertyType: string
  province: string
  district: string
  corregimiento?: string | null
  neighborhood?: string | null
  address: string
  buildingName?: string | null
  hasTerrace?: boolean
  hasBalcony?: boolean
  hasDen?: boolean
  hasSocialArea?: boolean
  socialAreaDescription?: string | null
  hasMaidRoomBathroom?: boolean
  phContactName?: string | null
  phContactPhone?: string | null
  phContactEmail?: string | null
  totalArea: number
  builtArea?: number | null
  bedrooms: number
  bathrooms: number
  parkingSpaces: number
  floorNumber?: number | null
  fincaNumber: string
  tomoNumber?: string | null
  folioNumber?: string | null
  asientoNumber?: string | null
  monthlyRent: number
  depositAmount: number
  status: string
  mainImage: string | null
  images: string | null
  comments?: string | null
  forSale?: boolean
  salePrice?: number | null
  saleDescription?: string | null
  forRent?: boolean
  recurringExpenses?: Array<{
    id: string
    title: string
    category: string
    amount: number
    frequencyMonths: number
    startsAt?: string | null
    endsAt?: string | null
    createdAt?: string
    paidByAdmin: boolean
  }>
  owner?: { id: string; name: string; email: string; phone?: string | null } | null
  tenant?: { id: string; name: string; email: string; phone?: string | null } | null
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface PhotoPreview {
  file: File
  preview: string
  uploaded: boolean
  url?: string
}

interface FixedExpenseDraft {
  id: string
  persistedId?: string
  title: string
  category: string
  amount: string
  frequencyMonths: number
  startsAt: string
  endsAt: string
  paidByAdmin: boolean
}

const dateInputValue = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 10) : ''
const todayInputValue = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Panama',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date())

const propertyTypes = [
  { value: 'APARTAMENTO', label: 'Apartamento' },
  { value: 'CASA', label: 'Casa' },
  { value: 'LOCAL_COMERCIAL', label: 'Local Comercial' },
  { value: 'OFICINA', label: 'Oficina' },
  { value: 'BODEGA', label: 'Bodega' },
  { value: 'TERRENO', label: 'Terreno' },
  { value: 'PH', label: 'PH' },
]

const provinces = [
  'Panamá',
  'Panamá Oeste',
  'Colón',
  'Chiriquí',
  'Veraguas',
  'Herrera',
  'Los Santos',
  'Coclé',
  'Bocas del Toro',
  'Darién',
]

const statusOptions = [
  { value: 'DISPONIBLE', label: 'Disponible' },
  { value: 'OCUPADA', label: 'Ocupada' },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento' },
  { value: 'INACTIVA', label: 'Inactiva' },
]

const expenseCategories = [
  { value: 'MANTENIMIENTO_PH', label: 'Mantenimiento de PH' },
  { value: 'SEGURO', label: 'Seguro' },
  { value: 'SERVICIOS_BASICOS', label: 'Servicios básicos' },
  { value: 'IMPUESTOS', label: 'Impuestos' },
  { value: 'COMISION_ADMIN', label: 'Comisión de administración' },
  { value: 'REPARACION', label: 'Reparación' },
  { value: 'SERVICIO_TECNICO', label: 'Servicio técnico' },
  { value: 'OTROS', label: 'Otros' },
]

const expenseFrequencies = [
  { value: 1, label: 'Mensual' },
  { value: 3, label: 'Trimestral' },
  { value: 4, label: 'Cuatrimestral' },
  { value: 6, label: 'Semestral' },
  { value: 12, label: 'Anual' },
]

export default function PropiedadesPage() {
  const router = useRouter()
  const [properties, setProperties] = useState<Property[]>([])
  const [admins, setAdmins] = useState<User[]>([])
  const [owners, setOwners] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [editUploading, setEditUploading] = useState(false)
  const editFileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    propertyType: 'APARTAMENTO',
    province: 'Panamá',
    district: '',
    corregimiento: '',
    neighborhood: '',
    address: '',
    buildingName: '',
    hasTerrace: false,
    hasBalcony: false,
    hasDen: false,
    hasSocialArea: false,
    socialAreaDescription: '',
    hasMaidRoomBathroom: false,
    phContactName: '',
    phContactPhone: '',
    phContactEmail: '',
    totalArea: '',
    builtArea: '',
    bedrooms: '0',
    bathrooms: '1',
    parkingSpaces: '1',
    floorNumber: '',
    fincaNumber: '',
    tomoNumber: '',
    folioNumber: '',
    asientoNumber: '',
    monthlyRent: '',
    depositAmount: '',
    ownerId: '',
    adminId: '',
    mainImage: '',
    images: '',
    comments: '',
    forSale: false,
    salePrice: '',
    saleDescription: '',
    forRent: true,
  })

  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    propertyType: 'APARTAMENTO',
    province: 'Panamá',
    district: '',
    corregimiento: '',
    neighborhood: '',
    address: '',
    buildingName: '',
    hasTerrace: false,
    hasBalcony: false,
    hasDen: false,
    hasSocialArea: false,
    socialAreaDescription: '',
    hasMaidRoomBathroom: false,
    phContactName: '',
    phContactPhone: '',
    phContactEmail: '',
    totalArea: '',
    builtArea: '',
    bedrooms: '0',
    bathrooms: '1',
    parkingSpaces: '1',
    floorNumber: '',
    fincaNumber: '',
    tomoNumber: '',
    folioNumber: '',
    asientoNumber: '',
    monthlyRent: '',
    depositAmount: '',
    ownerId: '',
    adminId: '',
    status: 'DISPONIBLE',
  })

  const [photos, setPhotos] = useState<PhotoPreview[]>([])
  const [mainPhotoIndex, setMainPhotoIndex] = useState<number | null>(null)
  const [editPhotos, setEditPhotos] = useState<PhotoPreview[]>([])
  const [editMainPhotoIndex, setEditMainPhotoIndex] = useState<number | null>(null)
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpenseDraft[]>([])
  const [editFixedExpenses, setEditFixedExpenses] = useState<FixedExpenseDraft[]>([])

  const addFixedExpense = () => {
    setFixedExpenses(current => [
      ...current,
      {
        id: crypto.randomUUID(),
        title: '',
        category: 'MANTENIMIENTO_PH',
        amount: '',
        frequencyMonths: 1,
        startsAt: todayInputValue(),
        endsAt: '',
        paidByAdmin: false,
      },
    ])
  }

  const addEditFixedExpense = () => {
    setEditFixedExpenses(current => [...current, {
      id: crypto.randomUUID(),
      title: '',
      category: 'MANTENIMIENTO_PH',
      amount: '',
      frequencyMonths: 1,
      startsAt: todayInputValue(),
      endsAt: '',
      paidByAdmin: false,
    }])
  }

  const updateEditFixedExpense = (id: string, patch: Partial<FixedExpenseDraft>) => {
    setEditFixedExpenses(current => current.map(expense => expense.id === id ? { ...expense, ...patch } : expense))
  }

  const updateFixedExpense = (id: string, patch: Partial<FixedExpenseDraft>) => {
    setFixedExpenses(current => current.map(expense =>
      expense.id === id ? { ...expense, ...patch } : expense
    ))
  }

  useEffect(() => {
    queueMicrotask(() => {
      void fetchProperties()
      void fetchUsers()
    })
  }, [])

  async function fetchProperties() {
    try {
      const response = await fetch('/api/properties')
      if (response.ok) {
        const data = await response.json()
        setProperties(data.properties || [])
      }
    } catch (error) {
      console.error('Error fetching properties:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchUsers() {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        const allUsers = data.users || []
        setAdmins(allUsers.filter((u: User) => u.role === 'ADMIN'))
        setOwners(allUsers.filter((u: User) => u.role === 'PROPIETARIO'))
      } else {
        const demoAdmins = [
          { id: 'demo-admin-1', name: 'Carlos Administrador', email: 'admin@inmogest.pa', role: 'ADMIN' }
        ]
        const demoOwners = [
          { id: 'demo-owner-1', name: 'Juan Pérez', email: 'juan.perez@email.com', role: 'PROPIETARIO' },
          { id: 'demo-owner-2', name: 'María Rodríguez', email: 'maria.rodriguez@email.com', role: 'PROPIETARIO' }
        ]
        setAdmins(demoAdmins)
        setOwners(demoOwners)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      const demoAdmins = [
        { id: 'demo-admin-1', name: 'Carlos Administrador', email: 'admin@inmogest.pa', role: 'ADMIN' }
      ]
      const demoOwners = [
        { id: 'demo-owner-1', name: 'Juan Pérez', email: 'juan.perez@email.com', role: 'PROPIETARIO' },
        { id: 'demo-owner-2', name: 'María Rodríguez', email: 'maria.rodriguez@email.com', role: 'PROPIETARIO' }
      ]
      setAdmins(demoAdmins)
      setOwners(demoOwners)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    const newPhotos: PhotoPreview[] = []

    for (const file of Array.from(files)) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Archivo no válido',
          description: `${file.name} no es una imagen válida`,
          variant: 'destructive',
        })
        continue
      }

      // Validar tamaño (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'Archivo muy grande',
          description: `${file.name} excede el límite de 10MB`,
          variant: 'destructive',
        })
        continue
      }

      try {
        // Crear preview
        const preview = URL.createObjectURL(file)
        
        // Subir archivo
        const uploadFormData = new FormData()
        uploadFormData.append('file', file)
        uploadFormData.append('folder', 'properties')

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        })

        const data = await response.json()

        if (response.ok) {
          newPhotos.push({
            file,
            preview,
            uploaded: true,
            url: data.data.fileUrl,
          })
        } else {
          newPhotos.push({
            file,
            preview,
            uploaded: false,
          })
          toast({
            title: 'Error al subir',
            description: `No se pudo subir ${file.name}`,
            variant: 'destructive',
          })
        }
      } catch (error) {
        console.error('Error uploading file:', error)
      }
    }

    setPhotos(prev => [...prev, ...newPhotos])
    
    // Si es la primera foto, hacerla la principal
    if (photos.length === 0 && newPhotos.length > 0) {
      setMainPhotoIndex(0)
    }

    setUploading(false)
    
    // Limpiar input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleEditFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setEditUploading(true)
    const newPhotos: PhotoPreview[] = []

    for (const file of Array.from(files)) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Archivo no válido',
          description: `${file.name} no es una imagen válida`,
          variant: 'destructive',
        })
        continue
      }

      // Validar tamaño (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'Archivo muy grande',
          description: `${file.name} excede el límite de 10MB`,
          variant: 'destructive',
        })
        continue
      }

      try {
        // Crear preview
        const preview = URL.createObjectURL(file)
        
        // Subir archivo
        const uploadFormData = new FormData()
        uploadFormData.append('file', file)
        uploadFormData.append('folder', 'properties')

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        })

        const data = await response.json()

        if (response.ok) {
          newPhotos.push({
            file,
            preview,
            uploaded: true,
            url: data.data.fileUrl,
          })
        } else {
          newPhotos.push({
            file,
            preview,
            uploaded: false,
          })
          toast({
            title: 'Error al subir',
            description: `No se pudo subir ${file.name}`,
            variant: 'destructive',
          })
        }
      } catch (error) {
        console.error('Error uploading file:', error)
      }
    }

    setEditPhotos(prev => [...prev, ...newPhotos])
    
    // Si es la primera foto, hacerla la principal
    if (editPhotos.length === 0 && newPhotos.length > 0) {
      setEditMainPhotoIndex(0)
    }

    setEditUploading(false)
    
    // Limpiar input
    if (editFileInputRef.current) {
      editFileInputRef.current.value = ''
    }
  }

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      const newPhotos = prev.filter((_, i) => i !== index)
      // Ajustar índice de foto principal si es necesario
      if (mainPhotoIndex === index) {
        setMainPhotoIndex(newPhotos.length > 0 ? 0 : null)
      } else if (mainPhotoIndex !== null && mainPhotoIndex > index) {
        setMainPhotoIndex(mainPhotoIndex - 1)
      }
      return newPhotos
    })
  }

  const removeEditPhoto = (index: number) => {
    setEditPhotos(prev => {
      const newPhotos = prev.filter((_, i) => i !== index)
      // Ajustar índice de foto principal si es necesario
      if (editMainPhotoIndex === index) {
        setEditMainPhotoIndex(newPhotos.length > 0 ? 0 : null)
      } else if (editMainPhotoIndex !== null && editMainPhotoIndex > index) {
        setEditMainPhotoIndex(editMainPhotoIndex - 1)
      }
      return newPhotos
    })
  }

  const setAsMainPhoto = (index: number) => {
    setMainPhotoIndex(index)
  }

  const setAsEditMainPhoto = (index: number) => {
    setEditMainPhotoIndex(index)
  }

  const openEditDialog = (property: Property) => {
    setSelectedProperty(property)
    
    // Parse existing images
    let existingPhotos: PhotoPreview[] = []
    if (property.images) {
      try {
        const imageUrls = JSON.parse(property.images)
        existingPhotos = imageUrls.map((url: string, index: number) => ({
          file: new File([], ''),
          preview: url,
          uploaded: true,
          url: url,
        }))
      } catch (e) {
        console.error('Error parsing images:', e)
      }
    }
    
    setEditFormData({
      title: property.title,
      description: property.description || '',
      propertyType: property.propertyType,
      province: property.province,
      district: property.district || '',
      corregimiento: property.corregimiento || '',
      neighborhood: property.neighborhood || '',
      address: property.address,
      buildingName: property.buildingName || '',
      hasTerrace: property.hasTerrace || false,
      hasBalcony: property.hasBalcony || false,
      hasDen: property.hasDen || false,
      hasSocialArea: property.hasSocialArea || false,
      socialAreaDescription: property.socialAreaDescription || '',
      hasMaidRoomBathroom: property.hasMaidRoomBathroom || false,
      phContactName: property.phContactName || '',
      phContactPhone: property.phContactPhone || '',
      phContactEmail: property.phContactEmail || '',
      totalArea: String(property.totalArea),
      builtArea: property.builtArea ? String(property.builtArea) : '',
      bedrooms: String(property.bedrooms),
      bathrooms: String(property.bathrooms),
      parkingSpaces: String(property.parkingSpaces),
      floorNumber: property.floorNumber ? String(property.floorNumber) : '',
      fincaNumber: property.fincaNumber || '',
      tomoNumber: property.tomoNumber || '',
      folioNumber: property.folioNumber || '',
      asientoNumber: property.asientoNumber || '',
      monthlyRent: String(property.monthlyRent),
      depositAmount: String(property.depositAmount || 0),
      ownerId: property.owner?.id || '',
      adminId: '',
      status: property.status,
    })
    setEditFixedExpenses((property.recurringExpenses || []).map(expense => ({
      id: expense.id,
      persistedId: expense.id,
      title: expense.title,
      category: expense.category,
      amount: String(expense.amount),
      frequencyMonths: expense.frequencyMonths,
      startsAt: dateInputValue(expense.startsAt || expense.createdAt) || todayInputValue(),
      endsAt: dateInputValue(expense.endsAt),
      paidByAdmin: expense.paidByAdmin,
    })))
    setEditPhotos(existingPhotos)
    setEditMainPhotoIndex(existingPhotos.length > 0 ? 0 : null)
    setEditDialogOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedProperty) return

    setSaving(true)

    try {
      // Get photo URLs
      const photoUrls = editPhotos.filter(p => p.url).map(p => p.url!)
      const mainImage = editMainPhotoIndex !== null && editPhotos[editMainPhotoIndex]?.url 
        ? editPhotos[editMainPhotoIndex].url 
        : photoUrls[0] || null
      const images = photoUrls.length > 0 ? JSON.stringify(photoUrls) : null

      const response = await fetch(`/api/properties/${selectedProperty.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editFormData.title,
          propertyType: editFormData.propertyType,
          province: editFormData.province,
          district: editFormData.district,
          address: editFormData.address,
          description: editFormData.description || null,
          corregimiento: editFormData.corregimiento || null,
          neighborhood: editFormData.neighborhood || null,
          buildingName: editFormData.buildingName || null,
          hasTerrace: editFormData.hasTerrace,
          hasBalcony: editFormData.hasBalcony,
          hasDen: editFormData.hasDen,
          hasSocialArea: editFormData.hasSocialArea,
          socialAreaDescription: editFormData.hasSocialArea ? editFormData.socialAreaDescription || null : null,
          hasMaidRoomBathroom: editFormData.hasMaidRoomBathroom,
          phContactName: editFormData.phContactName || null,
          phContactPhone: editFormData.phContactPhone || null,
          phContactEmail: editFormData.phContactEmail || null,
          totalArea: parseFloat(editFormData.totalArea) || 0,
          builtArea: parseFloat(editFormData.builtArea) || null,
          bedrooms: parseInt(editFormData.bedrooms) || 0,
          bathrooms: parseInt(editFormData.bathrooms) || 1,
          parkingSpaces: parseInt(editFormData.parkingSpaces) || 0,
          floorNumber: parseInt(editFormData.floorNumber) || null,
          monthlyRent: parseFloat(editFormData.monthlyRent) || 0,
          depositAmount: parseFloat(editFormData.depositAmount) || 0,
          fincaNumber: editFormData.fincaNumber || null,
          status: editFormData.status,
          mainImage,
          images,
          recurringExpenses: editFixedExpenses
            .filter(expense => expense.title.trim() && Number(expense.amount) > 0)
            .map(expense => ({
              id: expense.persistedId,
              title: expense.title.trim(),
              category: expense.category,
              amount: Number(expense.amount),
              frequencyMonths: expense.frequencyMonths,
              startsAt: expense.startsAt || null,
              endsAt: expense.endsAt || null,
              paidByAdmin: expense.paidByAdmin,
            })),
        }),
      })

      if (response.ok) {
        toast({
          title: 'Propiedad actualizada',
          description: 'La propiedad se ha actualizado exitosamente.',
        })
        setEditDialogOpen(false)
        setSelectedProperty(null)
        fetchProperties()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'No se pudo actualizar la propiedad',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error de conexión',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (property: Property) => {
    if (!confirm(`¿Estás seguro de eliminar la propiedad "${property.title}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/properties/${property.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Propiedad eliminada',
          description: 'La propiedad se ha eliminado exitosamente.',
        })
        fetchProperties()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'No se pudo eliminar la propiedad',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error de conexión',
        variant: 'destructive',
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.ownerId) {
      toast({
        title: 'Error',
        description: 'Debes seleccionar un propietario',
        variant: 'destructive',
      })
      return
    }

    if (!formData.adminId) {
      toast({
        title: 'Error',
        description: 'Debes seleccionar un administrador',
        variant: 'destructive',
      })
      return
    }

    // Verificar que todas las fotos estén subidas
    const pendingPhotos = photos.filter(p => !p.uploaded)
    if (pendingPhotos.length > 0) {
      toast({
        title: 'Error',
        description: 'Algunas fotos aún se están subiendo. Por favor espera.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)

    try {
      // Obtener URLs de las fotos
      const photoUrls = photos.filter(p => p.url).map(p => p.url!)
      const mainImage = mainPhotoIndex !== null && photos[mainPhotoIndex]?.url 
        ? photos[mainPhotoIndex].url 
        : photoUrls[0] || null
      const images = photoUrls.length > 0 ? JSON.stringify(photoUrls) : null

      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          totalArea: parseFloat(formData.totalArea) || 0,
          builtArea: parseFloat(formData.builtArea) || null,
          bedrooms: parseInt(formData.bedrooms) || 0,
          bathrooms: parseInt(formData.bathrooms) || 1,
          parkingSpaces: parseInt(formData.parkingSpaces) || 0,
          floorNumber: parseInt(formData.floorNumber) || null,
          monthlyRent: parseFloat(formData.monthlyRent) || 0,
          depositAmount: parseFloat(formData.depositAmount) || 0,
          mainImage,
          images,
          comments: formData.comments || null,
          forSale: formData.forSale,
          salePrice: parseFloat(formData.salePrice) || null,
          saleDescription: formData.saleDescription || null,
          forRent: formData.forRent,
          fixedExpenses: fixedExpenses
            .filter(expense => expense.title.trim() && Number(expense.amount) > 0)
            .map(expense => ({
              title: expense.title.trim(),
              category: expense.category,
              amount: Number(expense.amount),
              frequencyMonths: expense.frequencyMonths,
              startsAt: expense.startsAt || null,
              endsAt: expense.endsAt || null,
              paidByAdmin: expense.paidByAdmin,
            })),
        }),
      })

      if (response.ok) {
        toast({
          title: 'Propiedad creada',
          description: 'La propiedad se ha registrado exitosamente.',
        })
        setDialogOpen(false)
        resetForm()
        fetchProperties()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'No se pudo crear la propiedad',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error de conexión',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      propertyType: 'APARTAMENTO',
      province: 'Panamá',
      district: '',
      corregimiento: '',
      neighborhood: '',
      address: '',
      buildingName: '',
      hasTerrace: false,
      hasBalcony: false,
      hasDen: false,
      hasSocialArea: false,
      socialAreaDescription: '',
      hasMaidRoomBathroom: false,
      phContactName: '',
      phContactPhone: '',
      phContactEmail: '',
      totalArea: '',
      builtArea: '',
      bedrooms: '0',
      bathrooms: '1',
      parkingSpaces: '1',
      floorNumber: '',
      fincaNumber: '',
      tomoNumber: '',
      folioNumber: '',
      asientoNumber: '',
      monthlyRent: '',
      depositAmount: '',
      ownerId: '',
      adminId: '',
      mainImage: '',
      images: '',
      comments: '',
      forSale: false,
      salePrice: '',
      saleDescription: '',
      forRent: true,
    })
    setPhotos([])
    setMainPhotoIndex(null)
    setFixedExpenses([])
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DISPONIBLE':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Disponible</Badge>
      case 'OCUPADA':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Ocupada</Badge>
      case 'MANTENIMIENTO':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Mantenimiento</Badge>
      case 'INACTIVA':
        return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">Inactiva</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getPropertyTypeLabel = (type: string) => {
    const found = propertyTypes.find(p => p.value === type)
    return found?.label || type
  }

  const visibleProperties = properties.filter(property => {
    const query = searchQuery.trim().toLocaleLowerCase('es')
    if (!query) return true
    return [property.title, property.address, property.district, property.province, property.buildingName]
      .some(value => value?.toLocaleLowerCase('es').includes(query))
  })

  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <Header />
        
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Propiedades</h1>
                <p className="text-muted-foreground">Gestiona tu inventario de propiedades</p>
              </div>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Propiedad
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar propiedades..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                    />
                  </div>
                  <div className="flex rounded-md border p-1" aria-label="Tipo de vista">
                    <Button
                      variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      aria-label="Vista en cuadros"
                    >
                      <LayoutGrid className="h-4 w-4 mr-2" />
                      Cuadros
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      aria-label="Vista en lista"
                    >
                      <List className="h-4 w-4 mr-2" />
                      Lista
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Listado de Propiedades</CardTitle>
                <CardDescription>{visibleProperties.length} propiedades encontradas</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : visibleProperties.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay propiedades registradas</p>
                    <p className="text-sm">Haz clic en "Nueva Propiedad" para agregar una</p>
                  </div>
                ) : viewMode === 'grid' ? (
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {visibleProperties.map((property) => (
                      <Card
                        key={property.id}
                        className="group cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
                        onClick={() => router.push(`/propiedades/${property.id}`)}
                      >
                        <div className="relative aspect-[16/9] bg-muted">
                          {property.mainImage ? (
                            <img src={property.mainImage} alt={property.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <Building2 className="h-12 w-12 text-muted-foreground/40" />
                            </div>
                          )}
                          <div className="absolute left-3 top-3">{getStatusBadge(property.status)}</div>
                        </div>
                        <CardContent className="space-y-4 p-5">
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="font-semibold leading-tight group-hover:text-primary">{property.title}</h3>
                                <p className="mt-1 text-sm text-muted-foreground">{getPropertyTypeLabel(property.propertyType)}</p>
                              </div>
                              <span className="whitespace-nowrap font-semibold">${property.monthlyRent.toLocaleString()}/mes</span>
                            </div>
                            <p className="mt-3 flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4 shrink-0" />
                              <span className="truncate">{property.district}, {property.province}</span>
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-4 border-t pt-4 text-sm text-muted-foreground">
                            {property.bedrooms > 0 && <span className="flex items-center gap-1"><Bed className="h-4 w-4" />{property.bedrooms}</span>}
                            <span className="flex items-center gap-1"><Bath className="h-4 w-4" />{property.bathrooms}</span>
                            <span className="flex items-center gap-1"><Car className="h-4 w-4" />{property.parkingSpaces}</span>
                            <span className="flex items-center gap-1"><Ruler className="h-4 w-4" />{property.totalArea}m²</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                    <TableRow>
                      <TableHead>Propiedad</TableHead>
                      <TableHead className="hidden md:table-cell">Ubicación</TableHead>
                      <TableHead className="hidden lg:table-cell">Características</TableHead>
                      <TableHead>Alquiler</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleProperties.map((property) => (
                      <TableRow key={property.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
                              {property.mainImage ? (
                                <img 
                                  src={property.mainImage} 
                                  alt={property.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Building2 className="h-5 w-5 text-primary" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{property.title}</p>
                              <p className="text-xs text-muted-foreground">{getPropertyTypeLabel(property.propertyType)}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {property.province}, {property.district}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {property.bedrooms > 0 && (
                              <span className="flex items-center gap-1">
                                <Bed className="h-3 w-3" /> {property.bedrooms}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Bath className="h-3 w-3" /> {property.bathrooms}
                            </span>
                            <span className="flex items-center gap-1">
                              <Car className="h-3 w-3" /> {property.parkingSpaces}
                            </span>
                            <span className="flex items-center gap-1">
                              <Ruler className="h-3 w-3" /> {property.totalArea}m²
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          ${property.monthlyRent.toLocaleString()}/mes
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(property.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/propiedades/${property.id}`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver detalle
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(property)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDelete(property)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
        
        <Footer />
      </SidebarInset>

      {/* Dialog para Nueva Propiedad */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Propiedad</DialogTitle>
            <DialogDescription>
              Registra una nueva propiedad en el sistema. Los campos con * son obligatorios.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información básica */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Información Básica</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Ej: Apartamento Vista Mar en Paitilla"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="propertyType">Tipo de Propiedad *</Label>
                  <Select value={formData.propertyType} onValueChange={(v) => setFormData({...formData, propertyType: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {propertyTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fincaNumber">Número de Finca *</Label>
                  <Input
                    id="fincaNumber"
                    value={formData.fincaNumber}
                    onChange={(e) => setFormData({...formData, fincaNumber: e.target.value})}
                    placeholder="Ej: 123456"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Ubicación */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Ubicación</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="province">Provincia *</Label>
                  <Select value={formData.province} onValueChange={(v) => setFormData({...formData, province: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar provincia" />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((prov) => (
                        <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district">Distrito *</Label>
                  <Input
                    id="district"
                    value={formData.district}
                    onChange={(e) => setFormData({...formData, district: e.target.value})}
                    placeholder="Ej: Panamá"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Barrio/Urbanización</Label>
                  <Input
                    id="neighborhood"
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({...formData, neighborhood: e.target.value})}
                    placeholder="Ej: Punta Paitilla"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Dirección Exacta *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Ej: Av. Balboa, Edificio Vista Mar, Apt 15-03"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Contacto del PH */}
            <div className="space-y-4 rounded-lg border p-4">
              <div>
                <h4 className="font-medium text-sm">Datos de contacto del PH</h4>
                <p className="mt-1 text-xs text-muted-foreground">Administración, conserjería o contacto principal del edificio.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="phContactName">Nombre del contacto</Label>
                  <Input id="phContactName" value={formData.phContactName} onChange={(e) => setFormData({...formData, phContactName: e.target.value})} placeholder="Administración del PH" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phContactPhone">Teléfono</Label>
                  <Input id="phContactPhone" type="tel" value={formData.phContactPhone} onChange={(e) => setFormData({...formData, phContactPhone: e.target.value})} placeholder="+507 6000-0000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phContactEmail">Correo</Label>
                  <Input id="phContactEmail" type="email" value={formData.phContactEmail} onChange={(e) => setFormData({...formData, phContactEmail: e.target.value})} placeholder="administracion@ph.com" />
                </div>
              </div>
            </div>

            {/* Características */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Características</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalArea">Área Total (m²) *</Label>
                  <Input
                    id="totalArea"
                    type="number"
                    value={formData.totalArea}
                    onChange={(e) => setFormData({...formData, totalArea: e.target.value})}
                    placeholder="150"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bedrooms">Recámaras</Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({...formData, bedrooms: e.target.value})}
                    placeholder="3"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bathrooms">Baños *</Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    value={formData.bathrooms}
                    onChange={(e) => setFormData({...formData, bathrooms: e.target.value})}
                    placeholder="2"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parkingSpaces">Estacionamientos *</Label>
                  <Input
                    id="parkingSpaces"
                    type="number"
                    value={formData.parkingSpaces}
                    onChange={(e) => setFormData({...formData, parkingSpaces: e.target.value})}
                    placeholder="2"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {[
                  ['hasTerrace', 'Terraza'],
                  ['hasBalcony', 'Balcón'],
                  ['hasDen', 'Den'],
                  ['hasSocialArea', 'Área social'],
                  ['hasMaidRoomBathroom', 'CDE (cuarto y baño de empleada)'],
                ].map(([field, label]) => (
                  <label key={field} className="flex min-h-11 items-center gap-3 rounded-md border bg-background px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(formData[field as keyof typeof formData])}
                      onChange={(event) => setFormData({...formData, [field]: event.target.checked})}
                      className="rounded border-gray-300"
                    />
                    {label}
                  </label>
                ))}
              </div>
              {formData.hasSocialArea && (
                <div className="space-y-2">
                  <Label htmlFor="socialAreaDescription">Características del área social</Label>
                  <Textarea id="socialAreaDescription" value={formData.socialAreaDescription} onChange={(e) => setFormData({...formData, socialAreaDescription: e.target.value})} placeholder="Ej. piscina, gimnasio, salón de eventos, parque infantil..." rows={3} />
                </div>
              )}
            </div>

            {/* Información Financiera */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Información Financiera</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthlyRent">Alquiler Mensual (USD) *</Label>
                  <Input
                    id="monthlyRent"
                    type="number"
                    value={formData.monthlyRent}
                    onChange={(e) => setFormData({...formData, monthlyRent: e.target.value})}
                    placeholder="2500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depositAmount">Depósito en Garantía (USD)</Label>
                  <Input
                    id="depositAmount"
                    type="number"
                    value={formData.depositAmount}
                    onChange={(e) => setFormData({...formData, depositAmount: e.target.value})}
                    placeholder="2500"
                  />
                </div>
              </div>
            </div>

            {/* Gastos fijos recurrentes */}
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="font-medium text-sm">Gastos fijos recurrentes</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Se registrarán automáticamente el día 30 según su frecuencia y durante las fechas indicadas.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addFixedExpense}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar gasto fijo
                </Button>
              </div>

              {fixedExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground rounded-md bg-muted/50 p-3">
                  Puedes agregar mantenimiento, seguro, servicios u otros gastos recurrentes.
                </p>
              ) : (
                <div className="space-y-4">
                  {fixedExpenses.map((expense, index) => (
                    <div key={expense.id} className="space-y-4 rounded-lg border bg-muted/30 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">Gasto {index + 1}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setFixedExpenses(current => current.filter(item => item.id !== expense.id))}
                          aria-label={`Eliminar gasto fijo ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor={`fixed-expense-title-${expense.id}`}>Nombre del gasto</Label>
                        <Input
                          id={`fixed-expense-title-${expense.id}`}
                          value={expense.title}
                          onChange={(event) => updateFixedExpense(expense.id, { title: event.target.value })}
                          placeholder="Ej. Mantenimiento del PH"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Categoría</Label>
                        <Select
                          value={expense.category}
                          onValueChange={(value) => updateFixedExpense(expense.id, { category: value })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {expenseCategories.map(category => (
                              <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Frecuencia</Label>
                        <Select
                          value={String(expense.frequencyMonths)}
                          onValueChange={(value) => updateFixedExpense(expense.id, { frequencyMonths: Number(value) })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {expenseFrequencies.map(frequency => (
                              <SelectItem key={frequency.value} value={String(frequency.value)}>
                                {frequency.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`fixed-expense-amount-${expense.id}`}>Monto (USD)</Label>
                        <Input
                          id={`fixed-expense-amount-${expense.id}`}
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={expense.amount}
                          onChange={(event) => updateFixedExpense(expense.id, { amount: event.target.value })}
                          placeholder="0.00"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`fixed-expense-start-${expense.id}`}>Fecha de inicio</Label>
                        <Input id={`fixed-expense-start-${expense.id}`} type="date" value={expense.startsAt} onChange={(event) => updateFixedExpense(expense.id, { startsAt: event.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`fixed-expense-end-${expense.id}`}>Fecha de finalización</Label>
                        <Input id={`fixed-expense-end-${expense.id}`} type="date" min={expense.startsAt || undefined} value={expense.endsAt} onChange={(event) => updateFixedExpense(expense.id, { endsAt: event.target.value })} />
                        <p className="text-xs text-muted-foreground">Déjala vacía si no tiene fecha final.</p>
                      </div>
                      <label className="flex min-h-10 items-center gap-3 rounded-md border bg-background px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={expense.paidByAdmin}
                          onChange={(event) => updateFixedExpense(expense.id, { paidByAdmin: event.target.checked })}
                          className="rounded border-gray-300"
                        />
                        Gestionado por el administrador
                      </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fotos */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Fotos de la Propiedad
              </h4>
              <div className="space-y-3">
                {/* Upload area */}
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {uploading ? 'Subiendo...' : 'Seleccionar Fotos'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Puedes seleccionar múltiples imágenes. JPG, PNG o WEBP. Máximo 10MB por imagen.
                  </p>
                </div>

                {/* Photo previews */}
                {photos.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {photos.map((photo, index) => (
                      <div 
                        key={index}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          mainPhotoIndex === index 
                            ? 'border-primary ring-2 ring-primary/20' 
                            : 'border-transparent hover:border-muted-foreground/30'
                        }`}
                      >
                        <img 
                          src={photo.preview} 
                          alt={`Foto ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Main photo badge */}
                        {mainPhotoIndex === index && (
                          <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                            Principal
                          </div>
                        )}
                        
                        {/* Uploading indicator */}
                        {!photo.uploaded && (
                          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          </div>
                        )}
                        
                        {/* Actions overlay */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          {mainPhotoIndex !== index && (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => setAsMainPhoto(index)}
                            >
                              <ImageIcon className="h-4 w-4 mr-1" />
                              Principal
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => removePhoto(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {photos.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {photos.length} foto{photos.length !== 1 ? 's' : ''} seleccionada{photos.length !== 1 ? 's' : ''}.
                    Haz clic en una foto para marcarla como principal.
                  </p>
                )}
              </div>
            </div>

            {/* Comentarios */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Comentarios</h4>
              <div className="space-y-2">
                <Label htmlFor="comments">Comentarios adicionales</Label>
                <Textarea
                  id="comments"
                  value={formData.comments}
                  onChange={(e) => setFormData({...formData, comments: e.target.value})}
                  placeholder="Añade comentarios o notas sobre la propiedad..."
                  rows={3}
                />
              </div>
            </div>

            {/* Interés en Venta/Alquiler */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Interés en Venta/Alquiler</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.forRent}
                      onChange={(e) => setFormData({...formData, forRent: e.target.checked})}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Disponible para Alquiler</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.forSale}
                      onChange={(e) => setFormData({...formData, forSale: e.target.checked})}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Disponible para Venta</span>
                  </label>
                </div>
                
                {formData.forSale && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="salePrice">Precio de Venta (USD)</Label>
                      <Input
                        id="salePrice"
                        type="number"
                        value={formData.salePrice}
                        onChange={(e) => setFormData({...formData, salePrice: e.target.value})}
                        placeholder="250000"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="saleDescription">Información adicional de venta</Label>
                      <Textarea
                        id="saleDescription"
                        value={formData.saleDescription}
                        onChange={(e) => setFormData({...formData, saleDescription: e.target.value})}
                        placeholder="Detalles adicionales sobre la venta..."
                        rows={2}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Asignación de Usuarios */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Asignación de Usuarios</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ownerId">Propietario *</Label>
                  <Select value={formData.ownerId} onValueChange={(v) => setFormData({...formData, ownerId: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar propietario" />
                    </SelectTrigger>
                    <SelectContent>
                      {owners.map((owner) => (
                        <SelectItem key={owner.id} value={owner.id}>{owner.name} ({owner.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminId">Administrador *</Label>
                  <Select value={formData.adminId} onValueChange={(v) => setFormData({...formData, adminId: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar administrador" />
                    </SelectTrigger>
                    <SelectContent>
                      {admins.map((admin) => (
                        <SelectItem key={admin.id} value={admin.id}>{admin.name} ({admin.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {owners.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300">
                  <strong>Nota:</strong> Si no ves usuarios en las listas, primero debes crear usuarios con rol de Propietario y Administrador.
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || uploading}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar Propiedad
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para Editar Propiedad */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Propiedad</DialogTitle>
            <DialogDescription>
              Modifica los datos de la propiedad. Los campos con * son obligatorios.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-6">
            {/* Información básica */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Información Básica</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-title">Título *</Label>
                  <Input
                    id="edit-title"
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                    placeholder="Ej: Apartamento Vista Mar en Paitilla"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-propertyType">Tipo de Propiedad *</Label>
                  <Select value={editFormData.propertyType} onValueChange={(v) => setEditFormData({...editFormData, propertyType: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {propertyTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Estado *</Label>
                  <Select value={editFormData.status} onValueChange={(v) => setEditFormData({...editFormData, status: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-fincaNumber">Número de Finca</Label>
                  <Input
                    id="edit-fincaNumber"
                    value={editFormData.fincaNumber}
                    onChange={(e) => setEditFormData({...editFormData, fincaNumber: e.target.value})}
                    placeholder="Ej: 123456"
                  />
                </div>
              </div>
            </div>

            {/* Ubicación */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Ubicación</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-province">Provincia *</Label>
                  <Select value={editFormData.province} onValueChange={(v) => setEditFormData({...editFormData, province: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar provincia" />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((prov) => (
                        <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-district">Distrito *</Label>
                  <Input
                    id="edit-district"
                    value={editFormData.district}
                    onChange={(e) => setEditFormData({...editFormData, district: e.target.value})}
                    placeholder="Ej: Panamá"
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-address">Dirección Exacta *</Label>
                  <Input
                    id="edit-address"
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                    placeholder="Ej: Av. Balboa, Edificio Vista Mar, Apt 15-03"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border p-4">
              <div>
                <h4 className="font-medium text-sm">Datos de contacto del PH</h4>
                <p className="mt-1 text-xs text-muted-foreground">Administración, conserjería o contacto principal del edificio.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-phContactName">Nombre del contacto</Label>
                  <Input id="edit-phContactName" value={editFormData.phContactName} onChange={(e) => setEditFormData({...editFormData, phContactName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phContactPhone">Teléfono</Label>
                  <Input id="edit-phContactPhone" type="tel" value={editFormData.phContactPhone} onChange={(e) => setEditFormData({...editFormData, phContactPhone: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phContactEmail">Correo</Label>
                  <Input id="edit-phContactEmail" type="email" value={editFormData.phContactEmail} onChange={(e) => setEditFormData({...editFormData, phContactEmail: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Características */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Características</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-totalArea">Área Total (m²) *</Label>
                  <Input
                    id="edit-totalArea"
                    type="number"
                    value={editFormData.totalArea}
                    onChange={(e) => setEditFormData({...editFormData, totalArea: e.target.value})}
                    placeholder="150"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-bedrooms">Recámaras</Label>
                  <Input
                    id="edit-bedrooms"
                    type="number"
                    value={editFormData.bedrooms}
                    onChange={(e) => setEditFormData({...editFormData, bedrooms: e.target.value})}
                    placeholder="3"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-bathrooms">Baños *</Label>
                  <Input
                    id="edit-bathrooms"
                    type="number"
                    value={editFormData.bathrooms}
                    onChange={(e) => setEditFormData({...editFormData, bathrooms: e.target.value})}
                    placeholder="2"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-parkingSpaces">Estacionamientos *</Label>
                  <Input
                    id="edit-parkingSpaces"
                    type="number"
                    value={editFormData.parkingSpaces}
                    onChange={(e) => setEditFormData({...editFormData, parkingSpaces: e.target.value})}
                    placeholder="2"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {[
                  ['hasTerrace', 'Terraza'],
                  ['hasBalcony', 'Balcón'],
                  ['hasDen', 'Den'],
                  ['hasSocialArea', 'Área social'],
                  ['hasMaidRoomBathroom', 'CDE (cuarto y baño de empleada)'],
                ].map(([field, label]) => (
                  <label key={field} className="flex min-h-11 items-center gap-3 rounded-md border bg-background px-3 py-2 text-sm">
                    <input type="checkbox" checked={Boolean(editFormData[field as keyof typeof editFormData])} onChange={(event) => setEditFormData({...editFormData, [field]: event.target.checked})} className="rounded border-gray-300" />
                    {label}
                  </label>
                ))}
              </div>
              {editFormData.hasSocialArea && (
                <div className="space-y-2">
                  <Label htmlFor="edit-socialAreaDescription">Características del área social</Label>
                  <Textarea id="edit-socialAreaDescription" value={editFormData.socialAreaDescription} onChange={(e) => setEditFormData({...editFormData, socialAreaDescription: e.target.value})} rows={3} />
                </div>
              )}
            </div>

            {/* Información Financiera */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Información Financiera</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-monthlyRent">Alquiler Mensual (USD) *</Label>
                  <Input
                    id="edit-monthlyRent"
                    type="number"
                    value={editFormData.monthlyRent}
                    onChange={(e) => setEditFormData({...editFormData, monthlyRent: e.target.value})}
                    placeholder="2500"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="font-medium text-sm">Gastos fijos recurrentes</h4>
                  <p className="mt-1 text-xs text-muted-foreground">Puedes cambiar monto, frecuencia o vigencia sin alterar los gastos ya registrados.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addEditFixedExpense}><Plus className="mr-2 h-4 w-4" />Agregar gasto fijo</Button>
              </div>
              {editFixedExpenses.length === 0 ? (
                <p className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">No hay gastos recurrentes activos.</p>
              ) : (
                <div className="space-y-4">
                  {editFixedExpenses.map((expense, index) => (
                    <div key={expense.id} className="space-y-4 rounded-lg border bg-muted/30 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">Gasto {index + 1}</p>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setEditFixedExpenses(current => current.filter(item => item.id !== expense.id))} aria-label={`Eliminar gasto fijo ${index + 1}`}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Nombre del gasto</Label>
                          <Input value={expense.title} onChange={(event) => updateEditFixedExpense(expense.id, { title: event.target.value })} required />
                        </div>
                        <div className="space-y-2">
                          <Label>Categoría</Label>
                          <Select value={expense.category} onValueChange={(value) => updateEditFixedExpense(expense.id, { category: value })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{expenseCategories.map(category => <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Frecuencia</Label>
                          <Select value={String(expense.frequencyMonths)} onValueChange={(value) => updateEditFixedExpense(expense.id, { frequencyMonths: Number(value) })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{expenseFrequencies.map(frequency => <SelectItem key={frequency.value} value={String(frequency.value)}>{frequency.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2"><Label>Monto (USD)</Label><Input type="number" min="0.01" step="0.01" value={expense.amount} onChange={(event) => updateEditFixedExpense(expense.id, { amount: event.target.value })} required /></div>
                        <div className="space-y-2"><Label>Fecha de inicio</Label><Input type="date" value={expense.startsAt} onChange={(event) => updateEditFixedExpense(expense.id, { startsAt: event.target.value })} required /></div>
                        <div className="space-y-2"><Label>Fecha de finalización</Label><Input type="date" min={expense.startsAt || undefined} value={expense.endsAt} onChange={(event) => updateEditFixedExpense(expense.id, { endsAt: event.target.value })} /><p className="text-xs text-muted-foreground">Opcional.</p></div>
                        <label className="flex min-h-10 items-center gap-3 rounded-md border bg-background px-3 py-2 text-sm"><input type="checkbox" checked={expense.paidByAdmin} onChange={(event) => updateEditFixedExpense(expense.id, { paidByAdmin: event.target.checked })} className="rounded border-gray-300" />Gestionado por el administrador</label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fotos */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Fotos de la Propiedad
              </h4>
              <div className="space-y-3">
                {/* Upload area */}
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleEditFileSelect}
                    className="hidden"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => editFileInputRef.current?.click()}
                    disabled={editUploading}
                  >
                    {editUploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {editUploading ? 'Subiendo...' : 'Agregar Fotos'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Puedes agregar más imágenes. JPG, PNG o WEBP. Máximo 10MB por imagen.
                  </p>
                </div>

                {/* Photo previews */}
                {editPhotos.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {editPhotos.map((photo, index) => (
                      <div 
                        key={index}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          editMainPhotoIndex === index 
                            ? 'border-primary ring-2 ring-primary/20' 
                            : 'border-transparent hover:border-muted-foreground/30'
                        }`}
                      >
                        <img 
                          src={photo.preview} 
                          alt={`Foto ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Main photo badge */}
                        {editMainPhotoIndex === index && (
                          <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                            Principal
                          </div>
                        )}
                        
                        {/* Uploading indicator */}
                        {!photo.uploaded && (
                          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          </div>
                        )}
                        
                        {/* Actions overlay */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          {editMainPhotoIndex !== index && (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => setAsEditMainPhoto(index)}
                            >
                              <ImageIcon className="h-4 w-4 mr-1" />
                              Principal
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => removeEditPhoto(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {editPhotos.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {editPhotos.length} foto{editPhotos.length !== 1 ? 's' : ''}. 
                    Haz clic en una foto para marcarla como principal.
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || editUploading}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </SidebarProvider>
  )
}
