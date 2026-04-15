'use client'

import { useState, useEffect, useRef } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { UserCheck, Plus, Search, Filter, MoreHorizontal, Eye, Edit, Phone, Mail, Building2, Loader2, Trash2, LayoutDashboard, TrendingUp, TrendingDown, DollarSign, Receipt, Separator, ArrowUpRight, ArrowDownRight, BarChart3, Calendar, PieChart, Ticket, Upload, X, ImageIcon, Wallet, CreditCard } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface Owner {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  createdAt: string
  _count?: {
    propertiesAsOwner: number
    contractsAsOwner: number
  }
}

interface OwnerDashboard {
  stats: {
    totalProperties: number
    occupiedProperties: number
    monthIncome: number
    monthItbms: number
    totalExpenses: number
    fixedExpenses: number
    variableExpenses: number
    expensesItbms: number
    netIncome: number
    occupancyRate: number
  }
  properties: Array<{
    id: string
    name: string
    address: string
    monthlyRent: number
    status: string
    tenant: string | null
  }>
  transactions: Array<{
    id: string
    type: 'income' | 'expense'
    description: string
    amount: number
    date: string
  }>
  expensesByCategory: Array<{
    category: string
    amount: number
    percentage: number
  }>
}

const CATEGORY_LABELS: Record<string, string> = {
  MANTENIMIENTO_PH: 'Mantenimiento PH',
  SEGURO: 'Seguros',
  SERVICIOS_BASICOS: 'Servicios',
  REPARACION: 'Reparaciones',
  SERVICIO_TECNICO: 'Servicio Técnico',
  IMPUESTOS: 'Impuestos',
  COMISION_ADMIN: 'Comisión Admin',
  OTROS: 'Otros',
}

const OWNER_TICKET_CATEGORIES = [
  { value: 'REPARACION', label: 'Reparación' },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento' },
  { value: 'PRESUPUESTO', label: 'Solicitud de Presupuesto' },
  { value: 'MEJORA', label: 'Mejora/Remodelación' },
  { value: 'SERVICIO', label: 'Servicio Técnico' },
  { value: 'INSPECCION', label: 'Inspección' },
  { value: 'OTRO', label: 'Otro' },
]

const TICKET_PRIORITIES = [
  { value: 'BAJA', label: 'Baja' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'URGENTE', label: 'Urgente' },
]

const PAYMENT_METHODS = [
  { value: 'TRANSFERENCIA', label: 'Transferencia Bancaria' },
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'YAPE', label: 'Yape' },
  { value: 'OTRO', label: 'Otro' },
]

export default function PropietariosPage() {
  const [owners, setOwners] = useState<Owner[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null)
  
  // Dashboard state
  const [dashboardOpen, setDashboardOpen] = useState(false)
  const [dashboardData, setDashboardData] = useState<OwnerDashboard | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [dashboardOwner, setDashboardOwner] = useState<Owner | null>(null)
  
  // Ticket state
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false)
  const [ticketOwner, setTicketOwner] = useState<Owner | null>(null)
  const [ticketOwnerProperties, setTicketOwnerProperties] = useState<Array<{id: string, title: string}>>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Payment state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentOwner, setPaymentOwner] = useState<Owner | null>(null)
  
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  })

  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  })

  const [ticketForm, setTicketForm] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'MEDIA',
    propertyId: '',
    photos: '',
    photoFileName: '',
  })

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: '',
    referenceNumber: '',
    notes: '',
  })

  useEffect(() => {
    fetchOwners()
  }, [])

  const fetchOwners = async () => {
    try {
      const response = await fetch('/api/users?role=PROPIETARIO')
      if (response.ok) {
        const data = await response.json()
        setOwners(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching owners:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOwnerDashboard = async (ownerId: string) => {
    setDashboardLoading(true)
    try {
      const response = await fetch(`/api/dashboard?role=propietario&userId=${ownerId}`)
      const result = await response.json()

      if (result.success) {
        setDashboardData(result.data)
      } else {
        toast({
          title: 'Error',
          description: result.error || 'No se pudo cargar el dashboard',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error)
      toast({
        title: 'Error',
        description: 'Error de conexión',
        variant: 'destructive',
      })
    } finally {
      setDashboardLoading(false)
    }
  }

  const openDashboard = (owner: Owner) => {
    setDashboardOwner(owner)
    setDashboardOpen(true)
    fetchOwnerDashboard(owner.id)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email || !formData.password) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos requeridos',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          role: 'PROPIETARIO',
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Propietario creado',
          description: 'El propietario se ha registrado exitosamente.',
        })
        setDialogOpen(false)
        resetForm()
        fetchOwners()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'No se pudo crear el propietario',
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

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedOwner || !editFormData.name || !editFormData.email) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos requeridos',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)

    try {
      const updateData: {
        name: string
        email: string
        phone: string | null
        password?: string
      } = {
        name: editFormData.name,
        email: editFormData.email,
        phone: editFormData.phone || null,
      }

      if (editFormData.password) {
        updateData.password = editFormData.password
      }

      const response = await fetch(`/api/users/${selectedOwner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Propietario actualizado',
          description: 'El propietario se ha actualizado exitosamente.',
        })
        setEditDialogOpen(false)
        resetEditForm()
        fetchOwners()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'No se pudo actualizar el propietario',
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

  const handleDelete = async (owner: Owner) => {
    if (!confirm(`¿Estás seguro de eliminar al propietario "${owner.name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/users/${owner.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Propietario eliminado',
          description: 'El propietario se ha eliminado exitosamente.',
        })
        fetchOwners()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'No se pudo eliminar el propietario',
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

  const openEditDialog = (owner: Owner) => {
    setSelectedOwner(owner)
    setEditFormData({
      name: owner.name,
      email: owner.email,
      phone: owner.phone || '',
      password: '',
    })
    setEditDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
    })
  }

  const resetEditForm = () => {
    setEditFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
    })
    setSelectedOwner(null)
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  // Ticket functions
  const openTicketDialog = async (owner: Owner) => {
    setTicketOwner(owner)
    try {
      const response = await fetch(`/api/properties?ownerId=${owner.id}`)
      if (response.ok) {
        const result = await response.json()
        const properties = result.properties || result.data || []
        setTicketOwnerProperties(properties.map((p: {id: string, title: string}) => ({ id: p.id, title: p.title })))
        if (properties.length > 0) {
          setTicketForm(prev => ({ ...prev, propertyId: properties[0].id }))
        }
      }
    } catch (error) {
      console.error('Error fetching owner properties:', error)
    }
    setTicketDialogOpen(true)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('folder', 'tickets')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      const data = await response.json()

      if (response.ok) {
        setTicketForm({
          ...ticketForm,
          photos: data.data.fileUrl,
          photoFileName: data.data.fileName,
        })
        toast({
          title: 'Foto subida',
          description: 'La foto se ha subido exitosamente.',
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'No se pudo subir la foto',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al subir la foto',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!ticketForm.title || !ticketForm.description || !ticketForm.propertyId || !ticketOwner) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos requeridos',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: ticketForm.title,
          description: ticketForm.description,
          category: ticketForm.category || null,
          priority: ticketForm.priority,
          photos: ticketForm.photos || null,
          propertyId: ticketForm.propertyId,
          userId: ticketOwner.id,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Ticket creado',
          description: 'El ticket de soporte se ha creado exitosamente.',
        })
        setTicketDialogOpen(false)
        resetTicketForm()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'No se pudo crear el ticket',
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

  const resetTicketForm = () => {
    setTicketForm({
      title: '',
      description: '',
      category: '',
      priority: 'MEDIA',
      propertyId: '',
      photos: '',
      photoFileName: '',
    })
    setTicketOwner(null)
    setTicketOwnerProperties([])
  }

  // Payment functions
  const openPaymentDialog = (owner: Owner) => {
    setPaymentOwner(owner)
    setPaymentForm({
      amount: '',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: '',
      referenceNumber: '',
      notes: '',
    })
    setPaymentDialogOpen(true)
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!paymentOwner || !paymentForm.amount) {
      toast({
        title: 'Error',
        description: 'Por favor ingresa el monto del pago',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/owner-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: paymentOwner.id,
          amount: parseFloat(paymentForm.amount),
          paymentDate: paymentForm.paymentDate,
          paymentMethod: paymentForm.paymentMethod || null,
          referenceNumber: paymentForm.referenceNumber || null,
          notes: paymentForm.notes || null,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Pago registrado',
          description: 'El pago se ha registrado exitosamente.',
        })
        setPaymentDialogOpen(false)
        setPaymentOwner(null)
      } else {
        toast({
          title: 'Error',
          description: data.error || 'No se pudo registrar el pago',
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

  const currentMonth = new Date().toLocaleDateString('es-PA', { month: 'long', year: 'numeric' })

  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <Header />
        
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Propietarios</h1>
                <p className="text-muted-foreground">Gestión de propietarios registrados</p>
              </div>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Propietario
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar propietarios..." className="pl-9" />
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
                <CardTitle>Propietarios Registrados</CardTitle>
                <CardDescription>{owners.length} propietarios activos</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : owners.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay propietarios registrados</p>
                    <p className="text-sm">Haz clic en "Nuevo Propietario" para agregar uno</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Propietario</TableHead>
                        <TableHead className="hidden md:table-cell">Contacto</TableHead>
                        <TableHead>Propiedades</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {owners.map((owner) => (
                        <TableRow key={owner.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                  {getInitials(owner.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{owner.name}</p>
                                <p className="text-xs text-muted-foreground">{owner.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                              {owner.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" /> {owner.phone}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {owner.email}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span>{owner._count?.propertiesAsOwner || 0} propiedades</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                              Activo
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openDashboard(owner)}>
                                  <LayoutDashboard className="h-4 w-4 mr-2" />
                                  Ver Dashboard
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openPaymentDialog(owner)}>
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  Registrar Pago
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openTicketDialog(owner)}>
                                  <Ticket className="h-4 w-4 mr-2" />
                                  Crear Ticket
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver detalle
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openEditDialog(owner)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => handleDelete(owner)}
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

      {/* Dialog para Nuevo Propietario */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Propietario</DialogTitle>
            <DialogDescription>
              Registra un nuevo propietario en el sistema.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre completo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Ej: Juan Pérez"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="Ej: juan@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="Ej: +507 6666-1234"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar Propietario
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para Editar Propietario */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Propietario</DialogTitle>
            <DialogDescription>
              Modifica los datos del propietario.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre completo *</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                placeholder="Ej: Juan Pérez"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                placeholder="Ej: juan@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Teléfono</Label>
              <Input
                id="edit-phone"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                placeholder="Ej: +507 6666-1234"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">Nueva Contraseña</Label>
              <Input
                id="edit-password"
                type="password"
                value={editFormData.password}
                onChange={(e) => setEditFormData({...editFormData, password: e.target.value})}
                placeholder="Dejar vacío para mantener la actual"
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">
                Deja este campo vacío si no deseas cambiar la contraseña.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
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

      {/* Dialog para Ver Dashboard del Propietario */}
      <Dialog open={dashboardOpen} onOpenChange={setDashboardOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5" />
              Dashboard de {dashboardOwner?.name}
            </DialogTitle>
            <DialogDescription>
              Vista del panel financiero del propietario
            </DialogDescription>
          </DialogHeader>
          
          {dashboardLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : dashboardData ? (
            <div className="space-y-6">
              {/* Stats row */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Ingresos Brutos</p>
                        <p className="text-2xl font-bold text-emerald-500">
                          ${dashboardData.stats.monthIncome.toLocaleString()}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-emerald-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Gastos Totales</p>
                        <p className="text-2xl font-bold text-red-500">
                          ${dashboardData.stats.totalExpenses.toLocaleString()}
                        </p>
                      </div>
                      <Receipt className="h-8 w-8 text-red-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Ingreso Neto</p>
                        <p className="text-2xl font-bold text-primary">
                          ${dashboardData.stats.netIncome.toLocaleString()}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Ocupación</p>
                        <p className="text-2xl font-bold">{dashboardData.stats.occupancyRate}%</p>
                        <p className="text-xs text-muted-foreground">
                          {dashboardData.stats.occupiedProperties}/{dashboardData.stats.totalProperties} propiedades
                        </p>
                      </div>
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Financial report card */}
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Reporte Financiero - {currentMonth}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Ingresos Brutos</p>
                      <p className="text-xl font-bold text-emerald-500">
                        +${dashboardData.stats.monthIncome.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">ITBMS: ${dashboardData.stats.monthItbms.toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Costos Fijos</p>
                      <p className="text-xl font-bold text-orange-500">
                        -${dashboardData.stats.fixedExpenses.toLocaleString()}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Reparaciones</p>
                      <p className="text-xl font-bold text-red-500">
                        -${dashboardData.stats.variableExpenses.toLocaleString()}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Ingreso Neto</p>
                      <p className="text-xl font-bold text-primary">
                        ${dashboardData.stats.netIncome.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Properties list */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Propiedades ({dashboardData.properties.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dashboardData.properties.map((prop) => (
                      <div key={prop.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium">{prop.name}</p>
                          <p className="text-xs text-muted-foreground">{prop.address}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="font-medium">${prop.monthlyRent.toLocaleString()}/mes</p>
                          <Badge variant="outline" className={cn(
                            prop.status === 'OCUPADA' 
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                              : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                          )}>
                            {prop.status === 'OCUPADA' ? 'Ocupada' : 'Disponible'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Expenses by category */}
              {dashboardData.expensesByCategory.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <PieChart className="h-4 w-4" />
                      Gastos por Categoría
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dashboardData.expensesByCategory.map((expense, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{CATEGORY_LABELS[expense.category] || expense.category}</span>
                          <span className="font-medium">${expense.amount.toLocaleString()}</span>
                        </div>
                        <Progress value={expense.percentage} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay datos disponibles</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDashboardOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Crear Ticket */}
      <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Crear Ticket para {ticketOwner?.name}
            </DialogTitle>
            <DialogDescription>
              Crea una solicitud de soporte en nombre del propietario
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTicketSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ticketProperty">Propiedad *</Label>
                <Select 
                  value={ticketForm.propertyId} 
                  onValueChange={(v) => setTicketForm({...ticketForm, propertyId: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar propiedad" />
                  </SelectTrigger>
                  <SelectContent>
                    {ticketOwnerProperties.map((prop) => (
                      <SelectItem key={prop.id} value={prop.id}>{prop.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticketCategory">Categoría</Label>
                <Select 
                  value={ticketForm.category} 
                  onValueChange={(v) => setTicketForm({...ticketForm, category: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {OWNER_TICKET_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticketPriority">Prioridad *</Label>
                <Select 
                  value={ticketForm.priority} 
                  onValueChange={(v) => setTicketForm({...ticketForm, priority: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    {TICKET_PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticketTitle">Título *</Label>
              <Input
                id="ticketTitle"
                value={ticketForm.title}
                onChange={(e) => setTicketForm({...ticketForm, title: e.target.value})}
                placeholder="Ej: Reparación de aire acondicionado"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticketDescription">Descripción *</Label>
              <Textarea
                id="ticketDescription"
                value={ticketForm.description}
                onChange={(e) => setTicketForm({...ticketForm, description: e.target.value})}
                placeholder="Describe el problema o solicitud en detalle..."
                rows={4}
                required
              />
            </div>

            {/* Photo upload section */}
            <div className="space-y-2">
              <Label>Foto (opcional)</Label>
              <div className="border-2 border-dashed rounded-lg p-4">
                {ticketForm.photos ? (
                  <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium text-sm">{ticketForm.photoFileName}</p>
                        <p className="text-xs text-muted-foreground">Archivo subido</p>
                      </div>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setTicketForm({...ticketForm, photos: '', photoFileName: ''})}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={handleFileChange}
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
                      {uploading ? 'Subiendo...' : 'Subir Foto'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      JPG, PNG o WEBP. Máximo 10MB.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTicketDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || uploading}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Crear Ticket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para Registrar Pago */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Registrar Pago de {paymentOwner?.name}
            </DialogTitle>
            <DialogDescription>
              Registra un pago realizado por el propietario a la administración
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Monto *</Label>
              <Input
                type="number"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha *</Label>
              <Input
                type="date"
                value={paymentForm.paymentDate}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Método de Pago</Label>
              <Select 
                value={paymentForm.paymentMethod} 
                onValueChange={(v) => setPaymentForm({ ...paymentForm, paymentMethod: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar método" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Número de Referencia</Label>
              <Input
                value={paymentForm.referenceNumber}
                onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                placeholder="Ej: TRANS-123456"
              />
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Registrar Pago
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
