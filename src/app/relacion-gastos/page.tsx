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
  ChevronDown, ChevronUp, Loader2, Plus, Minus, CheckCircle, Clock, Receipt
} from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface OwnerBalance {
  owner: {
    id: string
    name: string
    email: string
    phone: string | null
    propertiesCount: number
  }
  pendingExpenses: Array<{
    id: string
    description: string
    amount: number
    date: string
    category: string
    property: { id: string; title: string }
  }>
  reimbursedExpenses: Array<{
    id: string
    description: string
    amount: number
    date: string
    category: string
    property: { id: string; title: string }
    reimbursedAt: string | null
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
    reimbursed: number
    payments: number
    balance: number
  }
}

interface BalanceData {
  owners: OwnerBalance[]
  totals: {
    totalPending: number
    totalReimbursed: number
    totalPayments: number
    totalBalance: number
  }
}

const categoryLabels: Record<string, string> = {
  MANTENIMIENTO_PH: 'Mantenimiento PH',
  SEGURO: 'Seguro',
  SERVICIOS_BASICOS: 'Servicios Básicos',
  REPARACION: 'Reparación',
  SERVICIO_TECNICO: 'Servicio Técnico',
  IMPUESTOS: 'Impuestos',
  COMISION_ADMIN: 'Comisión Admin',
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
  const [expandedOwners, setExpandedOwners] = useState<Set<string>>(new Set())
  
  // Payment dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedOwner, setSelectedOwner] = useState<OwnerBalance['owner'] | null>(null)
  const [saving, setSaving] = useState(false)
  
  // Mark as reimbursed dialog
  const [reimburseDialogOpen, setReimburseDialogOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<{ id: string; description: string; amount: number; ownerId: string } | null>(null)
  
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: '',
    referenceNumber: '',
    notes: '',
  })

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
          description: result.error || 'No se pudo cargar la información',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error fetching balance:', error)
      toast({
        title: 'Error',
        description: 'Error de conexión',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleOwnerExpand = (ownerId: string) => {
    setExpandedOwners(prev => {
      const newSet = new Set(prev)
      if (newSet.has(ownerId)) {
        newSet.delete(ownerId)
      } else {
        newSet.add(ownerId)
      }
      return newSet
    })
  }

  const openPaymentDialog = (owner: OwnerBalance['owner']) => {
    setSelectedOwner(owner)
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
    
    if (!selectedOwner || !paymentForm.amount) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos requeridos',
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
          ownerId: selectedOwner.id,
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
        description: 'Error de conexión',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const openReimburseDialog = (expense: { id: string; description: string; amount: number }, ownerId: string) => {
    setSelectedExpense({ ...expense, ownerId })
    setReimburseDialogOpen(true)
  }

  const handleReimburse = async () => {
    if (!selectedExpense) return

    setSaving(true)
    try {
      const response = await fetch(`/api/expenses/${selectedExpense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reimbursedByOwner: true,
          reimbursedAt: new Date().toISOString(),
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Gasto marcado como reembolsado',
          description: 'El gasto se ha marcado como reembolsado por el propietario.',
        })
        setReimburseDialogOpen(false)
        fetchData()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'No se pudo actualizar el gasto',
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
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Relación de Gastos</h1>
                <p className="text-muted-foreground">Balance de gastos entre administración y propietarios</p>
              </div>
            </div>

            {/* Summary Cards */}
            {data && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Pendiente</p>
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
                        <p className="text-sm text-muted-foreground">Total Reembolsado</p>
                        <p className="text-2xl font-bold text-green-500">{formatCurrency(data.totals.totalReimbursed)}</p>
                        <p className="text-xs text-muted-foreground">Ya reembolsado</p>
                      </div>
                      <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Pagos Recibidos</p>
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
                        <p className="text-sm text-muted-foreground">Balance General</p>
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

            {/* Owners Detail */}
            {data && (
              <Card>
                <CardHeader>
                  <CardTitle>Balance por Propietario</CardTitle>
                  <CardDescription>
                    {data.owners.length} propietarios registrados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.owners.map((ownerBalance) => (
                      <div key={ownerBalance.owner.id} className="border rounded-lg overflow-hidden">
                        {/* Owner Header */}
                        <button
                          className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                          onClick={() => toggleOwnerExpand(ownerBalance.owner.id)}
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "h-10 w-10 rounded-lg flex items-center justify-center",
                              ownerBalance.totals.balance >= 0 
                                ? "bg-green-500/10" 
                                : "bg-red-500/10"
                            )}>
                              <Wallet className={cn(
                                "h-5 w-5",
                                ownerBalance.totals.balance >= 0 
                                  ? "text-green-500" 
                                  : "text-red-500"
                              )} />
                            </div>
                            <div className="text-left">
                              <p className="font-medium">{ownerBalance.owner.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {ownerBalance.owner.propertiesCount} propiedades
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className={cn(
                                "font-bold",
                                ownerBalance.totals.balance >= 0 ? "text-green-500" : "text-red-500"
                              )}>
                                {formatCurrency(ownerBalance.totals.balance)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {ownerBalance.totals.balance >= 0 ? "Saldo a favor" : "Debe"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openPaymentDialog(ownerBalance.owner)
                                }}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Pago
                              </Button>
                              {expandedOwners.has(ownerBalance.owner.id) ? (
                                <ChevronUp className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </button>

                        {/* Expanded Details */}
                        {expandedOwners.has(ownerBalance.owner.id) && (
                          <div className="border-t p-4 space-y-6 bg-muted/30">
                            {/* Summary */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                                <p className="text-xs text-muted-foreground">Pendiente</p>
                                <p className="text-lg font-bold text-red-500">{formatCurrency(ownerBalance.totals.pending)}</p>
                              </div>
                              <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                                <p className="text-xs text-muted-foreground">Reembolsado</p>
                                <p className="text-lg font-bold text-green-500">{formatCurrency(ownerBalance.totals.reimbursed)}</p>
                              </div>
                              <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                                <p className="text-xs text-muted-foreground">Pagos</p>
                                <p className="text-lg font-bold text-blue-500">{formatCurrency(ownerBalance.totals.payments)}</p>
                              </div>
                              <div className={cn(
                                "p-3 rounded-lg border",
                                ownerBalance.totals.balance >= 0 
                                  ? "bg-green-500/5 border-green-500/10" 
                                  : "bg-red-500/5 border-red-500/10"
                              )}>
                                <p className="text-xs text-muted-foreground">Balance</p>
                                <p className={cn(
                                  "text-lg font-bold",
                                  ownerBalance.totals.balance >= 0 ? "text-green-500" : "text-red-500"
                                )}>
                                  {formatCurrency(ownerBalance.totals.balance)}
                                </p>
                              </div>
                            </div>

                            {/* Pending Expenses */}
                            {ownerBalance.pendingExpenses.length > 0 && (
                              <div>
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-red-500" />
                                  Gastos Pendientes de Reembolso ({ownerBalance.pendingExpenses.length})
                                </h4>
                                <div className="bg-white rounded-lg border overflow-hidden">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Descripción</TableHead>
                                        <TableHead>Propiedad</TableHead>
                                        <TableHead>Categoría</TableHead>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead className="text-right">Monto</TableHead>
                                        <TableHead className="text-center">Acción</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {ownerBalance.pendingExpenses.map((expense) => (
                                        <TableRow key={expense.id}>
                                          <TableCell>{expense.description}</TableCell>
                                          <TableCell className="text-muted-foreground">{expense.property.title}</TableCell>
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
                                          <TableCell className="text-center">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => openReimburseDialog(
                                                { id: expense.id, description: expense.description, amount: expense.amount },
                                                ownerBalance.owner.id
                                              )}
                                            >
                                              <CheckCircle className="h-4 w-4 mr-1" />
                                              Marcar Reembolsado
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                      <TableRow className="bg-muted/50">
                                        <TableCell colSpan={4} className="font-medium">Total Pendiente</TableCell>
                                        <TableCell className="text-right font-bold text-red-500">
                                          {formatCurrency(ownerBalance.totals.pending)}
                                        </TableCell>
                                        <TableCell></TableCell>
                                      </TableRow>
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            )}

                            {/* Owner Payments */}
                            {ownerBalance.ownerPayments.length > 0 && (
                              <div>
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                  <Receipt className="h-4 w-4 text-blue-500" />
                                  Pagos del Propietario ({ownerBalance.ownerPayments.length})
                                </h4>
                                <div className="bg-white rounded-lg border overflow-hidden">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Método</TableHead>
                                        <TableHead>Referencia</TableHead>
                                        <TableHead>Notas</TableHead>
                                        <TableHead className="text-right">Monto</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {ownerBalance.ownerPayments.map((payment) => (
                                        <TableRow key={payment.id}>
                                          <TableCell>{new Date(payment.date).toLocaleDateString('es-PA')}</TableCell>
                                          <TableCell>{payment.method || 'N/A'}</TableCell>
                                          <TableCell>{payment.reference || 'N/A'}</TableCell>
                                          <TableCell className="text-muted-foreground">{payment.notes || 'N/A'}</TableCell>
                                          <TableCell className="text-right font-medium text-green-500">
                                            +{formatCurrency(payment.amount)}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                      <TableRow className="bg-muted/50">
                                        <TableCell colSpan={4} className="font-medium">Total Pagos</TableCell>
                                        <TableCell className="text-right font-bold text-green-500">
                                          {formatCurrency(ownerBalance.totals.payments)}
                                        </TableCell>
                                      </TableRow>
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            )}

                            {/* Empty state */}
                            {ownerBalance.pendingExpenses.length === 0 && ownerBalance.ownerPayments.length === 0 && (
                              <div className="text-center py-8 text-muted-foreground">
                                <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>No hay movimientos registrados</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {data.owners.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No hay propietarios registrados</p>
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
              Registra un pago realizado por {selectedOwner?.name}
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
                  {paymentMethods.map((m) => (
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

      {/* Reimburse Dialog */}
      <Dialog open={reimburseDialogOpen} onOpenChange={setReimburseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Marcar como Reembolsado</DialogTitle>
            <DialogDescription>
              ¿Confirmas que el propietario ha reembolsado este gasto?
            </DialogDescription>
          </DialogHeader>
          {selectedExpense && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <p className="font-medium">{selectedExpense.description}</p>
              <p className="text-2xl font-bold text-red-500">{formatCurrency(selectedExpense.amount)}</p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReimburseDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReimburse} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Reembolso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
