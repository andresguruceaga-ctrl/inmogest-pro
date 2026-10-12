'use client'

import { useState, useEffect, useMemo } from 'react'
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

// Interfaz para datos por propiedad
interface PropertyBalance {
  property: {
    id: string
    title: string
    address: string | null
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

interface AccountMovement {
  id: string
  type: 'GASTO' | 'PAGO'
  date: string
  description: string
  category: string
  amount: number
  balance: number
  payment?: PropertyBalance['ownerPayments'][number]
}

interface PropertyStatement extends PropertyBalance {
  movements: AccountMovement[]
  openingBalance: number
  endingBalance: number
  periodExpenses: number
  periodPayments: number
}

// Interfaz para propiedades de un propietario (para el selector)
interface OwnerProperties {
  ownerId: string
  ownerName: string
  properties: Array<{
    id: string
    title: string
    balance: number
  }>
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
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set())
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [propertyFilter, setPropertyFilter] = useState('ALL')
  
  // Payment dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<PropertyBalance | null>(null)
  const [saving, setSaving] = useState(false)
  
  // Owner properties for selector (when owner has multiple properties)
  const [ownerProperties, setOwnerProperties] = useState<OwnerProperties | null>(null)
  
  // Edit payment dialog
  const [editPaymentDialogOpen, setEditPaymentDialogOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<{ id: string; amount: number; date: string; method: string | null; reference: string | null; notes: string | null; propertyId: string } | null>(null)
  
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
  })

  useEffect(() => {
    queueMicrotask(() => void fetchData())
  }, [])

  async function fetchData() {
    try {
      const response = await fetch('/api/owner-balance')
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
        setExpandedProperties(new Set(result.data.properties.map((item: PropertyBalance) => item.property.id)))
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

  // Obtener propiedades de un mismo propietario
  const getOwnerProperties = (ownerId: string): OwnerProperties | null => {
    if (!data) return null
    
    const ownerProps = data.properties.filter(p => p.owner.id === ownerId)
    if (ownerProps.length === 0) return null
    
    return {
      ownerId,
      ownerName: ownerProps[0].owner.name,
      properties: ownerProps.map(p => ({
        id: p.property.id,
        title: p.property.title,
        balance: p.totals.balance,
      }))
    }
  }

  const openPaymentDialog = async (propertyBalance: PropertyBalance) => {
    setSelectedProperty(propertyBalance)
    
    // Verificar si el propietario tiene múltiples propiedades
    const ownerProps = getOwnerProperties(propertyBalance.owner.id)
    
    if (ownerProps && ownerProps.properties.length > 1) {
      // Tiene múltiples propiedades - mostrar selector
      setOwnerProperties(ownerProps)
      setPaymentForm({
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: '',
        referenceNumber: '',
        notes: '',
        propertyId: propertyBalance.property.id,
      })
    } else {
      // Solo una propiedad - no mostrar selector
      setOwnerProperties(null)
      setPaymentForm({
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: '',
        referenceNumber: '',
        notes: '',
        propertyId: propertyBalance.property.id,
      })
    }
    
    setPaymentDialogOpen(true)
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!paymentForm.amount || !paymentForm.propertyId) {
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
          ownerId: selectedProperty?.owner.id,
          propertyId: paymentForm.propertyId,
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

  const openEditPaymentDialog = (payment: { id: string; amount: number; date: string; method: string | null; reference: string | null; notes: string | null }, propertyId: string) => {
    setEditingPayment({ ...payment, propertyId })
    setEditPaymentForm({
      amount: String(payment.amount),
      paymentDate: payment.date ? new Date(payment.date).toISOString().split('T')[0] : '',
      paymentMethod: payment.method || '',
      referenceNumber: payment.reference || '',
      notes: payment.notes || '',
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
        description: 'Error de conexión',
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
        description: 'Error de conexión',
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

  const statements = useMemo<PropertyStatement[]>(() => {
    if (!data) return []

    return data.properties
      .filter(item => propertyFilter === 'ALL' || item.property.id === propertyFilter)
      .map(item => {
        let balance = 0
        const allMovements = [
          ...item.pendingExpenses.map(expense => ({
            id: expense.id,
            type: 'GASTO' as const,
            date: expense.date,
            description: expense.description,
            category: categoryLabels[expense.category] || expense.category,
            amount: expense.amount,
          })),
          ...item.ownerPayments.map(payment => ({
            id: payment.id,
            type: 'PAGO' as const,
            date: payment.date,
            description: payment.notes || payment.reference || payment.method || 'Pago del propietario',
            category: 'Pago del propietario',
            amount: payment.amount,
            payment,
          })),
        ].sort((a, b) => {
          const difference = new Date(a.date).getTime() - new Date(b.date).getTime()
          if (difference !== 0) return difference
          if (a.type !== b.type) return a.type === 'GASTO' ? -1 : 1
          return a.id.localeCompare(b.id)
        }).map(movement => {
          balance += movement.type === 'GASTO' ? -movement.amount : movement.amount
          return { ...movement, balance }
        })

        const dateKey = (value: string) => new Date(value).toISOString().slice(0, 10)
        const openingBalance = allMovements
          .filter(movement => startDateFilter && dateKey(movement.date) < startDateFilter)
          .reduce((sum, movement) => sum + (movement.type === 'GASTO' ? -movement.amount : movement.amount), 0)
        const movements = allMovements.filter(movement => {
          const date = dateKey(movement.date)
          return (!startDateFilter || date >= startDateFilter) && (!endDateFilter || date <= endDateFilter)
        })

        return {
          ...item,
          movements,
          openingBalance,
          endingBalance: movements.length ? movements[movements.length - 1].balance : openingBalance,
          periodExpenses: movements.filter(m => m.type === 'GASTO').reduce((sum, m) => sum + m.amount, 0),
          periodPayments: movements.filter(m => m.type === 'PAGO').reduce((sum, m) => sum + m.amount, 0),
        }
      })
  }, [data, propertyFilter, startDateFilter, endDateFilter])

  const periodSummary = useMemo(() => ({
    expenses: statements.reduce((sum, item) => sum + item.periodExpenses, 0),
    payments: statements.reduce((sum, item) => sum + item.periodPayments, 0),
    balance: statements.reduce((sum, item) => sum + item.endingBalance, 0),
  }), [statements])

  // Agrupar propiedades por propietario para mostrar en la UI
  const groupedByOwner = statements.reduce((acc, propBalance) => {
    const ownerId = propBalance.owner.id
    if (!acc[ownerId]) {
      acc[ownerId] = {
        owner: propBalance.owner,
        properties: [],
      }
    }
    acc[ownerId].properties.push(propBalance)
    return acc
  }, {} as Record<string, { owner: PropertyBalance['owner']; properties: PropertyStatement[] }>)

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
                <p className="text-muted-foreground">Balance de gastos por propiedad entre administración y propietarios</p>
              </div>
            </div>

            <Card>
              <CardContent className="grid gap-4 pt-6 md:grid-cols-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Propiedad</Label>
                  <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todas las propiedades</SelectItem>
                      {data?.properties.map(item => (
                        <SelectItem key={item.property.id} value={item.property.id}>
                          {item.property.title} · {item.owner.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="statement-start-date">Desde</Label>
                  <Input
                    id="statement-start-date"
                    type="date"
                    value={startDateFilter}
                    max={endDateFilter || undefined}
                    onChange={event => setStartDateFilter(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="statement-end-date">Hasta</Label>
                  <Input
                    id="statement-end-date"
                    type="date"
                    value={endDateFilter}
                    min={startDateFilter || undefined}
                    onChange={event => setEndDateFilter(event.target.value)}
                  />
                </div>
                {(startDateFilter || endDateFilter || propertyFilter !== 'ALL') && (
                  <div className="md:col-span-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStartDateFilter('')
                        setEndDateFilter('')
                        setPropertyFilter('ALL')
                      }}
                    >
                      Limpiar filtros
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary Cards */}
            {data && (
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Gastos</p>
                        <p className="text-2xl font-bold text-red-500">{formatCurrency(periodSummary.expenses)}</p>
                        <p className="text-xs text-muted-foreground">Cargos del período</p>
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
                        <p className="text-2xl font-bold text-blue-500">{formatCurrency(periodSummary.payments)}</p>
                        <p className="text-xs text-muted-foreground">Abonos del período</p>
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
                          periodSummary.balance < 0 ? "text-red-500" : "text-green-500"
                        )}>
                          {formatCurrency(periodSummary.balance)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {periodSummary.balance < 0
                            ? "Pendiente al administrador"
                            : periodSummary.balance > 0
                              ? "A favor del propietario"
                              : "Sin saldo pendiente"}
                        </p>
                      </div>
                      <div className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center",
                        periodSummary.balance < 0 ? "bg-red-500/10" : "bg-green-500/10"
                      )}>
                        <Wallet className={cn(
                          "h-6 w-6",
                          periodSummary.balance < 0 ? "text-red-500" : "text-green-500"
                        )} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Properties Detail - Grouped by Owner */}
            {data && groupedByOwner && (
              <Card>
                <CardHeader>
                  <CardTitle>Estados de cuenta por propiedad</CardTitle>
                  <CardDescription>
                    Movimientos ordenados por fecha con saldo acumulado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {Object.values(groupedByOwner).map((group) => (
                      <div key={group.owner.id} className="space-y-3">
                        {/* Owner Header */}
                        <div className="flex items-center gap-2 px-2">
                          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                            <Wallet className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-semibold">{group.owner.name}</p>
                            <p className="text-xs text-muted-foreground">{group.properties.length} propiedad{group.properties.length > 1 ? 'es' : ''}</p>
                          </div>
                        </div>

                        {/* Properties under this owner */}
                        <div className="space-y-2 ml-4">
                          {group.properties.map((propBalance) => (
                            <div key={propBalance.property.id} className="border rounded-lg overflow-hidden">
                              {/* Property Header */}
                              <button
                                className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                                onClick={() => togglePropertyExpand(propBalance.property.id)}
                              >
                                <div className="flex items-center gap-4">
                                  <div className={cn(
                                    "h-10 w-10 rounded-lg flex items-center justify-center",
                                    propBalance.endingBalance < 0
                                      ? "bg-red-500/10"
                                      : "bg-green-500/10"
                                  )}>
                                    <Building2 className={cn(
                                      "h-5 w-5",
                                      propBalance.endingBalance < 0
                                        ? "text-red-500"
                                        : "text-green-500"
                                    )} />
                                  </div>
                                  <div className="text-left">
                                    <p className="font-medium">{propBalance.property.title}</p>
                                    {propBalance.property.address && (
                                      <p className="text-sm text-muted-foreground">{propBalance.property.address}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <p className={cn(
                                      "font-bold",
                                      propBalance.endingBalance < 0 ? "text-red-500" : "text-green-500"
                                    )}>
                                      {formatCurrency(propBalance.endingBalance)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {propBalance.endingBalance < 0 ? "Pendiente" : propBalance.endingBalance > 0 ? "A favor" : "Saldado"}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openPaymentDialog(propBalance)
                                      }}
                                    >
                                      <Plus className="h-4 w-4 mr-1" />
                                      Pago
                                    </Button>
                                    {expandedProperties.has(propBalance.property.id) ? (
                                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                    ) : (
                                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                    )}
                                  </div>
                                </div>
                              </button>

                              {/* Expanded Details */}
                              {expandedProperties.has(propBalance.property.id) && (
                                <div className="border-t bg-muted/30 p-4">
                                  <div className="overflow-hidden rounded-lg border bg-background">
                                    <div className="overflow-x-auto">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead className="min-w-28">Fecha</TableHead>
                                            <TableHead className="min-w-52">Descripción</TableHead>
                                            <TableHead className="min-w-40">Categoría</TableHead>
                                            <TableHead className="text-right">Monto</TableHead>
                                            <TableHead className="text-right">Balance</TableHead>
                                            <TableHead className="w-16 text-center">Acciones</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {startDateFilter && (
                                            <TableRow className="bg-muted/50">
                                              <TableCell>{new Date(`${startDateFilter}T12:00:00`).toLocaleDateString('es-PA')}</TableCell>
                                              <TableCell className="font-medium">Saldo anterior</TableCell>
                                              <TableCell>—</TableCell>
                                              <TableCell className="text-right">—</TableCell>
                                              <TableCell className="text-right font-semibold">{formatCurrency(propBalance.openingBalance)}</TableCell>
                                              <TableCell />
                                            </TableRow>
                                          )}
                                          {propBalance.movements.map(movement => (
                                            <TableRow key={`${movement.type}-${movement.id}`}>
                                              <TableCell className="whitespace-nowrap text-muted-foreground">
                                                {new Date(movement.date).toLocaleDateString('es-PA')}
                                              </TableCell>
                                              <TableCell>{movement.description}</TableCell>
                                              <TableCell>
                                                <Badge variant={movement.type === 'GASTO' ? 'outline' : 'secondary'} className="whitespace-nowrap text-xs">
                                                  {movement.category}
                                                </Badge>
                                              </TableCell>
                                              <TableCell className={cn(
                                                'whitespace-nowrap text-right font-medium',
                                                movement.type === 'GASTO' ? 'text-red-600' : 'text-emerald-600'
                                              )}>
                                                {movement.type === 'GASTO' ? '-' : '+'}{formatCurrency(movement.amount)}
                                              </TableCell>
                                              <TableCell className={cn(
                                                'whitespace-nowrap text-right font-semibold',
                                                movement.balance < 0 ? 'text-red-600' : 'text-emerald-600'
                                              )}>
                                                {formatCurrency(movement.balance)}
                                              </TableCell>
                                              <TableCell className="text-center">
                                                {movement.payment && (
                                                  <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                      </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                      <DropdownMenuItem onClick={() => openEditPaymentDialog(movement.payment!, propBalance.property.id)}>
                                                        <Edit className="mr-2 h-4 w-4" /> Editar pago
                                                      </DropdownMenuItem>
                                                      <DropdownMenuItem className="text-destructive" onClick={() => openDeletePaymentDialog(movement.payment!.id)}>
                                                        Eliminar pago
                                                      </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                  </DropdownMenu>
                                                )}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                          {!propBalance.movements.length && !startDateFilter && (
                                            <TableRow>
                                              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                                No hay movimientos en el período seleccionado.
                                              </TableCell>
                                            </TableRow>
                                          )}
                                          <TableRow className="bg-muted/60">
                                            <TableCell colSpan={3} className="font-semibold">Saldo final</TableCell>
                                            <TableCell className="text-right text-xs text-muted-foreground">
                                              Gastos {formatCurrency(propBalance.periodExpenses)} · Pagos {formatCurrency(propBalance.periodPayments)}
                                            </TableCell>
                                            <TableCell className={cn(
                                              'text-right font-bold',
                                              propBalance.endingBalance < 0 ? 'text-red-600' : 'text-emerald-600'
                                            )}>
                                              {formatCurrency(propBalance.endingBalance)}
                                            </TableCell>
                                            <TableCell />
                                          </TableRow>
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {statements.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No hay propiedades o movimientos que coincidan con los filtros</p>
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
              Registra un pago realizado por {selectedProperty?.owner.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            {/* Selector de propiedad - solo si tiene múltiples */}
            {ownerProperties && ownerProperties.properties.length > 1 && (
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
                    {ownerProperties.properties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>{p.title}</span>
                          <span className={cn(
                            "text-xs font-medium",
                            p.balance >= 0 ? "text-green-500" : "text-red-500"
                          )}>
                            {formatCurrency(p.balance)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Este propietario tiene múltiples propiedades. Selecciona a cuál aplicar el pago.
                </p>
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
              <Label>Método de Pago</Label>
              <Select 
                value={editPaymentForm.paymentMethod} 
                onValueChange={(v) => setEditPaymentForm({ ...editPaymentForm, paymentMethod: v })}
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
            <AlertDialogTitle>¿Eliminar pago?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El pago será eliminado permanentemente.
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
