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
import { Receipt, Plus, Search, Filter, MoreHorizontal, Eye, Calendar, Building2, ArrowUpRight, ArrowDownRight, Loader2, Trash2, Edit } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface Expense {
  id: string
  title: string
  description: string | null
  category: string
  expenseType: string
  amount: number
  itbmsAmount: number
  totalAmount: number
  invoiceNumber: string | null
  supplier: string | null
  expenseDate: string
  property: { id: string; title: string; address: string }
}

interface Property {
  id: string
  title: string
  address: string
}

const expenseCategories = [
  { value: 'MANTENIMIENTO_PH', label: 'Mantenimiento PH' },
  { value: 'SEGURO', label: 'Seguro' },
  { value: 'SERVICIOS_BASICOS', label: 'Servicios Básicos' },
  { value: 'REPARACION', label: 'Reparación' },
  { value: 'SERVICIO_TECNICO', label: 'Servicio Técnico' },
  { value: 'IMPUESTOS', label: 'Impuestos' },
  { value: 'COMISION_ADMIN', label: 'Comisión Admin' },
  { value: 'OTROS', label: 'Otros' },
]

const expenseTypes = [
  { value: 'FIJO', label: 'Fijo' },
  { value: 'VARIABLE', label: 'Variable' },
]

export default function GastosPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [summary, setSummary] = useState({
    totalExpenses: 0,
    totalITBMS: 0,
    byType: { FIJO: { count: 0, total: 0 }, VARIABLE: { count: 0, total: 0 } }
  })
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'MANTENIMIENTO_PH',
    expenseType: 'VARIABLE',
    amount: '',
    invoiceNumber: '',
    supplier: '',
    expenseDate: '',
    propertyId: '',
    includeItbms: true,
  })

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
          includeItbms: formData.includeItbms,
          invoiceNumber: formData.invoiceNumber || null,
          supplier: formData.supplier || null,
          expenseDate: formData.expenseDate,
          propertyId: formData.propertyId,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Gasto registrado',
          description: 'El gasto se ha registrado exitosamente.',
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
        description: 'Error de conexión',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
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
      includeItbms: true,
    })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const getCategoryLabel = (category: string) => {
    const found = expenseCategories.find(c => c.value === category)
    return found?.label || category
  }

  const summaryCards = [
    { label: 'Gastos Fijos', value: summary.byType.FIJO.total, trend: 'up' },
    { label: 'Gastos Variables', value: summary.byType.VARIABLE.total, trend: 'down' },
    { label: 'ITBMS Pagado', value: summary.totalITBMS, trend: 'neutral' },
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

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                        <TableHead className="hidden md:table-cell">Categoría</TableHead>
                        <TableHead>Tipo</TableHead>
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
                          <TableCell className="font-medium text-red-500">
                            -${expense.totalAmount.toLocaleString()}
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
                <Label htmlFor="title">Título *</Label>
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
              <div className="space-y-2">
                <Label htmlFor="category">Categoría *</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expenseType">Tipo *</Label>
                <Select value={formData.expenseType} onValueChange={(v) => setFormData({...formData, expenseType: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
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
                <Label htmlFor="invoiceNumber">Número de Factura</Label>
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
              <Label htmlFor="description">Descripción</Label>
              <textarea
                id="description"
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Detalles adicionales del gasto..."
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeItbms"
                checked={formData.includeItbms}
                onChange={(e) => setFormData({...formData, includeItbms: e.target.checked})}
                className="rounded border-gray-300"
              />
              <Label htmlFor="includeItbms" className="font-normal">Incluir ITBMS (7%)</Label>
            </div>
            {formData.amount && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
                <strong>Total con ITBMS:</strong> ${(parseFloat(formData.amount || '0') * (formData.includeItbms ? 1.07 : 1)).toFixed(2)}
              </div>
            )}
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
    </SidebarProvider>
  )
}
