'use client'

import { useState, useEffect } from 'react'
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
  Loader2,
  Users,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppStore } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface PropertyData {
  id: string
  title: string
  address: string
  bedrooms: number
  bathrooms: number
  parkingSpaces: number
  area: number
  monthlyRent: number
}

interface ContractData {
  id: string
  contractNumber: string
  startDate: string
  endDate: string
  depositAmount: number | null
  status: string
}

interface PaymentData {
  id: string
  month: string
  amount: string
  date: string
  method: string
  status: string
}

interface TicketData {
  id: string
  title: string
  status: string
  priority: string
  createdAt: string
}

interface NextPaymentData {
  id: string
  amount: number
  dueDate: string
  daysLeft: number
}

interface AdminContact {
  name: string
  email: string
  phone: string | null
}

interface DashboardData {
  property: PropertyData | null
  contract: ContractData | null
  nextPayment: NextPaymentData | null
  paymentHistory: PaymentData[]
  tickets: TicketData[]
  admins?: AdminContact[]
}

interface Tenant {
  id: string
  name: string
  email: string
}

interface InquilinoDashboardProps {
  userId?: string // Optional: for admin to view specific tenant
}

export function InquilinoDashboard({ userId: propUserId }: InquilinoDashboardProps = {}) {
  const { user } = useAppStore()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(propUserId || null)

  // Check if current user is admin
  const isAdmin = user?.role === 'admin'
  
  // Determine which userId to use
  const effectiveUserId = isAdmin ? selectedTenantId : user?.id

  // Fetch tenants list for admin selector
  useEffect(() => {
    if (isAdmin) {
      const fetchTenants = async () => {
        try {
          const response = await fetch('/api/users?role=INQUILINO')
          if (response.ok) {
            const result = await response.json()
            setTenants(result.users || [])
            // Auto-select first tenant if none selected
            if (!selectedTenantId && result.users?.length > 0) {
              setSelectedTenantId(result.users[0].id)
            }
          }
        } catch (error) {
          console.error('Error fetching tenants:', error)
        }
      }
      fetchTenants()
    }
  }, [isAdmin, selectedTenantId])

  // Fetch dashboard data
  useEffect(() => {
    if (!effectiveUserId) return
    
    fetchDashboardData(effectiveUserId)
  }, [effectiveUserId])

  const fetchDashboardData = async (targetUserId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/dashboard?role=inquilino&userId=${targetUserId}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        toast({
          title: 'Error',
          description: result.error || 'No se pudieron cargar los datos',
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

  // For non-admin users without data, show message
  if (!isAdmin && !user?.id) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">No hay información de usuario disponible</p>
      </div>
    )
  }

  // For admin without selected tenant
  if (isAdmin && !selectedTenantId && tenants.length === 0 && !loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Dashboard de Inquilino
            </h1>
            <p className="text-muted-foreground">
              Panel de control del inquilino
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay inquilinos registrados</p>
              <p className="text-sm">Registra un inquilino para ver su dashboard</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const property = data?.property
  const contract = data?.contract
  const nextPayment = data?.nextPayment

  // Calculate rent with ITBMS (7%)
  const monthlyRent = property?.monthlyRent || 0
  const itbms = Math.round(monthlyRent * 0.07)
  const total = monthlyRent + itbms

  // Get selected tenant name
  const selectedTenant = tenants.find(t => t.id === selectedTenantId)

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {isAdmin 
              ? `Dashboard de ${selectedTenant?.name || 'Inquilino'}`
              : `¡Bienvenido, ${user?.name?.split(' ')[0] || 'Usuario'}!`
            }
          </h1>
          <p className="text-muted-foreground">
            {isAdmin 
              ? 'Panel de control del inquilino seleccionado'
              : 'Panel de control de tu propiedad en alquiler'
            }
          </p>
        </div>
        
        {/* Admin tenant selector */}
        {isAdmin && tenants.length > 0 && (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <Select 
              value={selectedTenantId || undefined} 
              onValueChange={(v) => setSelectedTenantId(v)}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Seleccionar inquilino" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.name} ({tenant.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {/* Quick actions for non-admin */}
        {!isAdmin && (
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
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !data ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p>No se pudieron cargar los datos del dashboard</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Top cards row */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Property card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Home className="h-5 w-5 text-primary" />
                      {property?.title || 'Sin propiedad asignada'}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {property?.address || 'N/A'}
                    </CardDescription>
                  </div>
                  <Badge variant="default" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                    Ocupado
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {property ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Bed className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{property.bedrooms}</p>
                          <p className="text-xs text-muted-foreground">Recámaras</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Bath className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{property.bathrooms}</p>
                          <p className="text-xs text-muted-foreground">Baños</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Car className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{property.parkingSpaces}</p>
                          <p className="text-xs text-muted-foreground">Estacionamientos</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Ruler className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{property.area} m²</p>
                          <p className="text-xs text-muted-foreground">Área total</p>
                        </div>
                      </div>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Alquiler mensual</p>
                        <p className="text-xl font-bold">${monthlyRent.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">ITBMS (7%)</p>
                        <p className="text-xl font-bold">${itbms}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total mensual</p>
                        <p className="text-xl font-bold text-primary">${total.toLocaleString()}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Home className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay una propiedad asignada</p>
                    <p className="text-sm">Contacta al administrador</p>
                  </div>
                )}
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
                {nextPayment ? (
                  <>
                    <div className="text-3xl font-bold text-primary">
                      ${nextPayment.amount.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {new Date(nextPayment.dueDate).toLocaleDateString('es-PA', { 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </span>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Días restantes</span>
                        <span className="font-medium">{nextPayment.daysLeft} días</span>
                      </div>
                      <Progress 
                        value={Math.max(0, Math.min(100, (30 - nextPayment.daysLeft) / 30 * 100))} 
                        className="h-2" 
                      />
                    </div>
                    {!isAdmin && (
                      <Button className="w-full mt-4" size="sm">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Realizar Pago
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                    <p className="text-sm text-muted-foreground">No hay pagos pendientes</p>
                  </div>
                )}
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
                  {!isAdmin && (
                    <Button variant="outline" size="sm">
                      Ver todos
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {data.paymentHistory.length > 0 ? (
                  <div className="space-y-4">
                    {data.paymentHistory.map((payment) => (
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
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No hay historial de pagos</p>
                  </div>
                )}
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
                {contract ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Número</span>
                      <span className="font-mono font-medium">{contract.contractNumber}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Inicio</span>
                      <span className="font-medium">
                        {new Date(contract.startDate).toLocaleDateString('es-PA')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Vencimiento</span>
                      <span className="font-medium">
                        {new Date(contract.endDate).toLocaleDateString('es-PA')}
                      </span>
                    </div>
                    {contract.depositAmount && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Depósito</span>
                        <span className="font-medium">${contract.depositAmount.toLocaleString()}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Estado</span>
                        <Badge variant="outline" className="text-emerald-500 border-emerald-500/20">
                          {contract.status === 'VIGENTE' ? 'Vigente' : contract.status}
                        </Badge>
                      </div>
                    </div>
                    {!isAdmin && (
                      <Button variant="outline" className="w-full" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        Descargar Contrato
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No hay contrato activo</p>
                  </div>
                )}
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
                  <CardDescription>Estado de los tickets de mantenimiento</CardDescription>
                </div>
                {!isAdmin && (
                  <Button size="sm">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Nuevo Ticket
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {data.tickets.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {data.tickets.map((ticket) => (
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
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs",
                              ticket.priority === 'ALTA' 
                                ? 'text-red-500 border-red-500/20' 
                                : ticket.priority === 'MEDIA'
                                ? 'text-yellow-500 border-yellow-500/20'
                                : 'text-green-500 border-green-500/20'
                            )}
                          >
                            {ticket.priority === 'ALTA' ? 'Alta' : 
                             ticket.priority === 'MEDIA' ? 'Media' : 'Baja'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{ticket.createdAt}</span>
                          <Badge variant="secondary" className="text-xs">
                            {ticket.status === 'EN_PROCESO' ? 'En proceso' : 
                             ticket.status === 'ABIERTO' ? 'Abierto' : 
                             ticket.status === 'RESUELTO' ? 'Resuelto' : ticket.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                  <p>No hay solicitudes de soporte</p>
                  <p className="text-sm">Todo está funcionando correctamente</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Admin Contacts */}
          {data.admins && data.admins.length > 0 && (
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
                  {data.admins.map((admin, index) => (
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
