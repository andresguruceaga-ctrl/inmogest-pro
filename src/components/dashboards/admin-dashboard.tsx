'use client'

import * as React from 'react'
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
  MoreHorizontal,
  Eye,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Stats card component
function StatCard({ 
  title, 
  value, 
  change, 
  changeType, 
  icon: Icon, 
  description 
}: { 
  title: string
  value: string
  change: string
  changeType: 'positive' | 'negative' | 'neutral'
  icon: React.ElementType
  description?: string
}) {
  return (
    <Card className="card-hover">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <div className="flex items-center gap-1 mt-1">
          {changeType === 'positive' && (
            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
          )}
          {changeType === 'negative' && (
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          )}
          <span className={`text-sm font-medium ${
            changeType === 'positive' ? 'text-emerald-500' : 
            changeType === 'negative' ? 'text-red-500' : 
            'text-muted-foreground'
          }`}>
            {change}
          </span>
          {description && (
            <span className="text-sm text-muted-foreground">
              {description}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Activity item
interface Activity {
  id: string
  type: 'contract' | 'payment' | 'property' | 'tenant'
  title: string
  description: string
  time: string
  amount?: string
}

const recentActivities: Activity[] = [
  {
    id: '1',
    type: 'payment',
    title: 'Pago recibido',
    description: 'Pedro González - Apt 15-03, Torre Vista Mar',
    time: 'Hace 5 minutos',
    amount: '$2,675.00',
  },
  {
    id: '2',
    type: 'contract',
    title: 'Contrato renovado',
    description: 'Ana Martínez - Casa 45, Condado del Rey',
    time: 'Hace 1 hora',
  },
  {
    id: '3',
    type: 'property',
    title: 'Nueva propiedad',
    description: 'PH en Costa del Este añadido al portafolio',
    time: 'Hace 3 horas',
  },
  {
    id: '4',
    type: 'tenant',
    title: 'Nuevo inquilino',
    description: 'Luis Herrera registrado',
    time: 'Hace 5 horas',
  },
  {
    id: '5',
    type: 'payment',
    title: 'Pago recibido',
    description: 'Ana Martínez - Casa 45, Condado del Rey',
    time: 'Hace 1 día',
    amount: '$1,926.00',
  },
]

// Upcoming payments
const upcomingPayments = [
  { id: '1', tenant: 'Luis Herrera', property: 'Oficina 2501, Torre Américas', amount: '$4,494.00', dueDate: '15 Ene', status: 'pending', daysLeft: 5 },
  { id: '2', tenant: 'Pedro González', property: 'Apt 15-03, Torre Vista Mar', amount: '$2,675.00', dueDate: '01 Feb', status: 'upcoming', daysLeft: 22 },
  { id: '3', tenant: 'Ana Martínez', property: 'Casa 45, Condado del Rey', amount: '$1,926.00', dueDate: '03 Feb', status: 'upcoming', daysLeft: 24 },
]

// Support tickets
const supportTickets = [
  { id: '1', title: 'Fuga de agua en cocina', property: 'Apt 15-03', priority: 'alta', status: 'en_proceso' },
  { id: '2', title: 'Aire acondicionado no enfría', property: 'Apt 15-03', priority: 'media', status: 'abierto' },
]

// Activity icons and colors
const activityIcons: Record<string, React.ElementType> = {
  contract: FileText,
  payment: DollarSign,
  property: Building2,
  tenant: Users,
}

const activityColors: Record<string, string> = {
  contract: 'bg-blue-500/10 text-blue-500',
  payment: 'bg-emerald-500/10 text-emerald-500',
  property: 'bg-purple-500/10 text-purple-500',
  tenant: 'bg-orange-500/10 text-orange-500',
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

export function AdminDashboard() {
  const stats = [
    {
      title: 'Propiedades Activas',
      value: '124',
      change: '+12%',
      changeType: 'positive' as const,
      icon: Building2,
      description: 'vs. mes anterior',
    },
    {
      title: 'Contratos Vigentes',
      value: '98',
      change: '+5%',
      changeType: 'positive' as const,
      icon: FileText,
      description: 'vs. mes anterior',
    },
    {
      title: 'Inquilinos',
      value: '156',
      change: '+8',
      changeType: 'positive' as const,
      icon: Users,
      description: 'este mes',
    },
    {
      title: 'Ingresos del Mes',
      value: '$48,250',
      change: '+15%',
      changeType: 'positive' as const,
      icon: DollarSign,
      description: 'vs. mes anterior',
    },
  ]

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
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Enero 2025
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Propiedad
          </Button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upcoming payments - Takes 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Pagos Próximos</CardTitle>
              <CardDescription>
                Pagos pendientes de cobro
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              Ver todos
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inquilino</TableHead>
                  <TableHead className="hidden md:table-cell">Propiedad</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {payment.tenant.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span>{payment.tenant}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {payment.property}
                    </TableCell>
                    <TableCell className="font-medium">
                      {payment.amount}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{payment.dueDate}</span>
                        {payment.status === 'pending' && payment.daysLeft <= 7 && (
                          <Badge variant="outline" className="text-orange-500 border-orange-500/20">
                            {payment.daysLeft} días
                          </Badge>
                        )}
                      </div>
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
                            <DollarSign className="h-4 w-4 mr-2" />
                            Registrar pago
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>
              Últimas actualizaciones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => {
                const Icon = activityIcons[activity.type]
                const colorClass = activityColors[activity.type]
                
                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
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
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Occupancy */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ocupación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl font-bold">89%</span>
              <span className="text-sm text-muted-foreground">110/124</span>
            </div>
            <Progress value={89} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              <TrendingUp className="h-3 w-3 inline mr-1 text-emerald-500" />
              +3% vs. mes anterior
            </p>
          </CardContent>
        </Card>
        
        {/* Collection */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recaudación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl font-bold">78%</span>
              <span className="text-sm text-muted-foreground">$37,635/$48,250</span>
            </div>
            <Progress value={78} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              5 pagos pendientes este mes
            </p>
          </CardContent>
        </Card>
        
        {/* Support tickets */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Tickets de Soporte</CardTitle>
              <Badge variant="secondary">2 abiertos</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {supportTickets.map((ticket) => {
                const StatusIcon = statusIcons[ticket.status]
                return (
                  <div key={ticket.id} className="flex items-center gap-2">
                    <AlertTriangle className={`h-4 w-4 ${
                      ticket.priority === 'alta' ? 'text-red-500' : 'text-yellow-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ticket.title}</p>
                      <p className="text-xs text-muted-foreground">{ticket.property}</p>
                    </div>
                    <Badge variant="outline" className={priorityColors[ticket.priority]}>
                      {ticket.priority}
                    </Badge>
                  </div>
                )
              })}
            </div>
            <Button variant="outline" size="sm" className="w-full mt-3">
              Ver todos los tickets
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
