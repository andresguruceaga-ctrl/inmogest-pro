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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Receipt, Plus, Search, Filter, MoreHorizontal, Eye, Calendar, Building2, ArrowUpRight, ArrowDownRight, Loader2, Trash2, Edit } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { Separator } from '@/components/ui/separator'

interface Expense {
  id: string
  title: string
  description: string | null
  category: string
  expenseType: string
  amount: number
  invoiceNumber: string | null
  supplier: string | null
  expenseDate: string
  paidByAdmin: boolean
  reimbursedByOwner: boolean
  property: { id: string; title: string; address: string } | null
}

interface Property {
  id: string
  title: string
  address: string
}

const EXPENSE_CATEGORIES = [
  'MANTENIMIENTO_PH',
  'SEGURO',
  'SERVICIOS_BASICOS',
  'REPARACION',
  'SERVICIO_TECNICO',
  'IMPUESTOS',
  'COMISION_ADMIN',
  'OTROS',
] as const

const EXPENSE_TYPES = ['FIJO', 'VARIABLE'] as const

const CATEGORY_LABELS: Record<string, string> = {
  MANTENIMIENTO_PH: 'Mantenimiento PH',
  SEGURO: 'Seguro',
  SERVICIOS_BASICOS: 'Servicios Basicos',
  REPARACION: 'Reparacion',
  SERVICIO_TECNICO: 'Servicio Tecnico',
  IMPUESTOS: 'Impuestos',
  COMISION_ADMIN: 'Comision Admin',
  OTROS: 'Otros',
}

export default function GastosPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [summary, setSummary] = useState({
    totalExpenses: 0,
    byType: { FIJO: { count: 0, total: 0 }, VARIABLE: { count: 0, total: 0 } }
  })
  const { toast } = useToast()

  // Detail dialog state
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    category: 'OTROS' as typeof EXPENSE_CATEGORIES[number],
    expenseType: 'VARIABLE' as typeof EXPENSE_TYPES[number],
    amount: '',
    invoiceNumber: '',
    supplier: '',
    expenseDate: '',
    propertyId: '',
    paidByAdmin: false,
  })

  // Delete confirmation state
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'MANTENIMIENTO_PH' as typeof EXPENSE_CATEGORIES[number],
    expenseType: 'VARIABLE' as typeof EXPENSE_TYPES[number],
    amount: '',
    invoiceNumber: '',
    supplier: '',
    expenseDate: '',
    propertyId: '',
    paidByAdmin: false,
  })

  // Memoized valid property ID for edit form
  const validEditPropertyId = useMemo(() => {
    if (!editFormData.propertyId) return ''
    const exists = properties.some(p => p.id === editFormData.propertyId)
    return exists ? editFormData.propertyId : ''
  }, [editFormData.propertyId, properties])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [expensesRes, propertiesRes] = await Promise.all([
        fetch('/api/expenses'),
        fetch('/api/properties'),
      ])

      if (expensesRes.ok) {
        const data = await expensesRes.json()
        setExpenses(data.data || [])
        if (data.summary) {
          setSummary(data.summary)
        }
      }
      if (propertiesRes.ok) {
        const data = await propertiesRes.json()
        setProperties(data.properties || data.data || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.amount || !formData.expenseDate || !formData.propertyId) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos requeridos',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          category: formData.category,
          expenseType: formData.expenseType,
          amount: parseFloat(formData.amount),
          invoiceNumber: formData.invoiceNumber || null,
          supplier: formData.supplier || null,
          expenseDate: formData.expenseDate,
          propertyId: formData.propertyId,
          paidByAdmin: formData.paidByAdmin,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Gasto registrado',
          description: formData.paidByAdmin 
            ? 'El gasto se ha registrado como pagado por el administrador. Aparecera en Relacion de Gastos.'
            : 'El gasto se ha registrado exitosamente.',
        })
        setDialogOpen(false)
        resetForm()
        fetchData()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'No se pudo registrar el gasto',
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

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingExpense) {
      toast({
        title: 'Error',
        description: 'No hay gasto seleccionado para editar',
        variant: 'destructive',
      })
      return
    }

    if (!editFormData.title?.trim()) {
      toast({
        title: 'Error',
        description: 'El titulo es requerido',
        variant: 'destructive',
      })
      return
    }

    if (!editFormData.amount || isNaN(parseFloat(editFormData.amount))) {
      toast({
        title: 'Error',
        description: 'El monto debe ser un numero valido',
        variant: 'destructive',
      })
      return
    }

    if (!editFormData.expenseDate) {
      toast({
        title: 'Error',
        description: 'La fecha del gasto es requerida',
        variant: 'destructive',
      })
      return
    }

    if (!editFormData.propertyId) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar una propiedad',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)

    try {
      const parsedAmount = parseFloat(editFormData.amount)
      
      const response = await fetch(`/api/expenses/${editingExpense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editFormData.title.trim(),
          description: editFormData.description?.trim() || null,
          category: editFormData.category,
          expenseType: editFormData.expenseType,
          amount: parsedAmount,
          invoiceNumber: editFormData.invoiceNumber?.trim() || null,
          supplier: editFormData.supplier?.trim() || null,
          expenseDate: editFormData.expenseDate,
          propertyId: editFormData.propertyId,
          paidByAdmin: editFormData.paidByAdmin,
        }),
      })

      let data
      try {
        data = await response.json()
      } catch {
        throw new Error('El servidor no respondio correctamente. Por favor, intenta de nuevo.')
      }

      if (response.ok) {
        toast({
          title: 'Gasto actualizado',
          description: 'El gasto se ha actualizado exitosamente.',
        })
        setEditOpen(false)
        setEditingExpense(null)
        fetchData()
      } else {
        const errorMessage = data.error || data.message || 'No se pudo actualizar el gasto'
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error updating expense:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error de conexion. Por favor, intenta de nuevo.',
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
      const response = await fetch(`/api/expenses/${deletingId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Gasto eliminado',
          description: 'El gasto se ha eliminado exitosamente.',
        })
        setDeleteOpen(false)
        setDeletingId(null)
        fetchData()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'No se pudo eliminar el gasto',
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

  const openDetail = (expense: Expense) => {
    setSelectedExpense(expense)
    setDetailOpen(true)
  }

  const openEdit = (expense: Expense) => {
    if (!expense) {
      toast({
        title: 'Error',
        description: 'No se pudo cargar el gasto para editar',
        variant: 'destructive',
      })
      return
    }
    
    setEditingExpense(expense)
    
    const propertyId = expense.property?.id || ''
    
    let expenseDateStr = ''
    try {
      if (expense.expenseDate) {
        const date = new Date(expense.expenseDate)
        if (!isNaN(date.getTime())) {
          expenseDateStr = date.toISOString().split('T')[0]
        }
      }
    } catch (e) {
      console.error('Error parsing expense date:', e)
    }

    const category = EXPENSE_CATEGORIES.includes(expense.category as typeof EXPENSE_CATEGORIES[number])
      ? expense.category as typeof EXPENSE_CATEGORIES[number]
      : 'OTROS'

    const expenseType = EXPENSE_TYPES.includes(expense.expenseType as typeof EXPENSE_TYPES[number])
      ? expense.expenseType as typeof EXPENSE_TYPES[number]
      : 'VARIABLE'
    
    setEditFormData({
      title: expense.title || '',
      description: expense.description || '',
      category,
      expenseType,
      amount: String(expense.amount ?? 0),
      invoiceNumber: expense.invoiceNumber || '',
      supplier: expense.supplier || '',
      expenseDate: expenseDateStr,
      propertyId: propertyId,
      paidByAdmin: expense.paidByAdmin || false,
    })
    setEditOpen(true)
  }

  const openDelete = (id: string) => {
    setDeletingId(id)
    setDeleteOpen(true)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'MANTENIMIENTO_PH',
      expenseType: 'VARIABLE',
      amount: '',
      invoiceNumber: '',
      supplier: '',
      expenseDate: '',
      propertyId: '',
      paidByAdmin: false,
    })
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A'
    try {
      return new Date(dateStr).toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch {
      return 'N/A'
    }
  }

  const getCategoryLabel = (category: string) => {
    return CATEGORY_LABELS[category] || category
  }

  const summaryCards = [
    { label: 'Gastos Fijos', value: summary.byType.FIJO.total, trend: 'up' },
    { label: 'Gastos Variables', value: summary.byType.VARIABLE.total, trend: 'down' },
    { label: 'Total', value: summary.totalExpenses, trend: 'up' },
  ]

  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <Header />
        
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Gastos</h1>
                <p className="text-muted-foreground">Control de gastos fijos y variables</p>
              </div>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Gasto
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {summaryCards.map((item, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-2xl font-bold">${item.value.toLocaleString()}</span>
                      {item.trend === 'up' && <ArrowUpRight className="h-4 w-4 text-red-500" />}
                      {item.trend === 'down' && <ArrowDownRight className="h-4 w-4 text-emerald-500" />}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar gastos..." className="pl-9" />
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
                <CardTitle>Historial de Gastos</CardTitle>
                <CardDescription>{expenses.length} gastos registrados</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : expenses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay gastos registrados</p>
                    <p className="text-sm">Haz clic en "Nuevo Gasto" para agregar uno</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Propiedad</TableHead>
                        <TableHead className="hidden md:table-cell">Categoria</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(expense.expenseDate)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate max-w-[150px]">{expense.property?.title || 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{getCategoryLabel(expense.category)}</TableCell>
                          <TableCell>
                            <Badge variant={expense.expenseType === 'FIJO' ? 'outline' : 'secondary'}>
                              {expense.expenseType === 'FIJO' ? 'Fijo' : 'Variable'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {expense.paidByAdmin ? (
                              <Badge variant="default" className="bg-orange-500">
                                Pagado por Admin
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-green-600">
                                Gasto Propiedad
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-red-500">
                            -${expense.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openDetail(expense)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver detalle
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEdit(expense)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => openDelete(expense.id)}
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

      {/* Dialog para Nuevo Gasto */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Gasto</DialogTitle>
            <DialogDescription>
              Registra un nuevo gasto para una propiedad.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Titulo *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Ej: Mantenimiento mensual PH"
                  required
                />
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
              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v as typeof EXPENSE_CATEGORIES[number]})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expenseType">Tipo *</Label>
                <Select value={formData.expenseType} onValueChange={(v) => setFormData({...formData, expenseType: v as typeof EXPENSE_TYPES[number]})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIJO">Fijo</SelectItem>
                    <SelectItem value="VARIABLE">Variable</SelectItem>
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
                  placeholder="250.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expenseDate">Fecha del Gasto *</Label>
                <Input
                  id="expenseDate"
                  type="date"
                  value={formData.expenseDate}
                  onChange={(e) => setFormData({...formData, expenseDate: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Numero de Factura</Label>
                <Input
                  id="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})}
                  placeholder="Ej: INV-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier">Proveedor</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                  placeholder="Ej: Empresa ABC"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripcion</Label>
              <textarea
                id="description"
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Detalles adicionales del gasto..."
              />
            </div>
            
            {/* CHECKBOX: Gasto pagado por administrador */}
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="paidByAdmin"
                  checked={formData.paidByAdmin}
                  onChange={(e) => setFormData({...formData, paidByAdmin: e.target.checked})}
                  className="rounded border-gray-300 mt-1"
                />
                <div>
                  <Label htmlFor="paidByAdmin" className="font-medium cursor-pointer">
                    Gasto pagado por el Administrador
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Marca esta opcion si el gasto fue pagado por la administracion y el propietario debe reembolsarlo. 
                    Aparecera en la seccion de "Relacion de Gastos".
                  </p>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar Gasto
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para Ver Detalle */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle del Gasto</DialogTitle>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Titulo</p>
                  <p className="font-medium">{selectedExpense.title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha</p>
                  <p className="font-medium">{formatDate(selectedExpense.expenseDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Propiedad</p>
                  <p className="font-medium">{selectedExpense.property?.title || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Categoria</p>
                  <p className="font-medium">{getCategoryLabel(selectedExpense.category)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <Badge variant={selectedExpense.expenseType === 'FIJO' ? 'outline' : 'secondary'}>
                    {selectedExpense.expenseType === 'FIJO' ? 'Fijo' : 'Variable'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Proveedor</p>
                  <p className="font-medium">{selectedExpense.supplier || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  {selectedExpense.paidByAdmin ? (
                    <Badge variant="default" className="bg-orange-500">Pagado por Admin</Badge>
                  ) : (
                    <Badge variant="outline" className="text-green-600">Gasto Propiedad</Badge>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monto</p>
                  <p className="font-bold text-lg text-red-500">${selectedExpense.amount.toLocaleString()}</p>
                </div>
              </div>

              {selectedExpense.description && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Descripcion</p>
                    <p className="text-sm bg-muted/50 rounded-lg p-3">{selectedExpense.description}</p>
                  </div>
                </>
              )}

              {selectedExpense.invoiceNumber && (
                <div>
                  <p className="text-sm text-muted-foreground">Numero de Factura</p>
                  <p className="font-medium">{selectedExpense.invoiceNumber}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Cerrar
            </Button>
            <Button onClick={() => {
              setDetailOpen(false)
              if (selectedExpense) openEdit(selectedExpense)
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Editar Gasto */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Gasto</DialogTitle>
            <DialogDescription>
              Modifica los datos del gasto.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-title">Titulo *</Label>
                <Input
                  id="edit-title"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                  placeholder="Ej: Mantenimiento mensual PH"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-propertyId">Propiedad *</Label>
                <Select 
                  value={validEditPropertyId || undefined} 
                  onValueChange={(v) => setEditFormData({...editFormData, propertyId: v})}
                >
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
                <Label htmlFor="edit-category">Categoria *</Label>
                <Select value={editFormData.category} onValueChange={(v) => setEditFormData({...editFormData, category: v as typeof EXPENSE_CATEGORIES[number]})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-expenseType">Tipo *</Label>
                <Select value={editFormData.expenseType} onValueChange={(v) => setEditFormData({...editFormData, expenseType: v as typeof EXPENSE_TYPES[number]})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIJO">Fijo</SelectItem>
                    <SelectItem value="VARIABLE">Variable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-amount">Monto (USD) *</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  value={editFormData.amount}
                  onChange={(e) => setEditFormData({...editFormData, amount: e.target.value})}
                  placeholder="250.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-expenseDate">Fecha del Gasto *</Label>
                <Input
                  id="edit-expenseDate"
                  type="date"
                  value={editFormData.expenseDate}
                  onChange={(e) => setEditFormData({...editFormData, expenseDate: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-invoiceNumber">Numero de Factura</Label>
                <Input
                  id="edit-invoiceNumber"
                  value={editFormData.invoiceNumber}
                  onChange={(e) => setEditFormData({...editFormData, invoiceNumber: e.target.value})}
                  placeholder="Ej: INV-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-supplier">Proveedor</Label>
                <Input
                  id="edit-supplier"
                  value={editFormData.supplier}
                  onChange={(e) => setEditFormData({...editFormData, supplier: e.target.value})}
                  placeholder="Ej: Empresa ABC"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descripcion</Label>
              <textarea
                id="edit-description"
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editFormData.description}
                onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                placeholder="Detalles adicionales del gasto..."
              />
            </div>
            
            {/* CHECKBOX: Gasto pagado por administrador */}
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="edit-paidByAdmin"
                  checked={editFormData.paidByAdmin}
                  onChange={(e) => setEditFormData({...editFormData, paidByAdmin: e.target.checked})}
                  className="rounded border-gray-300 mt-1"
                />
                <div>
                  <Label htmlFor="edit-paidByAdmin" className="font-medium cursor-pointer">
                    Gasto pagado por el Administrador
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Si esta marcado, el gasto aparecera en "Relacion de Gastos" como pendiente de reembolso.
                  </p>
                </div>
              </div>
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
            <AlertDialogTitle>Eliminar gasto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. El gasto sera eliminado permanentemente.
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
