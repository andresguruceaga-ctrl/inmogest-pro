'use client'

import * as React from 'react'
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
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Properties data
const properties = [
  { 
    id: '1', 
    name: 'Apartamento Vista Mar', 
    address: 'Punta Paitilla', 
    monthlyRent: 2500,
    status: 'ocupada',
    tenant: 'Pedro González',
    occupancy: 100,
  },
  { 
    id: '2', 
    name: 'Local Comercial El Dorado', 
    address: 'El Dorado', 
    monthlyRent: 3500,
    status: 'disponible',
    tenant: null,
    occupancy: 0,
  },
  { 
    id: '3', 
    name: 'PH Costa del Este', 
    address: 'Costa del Este', 
    monthlyRent: 6500,
    status: 'disponible',
    tenant: null,
    occupancy: 0,
  },
]

// Financial summary
const financialSummary = {
  grossIncome: 18500,
  fixedExpenses: 1200,
  variableExpenses: 450,
  totalExpenses: 1650,
  netIncome: 16850,
  itbmsCollected: 1295,
  itbmsPaid: 115.50,
}

// Monthly trend
const monthlyTrend = [
  { month: 'Sep', income: 15000, expenses: 1200 },
  { month: 'Oct', income: 16500, expenses: 1350 },
  { month: 'Nov', income: 17200, expenses: 1100 },
  { month: 'Dic', income: 18000, expenses: 1500 },
  { month: 'Ene', income: 18500, expenses: 1650 },
]

// Expenses breakdown
const expensesBreakdown = [
  { category: 'Mantenimiento PH', amount: 500, percentage: 30 },
  { category: 'Seguros', amount: 350, percentage: 21 },
  { category: 'Comisión Admin', amount: 400, percentage: 24 },
  { category: 'Reparaciones', amount: 250, percentage: 15 },
  { category: 'Servicios', amount: 150, percentage: 9 },
]

// Recent transactions
const recentTransactions = [
  { id: '1', type: 'income', description: 'Alquiler - Apt Vista Mar', amount: 2675, date: '05 Ene' },
  { id: '2', type: 'expense', description: 'Mantenimiento PH', amount: -267.50, date: '05 Ene' },
  { id: '3', type: 'income', description: 'Alquiler - Casa Condado', amount: 1926, date: '03 Ene' },
  { id: '4', type: 'expense', description: 'Reparación plomería', amount: -214, date: '22 Dic' },
]

// Stat card component
function StatCard({ 
  title, 
  value, 
  change, 
  changeType, 
  icon: Icon,
  subtitle,
}: { 
  title: string
  value: string
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon: React.ElementType
  subtitle?: string
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
        {change && changeType && (
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
          </div>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}

export function PropietarioDashboard() {
  const activeProperties = properties.filter(p => p.status === 'ocupada').length
  const totalProperties = properties.length
  const occupancyRate = Math.round((activeProperties / totalProperties) * 100)

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Panel de Propietario
          </h1>
          <p className="text-muted-foreground">
            Resumen financiero y estado de tus propiedades
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Enero 2025
          </Button>
          <Button size="sm">
            <Download className="h-4 w-4 mr-2" />
            Descargar Reporte
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ingresos Brutos"
          value={`$${financialSummary.grossIncome.toLocaleString()}`}
          change="+8%"
          changeType="positive"
          icon={TrendingUp}
          subtitle="vs. mes anterior"
        />
        <StatCard
          title="Gastos Totales"
          value={`$${financialSummary.totalExpenses.toLocaleString()}`}
          change="+12%"
          changeType="negative"
          icon={Receipt}
          subtitle="vs. mes anterior"
        />
        <StatCard
          title="Ingreso Neto"
          value={`$${financialSummary.netIncome.toLocaleString()}`}
          change="+7%"
          changeType="positive"
          icon={DollarSign}
          subtitle="después de gastos"
        />
        <StatCard
          title="Ocupación"
          value={`${occupancyRate}%`}
          subtitle={`${activeProperties} de ${totalProperties} propiedades`}
          icon={Building2}
        />
      </div>

      {/* Financial report card */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Reporte Financiero Mensual
          </CardTitle>
          <CardDescription>Desglose detallado de ingresos y gastos - Enero 2025</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Ingresos Brutos</p>
              <p className="text-2xl font-bold text-emerald-500">
                +${financialSummary.grossIncome.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">ITBMS: ${financialSummary.itbmsCollected}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Costos Fijos</p>
              <p className="text-2xl font-bold text-orange-500">
                -${financialSummary.fixedExpenses.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">PH, Seguros, Comisión</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Reparaciones/Servicios</p>
              <p className="text-2xl font-bold text-red-500">
                -${financialSummary.variableExpenses.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">ITBMS pagado: ${financialSummary.itbmsPaid}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Ingreso Neto</p>
              <p className="text-2xl font-bold text-primary">
                ${financialSummary.netIncome.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">91% margen neto</p>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                <TrendingUp className="h-3 w-3 mr-1" />
                +15% vs mes anterior
              </Badge>
              <span className="text-sm text-muted-foreground">
                Total ITBMS recaudado: ${financialSummary.itbmsCollected}
              </span>
            </div>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Ver detalle completo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Properties and expenses grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Properties list */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Mis Propiedades</CardTitle>
                <CardDescription>Estado actual de tu portafolio</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                Ver todas
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Propiedad</TableHead>
                  <TableHead className="hidden md:table-cell">Ubicación</TableHead>
                  <TableHead>Alquiler</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {properties.map((property) => (
                  <TableRow key={property.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{property.name}</p>
                        {property.tenant && (
                          <p className="text-xs text-muted-foreground">{property.tenant}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {property.address}
                    </TableCell>
                    <TableCell className="font-medium">
                      ${property.monthlyRent.toLocaleString()}/mes
                    </TableCell>
                    <TableCell>
                      <Badge variant={property.status === 'ocupada' ? 'default' : 'secondary'}
                        className={property.status === 'ocupada' 
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                          : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                        }>
                        {property.status === 'ocupada' ? 'Ocupada' : 'Disponible'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Expenses breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Gastos del Mes
            </CardTitle>
            <CardDescription>Distribución por categoría</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {expensesBreakdown.map((expense, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{expense.category}</span>
                  <span className="font-medium">${expense.amount}</span>
                </div>
                <Progress value={expense.percentage} className="h-2" />
              </div>
            ))}
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <span className="font-medium">Total</span>
              <span className="font-bold text-primary">${financialSummary.totalExpenses}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transacciones Recientes</CardTitle>
              <CardDescription>Últimos movimientos financieros</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              Ver todas
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                    transaction.type === 'income' 
                      ? 'bg-emerald-500/10' 
                      : 'bg-red-500/10'
                  }`}>
                    {transaction.type === 'income' ? (
                      <ArrowUpRight className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground">{transaction.date}</p>
                  </div>
                </div>
                <span className={`font-bold ${
                  transaction.type === 'income' ? 'text-emerald-500' : 'text-red-500'
                }`}>
                  {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly trend chart placeholder */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tendencia de Ingresos</CardTitle>
            <CardDescription>Últimos 5 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {monthlyTrend.map((item, index) => {
                const height = (item.income / 20000) * 100
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      className="w-full bg-primary/20 rounded-t-lg transition-all hover:bg-primary/30"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-xs text-muted-foreground">{item.month}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximos Vencimientos</CardTitle>
            <CardDescription>Contratos por renovar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium text-sm">Casa Condado del Rey</p>
                  <p className="text-xs text-muted-foreground">Vence en 45 días</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Renovar</Button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-green-500/20 bg-green-500/5">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="font-medium text-sm">Apt Vista Mar</p>
                  <p className="text-xs text-muted-foreground">Vigente hasta Dic 2025</p>
                </div>
              </div>
              <Badge variant="outline" className="text-emerald-500 border-emerald-500/20">
                Al día
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
