'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { format, isValid, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Search,
  FileText,
  Calendar,
  User,
  Building2,
  Eye,
  Download,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

interface Contract {
  id: string
  contractNumber: string
  startDate: string | null
  endDate: string | null
  monthlyAmount: number | null
  depositAmount: number | null
  status: string
  isActive?: boolean
  daysRemaining?: number
  durationMonths?: number
  totalContractValue?: number
  property: {
    id: string
    title: string
    address: string
    propertyType: string
    monthlyRent: number
  } | null
  owner: {
    id: string
    name: string
    email: string
    phone: string
  } | null
  tenant: {
    id: string
    name: string
    email: string
    phone: string
  } | null
}

const statusColors: Record<string, string> = {
  VIGENTE: 'bg-green-500/10 text-green-500 border-green-500/20',
  VENCIDO: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  CANCELADO: 'bg-red-500/10 text-red-500 border-red-500/20',
  RENOVADO: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
}

const statusLabels: Record<string, string> = {
  VIGENTE: 'Vigente',
  VENCIDO: 'Vencido',
  CANCELADO: 'Cancelado',
  RENOVADO: 'Renovado',
}

export default function MisContratosPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Get user from localStorage
  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      const stored = localStorage.getItem('inmogest-pro-storage')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          const id = parsed?.state?.user?.id
          const role = parsed?.state?.user?.role
          setUserId(id)
          setUserRole(role)
          
          // Redirect if not authenticated
          if (!id) {
            router.push('/login')
            return
          }
        } catch (e) {
          console.error('Error parsing store:', e)
          router.push('/login')
        }
      } else {
        router.push('/login')
      }
    }
  }, [mounted, router])

  useEffect(() => {
    if (userId) {
      fetchContracts()
    }
  }, [userId])

  const fetchContracts = async () => {
    if (!userId) return
    
    try {
      setLoading(true)
      
      const response = await fetch(`/api/contracts?ownerId=${userId}`)
      
      if (!response.ok) {
        throw new Error('Error al cargar contratos')
      }
      
      const data = await response.json()
      
      let contractsList: Contract[] = []
      if (data.success && Array.isArray(data.data)) {
        contractsList = data.data
      } else if (Array.isArray(data)) {
        contractsList = data
      } else if (data.contracts && Array.isArray(data.contracts)) {
        contractsList = data.contracts
      }
      
      setContracts(contractsList)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar los contratos')
      setContracts([])
    } finally {
      setLoading(false)
    }
  }

  const filteredContracts = contracts.filter((contract) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      (contract.contractNumber || '').toLowerCase().includes(searchLower) ||
      (contract.property?.title || '').toLowerCase().includes(searchLower) ||
      (contract.tenant?.name || '').toLowerCase().includes(searchLower)
    
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '$0.00'
    return new Intl.NumberFormat('es-PA', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return 'N/A'
    try {
      const date = typeof dateString === 'string' ? parseISO(dateString) : dateString
      if (!isValid(date)) return 'N/A'
      return format(date, 'dd/MM/yyyy', { locale: es })
    } catch {
      return 'N/A'
    }
  }

  const handleViewDetails = (contract: Contract) => {
    setSelectedContract(contract)
    setDetailsOpen(true)
  }

  const handleDownloadPDF = async (contractId: string) => {
    try {
      toast.info('Generando PDF...')
      const response = await fetch(`/api/contracts/${contractId}/pdf`)
      if (!response.ok) throw new Error('Error al generar PDF')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `contrato-${contractId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('PDF descargado correctamente')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al generar el PDF')
    }
  }

  // Show loading while checking auth
  if (!mounted || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

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
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Mis Contratos</h1>
                <p className="text-muted-foreground">
                  Consulta tus contratos de arrendamiento activos e históricos
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Contratos</p>
                      <p className="text-2xl font-bold mt-1">{contracts.length}</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Contratos Vigentes</p>
                      <p className="text-2xl font-bold mt-1 text-green-500">
                        {contracts.filter((c) => c.status === 'VIGENTE').length}
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Contratos Vencidos</p>
                      <p className="text-2xl font-bold mt-1 text-yellow-500">
                        {contracts.filter((c) => c.status === 'VENCIDO').length}
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Ingresos Mensuales</p>
                      <p className="text-2xl font-bold mt-1 text-blue-500">
                        {formatCurrency(contracts.reduce((sum, c) => sum + (c.monthlyAmount || 0), 0))}
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por número, propiedad o inquilino..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="VIGENTE">Vigente</SelectItem>
                      <SelectItem value="VENCIDO">Vencido</SelectItem>
                      <SelectItem value="CANCELADO">Cancelado</SelectItem>
                      <SelectItem value="RENOVADO">Renovado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Contracts Table */}
            <Card>
              <CardHeader>
                <CardTitle>Lista de Contratos</CardTitle>
                <CardDescription>
                  {filteredContracts.length} contrato(s) encontrado(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                      <p className="text-muted-foreground">Cargando contratos...</p>
                    </div>
                  </div>
                ) : filteredContracts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No se encontraron contratos
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Propiedad</TableHead>
                        <TableHead>Inquilino</TableHead>
                        <TableHead>Fecha Inicio</TableHead>
                        <TableHead>Fecha Fin</TableHead>
                        <TableHead>Monto Mensual</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredContracts.map((contract) => (
                        <TableRow key={contract.id}>
                          <TableCell className="font-medium">
                            {contract.contractNumber || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{contract.property?.title || 'N/A'}</div>
                              <div className="text-sm text-muted-foreground">
                                {contract.property?.address || ''}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {contract.tenant?.name || 'Sin inquilino'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {contract.tenant?.email || ''}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatDate(contract.startDate)}
                          </TableCell>
                          <TableCell>
                            {formatDate(contract.endDate)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(contract.monthlyAmount)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={statusColors[contract.status] || ''}
                            >
                              {statusLabels[contract.status] || contract.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewDetails(contract)}
                                title="Ver detalles"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownloadPDF(contract.id)}
                                title="Descargar PDF"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
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

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Contrato</DialogTitle>
            <DialogDescription>
              Información completa del contrato {selectedContract?.contractNumber}
            </DialogDescription>
          </DialogHeader>
          
          {selectedContract && (
            <div className="space-y-6">
              {/* Estado */}
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`${statusColors[selectedContract.status] || ''} text-base px-4 py-1`}
                >
                  {statusLabels[selectedContract.status] || selectedContract.status}
                </Badge>
                {selectedContract.isActive && (
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                    Activo actualmente
                  </Badge>
                )}
              </div>

              {/* Información del Contrato */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Número de Contrato</p>
                  <p className="font-medium">{selectedContract.contractNumber || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Monto Mensual</p>
                  <p className="font-medium">{formatCurrency(selectedContract.monthlyAmount)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Fecha de Inicio</p>
                  <p className="font-medium">{formatDate(selectedContract.startDate)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Fecha de Fin</p>
                  <p className="font-medium">{formatDate(selectedContract.endDate)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Depósito</p>
                  <p className="font-medium">{formatCurrency(selectedContract.depositAmount)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Días Restantes</p>
                  <p className="font-medium">{selectedContract.daysRemaining || 0} días</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Duración</p>
                  <p className="font-medium">{selectedContract.durationMonths || 0} meses</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Valor Total del Contrato</p>
                  <p className="font-medium">{formatCurrency(selectedContract.totalContractValue)}</p>
                </div>
              </div>

              {/* Propiedad */}
              <Separator />
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Propiedad
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Nombre</p>
                    <p className="font-medium">{selectedContract.property?.title || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Tipo</p>
                    <p className="font-medium">{selectedContract.property?.propertyType || 'N/A'}</p>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <p className="text-sm text-muted-foreground">Dirección</p>
                    <p className="font-medium">{selectedContract.property?.address || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Inquilino */}
              <Separator />
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Inquilino
                </h4>
                {selectedContract.tenant ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Nombre</p>
                      <p className="font-medium">{selectedContract.tenant.name || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedContract.tenant.email || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Teléfono</p>
                      <p className="font-medium">{selectedContract.tenant.phone || 'N/A'}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Sin inquilino asignado</p>
                )}
              </div>

              {/* Botón Descargar */}
              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => handleDownloadPDF(selectedContract.id)}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Descargar PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
