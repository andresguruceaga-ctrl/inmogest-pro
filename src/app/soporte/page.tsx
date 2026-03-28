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
  Loader2, Trash2, Edit, MessageSquare, X
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
  { value: 'REPARACION', label: 'Reparación' },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento' },
  { value: 'PRESUPUESTO', label: 'Solicitud de Presupuesto' },
  { value: 'MEJORA', label: 'Mejora/Remodelación' },
  { value: 'SERVICIO', label: 'Servicio Técnico' },
  { value: 'INSPECCION', label: 'Inspección' },
  { value: 'OTRO', label: 'Otro' },
]

export default function SoportePage() {
  const { toast } = useToast()
  
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
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
    fetchTickets()
    fetchProperties()
  }, [])

  const fetchTickets = async () => {
    try {
      const response = await fetch('/api/tickets')
      if (response.ok) {
        const data = await response.json()
        setTickets(data.tickets || [])
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
        setProperties(data.properties || [])
      }
    } catch (error) {
      console.error('Error fetching properties:', error)
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
        }),
      })

      if (response.ok) {
        toast({
          title: 'Ticket creado',
          description: 'El ticket se ha creado exitosamente.',
        })
        setCreateDialogOpen(false)
        resetForm()
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
        description: 'Error de conexión',
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
        description: 'Error de conexión',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('¿Estás seguro de eliminar este ticket?')) return

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
        description: 'Error de conexión',
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
                <p className="text-muted-foreground">Gestión de tickets de soporte y mantenimiento</p>
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
                            <div>
                              <p>{ticket.title}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {ticket.description}
                              </p>
                            </div>
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
                                <DropdownMenuItem onClick={() => openEditDialog(ticket)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => handleDeleteTicket(ticket.id)}
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

      {/* Create Ticket Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
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
              <Label>Título *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Descripción breve del problema"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe el problema o solicitud en detalle"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoría</Label>
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Crear Ticket
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
              Actualiza el estado y la respuesta del ticket
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateTicket} className="space-y-4">
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
                      <SelectItem key={p.value} value={p.label}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Respuesta</Label>
              <Textarea
                value={formData.response}
                onChange={(e) => setFormData({ ...formData, response: e.target.value })}
                placeholder="Añade una respuesta o actualización..."
                rows={4}
              />
            </div>
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
        <DialogContent className="max-w-lg">
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
                <p className="text-sm text-muted-foreground">Título</p>
                <p className="font-medium">{selectedTicket.title}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Descripción</p>
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
                  <p className="text-sm text-muted-foreground">Categoría</p>
                  <p>{categoryOptions.find(c => c.value === selectedTicket.category)?.label || selectedTicket.category}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Creación</p>
                <p>{new Date(selectedTicket.createdAt).toLocaleString('es-PA')}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Cerrar
            </Button>
            <Button onClick={() => { setDetailDialogOpen(false); openEditDialog(selectedTicket!); }}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
