'use client'

import { useState, useEffect } from 'react'
import { 
  Building2, 
  FileText, 
  Users, 
  DollarSign,
  TrendingUp,
  Calendar,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  Clock,
  AlertTriangle,
  UserPlus,
  RefreshCw,
  Loader2,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface DashboardStats {
  totalProperties: number
  occupiedProperties: number
  totalTenants: number
  totalOwners: number
  occupancyRate: number
  monthAdminIncome: number
  yearAdminIncome: number
  activeAdminContracts: number
  openTickets: number
}

interface RecentTicket {
  id: string
  title: string
  property: string
  priority: string
  status: string
  user: string
  createdAt: string
}

interface Activity {
  id: string
  type: 'payment' | 'contract' | 'property' | 'ticket' | 'user'
  title: string
  description: string
  time: string
  amount?: string
}

// Stats card component
function StatCard({ 
  title, 
  value, 
  subtitle,
  icon: Icon, 
  iconColor = 'text-primary',
  trend,
  trendValue,
}: { 
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  iconColor?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
}) {
  return (
    <Card className="card-hover">
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
        <div className="flex items-center gap-1 mt-1">
          {trend === 'up' && <ArrowUpRight className="h-4 w-4 text-emerald-500" />}
          {trend === 'down' && <ArrowDownRight className="h-4 w-4 text-red-500" />}
          {trendValue && (
            <span className={cn(
              "text-sm font-medium",
              trend === 'up' ? 'text-emerald-500' : 
              trend === 'down' ? 'text-red-500' : 
              'text-muted-foreground'
            )}>
              {trendValue}
            </span>
          )}
          {subtitle && (
            <span className="text-sm text-muted-foreground">
              {subtitle}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Activity icons and colors
const activityIcons: Record<string, React.ElementType> = {
  contract: FileText,
  payment: DollarSign,
  property: Building2,
  user: UserPlus,
  ticket: AlertCircle,
}

const activityColors: Record<string, string> = {
  contract: 'bg-blue-500/10 text-blue-500',
  payment: 'bg-emerald-500/10 text-emerald-500',
  property: 'bg-purple-500/10 text-purple-500',
  user: 'bg-orange-500/10 text-orange-500',
  ticket: 'bg-red-500/10 text-red-500',
}

const priorityColors: Record<string, string> = {
  alta: 'bg-red-500/10 text-red-500 border-red-500/20',
  media: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  baja: 'bg-green-500/10 text-green-500 border-green-500/20',
}

const statusIcons: Record<string, React.ElementType> = {
  en_proceso: Clock,
  abierto: AlertCircle,
  resuelto: CheckCircle,
}

const statusColors: Record<string, string> = {
  abierto: 'text-red-500',
  en_proceso: 'text-yellow-500',
  resuelto: 'text-green-500',
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PA', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function AdminDashboard() {
  const { user } = useAppStore()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([])
  const [activities, setActivities] = useState<Activity[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/dashboard?role=admin')
      const data = await response.json()

      if (data.success) {
        setStats(data.data.stats)
        setRecentTickets(data.data.recentTickets)
        setActivities(data.data.activities)
      } else {
        toast({
          title: 'Error',
          description: data.error || 'No se pudieron cargar los datos',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast({
        title: 'Error',
        description: 'Error de conexión',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">No se pudieron cargar los datos del dashboard</p>
      </div>
    )
  }

  const currentMonth = new Date().toLocaleDateString('es-PA', { month: 'long', year: 'numeric' })
  const currentYear = new Date().getFullYear()

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Panel de Administración
          </h1>
          <p className="text-muted-foreground">
            Resumen general del portafolio inmobiliario
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm py-1.5 px-3">
            <Calendar className="h-4 w-4 mr-2" />
            {currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1)}
          </Badge>
          <Badge variant="secondary" className="text-sm py-1.5 px-3">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizado
          </Badge>
        </div>
      </div>

      {/* Main Stats - First Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Propiedades Activas"
          value={stats.totalProperties}
          subtitle="propiedades registradas"
          icon={Building2}
        />
        <StatCard
          title="% de Ocupación"
          value={`${stats.occupancyRate}%`}
          subtitle={`${stats.occupiedProperties} de ${stats.totalProperties} ocupadas`}
          icon={TrendingUp}
          iconColor="text-emerald-500"
          trend={stats.occupancyRate >= 80 ? 'up' : stats.occupancyRate >= 50 ? 'neutral' : 'down'}
        />
        <StatCard
          title="Propietarios Activos"
          value={stats.totalOwners}
          subtitle="propietarios registrados"
          icon={Users}
          iconColor="text-purple-500"
        />
        <StatCard
          title="Inquilinos Activos"
          value={stats.totalTenants}
          subtitle="inquilinos registrados"
          icon={Users}
          iconColor="text-orange-500"
        />
      </div>

      {/* Income Stats - Second Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Ingresos del Mes"
          value={formatCurrency(stats.monthAdminIncome)}
          subtitle="de contratos de administración"
          icon={DollarSign}
          iconColor="text-emerald-500"
        />
        <StatCard
          title="Ingresos Anuales"
          value={formatCurrency(stats.yearAdminIncome)}
          subtitle={`acumulado ${currentYear}`}
          icon={DollarSign}
          iconColor="text-primary"
        />
        <StatCard
          title="Contratos de Administración"
          value={stats.activeAdminContracts}
          subtitle="contratos vigentes"
          icon={FileText}
        />
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Actualizaciones Recientes
            </CardTitle>
            <CardDescription>
              Últimas actividades del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity) => {
                  const Icon = activityIcons[activity.type] || FileText
                  const colorClass = activityColors[activity.type] || 'bg-gray-500/10 text-gray-500'
                  
                  return (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", colorClass)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {activity.description}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">
                            {activity.time}
                          </span>
                          {activity.amount && (
                            <span className="text-xs font-semibold text-emerald-500">
                              {activity.amount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No hay actividades recientes</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Support Tickets */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Tickets de Soporte
                </CardTitle>
                <CardDescription>
                  Tickets pendientes de atención
                </CardDescription>
              </div>
              <Badge variant="secondary">{stats.openTickets} abiertos</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {recentTickets.length > 0 ? (
              <div className="space-y-4">
                {recentTickets.map((ticket) => {
                  const StatusIcon = statusIcons[ticket.status] || AlertCircle
                  const statusColor = statusColors[ticket.status] || 'text-gray-500'
                  
                  return (
                    <div key={ticket.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <div className={cn("mt-0.5", statusColor)}>
                        <StatusIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium truncate">{ticket.title}</p>
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs shrink-0", priorityColors[ticket.priority])}
                          >
                            {ticket.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {ticket.property}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {ticket.user}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {ticket.status === 'abierto' ? 'Abierto' : 
                             ticket.status === 'en_proceso' ? 'En Proceso' : 
                             ticket.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {ticket.createdAt}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50 text-emerald-500" />
                <p>No hay tickets pendientes</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Occupancy Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Resumen de Ocupación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Tasa de Ocupación</span>
                <span className="text-2xl font-bold">{stats.occupancyRate}%</span>
              </div>
              <Progress value={stats.occupancyRate} className="h-3" />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-muted-foreground">{stats.occupiedProperties} ocupadas</span>
                <span className="text-xs text-muted-foreground">{stats.totalProperties - stats.occupiedProperties} disponibles</span>
              </div>
            </div>
            
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{stats.activeAdminContracts}</div>
                <p className="text-sm text-muted-foreground">Contratos de Administración</p>
              </div>
            </div>
            
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-500">{formatCurrency(stats.monthAdminIncome)}</div>
                <p className="text-sm text-muted-foreground">Ingresos Mensuales</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
