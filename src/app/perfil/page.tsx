'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  User, Mail, Phone, Building, Loader2, FileText, Download, 
  Eye, Calendar, MapPin, User as UserIcon, File, FolderOpen 
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
  property: {
    title: string
    address: string
  }
  uploader: {
    name: string
    email: string
  }
}

// Document type labels
const documentTypeLabels: Record<string, string> = {
  CONTRATO_ADMINISTRACION: 'Contrato de Administración',
  CONTRATO_ARRENDAMIENTO: 'Contrato de Arrendamiento',
  FACTURA: 'Factura',
  RECIBO: 'Recibo',
  ESCRITURA: 'Escritura',
  INFORME: 'Informe',
  OTRO: 'Otro',
}

// Document type badge colors
const documentTypeColors: Record<string, string> = {
  CONTRATO_ADMINISTRACION: 'bg-blue-500',
  CONTRATO_ARRENDAMIENTO: 'bg-green-500',
  FACTURA: 'bg-yellow-500',
  RECIBO: 'bg-purple-500',
  ESCRITURA: 'bg-orange-500',
  INFORME: 'bg-cyan-500',
  OTRO: 'bg-gray-500',
}

export default function PerfilPage() {
  const { user, setUser } = useAppStore()
  const router = useRouter()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  })

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/login')
    } else {
      // Populate form with user data
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      })
      
      // Load documents if user is propietario
      if (user.role === 'propietario') {
        fetchDocuments(user.id)
      }
    }
  }, [user, router])

  // Fetch owner documents
  const fetchDocuments = async (ownerId: string) => {
    setDocumentsLoading(true)
    try {
      const response = await fetch(`/api/documents/owner?ownerId=${ownerId}`)
      const result = await response.json()
      
      if (result.success) {
        setDocuments(result.data || [])
      } else {
        console.error('Error fetching documents:', result.error)
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setDocumentsLoading(false)
    }
  }

  // Show loading while checking auth
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  // Get user initials for avatar
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Role labels
  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    inquilino: 'Inquilino',
    propietario: 'Propietario',
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({
      ...prev,
      [id]: value
    }))
  }

  const handleSave = async () => {
    setLoading(true)
    
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        // Update local store
        setUser({
          ...user,
          name: formData.name,
          phone: formData.phone,
        })
        
        toast({
          title: 'Perfil actualizado',
          description: 'Tus datos se han guardado correctamente.',
        })
      } else {
        toast({
          title: 'Error',
          description: result.error || 'No se pudo actualizar el perfil',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: 'Error',
        description: 'Error de conexión al actualizar el perfil',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    // Reset form to original user data
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
    })
  }

  // Format file size
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Fecha inválida'
      return date.toLocaleDateString('es-PA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return 'Fecha inválida'
    }
  }

  // Handle view document
  const handleViewDocument = (doc: Document) => {
    setSelectedDocument(doc)
    setViewDialogOpen(true)
  }

  // Handle download document
  const handleDownloadDocument = (doc: Document) => {
    window.open(doc.fileUrl, '_blank')
  }

  // Check if file is viewable (PDF or image)
  const isViewable = (mimeType: string | null) => {
    if (!mimeType) return false
    return mimeType.startsWith('image/') || mimeType === 'application/pdf'
  }

  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <Header />
        
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Mi Perfil</h1>
            
            <Card>
              <CardHeader>
                <CardTitle>Información Personal</CardTitle>
                <CardDescription>Actualiza tu información de perfil</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{roleLabels[user.role]}</p>
                    <p className="text-xs text-muted-foreground">Los administradores pueden cambiar tu foto</p>
                  </div>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre completo</Label>
                    <Input 
                      id="name" 
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Tu nombre"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={formData.email}
                      disabled 
                      className="bg-muted/50"
                    />
                    <p className="text-xs text-muted-foreground">El correo no puede ser modificado</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input 
                      id="phone" 
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+507 6XXX-XXXX"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={handleCancel} disabled={loading}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Guardar cambios
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Account Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Información de Cuenta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Rol</Label>
                    <p className="font-medium">{roleLabels[user.role]}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">ID de Usuario</Label>
                    <p className="font-mono text-sm text-muted-foreground">{user.id}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Documents Section - Only for Propietario */}
            {user.role === 'propietario' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FolderOpen className="h-5 w-5" />
                        Mis Documentos
                      </CardTitle>
                      <CardDescription>
                        Documentos asociados a tus propiedades
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">
                      {documents.length} documento{documents.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {documentsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No tienes documentos asociados a tus propiedades</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start gap-3 flex-1">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <File className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium truncate">{doc.title}</p>
                                <Badge className={`${documentTypeColors[doc.documentType]} text-white text-xs`}>
                                  {documentTypeLabels[doc.documentType] || doc.documentType}
                                </Badge>
                              </div>
                              {doc.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                  {doc.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {doc.property.title}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(doc.uploadedAt)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <UserIcon className="h-3 w-3" />
                                  {doc.uploader.name}
                                </span>
                                <span>{formatFileSize(doc.fileSize)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            {isViewable(doc.mimeType) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewDocument(doc)}
                                title="Ver documento"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownloadDocument(doc)}
                              title="Descargar documento"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* View Document Dialog */}
            <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>{selectedDocument?.title}</DialogTitle>
                  <DialogDescription>
                    {selectedDocument?.property.title} - {documentTypeLabels[selectedDocument?.documentType || '']}
                  </DialogDescription>
                </DialogHeader>
                <div className="overflow-auto max-h-[70vh]">
                  {selectedDocument?.mimeType === 'application/pdf' ? (
                    <iframe
                      src={selectedDocument.fileUrl}
                      className="w-full h-[60vh]"
                      title={selectedDocument.title}
                    />
                  ) : selectedDocument?.mimeType?.startsWith('image/') ? (
                    <img
                      src={selectedDocument.fileUrl}
                      alt={selectedDocument.title}
                      className="w-full h-auto"
                    />
                  ) : null}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                    Cerrar
                  </Button>
                  <Button onClick={() => selectedDocument && handleDownloadDocument(selectedDocument)}>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </main>
        
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  )
}
