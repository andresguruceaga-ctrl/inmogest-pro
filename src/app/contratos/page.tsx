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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, Plus, Search, Filter, MoreHorizontal, Eye, Download, Calendar, User, Building2, Loader2, Trash2, Edit } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface Contract {
  id: string
  contractNumber: string
  contractType: string
  startDate: string
  endDate: string
  monthlyAmount: number
  itbmsAmount: number
  depositAmount: number | null
  status: string
  property: { id: string; title: string; address: string }
  owner: { id: string; name: string; email: string }
  tenant: { id: string; name: string; email: string } | null
  isActive: boolean
  daysRemaining: number
}

interface Property {
  id: string
  title: string
  address: string
  ownerId: string
  owner: { id: string; name: string }
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

const contractTypes = [
  { value: 'ARRENDAMIENTO', label: 'Arrendamiento' },
  { value: 'ADMINISTRACION', label: 'Administración' },
]

export default function ContratosPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [tenants, setTenants] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
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
    includeItbms: true,
  })

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
          itbmsRate: formData.includeItbms ? 7.0 : 0,
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
      includeItbms: true,
    })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (status === 'VIGENTE' && isActive) {
      return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Vigente</Badge>
    } else if (status === 'VIGENTE' && !isActive) {
      return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Por vencer</Badge>
    }
    return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Vencido</Badge>
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
                            ${(contract.monthlyAmount + contract.itbmsAmount).toLocaleString()}
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
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver detalle
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Download className="h-4 w-4 mr-2" />
                                  Descargar PDF
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
                <Select value={formData.contractType} onValueChange={(v) => setFormData({...formData, contractType: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {contractTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="propertyId">Propiedad *</Label>
                <Select value={formData.propertyId} onValueChange={(v) => setFormData({...formData, propertyId: v})}>
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
                  <Label htmlFor="tenantId">Inquilino *</Label>
                  <Select value={formData.tenantId} onValueChange={(v) => setFormData({...formData, tenantId: v})}>
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
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <input
                    type="checkbox"
                    id="includeItbms"
                    checked={formData.includeItbms}
                    onChange={(e) => setFormData({...formData, includeItbms: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div className="flex-1">
                    <Label htmlFor="includeItbms" className="font-medium cursor-pointer">
                      Incluir ITBMS (7%)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Marca para calcular el impuesto sobre el monto mensual
                    </p>
                  </div>
                </div>
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
            {/* Resumen del contrato */}
            {formData.monthlyAmount && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <h4 className="font-medium mb-2">Resumen del Contrato</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monto mensual:</span>
                    <span>${parseFloat(formData.monthlyAmount).toLocaleString()}</span>
                  </div>
                  {formData.includeItbms && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ITBMS (7%):</span>
                      <span>${(parseFloat(formData.monthlyAmount) * 0.07).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold col-span-2 pt-2 border-t">
                    <span>Total mensual:</span>
                    <span className="text-primary">
                      ${formData.includeItbms 
                        ? (parseFloat(formData.monthlyAmount) * 1.07).toFixed(2)
                        : parseFloat(formData.monthlyAmount).toLocaleString()
                      }
                    </span>
                  </div>
                </div>
              </div>
            )}
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
    </SidebarProvider>
  )
}
