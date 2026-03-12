'use client'

import { useState, useEffect, useRef } from 'react'
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
import { CreditCard, Plus, ArrowUpRight, ArrowDownRight, Loader2, Upload, FileText, Image, Eye, Download, Calendar, Building2, DollarSign, X, Check } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface Payment {
  id: string
  paymentType: string
  amount: number
  itbmsAmount: number
  totalAmount: number
  referenceNumber: string | null
  paymentMethod: string | null
  status: string
  paidAt: string | null
  dueDate: string
  receiptImage: string | null
  property: { id: string; title: string; address: string }
  user: { id: string; name: string; email: string }
}

interface Property {
  id: string
  title: string
  address: string
  monthlyRent: number
}

interface Tenant {
  id: string
  name: string
  email: string
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

export default function PagosPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [summary, setSummary] = useState({
    totalAmount: 0,
    byStatus: { pendiente: { count: 0, total: 0 }, pagado: { count: 0, total: 0 }, atrasado: { count: 0, total: 0 } },
    overdueCount: 0
  })
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    paymentType: 'ALQUILER',
    amount: '',
    referenceNumber: '',
    paymentMethod: 'TRANSFERENCIA',
    dueDate: '',
    paidAt: '',
    propertyId: '',
    userId: '',
    receiptImage: '',
    receiptFileName: '',
    includeItbms: true,
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [paymentsRes, propertiesRes, tenantsRes] = await Promise.all([
        fetch('/api/payments'),
        fetch('/api/properties'),
        fetch('/api/users?role=INQUILINO'),
      ])

      if (paymentsRes.ok) {
        const data = await paymentsRes.json()
        setPayments(data.data || [])
        if (data.summary) {
          setSummary(data.summary)
        }
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
        setFormData({
          ...formData,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.amount || !formData.dueDate || !formData.propertyId || !formData.userId) {
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
          paymentType: formData.paymentType,
          amount: parseFloat(formData.amount),
          includeItbms: formData.includeItbms,
          referenceNumber: formData.referenceNumber || null,
          paymentMethod: formData.paymentMethod,
          status: 'PAGADO',
          paidAt: formData.paidAt || new Date().toISOString(),
          dueDate: formData.dueDate,
          receiptImage: formData.receiptImage || null,
          propertyId: formData.propertyId,
          userId: formData.userId,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Pago registrado',
          description: 'El pago se ha registrado exitosamente.',
        })
        setDialogOpen(false)
        resetForm()
        fetchData()
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

  const resetForm = () => {
    setFormData({
      paymentType: 'ALQUILER',
      amount: '',
      referenceNumber: '',
      paymentMethod: 'TRANSFERENCIA',
      dueDate: '',
      paidAt: '',
      propertyId: '',
      userId: '',
      receiptImage: '',
      receiptFileName: '',
      includeItbms: true,
    })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAGADO':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><Check className="h-3 w-3 mr-1" />Pagado</Badge>
      case 'PENDIENTE':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pendiente</Badge>
      case 'ATRASADO':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Atrasado</Badge>
      case 'PARCIAL':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Parcial</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getPaymentTypeLabel = (type: string) => {
    const found = paymentTypes.find(p => p.value === type)
    return found?.label || type
  }

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return '-'
    const found = paymentMethods.find(p => p.value === method)
    return found?.label || method
  }

  // Calcular fecha de pago por defecto (hoy)
  const today = new Date().toISOString().split('T')[0]
  
  // Calcular fecha de vencimiento (día 5 del próximo mes)
  const nextMonth = new Date()
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  nextMonth.setDate(5)
  const defaultDueDate = nextMonth.toISOString().split('T')[0]

  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <Header />
        
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Pagos</h1>
                <p className="text-muted-foreground">Registro y seguimiento de pagos de alquiler</p>
              </div>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Registrar Pago
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total Recibido</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold text-emerald-500">${summary.byStatus.pagado.total.toLocaleString()}</span>
                    <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{summary.byStatus.pagado.count} pagos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Pagos Pendientes</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold text-yellow-500">${summary.byStatus.pendiente.total.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{summary.byStatus.pendiente.count} pagos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Pagos Atrasados</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold text-red-500">${summary.byStatus.atrasado.total.toLocaleString()}</span>
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{summary.overdueCount} pagos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">ITBMS Recaudado</p>
                  <p className="text-2xl font-bold">${summary.totalAmount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Incluye 7% ITBMS</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Historial de Pagos</CardTitle>
                <CardDescription>{payments.length} pagos registrados</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : payments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay pagos registrados</p>
                    <p className="text-sm">Haz clic en "Registrar Pago" para agregar uno</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Propiedad</TableHead>
                        <TableHead className="hidden md:table-cell">Inquilino</TableHead>
                        <TableHead className="hidden lg:table-cell">Referencia</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Comprobante</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {payment.paidAt ? formatDate(payment.paidAt) : formatDate(payment.dueDate)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate max-w-[120px]">{payment.property?.title || 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="truncate">{payment.user?.name || 'N/A'}</span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <span className="text-xs font-mono">{payment.referenceNumber || '-'}</span>
                          </TableCell>
                          <TableCell className="font-medium">
                            ${payment.totalAmount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(payment.status)}
                          </TableCell>
                          <TableCell className="text-right">
                            {payment.receiptImage ? (
                              <Button variant="ghost" size="sm" asChild>
                                <a href={payment.receiptImage} target="_blank" rel="noopener noreferrer">
                                  <Eye className="h-4 w-4 mr-1" />
                                  Ver
                                </a>
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">Sin comprobante</span>
                            )}
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

      {/* Dialog para Registrar Pago */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              Registra un pago de alquiler. Puedes adjuntar el comprobante de pago.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="propertyId">Propiedad *</Label>
                <Select value={formData.propertyId} onValueChange={(v) => {
                  const prop = properties.find(p => p.id === v)
                  setFormData({
                    ...formData, 
                    propertyId: v,
                    amount: prop ? String(prop.monthlyRent) : formData.amount
                  })
                }}>
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
              <div className="space-y-2">
                <Label htmlFor="userId">Inquilino *</Label>
                <Select value={formData.userId} onValueChange={(v) => setFormData({...formData, userId: v})}>
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
              <div className="space-y-2">
                <Label htmlFor="paymentType">Tipo de Pago *</Label>
                <Select value={formData.paymentType} onValueChange={(v) => setFormData({...formData, paymentType: v})}>
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
                <Select value={formData.paymentMethod} onValueChange={(v) => setFormData({...formData, paymentMethod: v})}>
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
                <Label htmlFor="amount">Monto (USD) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="2500.00"
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
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
                      Marca esta opción si el monto incluye el Impuesto de Transferencia de Bienes Muebles y Servicios
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="referenceNumber">Número de Referencia</Label>
                <Input
                  id="referenceNumber"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({...formData, referenceNumber: e.target.value})}
                  placeholder="Ej: TRF-2025-001234"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paidAt">Fecha de Pago *</Label>
                <Input
                  id="paidAt"
                  type="date"
                  value={formData.paidAt || today}
                  onChange={(e) => setFormData({...formData, paidAt: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Fecha de Vencimiento *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate || defaultDueDate}
                  onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                  required
                />
              </div>
            </div>

            {/* Sección de comprobante */}
            <div className="space-y-2">
              <Label>Comprobante de Pago (PDF o Imagen)</Label>
              <div className="border-2 border-dashed rounded-lg p-4">
                {formData.receiptImage ? (
                  <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      {formData.receiptImage.endsWith('.pdf') ? (
                        <FileText className="h-8 w-8 text-red-500" />
                      ) : (
                        <Image className="h-8 w-8 text-primary" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{formData.receiptFileName}</p>
                        <p className="text-xs text-muted-foreground">Archivo subido</p>
                      </div>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setFormData({...formData, receiptImage: '', receiptFileName: ''})}
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
            {formData.amount && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <h4 className="font-medium mb-2">Resumen del Pago</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monto base:</span>
                    <span>${parseFloat(formData.amount).toLocaleString()}</span>
                  </div>
                  {formData.includeItbms && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ITBMS (7%):</span>
                      <span>${(parseFloat(formData.amount) * 0.07).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold col-span-2 pt-2 border-t">
                    <span>Total:</span>
                    <span className="text-primary">
                      ${formData.includeItbms 
                        ? (parseFloat(formData.amount) * 1.07).toFixed(2)
                        : parseFloat(formData.amount).toLocaleString()
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
              <Button type="submit" disabled={saving || uploading}>
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
