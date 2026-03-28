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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FolderOpen, Plus, Search, Filter, MoreHorizontal, Eye, Download, FileText, Loader2, Trash2, Upload, X } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface Document {
  id: string
  title: string
  description: string | null
  documentType: string
  fileUrl: string
  fileName: string
  fileSize: number | null
  mimeType: string | null
  uploadedAt: string
  property: { id: string; title: string; address: string }
  uploader: { id: string; name: string; email: string }
}

interface Property {
  id: string
  title: string
  address: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

const documentTypes = [
  { value: 'CONTRATO_ARRENDAMIENTO', label: 'Contrato de Arrendamiento' },
  { value: 'CONTRATO_ADMINISTRACION', label: 'Contrato de Administración' },
  { value: 'FACTURA', label: 'Factura' },
  { value: 'RECIBO', label: 'Recibo' },
  { value: 'ESCRITURA', label: 'Escritura' },
  { value: 'INFORME', label: 'Informe' },
  { value: 'OTRO', label: 'Otro' },
]

export default function DocumentosPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [admins, setAdmins] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    documentType: 'CONTRATO_ARRENDAMIENTO',
    fileUrl: '',
    fileName: '',
    fileSize: '',
    propertyId: '',
    uploadedBy: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [documentsRes, propertiesRes, adminsRes] = await Promise.all([
        fetch('/api/documents'),
        fetch('/api/properties'),
        fetch('/api/users?role=ADMIN'),
      ])

      if (documentsRes.ok) {
        const data = await documentsRes.json()
        setDocuments(data.data || [])
      }
      if (propertiesRes.ok) {
        const data = await propertiesRes.json()
        setProperties(data.properties || data.data || [])
      }
      if (adminsRes.ok) {
        const data = await adminsRes.json()
        setAdmins(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('folder', 'documents')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      const data = await response.json()

      if (response.ok) {
        setFormData({
          ...formData,
          fileUrl: data.data.fileUrl,
          fileName: data.data.fileName,
          fileSize: String(data.data.fileSize),
        })
        toast({
          title: 'Archivo subido',
          description: 'El documento se ha subido exitosamente.',
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'No se pudo subir el archivo',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al subir el archivo',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.fileUrl || !formData.propertyId || !formData.uploadedBy) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos requeridos y sube un archivo',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          documentType: formData.documentType,
          fileUrl: formData.fileUrl,
          fileName: formData.fileName,
          fileSize: formData.fileSize ? parseInt(formData.fileSize) : null,
          mimeType: formData.fileUrl.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
          propertyId: formData.propertyId,
          uploadedBy: formData.uploadedBy,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Documento subido',
          description: 'El documento se ha registrado exitosamente.',
        })
        setDialogOpen(false)
        resetForm()
        fetchData()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'No se pudo subir el documento',
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
      documentType: 'CONTRATO_ARRENDAMIENTO',
      fileUrl: '',
      fileName: '',
      fileSize: '',
      propertyId: '',
      uploadedBy: '',
    })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getDocumentTypeLabel = (type: string) => {
    const found = documentTypes.find(d => d.value === type)
    return found?.label || type
  }

  const getFileIcon = (mimeType: string | null, fileName: string) => {
    if (mimeType?.startsWith('image/') || fileName?.match(/\.(jpg|jpeg|png|webp)$/i)) {
      return <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
        <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    }
    return <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
      <FileText className="h-5 w-5 text-red-500" />
    </div>
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
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Documentos</h1>
                <p className="text-muted-foreground">Gestión documental de propiedades</p>
              </div>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Subir Documento
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar documentos..." className="pl-9" />
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
                <CardTitle>Documentos</CardTitle>
                <CardDescription>{documents.length} documentos almacenados</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay documentos registrados</p>
                    <p className="text-sm">Haz clic en "Subir Documento" para agregar uno</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Documento</TableHead>
                        <TableHead className="hidden md:table-cell">Propiedad</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="hidden md:table-cell">Tamaño</TableHead>
                        <TableHead>Subido</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {getFileIcon(doc.mimeType, doc.fileName)}
                              <div>
                                <p className="font-medium truncate max-w-[200px]">{doc.title}</p>
                                <p className="text-xs text-muted-foreground">{doc.fileName}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            {doc.property?.title || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{getDocumentTypeLabel(doc.documentType)}</Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            {formatFileSize(doc.fileSize)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(doc.uploadedAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <a href={doc.fileUrl} download={doc.fileName}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Descargar
                                  </a>
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

      {/* Dialog para Subir Documento */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Subir Documento</DialogTitle>
            <DialogDescription>
              Sube un documento PDF o imagen para asociarlo a una propiedad.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Sección de archivo */}
            <div className="space-y-2">
              <Label>Archivo (PDF o Imagen) *</Label>
              <div className="border-2 border-dashed rounded-lg p-6">
                {formData.fileUrl ? (
                  <div className="flex items-center justify-between bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      {formData.fileName?.toLowerCase().endsWith('.pdf') ? (
                        <div className="h-12 w-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                          <FileText className="h-6 w-6 text-red-500" />
                        </div>
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{formData.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formData.fileSize ? formatFileSize(parseInt(formData.fileSize)) : 'Archivo listo'}
                        </p>
                      </div>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setFormData({...formData, fileUrl: '', fileName: '', fileSize: ''})}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="mb-4">
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Upload className="h-8 w-8 text-primary" />
                      </div>
                      <p className="font-medium">Arrastra y suelta tu archivo aquí</p>
                      <p className="text-sm text-muted-foreground mb-4">o</p>
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
                        {uploading ? 'Subiendo...' : 'Seleccionar Archivo'}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      PDF, JPG, PNG o WEBP. Máximo 10MB.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Título del Documento *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Ej: Contrato de Arrendamiento 2025"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="propertyId">Propiedad *</Label>
                <Select value={formData.propertyId} onValueChange={(v) => setFormData({...formData, propertyId: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar propiedad" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((prop) => (
                      <SelectItem key={prop.id} value={prop.id}>{prop.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="documentType">Tipo de Documento *</Label>
                <Select value={formData.documentType} onValueChange={(v) => setFormData({...formData, documentType: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="uploadedBy">Subido por *</Label>
                <Select value={formData.uploadedBy} onValueChange={(v) => setFormData({...formData, uploadedBy: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    {admins.map((admin) => (
                      <SelectItem key={admin.id} value={admin.id}>{admin.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <textarea
                id="description"
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Descripción del documento..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || uploading || !formData.fileUrl}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar Documento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
