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
import { 
  Download, TrendingUp, TrendingDown, DollarSign, Receipt, BarChart3, 
  Building2, Calendar, ChevronDown, ChevronUp, Loader2, FileText,
  ArrowUpRight, ArrowDownRight, Eye, AlertCircle, ChevronRight, Sparkles,
  HelpCircle, Clock, CheckCircle, AlertTriangle
} from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'
import { generateReportPDF } from '@/lib/pdf-utils'
import { cn } from '@/lib/utils'

interface Owner {
  id: string
  name: string
  email: string
}

interface Property {
  id: string
  title: string
  address: string
  province: string
}

interface ReportData {
  period: {
    type: 'monthly' | 'yearly'
    month?: number
    year: number
    monthName?: string
  }
  properties: Array<{
    propertyId: string
    propertyTitle: string
    address: string
    province: string
    monthlyRent: number
    grossIncome: number
    fixedExpenses: number
    variableExpenses: number
    totalExpenses: number
    netIncome: number
    itbmsCollected: number
    itbmsPaid: number
    occupancyRate: number
    paymentsCount: number
    expensesCount: number
    owner?: { id: string; name: string }
    expensesDetails?: {
      fixed: Array<{ id: string; description: string; amount: number; date: string; category: string }>
      variable: Array<{ id: string; description: string; amount: number; date: string; category: string }>
    }
    paymentsDetails?: Array<{ id: string; amount: number; date: string; type: string; tenant?: string }>
  }>
  totals: {
    grossIncome: number
    fixedExpenses: number
    variableExpenses: number
    totalExpenses: number
    netIncome: number
    itbmsCollected: number
    itbmsPaid: number
    propertiesCount: number
    avgOccupancy?: number
    avgMonthlyIncome?: number
  }
  monthlyData?: Array<{
    month: number
    monthName: string
    grossIncome: number
    fixedExpenses: number
    variableExpenses: number
    totalExpenses: number
    netIncome: number
  }>
  comparison?: {
    previousPeriod?: { month?: number; year: number; totals: { grossIncome: number; netIncome: number; totalExpenses: number } }
    previousYear?: number
    previousTotals?: { grossIncome: number; netIncome: number; totalExpenses: number }
    variations: {
      grossIncome: number
      netIncome: number
      totalExpenses: number
    }
  }
  generated: boolean
  tickets?: Array<{
    id: string
    title: string
    description: string
    category: string | null
    status: string
    priority: string
    createdAt: string
    property: { id: string; title: string; address: string }
  }>
}

const months = [
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
]

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

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

const ticketStatusConfig: Record<string, { label: string; color: string }> = {
  ABIERTO: { label: 'Abierto', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  EN_PROCESO: { label: 'En Proceso', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  RESUELTO: { label: 'Resuelto', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  CERRADO: { label: 'Cerrado', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
}

const ticketPriorityConfig: Record<string, { label: string; color: string }> = {
  BAJA: { label: 'Baja', color: 'bg-gray-500' },
  MEDIA: { label: 'Media', color: 'bg-yellow-500' },
  ALTA: { label: 'Alta', color: 'bg-orange-500' },
  URGENTE: { label: 'Urgente', color: 'bg-red-500' },
}

export default function ReportesPage() {
  const { user } = useAppStore()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Filters
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1))
  const [selectedYear, setSelectedYear] = useState(String(currentYear))
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null)
  const [selectedPropertyId, setSelectedPropertyId] = useState('all')
  
  // Data
  const [owners, setOwners] = useState<Owner[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  
  // Expandable sections
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set())
  const [expandedCostDetails, setExpandedCostDetails] = useState<'fixed' | 'variable' | null>(null)
  
  // Admin summary for PDF (optional)
  const [adminSummary, setAdminSummary] = useState('')
  const [isRewriting, setIsRewriting] = useState(false)

  // Function definitions first (before useEffects that use them)
  const fetchOwners = async () => {
    try {
      const response = await fetch('/api/users?role=PROPIETARIO')
      if (response.ok) {
        const data = await response.json()
        setOwners(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching owners:', error)
    }
  }

  const fetchProperties = async (ownerId?: string) => {
    try {
      const effectiveOwnerId = ownerId || selectedOwnerId
      const url = effectiveOwnerId && effectiveOwnerId !== 'all' 
        ? `/api/properties?ownerId=${effectiveOwnerId}`
        : '/api/properties'
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setProperties(data.properties || [])
      }
    } catch (error) {
      console.error('Error fetching properties:', error)
    }
  }

  const fetchReport = async () => {
    // Don't fetch until initialized
    if (!isInitialized || selectedOwnerId === null) return
    
    setLoading(true)
    try {
      const params = new URLSearchParams({
        period,
        year: selectedYear,
      })

      if (period === 'monthly') {
        params.append('month', selectedMonth)
      }

      if (selectedOwnerId && selectedOwnerId !== 'all') {
        params.append('ownerId', selectedOwnerId)
      }

      if (selectedPropertyId && selectedPropertyId !== 'all') {
        params.append('propertyId', selectedPropertyId)
      }

      const response = await fetch(`/api/reports?${params.toString()}`)
      const data = await response.json()

      if (response.ok && data.success) {
        setReportData(data.data)
      } else {
        toast({
          title: 'Error',
          description: data.error || 'No se pudo cargar el reporte',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error fetching report:', error)
      toast({
        title: 'Error',
        description: 'Error de conexión',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Initial data fetch and setup
  useEffect(() => {
    const initializePage = async () => {
      // Fetch owners list (for admin)
      await fetchOwners()
      
      // Set initial owner based on user role
      if (user?.role === 'propietario' && user.id) {
        setSelectedOwnerId(user.id)
        await fetchProperties(user.id)
      } else if (user?.role === 'admin') {
        setSelectedOwnerId('all')
        await fetchProperties()
      } else {
        setSelectedOwnerId('all')
        await fetchProperties()
      }
      
      // Mark as initialized after setup is complete
      setIsInitialized(true)
    }
    
    initializePage()
  }, [user])

  // Fetch report when filters change (only after initialization)
  useEffect(() => {
    if (isInitialized) {
      fetchReport()
    }
  }, [period, selectedMonth, selectedYear, selectedOwnerId, selectedPropertyId, isInitialized])

  // Reset property selection when owner changes
  useEffect(() => {
    if (selectedOwnerId !== null && selectedOwnerId !== 'all') {
      fetchProperties(selectedOwnerId)
    } else if (selectedOwnerId === 'all') {
      fetchProperties()
    }
    setSelectedPropertyId('all')
  }, [selectedOwnerId])

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PA', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getVariationIcon = (value: number) => {
    if (value > 0) return <ArrowUpRight className="h-4 w-4 text-emerald-500" />
    if (value < 0) return <ArrowDownRight className="h-4 w-4 text-red-500" />
    return null
  }

  const getVariationColor = (value: number) => {
    if (value > 0) return 'text-emerald-500'
    if (value < 0) return 'text-red-500'
    return 'text-muted-foreground'
  }

  const improveWithAI = async () => {
    if (!adminSummary.trim()) {
      toast({
        title: 'Texto vacío',
        description: 'Escribe algún texto para mejorar.',
        variant: 'destructive',
      })
      return
    }

    if (adminSummary.trim().length < 10) {
      toast({
        title: 'Texto muy corto',
        description: 'Escribe al menos 10 caracteres para mejorar el texto.',
        variant: 'destructive',
      })
      return
    }

    setIsRewriting(true)
    
    try {
      const response = await fetch('/api/ai/rewrite-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: adminSummary.trim() }),
      })

      const data = await response.json()

      if (response.ok && data.success && data.improvedText) {
        setAdminSummary(data.improvedText)
        toast({
          title: '✨ Texto mejorado',
          description: 'El resumen ha sido reescrito de forma profesional.',
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'No se pudo mejorar el texto. Intenta de nuevo.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error improving text:', error)
      toast({
        title: 'Error de conexión',
        description: 'No se pudo conectar con el servicio de IA. Verifica tu conexión.',
        variant: 'destructive',
      })
    } finally {
      setIsRewriting(false)
    }
  }

  const handleDownloadPDF = () => {
    if (!reportData) {
      toast({
        title: 'Sin datos',
        description: 'No hay datos de reporte para exportar.',
        variant: 'destructive',
      })
      return
    }

    try {
      const doc = generateReportPDF({
        title: reportData.period.type === 'monthly' 
          ? `Reporte ${reportData.period.monthName} ${reportData.period.year}`
          : `Reporte Anual ${reportData.period.year}`,
        period: reportData.period.type === 'monthly' 
          ? `${reportData.period.monthName} ${reportData.period.year}`
          : `Año ${reportData.period.year}`,
        adminSummary: adminSummary.trim() || undefined,
        data: {
          totals: reportData.totals,
          properties: reportData.properties,
          monthlyData: reportData.monthlyData,
          tickets: reportData.tickets,
        },
      })

      const fileName = reportData.period.type === 'monthly'
        ? `reporte_${reportData.period.month}_${reportData.period.year}.pdf`
        : `reporte_anual_${reportData.period.year}.pdf`

      doc.save(fileName)
      
      toast({
        title: 'PDF descargado',
        description: 'El reporte ha sido exportado exitosamente.',
      })
    } catch (error) {
      console.error('Error al generar PDF:', error)
      toast({
        title: 'Error',
        description: `No se pudo generar el PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: 'destructive',
      })
    }
  }

  // Aggregate all expenses across properties
  const getAllExpenses = () => {
    if (!reportData) return { fixed: [], variable: [] }
    
    const fixed: Array<{ id: string; description: string; amount: number; date: string; category: string; propertyTitle: string }> = []
    const variable: Array<{ id: string; description: string; amount: number; date: string; category: string; propertyTitle: string }> = []
    
    reportData.properties.forEach(prop => {
      if (prop.expensesDetails) {
        prop.expensesDetails.fixed.forEach(e => {
          fixed.push({ ...e, propertyTitle: prop.propertyTitle })
        })
        prop.expensesDetails.variable.forEach(e => {
          variable.push({ ...e, propertyTitle: prop.propertyTitle })
        })
      }
    })
    
    return { fixed, variable }
  }

  const isAdmin = user?.role === 'admin'
  const allExpenses = getAllExpenses()

  // Ticket stats
  const getTicketStats = () => {
    if (!reportData?.tickets) return { total: 0, open: 0, resolved: 0, urgent: 0 }
    
    const tickets = reportData.tickets
    return {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'ABIERTO' || t.status === 'EN_PROCESO').length,
      resolved: tickets.filter(t => t.status === 'RESUELTO' || t.status === 'CERRADO').length,
      urgent: tickets.filter(t => t.priority === 'URGENTE' || t.priority === 'ALTA').length,
    }
  }

  const ticketStats = getTicketStats()

  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <Header />
        
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Reportes Financieros</h1>
                <p className="text-muted-foreground">Análisis detallado de ingresos y gastos</p>
              </div>
              <Button variant="outline" onClick={handleDownloadPDF} disabled={!reportData || loading}>
                <Download className="h-4 w-4 mr-2" />
                Descargar PDF
              </Button>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {/* Period Type */}
                  <div className="space-y-2">
                    <Label>Período</Label>
                    <Select value={period} onValueChange={(v) => setPeriod(v as 'monthly' | 'yearly')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mensual</SelectItem>
                        <SelectItem value="yearly">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Month (only for monthly) */}
                  {period === 'monthly' && (
                    <div className="space-y-2">
                      <Label>Mes</Label>
                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((m) => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Year */}
                  <div className="space-y-2">
                    <Label>Año</Label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((y) => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Owner (only for admin) */}
                  {isAdmin && (
                    <div className="space-y-2">
                      <Label>Propietario</Label>
                      <Select value={selectedOwnerId || 'all'} onValueChange={setSelectedOwnerId}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los propietarios</SelectItem>
                          {owners.map((owner) => (
                            <SelectItem key={owner.id} value={owner.id}>{owner.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Property */}
                  <div className="space-y-2">
                    <Label>Propiedad</Label>
                    <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las propiedades</SelectItem>
                        {properties.map((prop) => (
                          <SelectItem key={prop.id} value={prop.id}>{prop.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Admin Summary - Only visible for admins */}
            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Resumen del Administrador (Opcional)
                  </CardTitle>
                  <CardDescription>
                    Agregue notas o comentarios que aparecerán en el PDF del reporte
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <textarea
                    className="w-full min-h-[100px] p-3 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Escriba aquí sus observaciones o notas para este reporte..."
                    value={adminSummary}
                    onChange={(e) => setAdminSummary(e.target.value)}
                    maxLength={1000}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {adminSummary.length}/1000 caracteres
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={improveWithAI}
                      disabled={isRewriting || adminSummary.trim().length < 10}
                      className="gap-2"
                    >
                      {isRewriting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Mejorando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Mejorar con IA
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {loading || !isInitialized ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : reportData ? (
              <>
                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Ingresos Brutos</p>
                          <p className="text-2xl font-bold mt-1">{formatCurrency(reportData.totals.grossIncome)}</p>
                          {reportData.comparison && (
                            <div className={`flex items-center gap-1 mt-1 ${getVariationColor(reportData.comparison.variations.grossIncome)}`}>
                              {getVariationIcon(reportData.comparison.variations.grossIncome)}
                              <span className="text-sm">{Math.abs(reportData.comparison.variations.grossIncome)}%</span>
                            </div>
                          )}
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                          <TrendingUp className="h-6 w-6 text-emerald-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setExpandedCostDetails(expandedCostDetails === 'fixed' ? null : 'fixed')}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Gastos Fijos</p>
                          <p className="text-2xl font-bold mt-1 text-orange-500">{formatCurrency(reportData.totals.fixedExpenses)}</p>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            {allExpenses.fixed.length} gastos
                            <ChevronRight className={cn("h-3 w-3 transition-transform", expandedCostDetails === 'fixed' && "rotate-90")} />
                          </p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                          <TrendingDown className="h-6 w-6 text-orange-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setExpandedCostDetails(expandedCostDetails === 'variable' ? null : 'variable')}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Gastos Variables</p>
                          <p className="text-2xl font-bold mt-1 text-red-500">{formatCurrency(reportData.totals.variableExpenses)}</p>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            {allExpenses.variable.length} gastos
                            <ChevronRight className={cn("h-3 w-3 transition-transform", expandedCostDetails === 'variable' && "rotate-90")} />
                          </p>
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
                          <p className="text-sm text-muted-foreground">Ingreso Neto</p>
                          <p className="text-2xl font-bold mt-1 text-primary">{formatCurrency(reportData.totals.netIncome)}</p>
                          {reportData.comparison && (
                            <div className={`flex items-center gap-1 mt-1 ${getVariationColor(reportData.comparison.variations.netIncome)}`}>
                              {getVariationIcon(reportData.comparison.variations.netIncome)}
                              <span className="text-sm">{Math.abs(reportData.comparison.variations.netIncome)}%</span>
                            </div>
                          )}
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <DollarSign className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Expanded Cost Details */}
                {expandedCostDetails && (
                  <Card className="animate-in slide-in-from-top-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        {expandedCostDetails === 'fixed' ? (
                          <>
                            <TrendingDown className="h-4 w-4 text-orange-500" />
                            Detalle de Gastos Fijos
                          </>
                        ) : (
                          <>
                            <TrendingDown className="h-4 w-4 text-red-500" />
                            Detalle de Gastos Variables
                          </>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {allExpenses[expandedCostDetails].length > 0 ? (
                        <div className="rounded-lg border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Propiedad</TableHead>
                                <TableHead>Categoría</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {allExpenses[expandedCostDetails].map((expense) => (
                                <TableRow key={expense.id}>
                                  <TableCell className="font-medium">{expense.description}</TableCell>
                                  <TableCell className="text-muted-foreground">{expense.propertyTitle}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs">
                                      {categoryLabels[expense.category] || expense.category}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {new Date(expense.date).toLocaleDateString('es-PA')}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatCurrency(expense.amount)}
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="bg-muted/50">
                                <TableCell colSpan={4} className="font-bold">
                                  Total Gastos {expandedCostDetails === 'fixed' ? 'Fijos' : 'Variables'}
                                </TableCell>
                                <TableCell className="text-right font-bold">
                                  {formatCurrency(
                                    expandedCostDetails === 'fixed' 
                                      ? reportData.totals.fixedExpenses 
                                      : reportData.totals.variableExpenses
                                  )}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No hay gastos {expandedCostDetails === 'fixed' ? 'fijos' : 'variables'} registrados</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Monthly Data Chart (for yearly report) */}
                {period === 'yearly' && reportData.monthlyData && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Evolución Mensual
                      </CardTitle>
                      <CardDescription>Comparativa de ingresos y gastos por mes</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Bar Chart */}
                        <div className="flex items-end gap-1 h-48">
                          {reportData.monthlyData.map((data) => {
                            const maxValue = Math.max(...reportData.monthlyData!.map(d => Math.max(d.grossIncome, d.totalExpenses)))
                            const incomeHeight = maxValue > 0 ? (data.grossIncome / maxValue) * 100 : 0
                            const expenseHeight = maxValue > 0 ? (data.totalExpenses / maxValue) * 100 : 0
                            
                            return (
                              <div key={data.month} className="flex-1 flex flex-col items-center gap-1">
                                <div className="w-full flex gap-0.5 items-end h-36">
                                  <div 
                                    className="flex-1 bg-emerald-500/60 rounded-t transition-all hover:bg-emerald-500"
                                    style={{ height: `${incomeHeight}%` }}
                                    title={`Ingresos: ${formatCurrency(data.grossIncome)}`}
                                  />
                                  <div 
                                    className="flex-1 bg-red-500/60 rounded-t transition-all hover:bg-red-500"
                                    style={{ height: `${expenseHeight}%` }}
                                    title={`Gastos: ${formatCurrency(data.totalExpenses)}`}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground truncate w-full text-center">
                                  {data.monthName.slice(0, 3)}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                        
                        <div className="flex items-center justify-center gap-6 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded bg-emerald-500/60" />
                            <span>Ingresos</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded bg-red-500/60" />
                            <span>Gastos</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Tickets Section */}
                {reportData.tickets && reportData.tickets.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <HelpCircle className="h-5 w-5" />
                        Tickets de Soporte
                      </CardTitle>
                      <CardDescription>
                        {ticketStats.total} tickets registrados • {ticketStats.open} abiertos • {ticketStats.resolved} resueltos
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Ticket Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Total</span>
                          </div>
                          <p className="text-2xl font-bold mt-1">{ticketStats.total}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-500" />
                            <span className="text-sm text-muted-foreground">Abiertos</span>
                          </div>
                          <p className="text-2xl font-bold mt-1 text-blue-500">{ticketStats.open}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-muted-foreground">Resueltos</span>
                          </div>
                          <p className="text-2xl font-bold mt-1 text-green-500">{ticketStats.resolved}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <span className="text-sm text-muted-foreground">Urgentes</span>
                          </div>
                          <p className="text-2xl font-bold mt-1 text-red-500">{ticketStats.urgent}</p>
                        </div>
                      </div>

                      {/* Tickets Table */}
                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Propiedad</TableHead>
                              <TableHead>Título</TableHead>
                              <TableHead className="hidden md:table-cell">Descripción</TableHead>
                              <TableHead>Estado</TableHead>
                              <TableHead>Prioridad</TableHead>
                              <TableHead className="hidden lg:table-cell">Fecha</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {reportData.tickets.map((ticket) => (
                              <TableRow key={ticket.id}>
                                <TableCell className="font-medium">
                                  <div>
                                    <p>{ticket.property.title}</p>
                                    <p className="text-xs text-muted-foreground">{ticket.property.address}</p>
                                  </div>
                                </TableCell>
                                <TableCell>{ticket.title}</TableCell>
                                <TableCell className="hidden md:table-cell">
                                  <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                    {ticket.description}
                                  </p>
                                </TableCell>
                                <TableCell>
                                  <Badge className={ticketStatusConfig[ticket.status]?.color || 'bg-gray-500/10 text-gray-500'}>
                                    {ticketStatusConfig[ticket.status]?.label || ticket.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className={`${ticketPriorityConfig[ticket.priority]?.color || 'bg-gray-500'} text-white`}>
                                    {ticketPriorityConfig[ticket.priority]?.label || ticket.priority}
                                  </Badge>
                                </TableCell>
                                <TableCell className="hidden lg:table-cell text-muted-foreground">
                                  {new Date(ticket.createdAt).toLocaleDateString('es-PA')}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Properties Detail */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Desglose por Propiedad
                    </CardTitle>
                    <CardDescription>
                      {period === 'monthly' 
                        ? `Detalle del mes ${reportData.period.monthName} ${reportData.period.year}`
                        : `Resumen anual ${reportData.period.year}`
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {reportData.properties.map((prop) => (
                        <div key={prop.propertyId} className="border rounded-lg overflow-hidden">
                          {/* Property Header */}
                          <button
                            className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                            onClick={() => togglePropertyExpand(prop.propertyId)}
                          >
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-primary" />
                              </div>
                              <div className="text-left">
                                <p className="font-medium">{prop.propertyTitle}</p>
                                <p className="text-sm text-muted-foreground">{prop.address}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-bold text-primary">{formatCurrency(prop.netIncome)}</p>
                                <p className="text-xs text-muted-foreground">Ingreso neto</p>
                              </div>
                              {expandedProperties.has(prop.propertyId) ? (
                                <ChevronUp className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          </button>

                          {/* Expanded Details */}
                          {expandedProperties.has(prop.propertyId) && (
                            <div className="border-t p-4 space-y-4 bg-muted/30">
                              {/* Financial Summary */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                                  <p className="text-xs text-muted-foreground">Ingresos</p>
                                  <p className="font-bold text-emerald-500">{formatCurrency(prop.grossIncome)}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
                                  <p className="text-xs text-muted-foreground">Gastos Fijos</p>
                                  <p className="font-bold text-orange-500">{formatCurrency(prop.fixedExpenses)}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                                  <p className="text-xs text-muted-foreground">Gastos Variables</p>
                                  <p className="font-bold text-red-500">{formatCurrency(prop.variableExpenses)}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                                  <p className="text-xs text-muted-foreground">Neto</p>
                                  <p className="font-bold text-primary">{formatCurrency(prop.netIncome)}</p>
                                </div>
                              </div>

                              {/* Expenses Details */}
                              {prop.expensesDetails && (
                                <>
                                  {/* Fixed Expenses */}
                                  {prop.expensesDetails.fixed.length > 0 && (
                                    <div>
                                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                        <TrendingDown className="h-4 w-4 text-orange-500" />
                                        Gastos Fijos ({prop.expensesDetails.fixed.length})
                                      </h4>
                                      <div className="bg-white rounded-lg border overflow-hidden">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>Descripción</TableHead>
                                              <TableHead>Categoría</TableHead>
                                              <TableHead>Fecha</TableHead>
                                              <TableHead className="text-right">Monto</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {prop.expensesDetails.fixed.map((expense) => (
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
                                                <TableCell className="text-right font-medium">
                                                  {formatCurrency(expense.amount)}
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                            <TableRow className="bg-muted/50">
                                              <TableCell colSpan={3} className="font-medium">Total Gastos Fijos</TableCell>
                                              <TableCell className="text-right font-bold text-orange-500">
                                                {formatCurrency(prop.fixedExpenses)}
                                              </TableCell>
                                            </TableRow>
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </div>
                                  )}

                                  {/* Variable Expenses */}
                                  {prop.expensesDetails.variable.length > 0 && (
                                    <div>
                                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                        <TrendingDown className="h-4 w-4 text-red-500" />
                                        Gastos Variables ({prop.expensesDetails.variable.length})
                                      </h4>
                                      <div className="bg-white rounded-lg border overflow-hidden">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>Descripción</TableHead>
                                              <TableHead>Categoría</TableHead>
                                              <TableHead>Fecha</TableHead>
                                              <TableHead className="text-right">Monto</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {prop.expensesDetails.variable.map((expense) => (
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
                                                <TableCell className="text-right font-medium">
                                                  {formatCurrency(expense.amount)}
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                            <TableRow className="bg-muted/50">
                                              <TableCell colSpan={3} className="font-medium">Total Gastos Variables</TableCell>
                                              <TableCell className="text-right font-bold text-red-500">
                                                {formatCurrency(prop.variableExpenses)}
                                              </TableCell>
                                            </TableRow>
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}

                              {/* No expenses message */}
                              {(!prop.expensesDetails || (prop.expensesDetails.fixed.length === 0 && prop.expensesDetails.variable.length === 0)) && (
                                <div className="text-center py-4 text-muted-foreground">
                                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                  <p className="text-sm">No hay gastos registrados para este período</p>
                                </div>
                              )}

                              {/* Additional Stats (Monthly Only) */}
                              {period === 'monthly' && 'occupancyRate' in prop && (
                                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                                  <div className="text-center">
                                    <p className="text-2xl font-bold">{prop.occupancyRate}%</p>
                                    <p className="text-xs text-muted-foreground">Ocupación</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-2xl font-bold">{prop.paymentsCount}</p>
                                    <p className="text-xs text-muted-foreground">Pagos</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-2xl font-bold">{prop.expensesCount}</p>
                                    <p className="text-xs text-muted-foreground">Gastos</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      {reportData.properties.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No hay propiedades con datos para este período</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Tax Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="h-5 w-5" />
                      Resumen ITBMS
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                        <p className="text-sm text-muted-foreground">ITBMS Recaudado</p>
                        <p className="text-xl font-bold text-emerald-500">{formatCurrency(reportData.totals.itbmsCollected)}</p>
                        <p className="text-xs text-muted-foreground mt-1">De pagos recibidos</p>
                      </div>
                      <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/10">
                        <p className="text-sm text-muted-foreground">ITBMS Pagado</p>
                        <p className="text-xl font-bold text-red-500">{formatCurrency(reportData.totals.itbmsPaid)}</p>
                        <p className="text-xs text-muted-foreground mt-1">En gastos</p>
                      </div>
                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                        <p className="text-sm text-muted-foreground">Balance ITBMS</p>
                        <p className="text-xl font-bold text-primary">
                          {formatCurrency(reportData.totals.itbmsCollected - reportData.totals.itbmsPaid)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">A declarar</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Selecciona los filtros para generar el reporte</p>
              </div>
            )}
          </div>
        </main>
        
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  )
}
