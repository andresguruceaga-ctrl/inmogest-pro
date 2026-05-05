'use client'

import { useState, useEffect } from 'react'
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
import {
  HelpCircle, Plus, Search, Filter, MoreHorizontal, Eye, AlertTriangle, Clock, CheckCircle,
  Loader2, Trash2, Edit, MessageSquare, X, Paperclip, FileText, Image, Download, Upload
} from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface Ticket {
  id: string
  title: string
  description: string
  category: string | null
  status: string
  priority: string
  photos: string | null
  attachments: string | null
  response: string | null
  createdAt: string
  property: {
    id: string
    title: string
    address: string
  }
  user: {
    id: string
    name: string
    email: string
  }
}

interface Property {
  id: string
  title: string
  address: string
}

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'inquilino' | 'propietario'
}

interface Attachment {
  name: string
  type: string
  url: string
}

const statusOptions = [
  { value: 'ABIERTO', label: 'Abierto', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  { value: 'EN_PROCESO', label: 'En Proceso', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  { value: 'RESUELTO', label: 'Resuelto', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  { value: 'CERRADO', label: 'Cerrado', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
]

const priorityOptions = [
  { value: 'BAJA', label: 'Baja', color: 'bg-gray-500' },
  { value: 'MEDIA', label: 'Media', color: 'bg-yellow-500' },
  { value: 'ALTA', label: 'Alta', color: 'bg-orange-500' },
  { value: 'URGENTE', label: 'Urgente', color: 'bg-red-500' },
]

const categoryOptions = [
  { value: 'REPARACION', label: 'Reparacion' },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento' },
  { value: 'PRESUPUESTO', label: 'Solicitud de Presupuesto' },
  { value: 'MEJORA', label: 'Mejora/Remodelacion' },
  { value: 'SERVICIO', label: 'Servicio Tecnico' },
  { value: 'INSPECCION', label: 'Inspeccion' },
  { value: 'OTRO', label: 'Otro' },
]

export default function SoportePage() {
  const { toast } = useToast()

  const [tickets, setTickets] = useState<Ticket[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<Array<{file: File, preview: string}>>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'MEDIA',
    status: 'ABIERTO',
    propertyId: '',
    response: '',
  })

  useEffect(() => {
    const userStr = localStorage.getItem('inmogest-pro-storage')
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr)
        if (parsed.state?.user) {
          setCurrentUser(parsed.state.user)
        }
      } catch (e) {
        console.error('Error parsing user from localStorage:', e)
      }
    }
  }, [])

  useEffect(() => {
    if (currentUser) {
      fetchTickets()
      fetchProperties()
    }
  }, [currentUser])

  const fetchTickets = async () => {
    try {
      let url = '/api/tickets'

      if (currentUser?.role === 'inquilino') {
        url += `?userId=${currentUser.id}`
      } else if (currentUser?.role === 'propietario') {
        const propsResponse = await fetch('/api/properties')
        if (propsResponse.ok) {
          const propsData = await propsResponse.json()
          const userProperties = (propsData.properties || []).filter(
            (p: { ownerId: string }) => p.ownerId === currentUser.id
          )
          const propertyIds = userProperties.map((p: { id: string }) => p.id)
          if (propertyIds.length > 0) {
            const response = await fetch(url)
            if (response.ok) {
              const data = await response.json()
              const allTickets = data.data || data.tickets || []
              const filteredTickets = allTickets.filter(
                (t: Ticket) => propertyIds.includes(t.property.id)
              )
              setTickets(filteredTickets)
            }
          } else {
            setTickets([])
          }
        }
        setLoading(false)
        return
      }

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setTickets(data.data || data.tickets || [])
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProperties = async () => {
    try {
      const response = await fetch('/api/properties')
      if (response.ok) {
        const data = await response.json()
        let userProperties = data.properties || []

        if (currentUser?.role === 'inquilino') {
          const contractsResponse = await fetch('/api/contracts')
          if (contractsResponse.ok) {
            const contractsData = await contractsResponse.json()
            const userContract = (contractsData.contracts || []).find(
              (c: { tenantId: string; propertyId: string }) => c.tenantId === currentUser.id
            )
            if (userContract) {
              userProperties = userProperties.filter(
                (p: { id: string }) => p.id === userContract.propertyId
              )
            } else {
              userProperties = []
            }
          }
        } else if (currentUser?.role === 'propietario') {
          userProperties = userProperties.filter(
            (p: { ownerId: string }) => p.ownerId === currentUser.id
          )
        }

        setProperties(userProperties)
      }
    } catch (error) {
      console.error('Error fetching properties:', error)
    }
  }

  // File handling functions
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newFiles: Array<{file: File, preview: string}> = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Archivo no valido',
          description: `${file.name} no es un tipo de archivo permitido (PDF, JPG, PNG, WEBP)`,
          variant: 'destructive',
        })
        continue
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'Archivo muy grande',
          description: `${file.name} excede el tamano maximo de 10MB`,
          variant: 'destructive',
        })
        continue
      }

      const preview = file.type.startsWith('image/') 
        ? URL.createObjectURL(file) 
        : 'pdf'
      
      newFiles.push({ file, preview })
    }

    setPendingFiles([...pendingFiles, ...newFiles])
    e.target.value = ''
  }

  const removePendingFile = (index: number) => {
    const newFiles = [...pendingFiles]
    if (newFiles[index].preview.startsWith('blob:')) {
      URL.revokeObjectURL(newFiles[index].preview)
    }
    newFiles.splice(index, 1)
    setPendingFiles(newFiles)
  }

  const uploadFiles = async (): Promise<string | null> => {
    if (pendingFiles.length === 0) return null

    setUploadingFiles(true)
    const uploadedFiles: Array<{name: string, type: string, url: string}> = []

    try {
      for (const { file } of pendingFiles) {
        const formDataUpload = new FormData()
        formDataUpload.append('file', file)
        formDataUpload.append('folder', 'tickets')

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formDataUpload,
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            uploadedFiles.push({
              name: file.name,
              type: file.type,
              url: data.data.fileUrl,
            })
          }
        }
      }

      return JSON.stringify(uploadedFiles)
    } catch (error) {
      console.error('Error uploading files:', error)
      return null
    } finally {
      setUploadingFiles(false)
    }
  }

  const parseAttachments = (attachmentsStr: string | null): Attachment[] => {
    if (!attachmentsStr) return []
    try {
      return JSON.parse(attachmentsStr)
    } catch {
      return []
    }
  }

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title || !formData.description || !formData.propertyId) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos requeridos',
        variant: 'destructive',
      })
      return
    }

    if (!currentUser?.id) {
      toast({
        title: 'Error',
        description: 'Debes iniciar sesion para crear un ticket',
        variant: 'destructive',
      })
      return
    }

    // Upload files first
    const uploadedAttachments = await uploadFiles()

    setSaving(true)
    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          category: formData.category || null,
          priority: formData.priority,
          propertyId: formData.propertyId,
          userId: currentUser.id,
          attachments: uploadedAttachments,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Ticket creado',
          description: 'El ticket se ha creado exitosamente.',
        })
        setCreateDialogOpen(false)
        resetForm()
        setPendingFiles([])
        fetchTickets()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'No se pudo crear el ticket',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error de conexion',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedTicket) return

    setSaving(true)
    try {
      const response = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          category: formData.category || null,
          status: formData.status,
          priority: formData.priority,
          response: formData.response || null,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Ticket actualizado',
          description: 'El ticket se ha actualizado exitosamente.',
        })
        setEditDialogOpen(false)
        setSelectedTicket(null)
        fetchTickets()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'No se pudo actualizar el ticket',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error de conexion',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('Estas seguro de eliminar este ticket?')) return

    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: 'Ticket eliminado',
          description: 'El ticket se ha eliminado exitosamente.',
        })
        fetchTickets()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'No se pudo eliminar el ticket',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error de conexion',
        variant: 'destructive',
      })
    }
  }

  const openEditDialog = (ticket: Ticket) => {
    setSelectedTicket(ticket)
    setFormData({
      title: ticket.title,
      description: ticket.description,
      category: ticket.category || '',
      priority: ticket.priority,
      status: ticket.status,
      propertyId: ticket.property.id,
      response: ticket.response || '',
    })
    setEditDialogOpen(true)
  }

  const openDetailDialog = (ticket: Ticket) => {
    setSelectedTicket(ticket)
    setDetailDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      priority: 'MEDIA',
      status: 'ABIERTO',
      propertyId: '',
      response: '',
    })
    setPendingFiles([])
  }

  const getStatusBadge = (status: string) => {
    const config = statusOptions.find(s => s.value === status) || statusOptions[0]
    return <Badge className={config.color}>{config.label}</Badge>
  }

  const getPriorityBadge = (priority: string) => {
    const config = priorityOptions.find(p => p.value === priority) || priorityOptions[1]
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>
  }

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    if (statusFilter !== 'all' && ticket.status !== statusFilter) return false
    if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false
    if (searchQuery && !ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !ticket.property.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  // Check if user can edit/delete tickets
  const canModifyTicket = (ticket: Ticket) => {
    if (currentUser?.role === 'admin') return true
    if (currentUser?.role === 'inquilino' && ticket.user.id === currentUser.id) return true
    return false
  }

  // Check if user can respond to tickets (admin and propietario)
  const canRespondToTicket = (ticket: Ticket) => {
    if (currentUser?.role === 'admin') return true
    if (currentUser?.role === 'propietario') return true
    return false
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
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Soporte</h1>
                <p className="text-muted-foreground">Gestion de tickets de soporte y mantenimiento</p>
              </div>
              <Button onClick={() => { resetForm(); setCreateDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Ticket
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar tickets..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {statusOptions.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Prioridad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {priorityOptions.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tickets de Soporte</CardTitle>
                <CardDescription>{filteredTickets.length} tickets encontrados</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredTickets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay tickets registrados</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ticket</TableHead>
                        <TableHead className="hidden md:table-cell">Propiedad</TableHead>
                        <TableHead className="hidden lg:table-cell">Solicitante</TableHead>
                        <TableHead>Prioridad</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="hidden md:table-cell">Fecha</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTickets.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <p>{ticket.title}</p>
                              {ticket.attachments && parseAttachments(ticket.attachments).length > 0 && (
                                <Paperclip className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {ticket.description}
                            </p>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            {ticket.property.title}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">
                            {ticket.user.name}
                          </TableCell>
                          <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                          <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            {new Date(ticket.createdAt).toLocaleDateString('es-PA')}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openDetailDialog(ticket)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver detalle
                                </DropdownMenuItem>
                                {(canModifyTicket(ticket) || canRespondToTicket(ticket)) && (
                                  <DropdownMenuItem onClick={() => openEditDialog(ticket)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                )}
                                {canModifyTicket(ticket) && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => handleDeleteTicket(ticket.id)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Eliminar
                                    </DropdownMenuItem>
                                  </>
                                )}
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

      {/* Create Ticket Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Ticket de Soporte</DialogTitle>
            <DialogDescription>
              Crea un nuevo ticket de soporte o mantenimiento
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTicket} className="space-y-4">
            <div className="space-y-2">
              <Label>Propiedad *</Label>
              <Select value={formData.propertyId} onValueChange={(v) => setFormData({ ...formData, propertyId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar propiedad" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Titulo *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Descripcion breve del problema"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripcion *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe el problema o solicitud en detalle"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* File Upload Section */}
            <div className="space-y-2">
              <Label>Archivos Adjuntos (PDF, imagenes - max 10MB cada uno)</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  accept=".pdf,image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center cursor-pointer py-4"
                >
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    Haz clic para subir archivos
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    PDF, JPG, PNG, WEBP hasta 10MB
                  </span>
                </label>
              </div>
              
              {/* Pending files preview */}
              {pendingFiles.length > 0 && (
                <div className="space-y-2 mt-3">
                  <p className="text-sm font-medium">Archivos seleccionados:</p>
                  <div className="space-y-2">
                    {pendingFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
                        <div className="flex items-center gap-2">
                          {file.preview === 'pdf' ? (
                            <FileText className="h-8 w-8 text-red-500" />
                          ) : (
                            <img src={file.preview} alt="preview" className="h-8 w-8 object-cover rounded" />
                          )}
                          <span className="text-sm truncate max-w-[200px]">{file.file.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removePendingFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setCreateDialogOpen(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || uploadingFiles}>
                {(saving || uploadingFiles) ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {uploadingFiles ? 'Subiendo archivos...' : saving ? 'Creando...' : 'Crear Ticket'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Ticket Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Ticket</DialogTitle>
            <DialogDescription>
              {currentUser?.role === 'admin' || currentUser?.role === 'propietario'
                ? 'Actualiza el estado, prioridad y anade una respuesta al ticket'
                : 'Actualiza la informacion de tu ticket'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateTicket} className="space-y-4">
            {(currentUser?.role === 'admin' || currentUser?.role === 'inquilino') && (
              <>
                <div className="space-y-2">
                  <Label>Titulo</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Titulo del ticket"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripcion</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripcion del problema"
                    rows={3}
                  />
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(currentUser?.role === 'admin' || currentUser?.role === 'inquilino') && (
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(currentUser?.role === 'admin' || currentUser?.role === 'propietario') && (
              <div className="space-y-2">
                <Label>Respuesta</Label>
                <Textarea
                  value={formData.response}
                  onChange={(e) => setFormData({ ...formData, response: e.target.value })}
                  placeholder="Anade una respuesta o actualizacion..."
                  rows={4}
                />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Ticket</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  {getStatusBadge(selectedTicket.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Prioridad</p>
                  {getPriorityBadge(selectedTicket.priority)}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Titulo</p>
                <p className="font-medium">{selectedTicket.title}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Descripcion</p>
                <p>{selectedTicket.description}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Propiedad</p>
                <p>{selectedTicket.property.title}</p>
                <p className="text-xs text-muted-foreground">{selectedTicket.property.address}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Solicitante</p>
                <p>{selectedTicket.user.name}</p>
                <p className="text-xs text-muted-foreground">{selectedTicket.user.email}</p>
              </div>
              {selectedTicket.response && (
                <div>
                  <p className="text-sm text-muted-foreground">Respuesta</p>
                  <p className="bg-muted/50 p-3 rounded-lg">{selectedTicket.response}</p>
                </div>
              )}
              {selectedTicket.category && (
                <div>
                  <p className="text-sm text-muted-foreground">Categoria</p>
                  <p>{categoryOptions.find(c => c.value === selectedTicket.category)?.label || selectedTicket.category}</p>
                </div>
              )}
              
              {/* Attachments Section */}
              {selectedTicket.attachments && parseAttachments(selectedTicket.attachments).length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Archivos Adjuntos</p>
                  <div className="space-y-2">
                    {parseAttachments(selectedTicket.attachments).map((attachment, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          {attachment.type.includes('pdf') ? (
                            <FileText className="h-8 w-8 text-red-500" />
                          ) : (
                            <img 
                              src={attachment.url} 
                              alt={attachment.name} 
                              className="h-12 w-12 object-cover rounded"
                            />
                          )}
                          <span className="text-sm truncate max-w-[150px]">{attachment.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const link = document.createElement('a')
                            link.href = attachment.url
                            link.download = attachment.name
                            link.target = '_blank'
                            link.click()
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Creacion</p>
                <p>{new Date(selectedTicket.createdAt).toLocaleString('es-PA')}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Cerrar
            </Button>
            {selectedTicket && (canModifyTicket(selectedTicket) || canRespondToTicket(selectedTicket)) && (
              <Button onClick={() => { setDetailDialogOpen(false); openEditDialog(selectedTicket); }}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
