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
  Wallet, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight,
  ChevronDown, ChevronUp, Loader2, Plus, Minus, CheckCircle, Clock, Receipt, Edit, MoreHorizontal, Building2
} from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface PropertyBalance {
  property: {
    id: string
    title: string
    address: string
  }
  owner: {
    id: string
    name: string
    email: string
    phone: string | null
  }
  pendingExpenses: Array<{
    id: string
    description: string
    amount: number
    date: string
    category: string
    property: { id: string; title: string }
  }>
  ownerPayments: Array<{
    id: string
    amount: number
    date: string
    method: string | null
    reference: string | null
    notes: string | null
  }>
  totals: {
    pending: number
    payments: number
    balance: number
  }
}

interface BalanceData {
  properties: PropertyBalance[]
  totals: {
    totalPending: number
    totalPayments: number
    totalBalance: number
  }
}

const categoryLabels: Record<string, string> = {
  MANTENIMIENTO_PH: 'Mantenimiento PH',
  SEGURO: 'Seguro',
  SERVICIOS_BASICOS: 'Servicios Basicos',
  REPARACION: 'Reparacion',
  SERVICIO_TECNICO: 'Servicio Tecnico',
  IMPUESTOS: 'Impuestos',
  COMISION_ADMIN: 'Comision Admin',
  OTROS: 'Otros',
}

const paymentMethods = [
  { value: 'TRANSFERENCIA', label: 'Transferencia Bancaria' },
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'YAPE', label: 'Yape' },
  { value: 'OTRO', label: 'Otro' },
]

export default function RelacionGastosPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<BalanceData | null>(null)
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set())
  
  // Payment dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<PropertyBalance | null>(null)
  const [saving, setSaving] = useState(false)
  
  // Edit payment dialog
  const [editPaymentDialogOpen, setEditPaymentDialogOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<{ id: string; amount: number; date: string; method: string | null; reference: string | null; notes: string | null; propertyId: string; ownerId: string } | null>(null)
  
  // Delete payment dialog
  const [deletePaymentDialogOpen, setDeletePaymentDialogOpen] = useState(false)
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: '',
    referenceNumber: '',
    notes: '',
    propertyId: '',
  })
  
  const [editPaymentForm, setEditPaymentForm] = useState({
    amount: '',
    paymentDate: '',
    paymentMethod: '',
    referenceNumber: '',
    notes: '',
    propertyId: '',
  })

  // Get properties for the selected owner (to show selector if more than 1)
  const [ownerProperties, setOwnerProperties] = useState<Array<{ id: string; title: string }>>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await fetch('/api/owner-balance')
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        toast({
          title: 'Error',
          description: result.error || 'No se pudo cargar la informacion',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error fetching balance:', error)
      toast({
        title: 'Error',
        description: 'Error de conexion',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const togglePropertyExpand = (propertyId: string) => {
    setExpandedProperties(prev => {
      const newSet = new Set(prev)
      if (newSet.has(propertyId)) {
        newSet.delete(propertyId)
      } else {
        newSet.add(propertyId)
      }
      return newSet
    })
  }

  const openPaymentDialog = async (property: PropertyBalance) => {
    setSelectedProperty(property)
    
    // Get all properties for this owner
    const ownerProps = data?.properties
      .filter(p => p.owner.id === property.owner.id)
      .map(p => ({ id: p.property.id, title: p.property.title })) || []
    
    setOwnerProperties(ownerProps)
    
    setPaymentForm({
      amount: '',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: '',
      referenceNumber: '',
      notes: '',
      propertyId: ownerProps.length === 1 ? ownerProps[0].id : '',
    })
    setPaymentDialogOpen(true)
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedProperty || !paymentForm.amount) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos requeridos',
        variant: 'destructive',
      })
      return
    }

    // Si el owner tiene mas de 1 propiedad, propertyId es requerido
    if (ownerProperties.length > 1 && !paymentForm.propertyId) {
      toast({
        title: 'Error',
        description: 'Por favor selecciona la propiedad',
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
          ownerId: selectedProperty.owner.id,
          propertyId: paymentForm.propertyId || selectedProperty.property.id,
          amount: parseFloat(paymentForm.amount),
          paymentDate: paymentForm.paymentDate,
          paymentMethod: paymentForm.paymentMethod || null,
          referenceNumber: paymentForm.referenceNumber || null,
          notes: paymentForm.notes || null,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Pago registrado',
          description: 'El pago se ha registrado exitosamente.',
        })
        setPaymentDialogOpen(false)
        fetchData()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'No se pudo registrar el pago',
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

  const openEditPaymentDialog = (payment: { id: string; amount: number; date: string; method: string | null; reference: string | null; notes: string | null }, propertyId: string, ownerId: string) => {
    setEditingPayment({ ...payment, propertyId, ownerId })
    
    // Get all properties for this owner
    const ownerProps = data?.properties
      .filter(p => p.owner.id === ownerId)
      .map(p => ({ id: p.property.id, title: p.property.title })) || []
    
    setOwnerProperties(ownerProps)
    
    setEditPaymentForm({
      amount: String(payment.amount),
      paymentDate: payment.date ? new Date(payment.date).toISOString().split('T')[0] : '',
      paymentMethod: payment.method || '',
      referenceNumber: payment.reference || '',
      notes: payment.notes || '',
      propertyId: propertyId,
    })
    setEditPaymentDialogOpen(true)
  }

  const handleEditPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingPayment || !editPaymentForm.amount) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos requeridos',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/owner-payments/${editingPayment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(editPaymentForm.amount),
          paymentDate: editPaymentForm.paymentDate,
          paymentMethod: editPaymentForm.paymentMethod || null,
          referenceNumber: editPaymentForm.referenceNumber || null,
          notes: editPaymentForm.notes || null,
          propertyId: editPaymentForm.propertyId || null,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Pago actualizado',
          description: 'El pago se ha actualizado exitosamente.',
        })
        setEditPaymentDialogOpen(false)
        fetchData()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'No se pudo actualizar el pago',
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

  const openDeletePaymentDialog = (paymentId: string) => {
    setDeletingPaymentId(paymentId)
    setDeletePaymentDialogOpen(true)
  }

  const handleDeletePayment = async () => {
    if (!deletingPaymentId) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/owner-payments/${deletingPaymentId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Pago eliminado',
          description: 'El pago se ha eliminado exitosamente.',
        })
        setDeletePaymentDialogOpen(false)
        setDeletingPaymentId(null)
        fetchData()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'No se pudo eliminar el pago',
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
      setDeleting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PA', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  if (loading) {
    return (
      <SidebarProvider>
        <Sidebar />
        <SidebarInset className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </main>
          <Footer />
        </SidebarInset>
      </SidebarProvider>
    )
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
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Relacion de Gastos</h1>
                <p className="text-muted-foreground">Balance de gastos entre administracion y propietarios por propiedad</p>
              </div>
            </div>

            {/* Summary Cards - 3 tarjetas: Gastos, Pagos, Balance */}
            {data && (
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Gastos</p>
                        <p className="text-2xl font-bold text-red-500">{formatCurrency(data.totals.totalPending)}</p>
                        <p className="text-xs text-muted-foreground">Por cobrar a propietarios</p>
                      </div>
                      <div className="h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                        <TrendingDown className="h-6 w-6 text-red-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Pagos</p>
                        <p className="text-2xl font-bold text-blue-500">{formatCurrency(data.totals.totalPayments)}</p>
                        <p className="text-xs text-muted-foreground">Pagos de propietarios</p>
                      </div>
                      <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <DollarSign className="h-6 w-6 text-blue-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Balance</p>
                        <p className={cn(
                          "text-2xl font-bold",
                          data.totals.totalBalance >= 0 ? "text-green-500" : "text-red-500"
                        )}>
                          {formatCurrency(data.totals.totalBalance)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {data.totals.totalBalance >= 0 ? "Saldo a favor de admin" : "Saldo a favor de propietarios"}
                        </p>
                      </div>
                      <div className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center",
                        data.totals.totalBalance >= 0 ? "bg-green-500/10" : "bg-red-500/10"
                      )}>
                        <Wallet className={cn(
                          "h-6 w-6",
                          data.totals.totalBalance >= 0 ? "text-green-500" : "text-red-500"
                        )} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Properties Detail */}
            {data && (
              <Card>
                <CardHeader>
                  <CardTitle>Balance por Propiedad</CardTitle>
                  <CardDescription>
                    {data.properties.length} propiedades con movimientos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.properties.map((propertyBalance) => (
                      <div key={propertyBalance.property.id} className="border rounded-lg overflow-hidden">
                        {/* Property Header */}
                        <button
                          className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                          onClick={() => togglePropertyExpand(propertyBalance.property.id)}
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "h-10 w-10 rounded-lg flex items-center justify-center",
                              propertyBalance.totals.balance >= 0 
                                ? "bg-green-500/10" 
                                : "bg-red-500/10"
                            )}>
                              <Building2 className={cn(
                                "h-5 w-5",
                                propertyBalance.totals.balance >= 0 
                                  ? "text-green-500" 
                                  : "text-red-500"
                              )} />
                            </div>
                            <div className="text-left">
                              <p className="font-medium">{propertyBalance.property.title}</p>
                              <p className="text-sm text-muted-foreground">
                                Propietario: {propertyBalance.owner.name}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className={cn(
                                "font-bold",
                                propertyBalance.totals.balance >= 0 ? "text-green-500" : "text-red-500"
                              )}>
                                {formatCurrency(propertyBalance.totals.balance)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {propertyBalance.totals.balance >= 0 ? "Saldo a favor" : "Debe"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openPaymentDialog(propertyBalance)
                                }}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Pago
                              </Button>
                              {expandedProperties.has(propertyBalance.property.id) ? (
                                <ChevronUp className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </button>

                        {/* Expanded Details */}
                        {expandedProperties.has(propertyBalance.property.id) && (
                          <div className="border-t p-4 space-y-6 bg-muted/30">
                            {/* Summary - 3 columnas: Gastos, Pagos, Balance */}
                            <div className="grid grid-cols-3 gap-4">
                              <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                                <p className="text-xs text-muted-foreground">Gastos</p>
                                <p className="text-lg font-bold text-red-500">{formatCurrency(propertyBalance.totals.pending)}</p>
                              </div>
                              <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                                <p className="text-xs text-muted-foreground">Pagos</p>
                                <p className="text-lg font-bold text-blue-500">{formatCurrency(propertyBalance.totals.payments)}</p>
                              </div>
                              <div className={cn(
                                "p-3 rounded-lg border",
                                propertyBalance.totals.balance >= 0 
                                  ? "bg-green-500/5 border-green-500/10" 
                                  : "bg-red-500/5 border-red-500/10"
                              )}>
                                <p className="text-xs text-muted-foreground">Balance</p>
                                <p className={cn(
                                  "text-lg font-bold",
                                  propertyBalance.totals.balance >= 0 ? "text-green-500" : "text-red-500"
                                )}>
                                  {formatCurrency(propertyBalance.totals.balance)}
                                </p>
                              </div>
                            </div>

                            {/* Pending Expenses */}
                            {propertyBalance.pendingExpenses.length > 0 && (
                              <div>
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-red-500" />
                                  Gastos Pendientes de Reembolso ({propertyBalance.pendingExpenses.length})
                                </h4>
                                <div className="bg-white rounded-lg border overflow-hidden">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Descripcion</TableHead>
                                        <TableHead>Categoria</TableHead>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead className="text-right">Monto</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {propertyBalance.pendingExpenses.map((expense) => (
                                        <TableRow key={expense.id}>
                                          <TableCell>{expense.description}</TableCell>
                                          <TableCell>
                                            <Badge variant="outline" className="text-xs">
                                              {categoryLabels[expense.category] || expense.category}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="text-muted-foreground">
                                            {new Date(expense.date).toLocaleDateString('es-PA')}
                                          </TableCell>
                                          <TableCell className="text-right font-medium text-red-500">
                                            {formatCurrency(expense.amount)}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                      <TableRow className="bg-muted/50">
                                        <TableCell colSpan={3} className="font-medium">Total Gastos</TableCell>
                                        <TableCell className="text-right font-bold text-red-500">
                                          {formatCurrency(propertyBalance.totals.pending)}
                                        </TableCell>
                                      </TableRow>
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            )}

                            {/* Owner Payments */}
                            {propertyBalance.ownerPayments.length > 0 && (
                              <div>
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                  <Receipt className="h-4 w-4 text-blue-500" />
                                  Pagos del Propietario ({propertyBalance.ownerPayments.length})
                                </h4>
                                <div className="bg-white rounded-lg border overflow-hidden">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Metodo</TableHead>
                                        <TableHead>Referencia</TableHead>
                                        <TableHead>Notas</TableHead>
                                        <TableHead className="text-right">Monto</TableHead>
                                        <TableHead className="text-center">Acciones</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {propertyBalance.ownerPayments.map((payment) => (
                                        <TableRow key={payment.id}>
                                          <TableCell>{new Date(payment.date).toLocaleDateString('es-PA')}</TableCell>
                                          <TableCell>{payment.method || 'N/A'}</TableCell>
                                          <TableCell>{payment.reference || 'N/A'}</TableCell>
                                          <TableCell className="text-muted-foreground">{payment.notes || 'N/A'}</TableCell>
                                          <TableCell className="text-right font-medium text-green-500">
                                            +{formatCurrency(payment.amount)}
                                          </TableCell>
                                          <TableCell className="text-center">
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                  <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openEditPaymentDialog(payment, propertyBalance.property.id, propertyBalance.owner.id)}>
                                                  <Edit className="h-4 w-4 mr-2" />
                                                  Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                  className="text-destructive"
                                                  onClick={() => openDeletePaymentDialog(payment.id)}
                                                >
                                                  Eliminar
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                      <TableRow className="bg-muted/50">
                                        <TableCell colSpan={4} className="font-medium">Total Pagos</TableCell>
                                        <TableCell className="text-right font-bold text-green-500">
                                          {formatCurrency(propertyBalance.totals.payments)}
                                        </TableCell>
                                      </TableRow>
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            )}

                            {/* Empty state */}
                            {propertyBalance.pendingExpenses.length === 0 && propertyBalance.ownerPayments.length === 0 && (
                              <div className="text-center py-8 text-muted-foreground">
                                <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>No hay movimientos registrados</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {data.properties.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No hay propiedades con movimientos registrados</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
        
        <Footer />
      </SidebarInset>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pago de Propietario</DialogTitle>
            <DialogDescription>
              Propietario: {selectedProperty?.owner.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            {/* Selector de propiedad - solo si tiene mas de 1 */}
            {ownerProperties.length > 1 && (
              <div className="space-y-2">
                <Label>Propiedad *</Label>
                <Select 
                  value={paymentForm.propertyId} 
                  onValueChange={(v) => setPaymentForm({ ...paymentForm, propertyId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar propiedad" />
                  </SelectTrigger>
                  <SelectContent>
                    {ownerProperties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
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
              <Label>Metodo de Pago</Label>
              <Select 
                value={paymentForm.paymentMethod} 
                onValueChange={(v) => setPaymentForm({ ...paymentForm, paymentMethod: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar metodo" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Numero de Referencia</Label>
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

      {/* Edit Payment Dialog */}
      <Dialog open={editPaymentDialogOpen} onOpenChange={setEditPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Pago de Propietario</DialogTitle>
            <DialogDescription>
              Modifica los datos del pago
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditPaymentSubmit} className="space-y-4">
            {/* Selector de propiedad - solo si tiene mas de 1 */}
            {ownerProperties.length > 1 && (
              <div className="space-y-2">
                <Label>Propiedad</Label>
                <Select 
                  value={editPaymentForm.propertyId} 
                  onValueChange={(v) => setEditPaymentForm({ ...editPaymentForm, propertyId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar propiedad" />
                  </SelectTrigger>
                  <SelectContent>
                    {ownerProperties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Monto *</Label>
              <Input
                type="number"
                step="0.01"
                value={editPaymentForm.amount}
                onChange={(e) => setEditPaymentForm({ ...editPaymentForm, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha *</Label>
              <Input
                type="date"
                value={editPaymentForm.paymentDate}
                onChange={(e) => setEditPaymentForm({ ...editPaymentForm, paymentDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Metodo de Pago</Label>
              <Select 
                value={editPaymentForm.paymentMethod} 
                onValueChange={(v) => setEditPaymentForm({ ...editPaymentForm, paymentMethod: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar metodo" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Numero de Referencia</Label>
              <Input
                value={editPaymentForm.referenceNumber}
                onChange={(e) => setEditPaymentForm({ ...editPaymentForm, referenceNumber: e.target.value })}
                placeholder="Ej: TRANS-123456"
              />
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={editPaymentForm.notes}
                onChange={(e) => setEditPaymentForm({ ...editPaymentForm, notes: e.target.value })}
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditPaymentDialogOpen(false)}>
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

      {/* Delete Payment Dialog */}
      <AlertDialog open={deletePaymentDialogOpen} onOpenChange={setDeletePaymentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar pago?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. El pago sera eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePayment}
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
