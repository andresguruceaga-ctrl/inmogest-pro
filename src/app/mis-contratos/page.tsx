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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, Search, Eye, Calendar, User, Building2, Loader2, Download, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/lib/store'
import { generateContractPDF } from '@/lib/pdf-utils'

interface Contract {
  id: string
  contractNumber: string
  contractType: string
  startDate: string
  endDate: string
  monthlyAmount: number
  itbmsAmount: number
  depositAmount: number | null
  terms: string | null
  documentUrl: string | null
  status: string
  property: { id: string; title: string; address: string; province?: string; propertyType?: string; monthlyRent?: number } | null
  owner: { id: string; name: string; email: string; phone?: string } | null
  tenant: { id: string; name: string; email: string; phone?: string } | null
  isActive: boolean
  daysRemaining: number
  durationMonths?: number
  totalContractValue?: number
  _count?: { payments: number }
}

const CONTRACT_TYPES: Record<string, string> = {
  ARRENDAMIENTO: 'Arrendamiento',
  ADMINISTRACION: 'Administración',
}

const CONTRACT_STATUSES: Record<string, { label: string; color: string }> = {
  VIGENTE: { label: 'Vigente', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  VENCIDO: { label: 'Vencido', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  CANCELADO: { label: 'Cancelado', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
  RENOVADO: { label: 'Renovado', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
}

export default function MisContratosPage() {
  const { user } = useAppStore()
  const { toast } = useToast()
  
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)

  useEffect(() => {
    fetchContracts()
  }, [user])

  const fetchContracts = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/contracts?ownerId=${user.id}`)
      const data = await response.json()
      
      if (data.success) {
        setContracts(data.data || [])
      } else {
        toast({
          title: 'Error',
          description: data.error || 'No se pudieron cargar los contratos',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error fetching contracts:', error)
      toast({
        title: 'Error',
        description: 'Error de conexión',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-PA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PA', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VIGENTE':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'VENCIDO':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'CANCELADO':
        return <XCircle className="h-4 w-4 text-gray-500" />
      case 'RENOVADO':
        return <RefreshCw className="h-4 w-4 text-blue-500" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const handleViewDetails = (contract: Contract) => {
    setSelectedContract(contract)
    setDetailOpen(true)
  }

  const handleDownloadPDF = (contract: Contract) => {
    if (!contract.property) return

    const doc = generateContractPDF({
      contractNumber: contract.contractNumber,
      contractType: CONTRACT_TYPES[contract.contractType] || contract.contractType,
      startDate: contract.startDate,
      endDate: contract.endDate,
      monthlyAmount: contract.monthlyAmount,
      depositAmount: contract.depositAmount || 0,
      terms: contract.terms || '',
      property: {
        title: contract.property.title,
        address: contract.property.address,
        province: contract.property.province || '',
        propertyType: contract.property.propertyType || '',
      },
      owner: contract.owner ? {
        name: contract.owner.name,
        email: contract.owner.email,
        phone: contract.owner.phone || '',
      } : undefined,
      tenant: contract.tenant ? {
        name: contract.tenant.name,
        email: contract.tenant.email,
        phone: contract.tenant.phone || '',
      } : undefined,
    })

    doc.save(`contrato_${contract.contractNumber}.pdf`)
    
    toast({
      title: 'PDF descargado',
      description: 'El contrato ha sido exportado exitosamente.',
    })
  }

  // Filter contracts
  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = 
      contract.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.property?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.tenant?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Stats
  const activeContracts = contracts.filter(c => c.status === 'VIGENTE').length
  const expiredContracts = contracts.filter(c => c.status === 'VENCIDO').length
  const totalMonthlyIncome = contracts
    .filter(c => c.status === 'VIGENTE')
    .reduce((sum, c) => sum + c.monthlyAmount, 0)

  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <Header />

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Mis Contratos</h1>
              <p className="text-muted-foreground">Consulta tus contratos de arrendamiento y administración</p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Contratos Activos</p>
                      <p className="text-2xl font-bold text-green-500">{activeContracts}</p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Contratos Vencidos</p>
                      <p className="text-2xl font-bold text-red-500">{expiredContracts}</p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                      <XCircle className="h-6 w-6 text-red-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Ingreso Mensual Total</p>
                      <p className="text-2xl font-bold text-primary">{formatCurrency(totalMonthlyIncome)}</p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por número, propiedad o inquilino..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="w-full md:w-48">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los estados</SelectItem>
                        <SelectItem value="VIGENTE">Vigentes</SelectItem>
                        <SelectItem value="VENCIDO">Vencidos</SelectItem>
                        <SelectItem value="CANCELADO">Cancelados</SelectItem>
                        <SelectItem value="RENOVADO">Renovados</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contracts Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Lista de Contratos
                </CardTitle>
                <CardDescription>
                  {filteredContracts.length} contrato(s) encontrado(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredContracts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No se encontraron contratos</p>
                  </div>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Número</TableHead>
                          <TableHead>Propiedad</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Inquilino</TableHead>
                          <TableHead>Monto Mensual</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Vencimiento</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredContracts.map((contract) => (
                          <TableRow key={contract.id}>
                            <TableCell className="font-medium">
                              {contract.contractNumber}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{contract.property?.title || 'N/A'}</p>
                                <p className="text-xs text-muted-foreground">{contract.property?.address}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {CONTRACT_TYPES[contract.contractType] || contract.contractType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {contract.tenant ? (
                                <div>
                                  <p className="font-medium">{contract.tenant.name}</p>
                                  <p className="text-xs text-muted-foreground">{contract.tenant.email}</p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Sin inquilino</span>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(contract.monthlyAmount)}
                            </TableCell>
                            <TableCell>
                              <Badge className={CONTRACT_STATUSES[contract.status]?.color || ''}>
                                <span className="flex items-center gap-1">
                                  {getStatusIcon(contract.status)}
                                  {CONTRACT_STATUSES[contract.status]?.label || contract.status}
                                </span>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className={contract.daysRemaining <= 30 && contract.status === 'VIGENTE' ? 'text-orange-500 font-medium' : ''}>
                                  {formatDate(contract.endDate)}
                                </span>
                              </div>
                              {contract.status === 'VIGENTE' && contract.daysRemaining <= 30 && (
                                <p className="text-xs text-orange-500 mt-1">
                                  Vence en {contract.daysRemaining} días
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
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
                                  onClick={() => handleDownloadPDF(contract)}
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
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>

        <Footer />
      </SidebarInset>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalles del Contrato
            </DialogTitle>
            <DialogDescription>
              Contrato #{selectedContract?.contractNumber}
            </DialogDescription>
          </DialogHeader>
          
          {selectedContract && (
            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center gap-2">
                <Badge className={CONTRACT_STATUSES[selectedContract.status]?.color || ''}>
                  <span className="flex items-center gap-1">
                    {getStatusIcon(selectedContract.status)}
                    {CONTRACT_STATUSES[selectedContract.status]?.label || selectedContract.status}
                  </span>
                </Badge>
                {selectedContract.status === 'VIGENTE' && (
                  <span className="text-sm text-muted-foreground">
                    {selectedContract.daysRemaining} días restantes
                  </span>
                )}
              </div>

              {/* Property Info */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Propiedad
                </h4>
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Título</p>
                    <p className="font-medium">{selectedContract.property?.title || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Dirección</p>
                    <p className="font-medium">{selectedContract.property?.address || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Contract Info */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Información del Contrato
                </h4>
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo</p>
                    <p className="font-medium">{CONTRACT_TYPES[selectedContract.contractType] || selectedContract.contractType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Número</p>
                    <p className="font-medium">{selectedContract.contractNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha de Inicio</p>
                    <p className="font-medium">{formatDate(selectedContract.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha de Fin</p>
                    <p className="font-medium">{formatDate(selectedContract.endDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Duración</p>
                    <p className="font-medium">{selectedContract.durationMonths} meses</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                    <p className="font-medium">{formatCurrency(selectedContract.totalContractValue || 0)}</p>
                  </div>
                </div>
              </div>

              {/* Financial Info */}
              <div className="space-y-2">
                <h4 className="font-semibold">Información Financiera</h4>
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Monto Mensual</p>
                    <p className="font-medium text-lg text-primary">{formatCurrency(selectedContract.monthlyAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Depósito</p>
                    <p className="font-medium">{formatCurrency(selectedContract.depositAmount || 0)}</p>
                  </div>
                </div>
              </div>

              {/* Tenant Info */}
              {selectedContract.tenant && (
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Inquilino
                  </h4>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Nombre</p>
                      <p className="font-medium">{selectedContract.tenant.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedContract.tenant.email}</p>
                    </div>
                    {selectedContract.tenant.phone && (
                      <div>
                        <p className="text-sm text-muted-foreground">Teléfono</p>
                        <p className="font-medium">{selectedContract.tenant.phone}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Terms */}
              {selectedContract.terms && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Términos y Condiciones</h4>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{selectedContract.terms}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setDetailOpen(false)}>
                  Cerrar
                </Button>
                <Button onClick={() => handleDownloadPDF(selectedContract)}>
                  <Download className="h-4 w-4 mr-2" />
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
