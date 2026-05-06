'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, Plus, Search, Filter, MoreHorizontal, Eye, Download, Calendar, User, Building2, Loader2, Trash2, Edit, Upload, X, FileIcon, ImageIcon } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { generateContractPDF } from '@/lib/pdf-utils'

// Interfaz para archivos adjuntos
interface Attachment {
  name: string
  url: string
  type: string
  size: number
}

interface Contract {
  id: string
  contractNumber: string
  contractType: string
  startDate: string
  endDate: string
  monthlyAmount: number
  depositAmount: number | null
  terms: string | null
  documentUrl: string | null
  attachments: string | null
  status: string
  property: { id: string; title: string; address: string } | null
  owner: { id: string; name: string; email: string; phone?: string } | null
  tenant: { id: string; name: string; email: string; phone?: string } | null
  isActive: boolean
  daysRemaining: number
  durationMonths?: number
  totalContractValue?: number
}

interface Property {
  id: string
  title: string
  address: string
  ownerId: string
  owner: { id: string; name: string }
}

interface TenantUser {
  id: string
  name: string
  email: string
  role: string
}

const CONTRACT_TYPES = ['ARRENDAMIENTO', 'ADMINISTRACION'] as const
const CONTRACT_STATUSES = ['VIGENTE', 'VENCIDO', 'CANCELADO', 'RENOVADO'] as const

export default function ContratosPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [tenants, setTenants] = useState<TenantUser[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  // Detail dialog state
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const [editFormData, setEditFormData] = useState({
    contractType: 'ARRENDAMIENTO' as typeof CONTRACT_TYPES[number],
    contractNumber: '',
    startDate: '',
    endDate: '',
    monthlyAmount: '',
    depositAmount: '',
    terms: '',
    tenantId: '',
    status: 'VIGENTE' as typeof CONTRACT_STATUSES[number],
  })
  const [editAttachments, setEditAttachments] = useState<Attachment[]>([])
  const [editUploading, setEditUploading] = useState(false)

  // Delete confirmation state
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // File upload state
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    contractType: 'ARRENDAMIENTO' as typeof CONTRACT_TYPES[number],
    contractNumber: '',
    startDate: '',
    endDate: '',
    monthlyAmount: '',
    depositAmount: '',
    terms: '',
    propertyId: '',
    ownerId: '',
    tenantId: '',
  })

  // Memoized valid tenant ID for edit form
  const validEditTenantId = useMemo(() => {
    if (!editFormData.tenantId) return ''
    const exists = tenants.some(t => t.id === editFormData.tenantId)
    return exists ? editFormData.tenantId : ''
  }, [editFormData.tenantId, tenants])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [contractsRes, propertiesRes, tenantsRes] = await Promise.all([
        fetch('/api/contracts'),
        fetch('/api/properties'),
        fetch('/api/users?role=INQUILINO'),
      ])

      if (contractsRes.ok) {
        const data = await contractsRes.json()
        setContracts(data.data || [])
      }
      if (propertiesRes.ok) {
        const data = await propertiesRes.json()
        setProperties(data.properties || data.data || [])
      }
      if (tenantsRes.ok) {
        const data = await tenantsRes.json()
        setTenants(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Función para manejar la subida de archivos
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setUploading(true)

    try {
      for (const file of Array.from(files)) {
        // Validar tipo de archivo
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
          toast({
            title: 'Archivo no permitido',
            description: `${file.name} no es un archivo permitido. Solo PDF, JPG, PNG, WEBP.`,
            variant: 'destructive',
          })
          continue
        }

        // Validar tamaño (máximo 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: 'Archivo muy grande',
            description: `${file.name} excede el límite de 10MB.`,
            variant: 'destructive',
          })
          continue
        }

        // Crear FormData y subir
        const formDataToSend = new FormData()
        formDataToSend.append('file', file)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formDataToSend,
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setAttachments(prev => [...prev, {
              name: file.name,
              url: data.data.fileUrl,
              type: file.type,
              size: file.size,
            }])
          } else {
            toast({
              title: 'Error al subir',
              description: data.error || `No se pudo subir ${file.name}`,
              variant: 'destructive',
            })
          }
        } else {
          const errorData = await response.json()
          toast({
            title: 'Error al subir',
            description: errorData.error || `No se pudo subir ${file.name}`,
            variant: 'destructive',
          })
        }
      }
    } catch (error) {
      console.error('Error uploading files:', error)
      toast({
        title: 'Error',
        description: 'Error al subir los archivos',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Función para subir archivos en el modo edición
  const handleEditFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setEditUploading(true)

    try {
      for (const file of Array.from(files)) {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
          toast({
            title: 'Archivo no permitido',
            description: `${file.name} no es un archivo permitido. Solo PDF, JPG, PNG, WEBP.`,
            variant: 'destructive',
          })
          continue
        }

        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: 'Archivo muy grande',
            description: `${file.name} excede el límite de 10MB.`,
            variant: 'destructive',
          })
          continue
        }

        // Crear FormData y subir
        const formDataToSend = new FormData()
        formDataToSend.append('file', file)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formDataToSend,
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setEditAttachments(prev => [...prev, {
              name: file.name,
              url: data.data.fileUrl,
              type: file.type,
              size: file.size,
            }])
          } else {
            toast({
              title: 'Error al subir',
              description: data.error || `No se pudo subir ${file.name}`,
              variant: 'destructive',
            })
          }
        } else {
          const errorData = await response.json()
          toast({
            title: 'Error al subir',
            description: errorData.error || `No se pudo subir ${file.name}`,
            variant: 'destructive',
          })
        }
      }
    } catch (error) {
      console.error('Error uploading files:', error)
      toast({
        title: 'Error',
        description: 'Error al subir los archivos',
        variant: 'destructive',
      })
    } finally {
      setEditUploading(false)
      if (editFileInputRef.current) {
        editFileInputRef.current.value = ''
      }
    }
  }

  // Función para eliminar un adjunto
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const removeEditAttachment = (index: number) => {
    setEditAttachments(prev => prev.filter((_, i) => i !== index))
  }

  // Función para formatear tamaño de archivo
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Función para obtener icono según tipo de archivo
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />
    return <FileIcon className="h-4 w-4" />
  }

  // Función para parsear attachments de un contrato
  const parseAttachments = (attachmentsStr: string | null): Attachment[] => {
    if (!attachmentsStr) return []
    try {
      return JSON.parse(attachmentsStr)
    } catch {
      return []
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.propertyId || !formData.contractNumber || !formData.startDate || !formData.endDate || !formData.monthlyAmount) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos requeridos',
        variant: 'destructive',
      })
      return
    }

    const selectedProperty = properties.find(p => p.id === formData.propertyId)
    if (!selectedProperty) {
      toast({
        title: 'Error',
        description: 'Selecciona una propiedad válida',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractType: formData.contractType,
          contractNumber: formData.contractNumber,
          startDate: formData.startDate,
          endDate: formData.endDate,
          monthlyAmount: parseFloat(formData.monthlyAmount),
          depositAmount: formData.depositAmount ? parseFloat(formData.depositAmount) : null,
          terms: formData.terms || null,
          propertyId: formData.propertyId,
          ownerId: selectedProperty.ownerId,
          tenantId: formData.tenantId || null,
          attachments: attachments.length > 0 ? JSON.stringify(attachments) : null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Contrato creado',
          description: 'El contrato se ha registrado exitosamente.',
        })
        setDialogOpen(false)
        resetForm()
        fetchData()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'No se pudo crear el contrato',
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

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingContract || !editFormData.contractNumber || !editFormData.startDate || !editFormData.endDate || !editFormData.monthlyAmount) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos requeridos',
        variant: 'destructive',
      })
      return
    }

    const monthlyAmountNum = parseFloat(editFormData.monthlyAmount)
    if (isNaN(monthlyAmountNum) || monthlyAmountNum < 0) {
      toast({
        title: 'Error',
        description: 'El monto mensual debe ser un número válido',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`/api/contracts/${editingContract.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractNumber: editFormData.contractNumber,
          contractType: editFormData.contractType,
          startDate: editFormData.startDate,
          endDate: editFormData.endDate,
          monthlyAmount: monthlyAmountNum,
          depositAmount: editFormData.depositAmount ? parseFloat(editFormData.depositAmount) : null,
          terms: editFormData.terms || null,
          status: editFormData.status,
          tenantId: editFormData.tenantId || null,
          attachments: editAttachments.length > 0 ? JSON.stringify(editAttachments) : null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Contrato actualizado',
          description: 'El contrato se ha actualizado exitosamente.',
        })
        setEditOpen(false)
        setEditingContract(null)
        fetchData()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'No se pudo actualizar el contrato',
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

  const handleDelete = async () => {
    if (!deletingId) return

    setDeleting(true)

    try {
      const response = await fetch(`/api/contracts/${deletingId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Contrato eliminado',
          description: 'El contrato se ha eliminado exitosamente.',
        })
        setDeleteOpen(false)
        setDeletingId(null)
        fetchData()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'No se pudo eliminar el contrato',
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
      setDeleting(false)
    }
  }

  const handleDownloadPDF = (contract: Contract) => {
    try {
      const doc = generateContractPDF({
        contractNumber: contract.contractNumber || 'N/A',
        property: {
          title: contract.property?.title || 'N/A',
          address: contract.property?.address || 'N/A',
          province: ''
        },
        owner: {
          name: contract.owner?.name || 'N/A',
          email: contract.owner?.email || ''
        },
        tenant: contract.tenant ? {
          name: contract.tenant.name || 'N/A',
          email: contract.tenant.email || ''
        } : {
          name: 'Sin inquilino',
          email: ''
        },
        startDate: new Date(contract.startDate),
        endDate: new Date(contract.endDate),
        monthlyRent: contract.monthlyAmount ?? 0,
        depositAmount: contract.depositAmount ?? undefined
      })

      doc.save(`contrato_${contract.contractNumber || 'download'}.pdf`)

      toast({
        title: 'PDF descargado',
        description: 'El contrato se ha descargado exitosamente.',
      })
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast({
        title: 'Error',
        description: 'No se pudo generar el PDF',
        variant: 'destructive',
      })
    }
  }

  const openDetail = async (contract: Contract) => {
    try {
      const response = await fetch(`/api/contracts/${contract.id}`)
      const data = await response.json()
      if (data.success) {
        setSelectedContract(data.data)
      } else {
        setSelectedContract(contract)
      }
    } catch {
      setSelectedContract(contract)
    }
    setDetailOpen(true)
  }

  const openEdit = (contract: Contract) => {
    if (!contract) {
      toast({
        title: 'Error',
        description: 'No se pudo cargar el contrato para editar',
        variant: 'destructive',
      })
      return
    }

    setEditingContract(contract)

    // Safe date parsing
    let startDateStr = ''
    let endDateStr = ''

    try {
      if (contract.startDate) {
        const startDate = new Date(contract.startDate)
        if (!isNaN(startDate.getTime())) {
          startDateStr = startDate.toISOString().split('T')[0]
        }
      }
    } catch (e) {
      console.error('Error parsing startDate:', e)
    }

    try {
      if (contract.endDate) {
        const endDate = new Date(contract.endDate)
        if (!isNaN(endDate.getTime())) {
          endDateStr = endDate.toISOString().split('T')[0]
        }
      }
    } catch (e) {
      console.error('Error parsing endDate:', e)
    }

    // Validate and set contractType
    const contractType = CONTRACT_TYPES.includes(contract.contractType as typeof CONTRACT_TYPES[number])
      ? contract.contractType as typeof CONTRACT_TYPES[number]
      : 'ARRENDAMIENTO'

    // Validate and set status
    const status = CONTRACT_STATUSES.includes(contract.status as typeof CONTRACT_STATUSES[number])
      ? contract.status as typeof CONTRACT_STATUSES[number]
      : 'VIGENTE'

    // Parsear attachments existentes
    const existingAttachments = parseAttachments(contract.attachments)
    setEditAttachments(existingAttachments)

    setEditFormData({
      contractType,
      contractNumber: contract.contractNumber || '',
      startDate: startDateStr,
      endDate: endDateStr,
      monthlyAmount: String(contract.monthlyAmount ?? 0),
      depositAmount: contract.depositAmount != null ? String(contract.depositAmount) : '',
      terms: contract.terms || '',
      tenantId: contract.tenant?.id || '',
      status,
    })

    setEditOpen(true)
  }

  const openDelete = (id: string) => {
    setDeletingId(id)
    setDeleteOpen(true)
  }

  const resetForm = () => {
    setFormData({
      contractType: 'ARRENDAMIENTO',
      contractNumber: '',
      startDate: '',
      endDate: '',
      monthlyAmount: '',
      depositAmount: '',
      terms: '',
      propertyId: '',
      ownerId: '',
      tenantId: '',
    })
    setAttachments([])
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A'
    try {
      return new Date(dateStr).toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch {
      return 'N/A'
    }
  }

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (status === 'VIGENTE' && isActive) {
      return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Vigente</Badge>
    } else if (status === 'VIGENTE' && !isActive) {
      return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Por vencer</Badge>
    } else if (status === 'CANCELADO') {
      return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Cancelado</Badge>
    } else if (status === 'RENOVADO') {
      return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Renovado</Badge>
    }
    return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">Vencido</Badge>
  }

  const getContractProgress = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return 0
    try {
      const start = new Date(startDate).getTime()
      const end = new Date(endDate).getTime()
      const now = new Date().getTime()

      if (isNaN(start) || isNaN(end)) return 0
      if (now < start) return 0
      if (now > end) return 100

      const total = end - start
      if (total <= 0) return 0

      const elapsed = now - start
      return Math.round((elapsed / total) * 100)
    } catch {
      return 0
    }
  }

  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <Header />

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Contratos</h1>
                <p className="text-muted-foreground">Gestión de contratos de arrendamiento</p>
              </div>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Contrato
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar contratos..." className="pl-9" />
                  </div>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    Filtros
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Listado de Contratos</CardTitle>
                <CardDescription>{contracts.length} contratos registrados</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : contracts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay contratos registrados</p>
                    <p className="text-sm">Haz clic en "Nuevo Contrato" para agregar uno</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Propiedad</TableHead>
                        <TableHead className="hidden md:table-cell">Inquilino</TableHead>
                        <TableHead className="hidden lg:table-cell">Vigencia</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contracts.map((contract) => (
                        <TableRow key={contract.id}>
                          <TableCell className="font-mono font-medium">{contract.contractNumber}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {contract.property?.title || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {contract.tenant ? (
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                {contract.tenant.name}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            ${(contract.monthlyAmount ?? 0).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(contract.status, contract.isActive)}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openDetail(contract)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver detalle
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownloadPDF(contract)}>
                                  <Download className="h-4 w-4 mr-2" />
                                  Descargar PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEdit(contract)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => openDelete(contract.id)}
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

      {/* Dialog para Nuevo Contrato */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Contrato</DialogTitle>
            <DialogDescription>
              Registra un nuevo contrato de arrendamiento.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contractNumber">Número de Contrato *</Label>
                <Input
                  id="contractNumber"
                  value={formData.contractNumber}
                  onChange={(e) => setFormData({...formData, contractNumber: e.target.value})}
                  placeholder="Ej: CTR-2025-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractType">Tipo de Contrato *</Label>
                <Select value={formData.contractType} onValueChange={(v) => setFormData({...formData, contractType: v as typeof CONTRACT_TYPES[number]})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARRENDAMIENTO">Arrendamiento</SelectItem>
                    <SelectItem value="ADMINISTRACION">Administración</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="propertyId">Propiedad *</Label>
                <Select value={formData.propertyId || undefined} onValueChange={(v) => setFormData({...formData, propertyId: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar propiedad" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((prop) => (
                      <SelectItem key={prop.id} value={prop.id}>{prop.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formData.contractType === 'ARRENDAMIENTO' && (
                <div className="space-y-2">
                  <Label htmlFor="tenantId">Inquilino</Label>
                  <Select value={formData.tenantId || undefined} onValueChange={(v) => setFormData({...formData, tenantId: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar inquilino" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="startDate">Fecha de Inicio *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Fecha de Fin *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthlyAmount">Monto Mensual (USD) *</Label>
                <Input
                  id="monthlyAmount"
                  type="number"
                  value={formData.monthlyAmount}
                  onChange={(e) => setFormData({...formData, monthlyAmount: e.target.value})}
                  placeholder="2500"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="depositAmount">Depósito (USD)</Label>
                <Input
                  id="depositAmount"
                  type="number"
                  value={formData.depositAmount}
                  onChange={(e) => setFormData({...formData, depositAmount: e.target.value})}
                  placeholder="2500"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="terms">Términos y Condiciones</Label>
              <textarea
                id="terms"
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.terms}
                onChange={(e) => setFormData({...formData, terms: e.target.value})}
                placeholder="Condiciones del contrato..."
              />
            </div>

            {/* Sección de Archivos Adjuntos */}
            <div className="space-y-2">
              <Label>Archivos Adjuntos</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Seleccionar archivos
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    PDF, JPG, PNG, WEBP hasta 10MB cada uno
                  </p>
                </div>
              </div>

              {/* Lista de archivos adjuntos */}
              {attachments.length > 0 && (
                <div className="space-y-2 mt-3">
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        {getFileIcon(file.type)}
                        <div>
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAttachment(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar Contrato
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para Ver Detalle */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Contrato</DialogTitle>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Número de Contrato</p>
                  <p className="font-mono font-medium text-lg">{selectedContract.contractNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <Badge variant="outline">
                    {selectedContract.contractType === 'ARRENDAMIENTO' ? 'Arrendamiento' : 'Administración'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  {getStatusBadge(selectedContract.status, selectedContract.isActive)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Propiedad</p>
                  <p className="font-medium">{selectedContract.property?.title || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">{selectedContract.property?.address}</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground mb-2">Vigencia</p>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(selectedContract.startDate)}</span>
                  </div>
                  <span className="text-muted-foreground">→</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(selectedContract.endDate)}</span>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progreso</span>
                    <span>{selectedContract.daysRemaining} días restantes</span>
                  </div>
                  <Progress
                    value={getContractProgress(selectedContract.startDate, selectedContract.endDate)}
                    className="h-2"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Propietario</p>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{selectedContract.owner?.name || 'N/A'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">{selectedContract.owner?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Inquilino</p>
                  {selectedContract.tenant ? (
                    <>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{selectedContract.tenant.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground ml-6">{selectedContract.tenant.email}</p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">Sin inquilino asignado</p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium text-lg">Monto mensual:</span>
                  <span className="font-bold text-lg text-primary">
                    ${(selectedContract.monthlyAmount ?? 0).toLocaleString()}
                  </span>
                </div>
                {selectedContract.depositAmount != null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Depósito:</span>
                    <span className="font-medium">${selectedContract.depositAmount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {selectedContract.terms && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Términos y Condiciones</p>
                    <p className="text-sm bg-muted/50 rounded-lg p-3">{selectedContract.terms}</p>
                  </div>
                </>
              )}

              {/* Archivos Adjuntos */}
              {parseAttachments(selectedContract.attachments).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Archivos Adjuntos</p>
                    <div className="space-y-2">
                      {parseAttachments(selectedContract.attachments).map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            {getFileIcon(file.type)}
                            <div>
                              <p className="text-sm font-medium">{file.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(file.url, '_blank')}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Cerrar
            </Button>
            {selectedContract && (
              <Button onClick={() => handleDownloadPDF(selectedContract)}>
                <Download className="h-4 w-4 mr-2" />
                Descargar PDF
              </Button>
            )}
            <Button onClick={() => {
              setDetailOpen(false)
              if (selectedContract) openEdit(selectedContract)
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Editar Contrato */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Contrato</DialogTitle>
            <DialogDescription>
              Modifica los datos del contrato.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-contractNumber">Número de Contrato *</Label>
                <Input
                  id="edit-contractNumber"
                  value={editFormData.contractNumber}
                  onChange={(e) => setEditFormData({...editFormData, contractNumber: e.target.value})}
                  placeholder="Ej: CTR-2025-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contractType">Tipo de Contrato *</Label>
                <Select value={editFormData.contractType} onValueChange={(v) => setEditFormData({...editFormData, contractType: v as typeof CONTRACT_TYPES[number]})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARRENDAMIENTO">Arrendamiento</SelectItem>
                    <SelectItem value="ADMINISTRACION">Administración</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Estado *</Label>
                <Select value={editFormData.status} onValueChange={(v) => setEditFormData({...editFormData, status: v as typeof CONTRACT_STATUSES[number]})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIGENTE">Vigente</SelectItem>
                    <SelectItem value="VENCIDO">Vencido</SelectItem>
                    <SelectItem value="CANCELADO">Cancelado</SelectItem>
                    <SelectItem value="RENOVADO">Renovado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editFormData.contractType === 'ARRENDAMIENTO' && (
                <div className="space-y-2">
                  <Label htmlFor="edit-tenantId">Inquilino</Label>
                  <Select
                    value={validEditTenantId || undefined}
                    onValueChange={(v) => setEditFormData({...editFormData, tenantId: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar inquilino" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-startDate">Fecha de Inicio *</Label>
                <Input
                  id="edit-startDate"
                  type="date"
                  value={editFormData.startDate}
                  onChange={(e) => setEditFormData({...editFormData, startDate: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-endDate">Fecha de Fin *</Label>
                <Input
                  id="edit-endDate"
                  type="date"
                  value={editFormData.endDate}
                  onChange={(e) => setEditFormData({...editFormData, endDate: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-monthlyAmount">Monto Mensual (USD) *</Label>
                <Input
                  id="edit-monthlyAmount"
                  type="number"
                  value={editFormData.monthlyAmount}
                  onChange={(e) => setEditFormData({...editFormData, monthlyAmount: e.target.value})}
                  placeholder="2500"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-depositAmount">Depósito (USD)</Label>
                <Input
                  id="edit-depositAmount"
                  type="number"
                  value={editFormData.depositAmount}
                  onChange={(e) => setEditFormData({...editFormData, depositAmount: e.target.value})}
                  placeholder="2500"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-terms">Términos y Condiciones</Label>
              <textarea
                id="edit-terms"
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editFormData.terms}
                onChange={(e) => setEditFormData({...editFormData, terms: e.target.value})}
                placeholder="Condiciones del contrato..."
              />
            </div>

            {/* Sección de Archivos Adjuntos en Edición */}
            <div className="space-y-2">
              <Label>Archivos Adjuntos</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                <input
                  ref={editFileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleEditFileUpload}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => editFileInputRef.current?.click()}
                    disabled={editUploading}
                  >
                    {editUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Agregar archivos
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    PDF, JPG, PNG, WEBP hasta 10MB cada uno
                  </p>
                </div>
              </div>

              {/* Lista de archivos adjuntos en edición */}
              {editAttachments.length > 0 && (
                <div className="space-y-2 mt-3">
                  {editAttachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        {getFileIcon(file.type)}
                        <div>
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEditAttachment(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog para Eliminar */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El contrato será eliminado permanentemente.
              Si tiene pagos asociados, no se podrá eliminar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  )
}
