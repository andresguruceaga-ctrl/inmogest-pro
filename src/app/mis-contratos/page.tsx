'use client'

import { useState, useEffect } from 'react'
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
  property: {
    id: string
    name: string
    address: string
    propertyType: string
  } | null
  tenant: {
    id: string
    firstName: string
    lastName: string
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

  useEffect(() => {
    if (mounted) {
      fetchContracts()
    }
  }, [mounted])

  const fetchContracts = async () => {
    try {
      setLoading(true)
      
      // Obtener usuario del localStorage
      let userId = null
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('app-store')
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            userId = parsed?.state?.user?.id
          } catch (e) {
            console.error('Error parsing store:', e)
          }
        }
      }

      if (!userId) {
        setLoading(false)
        return
      }

      const response = await fetch(`/api/contracts?ownerId=${userId}`)
      
      if (!response.ok) {
        throw new Error('Error al cargar contratos')
      }
      
      const data = await response.json()
      
      // Manejar diferentes formatos de respuesta
      let contractsList: Contract[] = []
      if (Array.isArray(data)) {
        contractsList = data
      } else if (data.contracts && Array.isArray(data.contracts)) {
        contractsList = data.contracts
      } else if (data.data && Array.isArray(data.data)) {
        contractsList = data.data
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
      (contract.property?.name || '').toLowerCase().includes(searchLower) ||
      `${contract.tenant?.firstName || ''} ${contract.tenant?.lastName || ''}`.toLowerCase().includes(searchLower)
    
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

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    try {
      const date = parseISO(dateString)
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

  // No renderizar hasta que el componente esté montado (evita hidratación incorrecta)
  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mis Contratos</h1>
        <p className="text-muted-foreground">
          Consulta tus contratos de arrendamiento activos e históricos
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contratos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contracts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contratos Vigentes</CardTitle>
            <Calendar className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {contracts.filter((c) => c.status === 'VIGENTE').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contratos Vencidos</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {contracts.filter((c) => c.status === 'VENCIDO').length}
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
          {filteredContracts.length === 0 ? (
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
                        <div className="font-medium">{contract.property?.name || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">
                          {contract.property?.address || ''}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {contract.tenant?.firstName || ''} {contract.tenant?.lastName || ''}
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

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
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
              </div>

              {/* Propiedad */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Propiedad
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Nombre</p>
                    <p className="font-medium">{selectedContract.property?.name || 'N/A'}</p>
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
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Inquilino
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Nombre</p>
                    <p className="font-medium">
                      {selectedContract.tenant?.firstName || ''} {selectedContract.tenant?.lastName || ''}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedContract.tenant?.email || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Teléfono</p>
                    <p className="font-medium">{selectedContract.tenant?.phone || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Botón Descargar */}
              <div className="border-t pt-4 flex justify-end">
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
    </div>
  )
}
