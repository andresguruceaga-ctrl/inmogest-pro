'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Building2,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Download,
  PieChart,
  BarChart3,
  Receipt,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  UserCheck,
  Wrench,
  MessageSquare,
  Upload,
  X,
  ImageIcon,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Sparkles,
  Users,
  Mail,
  Phone,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAppStore } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'
import { generateReportPDF } from '@/lib/pdf-utils'
import { cn } from '@/lib/utils'

interface Property {
  id: string
  name: string
  address: string
  monthlyRent: number
  status: string
  tenant: string | null
}

interface Transaction {
  id: string
  type: 'income' | 'expense'
  description: string
  amount: number
  date: string
}

interface ExpenseCategory {
  category: string
  amount: number
  percentage: number
}

interface ContractExpiring {
  id: string
  property: string
  endDate: string
  daysLeft: number
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
  // Keep backward compatibility with old dashboard data
  stats?: {
    totalProperties: number
    occupiedProperties: number
    monthIncome: number
    monthItbms: number
    totalExpenses: number
    fixedExpenses: number
    variableExpenses: number
    expensesItbms: number
    netIncome: number
    occupancyRate: number
  }
  transactions?: Transaction[]
  expensesByCategory?: ExpenseCategory[]
  contractsExpiring?: ContractExpiring[]
  tickets?: TicketData[]
  admins?: Array<{
    name: string
    email: string
    phone: string | null
  }>
}

interface Owner {
  id: string
  name: string
  email: string
}

// Categories for owner tickets
const OWNER_TICKET_CATEGORIES = [
  { value: 'REPARACION', label: 'Reparación' },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento' },
  { value: 'PRESUPUESTO', label: 'Solicitud de Presupuesto' },
  { value: 'MEJORA', label: 'Mejora/Remodelación' },
  { value: 'SERVICIO', label: 'Servicio Técnico' },
  { value: 'INSPECCION', label: 'Inspección' },
  { value: 'OTRO', label: 'Otro' },
]

const TICKET_PRIORITIES = [
  { value: 'BAJA', label: 'Baja', color: 'bg-gray-500' },
  { value: 'MEDIA', label: 'Media', color: 'bg-yellow-500' },
  { value: 'ALTA', label: 'Alta', color: 'bg-orange-500' },
  { value: 'URGENTE', label: 'Urgente', color: 'bg-red-500' },
]

const TICKET_STATUSES: Record<string, { label: string; color: string }> = {
  ABIERTO: { label: 'Abierto', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  EN_PROCESO: { label: 'En Proceso', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  RESUELTO: { label: 'Resuelto', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  CERRADO: { label: 'Cerrado', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
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

const CATEGORY_LABELS: Record<string, string> = {
  MANTENIMIENTO_PH: 'Mantenimiento PH',
  SEGURO: 'Seguros',
  SERVICIOS_BASICOS: 'Servicios',
  REPARACION: 'Reparaciones',
  SERVICIO_TECNICO: 'Servicio Técnico',
  IMPUESTOS: 'Impuestos',
  COMISION_ADMIN: 'Comisión Admin',
  OTROS: 'Otros',
}

// Stat card component
function StatCard({ 
  title, 
  value, 
  change, 
  changeType, 
  icon: Icon,
  subtitle,
  iconColor = 'text-primary',
  onClick,
}: { 
  title: string
  value: string
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon: React.ElementType
  subtitle?: string
  iconColor?: string
  onClick?: () => void
}) {
  return (
    <Card className={cn("card-hover", onClick && "cursor-pointer")} onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center", iconColor)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {change && changeType && (
          <div className="flex items-center gap-1 mt-1">
            {changeType === 'positive' && (
              <ArrowUpRight className="h-4 w-4 text-emerald-500" />
            )}
            {changeType === 'negative' && (
              <ArrowDownRight className="h-4 w-4 text-red-500" />
            )}
            <span className={cn(
              "text-sm font-medium",
              changeType === 'positive' ? 'text-emerald-500' : 
              changeType === 'negative' ? 'text-red-500' : 
              'text-muted-foreground'
            )}>
              {change}
            </span>
          </div>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}

interface PropietarioDashboardProps {
  userId?: string // Optional: for admin to view specific owner
}

export function PropietarioDashboard({ userId: propUserId }: PropietarioDashboardProps = {}) {
  const { user } = useAppStore()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [owners, setOwners] = useState<Owner[]>([])
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(propUserId || null)
  
  // Period filters
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1))
  const [selectedYear, setSelectedYear] = useState(String(currentYear))
  
  // Expandable sections
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set())
  const [expandedCostDetails, setExpandedCostDetails] = useState<'fixed' | 'variable' | null>(null)
  
  // Ticket dialog state
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [ticketForm, setTicketForm] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'MEDIA',
    propertyId: '',
    photos: '',
    photoFileName: '',
  })

  // Admin summary for PDF
  const [adminSummary, setAdminSummary] = useState('')
  const [isRewriting, setIsRewriting] = useState(false)

  // Check if current user is admin
  const isAdmin = user?.role === 'admin'
  
  // Determine which userId to use
  const effectiveUserId = isAdmin ? selectedOwnerId : user?.id

  // Fetch owners list for admin selector
  useEffect(() => {
    if (isAdmin) {
      const fetchOwners = async () => {
        try {
          const response = await fetch('/api/users?role=PROPIETARIO')
          if (response.ok) {
            const result = await response.json()
            setOwners(result.users || [])
            // Auto-select first owner if none selected
            if (!selectedOwnerId && result.users?.length > 0) {
              setSelectedOwnerId(result.users[0].id)
            }
          }
        } catch (error) {
          console.error('Error fetching owners:', error)
        }
      }
      fetchOwners()
    }
  }, [isAdmin, selectedOwnerId])

  // Fetch report data
  useEffect(() => {
    if (!effectiveUserId) return
    
    fetchReportData(effectiveUserId)
  }, [effectiveUserId, period, selectedMonth, selectedYear])

  const fetchReportData = async (targetUserId: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        period,
        year: selectedYear,
        ownerId: targetUserId,
      })

      if (period === 'monthly') {
        params.append('month', selectedMonth)
      }

      const response = await fetch(`/api/reports?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setReportData(result.data)
        
        // Auto-select first property for ticket form
        if (result.data.properties?.length > 0) {
          setTicketForm(prev => ({
            ...prev,
            propertyId: result.data.properties[0].propertyId
          }))
        }
      } else {
        toast({
          title: 'Error',
          description: result.error || 'No se pudieron cargar los datos',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error fetching report data:', error)
      toast({
        title: 'Error',
        description: 'Error de conexión',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PA', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      const result = await response.json()

      if (response.ok) {
        setTicketForm({
          ...ticketForm,
          photos: result.data.fileUrl,
          photoFileName: result.data.fileName,
        })
        toast({
          title: 'Foto subida',
          description: 'La foto se ha subido exitosamente.',
        })
      } else {
        toast({
          title: 'Error',
          description: result.error || 'No se pudo subir la foto',
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

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!ticketForm.title || !ticketForm.description || !ticketForm.propertyId || !effectiveUserId) {
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
          userId: effectiveUserId,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: 'Ticket creado',
          description: 'El ticket de soporte se ha creado exitosamente.',
        })
        setTicketDialogOpen(false)
        resetTicketForm()
        // Refresh report data
        if (effectiveUserId) {
          fetchReportData(effectiveUserId)
        }
      } else {
        toast({
          title: 'Error',
          description: result.error || 'No se pudo crear el ticket',
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

  const resetTicketForm = () => {
    setTicketForm({
      title: '',
      description: '',
      category: '',
      priority: 'MEDIA',
      propertyId: reportData?.properties?.[0]?.propertyId || '',
      photos: '',
      photoFileName: '',
    })
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
          description: data.error || 'No se pudo mejorar el texto.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error improving text:', error)
      toast({
        title: 'Error de conexión',
        description: 'No se pudo conectar con el servicio de IA.',
        variant: 'destructive',
      })
    } finally {
      setIsRewriting(false)
    }
  }

  const handleDownloadPDF = () => {
    if (!reportData) return

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
  }

  const getPriorityBadge = (priority: string) => {
    const config = TICKET_PRIORITIES.find(p => p.value === priority) || TICKET_PRIORITIES[1]
    return (
      <Badge className={`${config.color} text-white`}>
        {config.label}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    const config = TICKET_STATUSES[status] || TICKET_STATUSES.ABIERTO
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    )
  }

  // For non-admin users without data, show message
  if (!isAdmin && !user?.id) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">No hay información de usuario disponible</p>
      </div>
    )
  }

  // For admin without selected owner
  if (isAdmin && !selectedOwnerId && owners.length === 0 && !loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Dashboard de Propietario
            </h1>
            <p className="text-muted-foreground">
              Panel de control del propietario
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay propietarios registrados</p>
              <p className="text-sm">Registra un propietario para ver su dashboard</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentMonth = new Date().toLocaleDateString('es-PA', { month: 'long', year: 'numeric' })
  
  // Get selected owner name
  const selectedOwner = owners.find(o => o.id === selectedOwnerId)
  const allExpenses = getAllExpenses()

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {isAdmin 
              ? `Dashboard de ${selectedOwner?.name || 'Propietario'}`
              : 'Panel de Propietario'
            }
          </h1>
          <p className="text-muted-foreground">
            {isAdmin 
              ? 'Resumen financiero y estado de las propiedades del propietario'
              : 'Resumen financiero y estado de tus propiedades'
            }
          </p>
        </div>
        
        {/* Admin owner selector */}
        {isAdmin && owners.length > 0 && (
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-muted-foreground" />
            <Select 
              value={selectedOwnerId || undefined} 
              onValueChange={(v) => setSelectedOwnerId(v)}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Seleccionar propietario" />
              </SelectTrigger>
              <SelectContent>
                {owners.map((owner) => (
                  <SelectItem key={owner.id} value={owner.id}>
                    {owner.name} ({owner.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros de Reporte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

            <div className="space-y-2 flex items-end">
              <Button variant="outline" className="w-full" onClick={handleDownloadPDF} disabled={!reportData || loading}>
                <Download className="h-4 w-4 mr-2" />
                Descargar PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !reportData ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p>No se pudieron cargar los datos del dashboard</p>
            </div>
          </CardContent>
        </Card>
      ) : (
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
                                {CATEGORY_LABELS[expense.category] || expense.category}
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
                                              {CATEGORY_LABELS[expense.category] || expense.category}
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
                                              {CATEGORY_LABELS[expense.category] || expense.category}
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
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Support tickets section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-primary" />
                    Solicitudes de Soporte
                  </CardTitle>
                  <CardDescription>
                    Tickets de mantenimiento y reparaciones
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {reportData.tickets && reportData.tickets.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {reportData.tickets.map((ticket) => (
                    <div key={ticket.id} className="flex items-start gap-3 p-4 rounded-lg border">
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                        ticket.status === 'EN_PROCESO' ? 'bg-yellow-500/10' : 
                        ticket.status === 'ABIERTO' ? 'bg-blue-500/10' : 'bg-emerald-500/10'
                      )}>
                        {ticket.status === 'EN_PROCESO' ? (
                          <Clock className="h-5 w-5 text-yellow-500" />
                        ) : ticket.status === 'ABIERTO' ? (
                          <AlertCircle className="h-5 w-5 text-blue-500" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-emerald-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium truncate">{ticket.title}</p>
                          {getPriorityBadge(ticket.priority)}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {ticket.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">{ticket.createdAt}</span>
                          {getStatusBadge(ticket.status)}
                          {ticket.category && (
                            <Badge variant="outline" className="text-xs">
                              {OWNER_TICKET_CATEGORIES.find(c => c.value === ticket.category)?.label || ticket.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                  <p>No hay solicitudes de soporte</p>
                  <p className="text-sm">Puedes solicitar reparaciones, presupuestos o mantenimiento</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Admin Contacts */}
          {reportData.admins && reportData.admins.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-5 w-5 text-primary" />
                  Contacto de Administradores
                </CardTitle>
                <CardDescription>
                  Datos de contacto del equipo de administración
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {reportData.admins.map((admin, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium">{admin.name}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{admin.email}</span>
                        </div>
                        {admin.phone && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{admin.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
