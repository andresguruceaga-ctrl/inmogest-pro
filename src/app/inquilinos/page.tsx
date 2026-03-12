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
import { Users, Plus, Search, Filter, MoreHorizontal, Eye, Edit, Phone, Mail, Home, Loader2, Trash2, CreditCard, Upload, FileText, X, Calendar, Building2, Ticket, AlertTriangle, ImageIcon } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

interface Tenant {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  createdAt: string
  _count?: {
    propertiesAsTenant: number
    contractsAsTenant: number
  }
}

interface Property {
  id: string
  title: string
  address: string
  monthlyRent: number
  tenantId: string | null
}

interface TicketData {
  id: string
  title: string
  description: string
  category: string | null
  status: string
  priority: string
  photos: string | null
  createdAt: string
  property: {
    id: string
    title: string
    address: string
  }
}

const paymentTypes = [
  { value: 'ALQUILER', label: 'Alquiler' },
  { value: 'DEPOSITO', label: 'Depósito' },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento' },
  { value: 'OTROS', label: 'Otros' },
]

const paymentMethods = [
  { value: 'TRANSFERENCIA', label: 'Transferencia Bancaria' },
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'TARJETA', label: 'Tarjeta de Crédito/Débito' },
]

const ticketCategories = [
  { value: 'PLOMERIA', label: 'Plomería' },
  { value: 'ELECTRICIDAD', label: 'Electricidad' },
  { value: 'AIRE_ACONDICIONADO', label: 'Aire Acondicionado' },
  { value: 'PINTURA', label: 'Pintura' },
  { value: 'CERRADURAS', label: 'Cerraduras/Puertas' },
  { value: 'VENTANAS', label: 'Ventanas' },
  { value: 'ELECTRODOMESTICOS', label: 'Electrodomésticos' },
  { value: 'PLAGAS', label: 'Control de Plagas' },
  { value: 'ESTRUCTURAL', label: 'Estructural' },
  { value: 'OTRO', label: 'Otro' },
]

const ticketPriorities = [
  { value: 'BAJA', label: 'Baja', color: 'bg-gray-500' },
  { value: 'MEDIA', label: 'Media', color: 'bg-yellow-500' },
  { value: 'ALTA', label: 'Alta', color: 'bg-orange-500' },
  { value: 'URGENTE', label: 'Urgente', color: 'bg-red-500' },
]

const ticketStatuses: Record<string, { label: string; color: string }> = {
  ABIERTO: { label: 'Abierto', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  EN_PROCESO: { label: 'En Proceso', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  RESUELTO: { label: 'Resuelto', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  CERRADO: { label: 'Cerrado', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
}

export default function InquilinosPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [tickets, setTickets] = useState<TicketData[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const ticketFileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  })

  const [paymentForm, setPaymentForm] = useState({
    paymentType: 'ALQUILER',
    amount: '',
    referenceNumber: '',
    paymentMethod: 'TRANSFERENCIA',
    dueDate: '',
    paidAt: '',
    propertyId: '',
    receiptImage: '',
    receiptFileName: '',
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

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [tenantsRes, propertiesRes, ticketsRes] = await Promise.all([
        fetch('/api/users?role=INQUILINO'),
        fetch('/api/properties'),
        fetch('/api/tickets'),
      ])

      if (tenantsRes.ok) {
        const data = await tenantsRes.json()
        setTenants(data.users || [])
      }
      if (propertiesRes.ok) {
        const data = await propertiesRes.json()
        setProperties(data.properties || data.data || [])
      }
      if (ticketsRes.ok) {
        const data = await ticketsRes.json()
        setTickets(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
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
          role: 'INQUILINO',
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Inquilino creado',
          description: 'El inquilino se ha registrado exitosamente.',
        })
        setDialogOpen(false)
        resetForm()
        fetchData()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'No se pudo crear el inquilino',
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('folder', 'receipts')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      const data = await response.json()

      if (response.ok) {
        setPaymentForm({
          ...paymentForm,
          receiptImage: data.data.fileUrl,
          receiptFileName: data.data.fileName,
        })
        toast({
          title: 'Archivo subido',
          description: 'El comprobante se ha subido exitosamente.',
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'No se pudo subir el archivo',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al subir el archivo',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleTicketFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const openPaymentDialogHandler = (tenant: Tenant) => {
    setSelectedTenant(tenant)
    const tenantProperties = properties.filter(p => p.tenantId === tenant.id)
    if (tenantProperties.length > 0) {
      const prop = tenantProperties[0]
      setPaymentForm({
        ...paymentForm,
        propertyId: prop.id,
        amount: String(prop.monthlyRent),
      })
    }
    setTimeout(() => setPaymentDialogOpen(true), 0)
  }

  const openTicketDialogHandler = (tenant: Tenant) => {
    setSelectedTenant(tenant)
    const tenantProperties = properties.filter(p => p.tenantId === tenant.id)
    if (tenantProperties.length > 0) {
      setTicketForm(prev => ({
        ...prev,
        propertyId: tenantProperties[0].id,
      }))
    }
    setTimeout(() => setTicketDialogOpen(true), 0)
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!paymentForm.amount || !paymentForm.dueDate || !paymentForm.propertyId || !selectedTenant) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos requeridos',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentType: paymentForm.paymentType,
          amount: parseFloat(paymentForm.amount),
          includeItbms: true,
          referenceNumber: paymentForm.referenceNumber || null,
          paymentMethod: paymentForm.paymentMethod,
          status: 'PAGADO',
          paidAt: paymentForm.paidAt || new Date().toISOString(),
          dueDate: paymentForm.dueDate,
          receiptImage: paymentForm.receiptImage || null,
          propertyId: paymentForm.propertyId,
          userId: selectedTenant.id,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Pago registrado',
          description: 'El pago se ha registrado exitosamente.',
        })
        setPaymentDialogOpen(false)
        resetPaymentForm()
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

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!ticketForm.title || !ticketForm.description || !ticketForm.propertyId || !selectedTenant) {
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
          userId: selectedTenant.id,
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
        fetchData()
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

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
    })
  }

  const resetPaymentForm = () => {
    setPaymentForm({
      paymentType: 'ALQUILER',
      amount: '',
      referenceNumber: '',
      paymentMethod: 'TRANSFERENCIA',
      dueDate: '',
      paidAt: '',
      propertyId: '',
      receiptImage: '',
      receiptFileName: '',
    })
    setSelectedTenant(null)
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
    setSelectedTenant(null)
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getPriorityBadge = (priority: string) => {
    const config = ticketPriorities.find(p => p.value === priority) || ticketPriorities[1]
    return (
      <Badge className={`${config.color} text-white`}>
        {config.label}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    const config = ticketStatuses[status] || ticketStatuses.ABIERTO
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    )
  }

  const today = new Date().toISOString().split('T')[0]
  const nextMonth = new Date()
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  nextMonth.setDate(5)
  const defaultDueDate = nextMonth.toISOString().split('T')[0]

  return (
    <>
      <SidebarProvider>
        <Sidebar />
        <SidebarInset className="flex flex-col min-h-screen">
          <Header />
          
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Inquilinos</h1>
                  <p className="text-muted-foreground">Gestión de inquilinos activos</p>
                </div>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Inquilino
                </Button>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Buscar inquilinos..." className="pl-9" />
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
                  <CardTitle>Inquilinos Activos</CardTitle>
                  <CardDescription>{tenants.length} inquilinos registrados</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : tenants.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay inquilinos registrados</p>
                      <p className="text-sm">Haz clic en "Nuevo Inquilino" para agregar uno</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Inquilino</TableHead>
                          <TableHead className="hidden md:table-cell">Contacto</TableHead>
                          <TableHead className="hidden lg:table-cell">Propiedades</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tenants.map((tenant) => (
                          <TableRow key={tenant.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarFallback className="bg-primary text-primary-foreground">
                                    {getInitials(tenant.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{tenant.name}</p>
                                  <p className="text-xs text-muted-foreground">{tenant.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                                {tenant.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" /> {tenant.phone}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" /> {tenant.email}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <div className="flex items-center gap-2">
                                <Home className="h-4 w-4 text-muted-foreground" />
                                <span>{tenant._count?.propertiesAsTenant || 0} propiedades</span>
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
                                  <DropdownMenuItem onClick={() => openPaymentDialogHandler(tenant)}>
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Registrar Pago
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openTicketDialogHandler(tenant)}>
                                    <Ticket className="h-4 w-4 mr-2" />
                                    Nuevo Ticket
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver detalle
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive">
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

              {/* Sección de Tickets Recientes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ticket className="h-5 w-5" />
                    Tickets de Soporte
                  </CardTitle>
                  <CardDescription>
                    {tickets.length} tickets registrados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {tickets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay tickets registrados</p>
                      <p className="text-sm">Los inquilinos pueden reportar problemas desde su perfil</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {tickets.slice(0, 10).map((ticket) => (
                        <div 
                          key={ticket.id} 
                          className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{ticket.title}</h4>
                              {getPriorityBadge(ticket.priority)}
                              {getStatusBadge(ticket.status)}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {ticket.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {ticket.property.title}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(ticket.createdAt).toLocaleDateString('es-PA')}
                              </span>
                              {ticket.category && (
                                <Badge variant="outline" className="text-xs">
                                  {ticketCategories.find(c => c.value === ticket.category)?.label || ticket.category}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
          
          <Footer />
        </SidebarInset>
      </SidebarProvider>

      {/* Dialog para Nuevo Inquilino */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Inquilino</DialogTitle>
            <DialogDescription>
              Registra un nuevo inquilino en el sistema.
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
                Guardar Inquilino
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para Registrar Pago */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              {selectedTenant && `Registrando pago para: ${selectedTenant.name}`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentPropertyId">Propiedad *</Label>
                <Select 
                  value={paymentForm.propertyId} 
                  onValueChange={(v) => {
                    const prop = properties.find(p => p.id === v)
                    setPaymentForm({
                      ...paymentForm, 
                      propertyId: v,
                      amount: prop ? String(prop.monthlyRent) : paymentForm.amount
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar propiedad" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties
                      .filter(p => selectedTenant && p.tenantId === selectedTenant.id)
                      .map((prop) => (
                        <SelectItem key={prop.id} value={prop.id}>{prop.title}</SelectItem>
                      ))
                    }
                    {selectedTenant && properties.filter(p => p.tenantId === selectedTenant.id).length === 0 && (
                      properties.map((prop) => (
                        <SelectItem key={prop.id} value={prop.id}>{prop.title}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentType">Tipo de Pago *</Label>
                <Select value={paymentForm.paymentType} onValueChange={(v) => setPaymentForm({...paymentForm, paymentType: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Método de Pago *</Label>
                <Select value={paymentForm.paymentMethod} onValueChange={(v) => setPaymentForm({...paymentForm, paymentMethod: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentAmount">Monto (USD) *</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                  placeholder="2500.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentReference">Número de Referencia</Label>
                <Input
                  id="paymentReference"
                  value={paymentForm.referenceNumber}
                  onChange={(e) => setPaymentForm({...paymentForm, referenceNumber: e.target.value})}
                  placeholder="Ej: TRF-2025-001234"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentDate">Fecha de Pago *</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentForm.paidAt || today}
                  onChange={(e) => setPaymentForm({...paymentForm, paidAt: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Fecha de Vencimiento *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={paymentForm.dueDate || defaultDueDate}
                  onChange={(e) => setPaymentForm({...paymentForm, dueDate: e.target.value})}
                  required
                />
              </div>
            </div>

            {/* Sección de comprobante */}
            <div className="space-y-2">
              <Label>Comprobante de Pago (PDF o Imagen)</Label>
              <div className="border-2 border-dashed rounded-lg p-4">
                {paymentForm.receiptImage ? (
                  <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      {paymentForm.receiptImage.endsWith('.pdf') ? (
                        <FileText className="h-8 w-8 text-red-500" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-primary" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{paymentForm.receiptFileName}</p>
                        <p className="text-xs text-muted-foreground">Archivo subido</p>
                      </div>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setPaymentForm({...paymentForm, receiptImage: '', receiptFileName: ''})}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
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
                      {uploading ? 'Subiendo...' : 'Subir Comprobante'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      PDF, JPG, PNG o WEBP. Máximo 10MB.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Resumen de pago */}
            {paymentForm.amount && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <h4 className="font-medium mb-2">Resumen del Pago</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monto base:</span>
                    <span>${parseFloat(paymentForm.amount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ITBMS (7%):</span>
                    <span>${(parseFloat(paymentForm.amount) * 0.07).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold col-span-2 pt-2 border-t">
                    <span>Total:</span>
                    <span className="text-primary">${(parseFloat(paymentForm.amount) * 1.07).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || uploading}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Registrar Pago
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para Nuevo Ticket */}
      <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Nuevo Ticket de Soporte
            </DialogTitle>
            <DialogDescription>
              {selectedTenant && `Reportando problema para: ${selectedTenant.name}`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTicketSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ticketPropertyId">Propiedad *</Label>
                <Select 
                  value={ticketForm.propertyId} 
                  onValueChange={(v) => setTicketForm({...ticketForm, propertyId: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar propiedad" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties
                      .filter(p => selectedTenant && p.tenantId === selectedTenant.id)
                      .map((prop) => (
                        <SelectItem key={prop.id} value={prop.id}>{prop.title}</SelectItem>
                      ))
                    }
                    {selectedTenant && properties.filter(p => p.tenantId === selectedTenant.id).length === 0 && (
                      properties.map((prop) => (
                        <SelectItem key={prop.id} value={prop.id}>{prop.title}</SelectItem>
                      ))
                    )}
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
                    {ticketCategories.map((cat) => (
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
                    {ticketPriorities.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${priority.color}`} />
                          {priority.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticketTitle">Título del Problema *</Label>
              <Input
                id="ticketTitle"
                value={ticketForm.title}
                onChange={(e) => setTicketForm({...ticketForm, title: e.target.value})}
                placeholder="Ej: Fuga de agua en el baño principal"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticketDescription">Descripción Detallada *</Label>
              <Textarea
                id="ticketDescription"
                value={ticketForm.description}
                onChange={(e) => setTicketForm({...ticketForm, description: e.target.value})}
                placeholder="Describe el problema con el mayor detalle posible. Incluye ubicación específica dentro de la propiedad, cuándo comenzó el problema, y cualquier otra información relevante."
                rows={4}
                required
              />
            </div>

            {/* Sección de foto */}
            <div className="space-y-2">
              <Label>Foto del Problema (Opcional)</Label>
              <div className="border-2 border-dashed rounded-lg p-4">
                {ticketForm.photos ? (
                  <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium text-sm">{ticketForm.photoFileName}</p>
                        <p className="text-xs text-muted-foreground">Foto subida</p>
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
                      ref={ticketFileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={handleTicketFileChange}
                      className="hidden"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => ticketFileInputRef.current?.click()}
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

            {/* Info adicional */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">Importante</p>
                  <p className="text-amber-700">
                    Tu ticket será enviado al administrador de la propiedad. Recibirás una notificación 
                    cuando sea respondido. Para emergencias urgentes (gas, agua, electricidad), 
                    contacta directamente al administrador.
                  </p>
                </div>
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
    </>
  )
}
