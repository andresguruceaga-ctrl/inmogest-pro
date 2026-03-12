'use client'

import { useState, useEffect, useRef } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Building2, Plus, Search, Filter, MoreHorizontal, Eye, Edit, Trash2, MapPin, Bed, Bath, Car, Ruler, Loader2, User, Upload, Image as ImageIcon, X, Camera } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface Property {
  id: string
  title: string
  province: string
  district: string
  address: string
  propertyType: string
  bedrooms: number
  bathrooms: number
  parkingSpaces: number
  totalArea: number
  monthlyRent: number
  status: string
  fincaNumber: string
  mainImage: string | null
  images: string | null
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface PhotoPreview {
  file: File
  preview: string
  uploaded: boolean
  url?: string
}

const propertyTypes = [
  { value: 'APARTAMENTO', label: 'Apartamento' },
  { value: 'CASA', label: 'Casa' },
  { value: 'LOCAL_COMERCIAL', label: 'Local Comercial' },
  { value: 'OFICINA', label: 'Oficina' },
  { value: 'BODEGA', label: 'Bodega' },
  { value: 'TERRENO', label: 'Terreno' },
  { value: 'PH', label: 'PH' },
]

const provinces = [
  'Panamá',
  'Panamá Oeste',
  'Colón',
  'Chiriquí',
  'Veraguas',
  'Herrera',
  'Los Santos',
  'Coclé',
  'Bocas del Toro',
  'Darién',
]

export default function PropiedadesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [admins, setAdmins] = useState<User[]>([])
  const [owners, setOwners] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    propertyType: 'APARTAMENTO',
    province: 'Panamá',
    district: '',
    corregimiento: '',
    neighborhood: '',
    address: '',
    buildingName: '',
    totalArea: '',
    builtArea: '',
    bedrooms: '0',
    bathrooms: '1',
    parkingSpaces: '1',
    floorNumber: '',
    fincaNumber: '',
    tomoNumber: '',
    folioNumber: '',
    asientoNumber: '',
    monthlyRent: '',
    depositAmount: '',
    ownerId: '',
    adminId: '',
    mainImage: '',
    images: '',
  })

  const [photos, setPhotos] = useState<PhotoPreview[]>([])
  const [mainPhotoIndex, setMainPhotoIndex] = useState<number | null>(null)

  useEffect(() => {
    fetchProperties()
    fetchUsers()
  }, [])

  const fetchProperties = async () => {
    try {
      const response = await fetch('/api/properties')
      if (response.ok) {
        const data = await response.json()
        setProperties(data.properties || [])
      }
    } catch (error) {
      console.error('Error fetching properties:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        const allUsers = data.users || []
        setAdmins(allUsers.filter((u: User) => u.role === 'ADMIN'))
        setOwners(allUsers.filter((u: User) => u.role === 'PROPIETARIO'))
      } else {
        const demoAdmins = [
          { id: 'demo-admin-1', name: 'Carlos Administrador', email: 'admin@inmogest.pa', role: 'ADMIN' }
        ]
        const demoOwners = [
          { id: 'demo-owner-1', name: 'Juan Pérez', email: 'juan.perez@email.com', role: 'PROPIETARIO' },
          { id: 'demo-owner-2', name: 'María Rodríguez', email: 'maria.rodriguez@email.com', role: 'PROPIETARIO' }
        ]
        setAdmins(demoAdmins)
        setOwners(demoOwners)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      const demoAdmins = [
        { id: 'demo-admin-1', name: 'Carlos Administrador', email: 'admin@inmogest.pa', role: 'ADMIN' }
      ]
      const demoOwners = [
        { id: 'demo-owner-1', name: 'Juan Pérez', email: 'juan.perez@email.com', role: 'PROPIETARIO' },
        { id: 'demo-owner-2', name: 'María Rodríguez', email: 'maria.rodriguez@email.com', role: 'PROPIETARIO' }
      ]
      setAdmins(demoAdmins)
      setOwners(demoOwners)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    const newPhotos: PhotoPreview[] = []

    for (const file of Array.from(files)) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Archivo no válido',
          description: `${file.name} no es una imagen válida`,
          variant: 'destructive',
        })
        continue
      }

      // Validar tamaño (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'Archivo muy grande',
          description: `${file.name} excede el límite de 10MB`,
          variant: 'destructive',
        })
        continue
      }

      try {
        // Crear preview
        const preview = URL.createObjectURL(file)
        
        // Subir archivo
        const uploadFormData = new FormData()
        uploadFormData.append('file', file)
        uploadFormData.append('folder', 'properties')

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        })

        const data = await response.json()

        if (response.ok) {
          newPhotos.push({
            file,
            preview,
            uploaded: true,
            url: data.data.fileUrl,
          })
        } else {
          newPhotos.push({
            file,
            preview,
            uploaded: false,
          })
          toast({
            title: 'Error al subir',
            description: `No se pudo subir ${file.name}`,
            variant: 'destructive',
          })
        }
      } catch (error) {
        console.error('Error uploading file:', error)
      }
    }

    setPhotos(prev => [...prev, ...newPhotos])
    
    // Si es la primera foto, hacerla la principal
    if (photos.length === 0 && newPhotos.length > 0) {
      setMainPhotoIndex(0)
    }

    setUploading(false)
    
    // Limpiar input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      const newPhotos = prev.filter((_, i) => i !== index)
      // Ajustar índice de foto principal si es necesario
      if (mainPhotoIndex === index) {
        setMainPhotoIndex(newPhotos.length > 0 ? 0 : null)
      } else if (mainPhotoIndex !== null && mainPhotoIndex > index) {
        setMainPhotoIndex(mainPhotoIndex - 1)
      }
      return newPhotos
    })
  }

  const setAsMainPhoto = (index: number) => {
    setMainPhotoIndex(index)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.ownerId) {
      toast({
        title: 'Error',
        description: 'Debes seleccionar un propietario',
        variant: 'destructive',
      })
      return
    }

    if (!formData.adminId) {
      toast({
        title: 'Error',
        description: 'Debes seleccionar un administrador',
        variant: 'destructive',
      })
      return
    }

    // Verificar que todas las fotos estén subidas
    const pendingPhotos = photos.filter(p => !p.uploaded)
    if (pendingPhotos.length > 0) {
      toast({
        title: 'Error',
        description: 'Algunas fotos aún se están subiendo. Por favor espera.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)

    try {
      // Obtener URLs de las fotos
      const photoUrls = photos.filter(p => p.url).map(p => p.url!)
      const mainImage = mainPhotoIndex !== null && photos[mainPhotoIndex]?.url 
        ? photos[mainPhotoIndex].url 
        : photoUrls[0] || null
      const images = photoUrls.length > 0 ? JSON.stringify(photoUrls) : null

      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          totalArea: parseFloat(formData.totalArea) || 0,
          builtArea: parseFloat(formData.builtArea) || null,
          bedrooms: parseInt(formData.bedrooms) || 0,
          bathrooms: parseInt(formData.bathrooms) || 1,
          parkingSpaces: parseInt(formData.parkingSpaces) || 0,
          floorNumber: parseInt(formData.floorNumber) || null,
          monthlyRent: parseFloat(formData.monthlyRent) || 0,
          depositAmount: parseFloat(formData.depositAmount) || 0,
          mainImage,
          images,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Propiedad creada',
          description: 'La propiedad se ha registrado exitosamente.',
        })
        setDialogOpen(false)
        resetForm()
        fetchProperties()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'No se pudo crear la propiedad',
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

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      propertyType: 'APARTAMENTO',
      province: 'Panamá',
      district: '',
      corregimiento: '',
      neighborhood: '',
      address: '',
      buildingName: '',
      totalArea: '',
      builtArea: '',
      bedrooms: '0',
      bathrooms: '1',
      parkingSpaces: '1',
      floorNumber: '',
      fincaNumber: '',
      tomoNumber: '',
      folioNumber: '',
      asientoNumber: '',
      monthlyRent: '',
      depositAmount: '',
      ownerId: '',
      adminId: '',
      mainImage: '',
      images: '',
    })
    setPhotos([])
    setMainPhotoIndex(null)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DISPONIBLE':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Disponible</Badge>
      case 'OCUPADA':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Ocupada</Badge>
      case 'MANTENIMIENTO':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Mantenimiento</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getPropertyTypeLabel = (type: string) => {
    const found = propertyTypes.find(p => p.value === type)
    return found?.label || type
  }

  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <Header />
        
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Propiedades</h1>
                <p className="text-muted-foreground">Gestiona tu inventario de propiedades</p>
              </div>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Propiedad
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar propiedades..." className="pl-9" />
                  </div>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    Filtros
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Listado de Propiedades</CardTitle>
                <CardDescription>{properties.length} propiedades registradas</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : properties.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay propiedades registradas</p>
                    <p className="text-sm">Haz clic en "Nueva Propiedad" para agregar una</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                    <TableRow>
                      <TableHead>Propiedad</TableHead>
                      <TableHead className="hidden md:table-cell">Ubicación</TableHead>
                      <TableHead className="hidden lg:table-cell">Características</TableHead>
                      <TableHead>Alquiler</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {properties.map((property) => (
                      <TableRow key={property.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
                              {property.mainImage ? (
                                <img 
                                  src={property.mainImage} 
                                  alt={property.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Building2 className="h-5 w-5 text-primary" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{property.title}</p>
                              <p className="text-xs text-muted-foreground">{getPropertyTypeLabel(property.propertyType)}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {property.province}, {property.district}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {property.bedrooms > 0 && (
                              <span className="flex items-center gap-1">
                                <Bed className="h-3 w-3" /> {property.bedrooms}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Bath className="h-3 w-3" /> {property.bathrooms}
                            </span>
                            <span className="flex items-center gap-1">
                              <Car className="h-3 w-3" /> {property.parkingSpaces}
                            </span>
                            <span className="flex items-center gap-1">
                              <Ruler className="h-3 w-3" /> {property.totalArea}m²
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          ${property.monthlyRent.toLocaleString()}/mes
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(property.status)}
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
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Dialog para Nueva Propiedad */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Propiedad</DialogTitle>
            <DialogDescription>
              Registra una nueva propiedad en el sistema. Los campos con * son obligatorios.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información básica */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Información Básica</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Ej: Apartamento Vista Mar en Paitilla"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="propertyType">Tipo de Propiedad *</Label>
                  <Select value={formData.propertyType} onValueChange={(v) => setFormData({...formData, propertyType: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {propertyTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fincaNumber">Número de Finca *</Label>
                  <Input
                    id="fincaNumber"
                    value={formData.fincaNumber}
                    onChange={(e) => setFormData({...formData, fincaNumber: e.target.value})}
                    placeholder="Ej: 123456"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Ubicación */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Ubicación</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="province">Provincia *</Label>
                  <Select value={formData.province} onValueChange={(v) => setFormData({...formData, province: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar provincia" />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((prov) => (
                        <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district">Distrito *</Label>
                  <Input
                    id="district"
                    value={formData.district}
                    onChange={(e) => setFormData({...formData, district: e.target.value})}
                    placeholder="Ej: Panamá"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Barrio/Urbanización</Label>
                  <Input
                    id="neighborhood"
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({...formData, neighborhood: e.target.value})}
                    placeholder="Ej: Punta Paitilla"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Dirección Exacta *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Ej: Av. Balboa, Edificio Vista Mar, Apt 15-03"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Características */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Características</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalArea">Área Total (m²) *</Label>
                  <Input
                    id="totalArea"
                    type="number"
                    value={formData.totalArea}
                    onChange={(e) => setFormData({...formData, totalArea: e.target.value})}
                    placeholder="150"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bedrooms">Recámaras</Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({...formData, bedrooms: e.target.value})}
                    placeholder="3"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bathrooms">Baños *</Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    value={formData.bathrooms}
                    onChange={(e) => setFormData({...formData, bathrooms: e.target.value})}
                    placeholder="2"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parkingSpaces">Estacionamientos *</Label>
                  <Input
                    id="parkingSpaces"
                    type="number"
                    value={formData.parkingSpaces}
                    onChange={(e) => setFormData({...formData, parkingSpaces: e.target.value})}
                    placeholder="2"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Información Financiera */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Información Financiera</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthlyRent">Alquiler Mensual (USD) *</Label>
                  <Input
                    id="monthlyRent"
                    type="number"
                    value={formData.monthlyRent}
                    onChange={(e) => setFormData({...formData, monthlyRent: e.target.value})}
                    placeholder="2500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depositAmount">Depósito en Garantía (USD)</Label>
                  <Input
                    id="depositAmount"
                    type="number"
                    value={formData.depositAmount}
                    onChange={(e) => setFormData({...formData, depositAmount: e.target.value})}
                    placeholder="2500"
                  />
                </div>
              </div>
            </div>

            {/* Fotos */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Fotos de la Propiedad
              </h4>
              <div className="space-y-3">
                {/* Upload area */}
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {uploading ? 'Subiendo...' : 'Seleccionar Fotos'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Puedes seleccionar múltiples imágenes. JPG, PNG o WEBP. Máximo 10MB por imagen.
                  </p>
                </div>

                {/* Photo previews */}
                {photos.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {photos.map((photo, index) => (
                      <div 
                        key={index}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          mainPhotoIndex === index 
                            ? 'border-primary ring-2 ring-primary/20' 
                            : 'border-transparent hover:border-muted-foreground/30'
                        }`}
                      >
                        <img 
                          src={photo.preview} 
                          alt={`Foto ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Main photo badge */}
                        {mainPhotoIndex === index && (
                          <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                            Principal
                          </div>
                        )}
                        
                        {/* Uploading indicator */}
                        {!photo.uploaded && (
                          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          </div>
                        )}
                        
                        {/* Actions overlay */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          {mainPhotoIndex !== index && (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => setAsMainPhoto(index)}
                            >
                              <ImageIcon className="h-4 w-4 mr-1" />
                              Principal
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => removePhoto(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {photos.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {photos.length} foto{photos.length !== 1 ? 's' : ''} seleccionada{photos.length !== 1 ? 's' : ''}.
                    Haz clic en una foto para marcarla como principal.
                  </p>
                )}
              </div>
            </div>

            {/* Asignación de Usuarios */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Asignación de Usuarios</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ownerId">Propietario *</Label>
                  <Select value={formData.ownerId} onValueChange={(v) => setFormData({...formData, ownerId: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar propietario" />
                    </SelectTrigger>
                    <SelectContent>
                      {owners.map((owner) => (
                        <SelectItem key={owner.id} value={owner.id}>{owner.name} ({owner.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminId">Administrador *</Label>
                  <Select value={formData.adminId} onValueChange={(v) => setFormData({...formData, adminId: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar administrador" />
                    </SelectTrigger>
                    <SelectContent>
                      {admins.map((admin) => (
                        <SelectItem key={admin.id} value={admin.id}>{admin.name} ({admin.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {owners.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300">
                  <strong>Nota:</strong> Si no ves usuarios en las listas, primero debes crear usuarios con rol de Propietario y Administrador.
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || uploading}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar Propiedad
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
