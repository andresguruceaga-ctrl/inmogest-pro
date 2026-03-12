'use client'

import * as React from 'react'
import { 
  Home,
  FileText,
  CreditCard,
  Wrench,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Bed,
  Bath,
  Car,
  Ruler,
  ArrowUpRight,
  MessageSquare,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

// Payment history
const paymentHistory = [
  { id: '1', month: 'Enero 2025', amount: '$2,675.00', status: 'paid', date: '05 Ene', method: 'Transferencia' },
  { id: '2', month: 'Diciembre 2024', amount: '$2,675.00', status: 'paid', date: '03 Dic', method: 'Transferencia' },
  { id: '3', month: 'Noviembre 2024', amount: '$2,675.00', status: 'paid', date: '02 Nov', method: 'Transferencia' },
]

// Support requests
const supportRequests = [
  { id: '1', title: 'Fuga de agua en cocina', status: 'en_proceso', date: '10 Ene', priority: 'alta' },
  { id: '2', title: 'Aire acondicionado no enfría', status: 'abierto', date: '08 Ene', priority: 'media' },
]

// Property info
const propertyInfo = {
  name: 'Apartamento Vista Mar',
  address: 'Ave. Balboa, Torre Vista Mar, Apto 15-03',
  building: 'Torre Vista Mar',
  floor: 15,
  bedrooms: 3,
  bathrooms: 2,
  parking: 2,
  area: 150.5,
  monthlyRent: 2500,
  itbms: 175,
  total: 2675,
}

// Contract info
const contractInfo = {
  number: 'CTR-2024-001',
  startDate: '01 Enero 2024',
  endDate: '31 Diciembre 2025',
  deposit: '$2,500.00',
  status: 'Vigente',
  daysRemaining: 350,
}

export function InquilinoDashboard() {
  const nextPayment = {
    amount: '$2,675.00',
    dueDate: '01 Febrero 2025',
    daysLeft: 22,
  }

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            ¡Bienvenido, Pedro!
          </h1>
          <p className="text-muted-foreground">
            Panel de control de tu propiedad en alquiler
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Ver Contrato
          </Button>
          <Button size="sm">
            <MessageSquare className="h-4 w-4 mr-2" />
            Nuevo Ticket
          </Button>
        </div>
      </div>

      {/* Top cards row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Property card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-primary" />
                  {propertyInfo.name}
                </CardTitle>
                <CardDescription className="flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  {propertyInfo.address}
                </CardDescription>
              </div>
              <Badge variant="default" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                Ocupado
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bed className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{propertyInfo.bedrooms}</p>
                  <p className="text-xs text-muted-foreground">Recámaras</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bath className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{propertyInfo.bathrooms}</p>
                  <p className="text-xs text-muted-foreground">Baños</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Car className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{propertyInfo.parking}</p>
                  <p className="text-xs text-muted-foreground">Estacionamientos</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Ruler className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{propertyInfo.area} m²</p>
                  <p className="text-xs text-muted-foreground">Área total</p>
                </div>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alquiler mensual</p>
                <p className="text-xl font-bold">${propertyInfo.monthlyRent.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ITBMS (7%)</p>
                <p className="text-xl font-bold">${propertyInfo.itbms}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total mensual</p>
                <p className="text-xl font-bold text-primary">${propertyInfo.total.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next payment card */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Próximo Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{nextPayment.amount}</div>
            <div className="flex items-center gap-2 mt-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{nextPayment.dueDate}</span>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">Días restantes</span>
                <span className="font-medium">{nextPayment.daysLeft} días</span>
              </div>
              <Progress value={(30 - nextPayment.daysLeft) / 30 * 100} className="h-2" />
            </div>
            <Button className="w-full mt-4" size="sm">
              <CreditCard className="h-4 w-4 mr-2" />
              Realizar Pago
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Second row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Payment history */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Historial de Pagos</CardTitle>
                <CardDescription>Últimos pagos realizados</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                Ver todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {paymentHistory.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-medium">{payment.month}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.date} • {payment.method}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{payment.amount}</p>
                    <Badge variant="outline" className="text-emerald-500 border-emerald-500/20">
                      Pagado
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contract info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Mi Contrato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Número</span>
              <span className="font-mono font-medium">{contractInfo.number}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Inicio</span>
              <span className="font-medium">{contractInfo.startDate}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Vencimiento</span>
              <span className="font-medium">{contractInfo.endDate}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Depósito</span>
              <span className="font-medium">{contractInfo.deposit}</span>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Días restantes</span>
                <span className="font-bold text-primary">{contractInfo.daysRemaining}</span>
              </div>
              <Progress value={(730 - contractInfo.daysRemaining) / 730 * 100} className="h-2" />
            </div>
            <Button variant="outline" className="w-full" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Descargar Contrato
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Support tickets */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                Solicitudes de Soporte
              </CardTitle>
              <CardDescription>Estado de tus tickets de mantenimiento</CardDescription>
            </div>
            <Button size="sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              Nuevo Ticket
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {supportRequests.map((ticket) => (
              <div key={ticket.id} className="flex items-start gap-3 p-4 rounded-lg border">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                  ticket.status === 'en_proceso' ? 'bg-yellow-500/10' : 'bg-blue-500/10'
                }`}>
                  {ticket.status === 'en_proceso' ? (
                    <Clock className={`h-5 w-5 text-yellow-500`} />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-blue-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate">{ticket.title}</p>
                    <Badge variant="outline" className={
                      ticket.priority === 'alta' 
                        ? 'text-red-500 border-red-500/20' 
                        : 'text-yellow-500 border-yellow-500/20'
                    }>
                      {ticket.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{ticket.date}</span>
                    <Badge variant="secondary" className="text-xs">
                      {ticket.status === 'en_proceso' ? 'En proceso' : 'Abierto'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contact info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contacto de Emergencia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Teléfono</p>
                <p className="font-medium">+507 200-0000</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium">soporte@inmogestpro.pa</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">WhatsApp</p>
                <p className="font-medium">+507 6123-4567</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
