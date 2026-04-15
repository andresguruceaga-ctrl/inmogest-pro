'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

// Types
interface User {
  id: string
  email: string
  name: string
  role: string
  active: boolean
}

interface Product {
  id: string
  code: string
  name: string
  description?: string
  category: string
  price: number
  cost: number
  stock: number
  minStock: number
  image?: string
  dimensions?: string
  unitsPerBox: number
  active: boolean
}

interface OrderItem {
  id: string
  productId: string
  product: Product
  quantity: number
  unitPrice: number
  subtotal: number
}

interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  customerAddress?: string
  sellerId: string
  seller?: { id: string; name: string; email: string }
  status: string
  subtotal: number
  tax: number
  discount: number
  total: number
  notes?: string
  createdAt: string
  items: OrderItem[]
}

interface Stats {
  totalProducts: number
  lowStockProducts: number
  totalInventoryValue: { value: number; items: number }
  categoryStats: { category: string; _count: { id: number }; _sum: { stock: number | null } }[]
  recentActivity: { id: string; action: string; details: string; createdAt: string }[]
  unreadNotifications: number
  totalUsers: number
  sellers: number
  totalOrders?: number
  pendingOrders?: number
}

interface CartItem {
  product: Product
  quantity: number
}

// Extended User interface for admin view
interface UserWithStats extends User {
  createdAt?: string
  _count?: {
    orders: number
  }
}

// Categories with labels
const categories: Record<string, string> = {
  'Escurridores': 'Escurridores',
  'Plateras': 'Plateras',
  'Organizadores': 'Organizadores',
  'Porta Champú': 'Porta Champú',
  'Conservadores': 'Conservadores',
  'Jarras Plásticas': 'Jarras Plásticas',
  'Coladores y Embudos': 'Coladores y Embudos',
  'Cestas y Accesorios': 'Cestas y Accesorios',
  'Poncheras': 'Poncheras',
  'Tobos y Pipotes': 'Tobos y Pipotes',
  'Salseros': 'Salseros',
  'Productos de Madera': 'Productos de Madera',
  'Moldes de Torta': 'Moldes de Torta',
  'Quesilleras': 'Quesilleras',
  'Bandejas para Hornear': 'Bandejas para Hornear',
  'Ollas y Sartenes': 'Ollas y Sartenes',
  'Utensilios de Cocina': 'Utensilios de Cocina',
  'Materos': 'Materos',
  'Rociadores': 'Rociadores',
  'Candados': 'Candados',
  'Cerraduras': 'Cerraduras',
  'Limpiadores': 'Limpiadores'
}

const categoryIcons: Record<string, string> = {
  'Escurridores': '🍽️',
  'Plateras': '📐',
  'Organizadores': '📦',
  'Porta Champú': '🧴',
  'Conservadores': '🥡',
  'Jarras Plásticas': '🫗',
  'Coladores y Embudos': '🔬',
  'Cestas y Accesorios': '🧺',
  'Poncheras': '🪣',
  'Tobos y Pipotes': '🪣',
  'Salseros': '🫙',
  'Productos de Madera': '🪵',
  'Moldes de Torta': '🎂',
  'Quesilleras': '🧀',
  'Bandejas para Hornear': '🍪',
  'Ollas y Sartenes': '🍳',
  'Utensilios de Cocina': '🥄',
  'Materos': '🪴',
  'Rociadores': '💧',
  'Candados': '🔒',
  'Cerraduras': '🔑',
  'Limpiadores': '🧹'
}

const orderStatusLabels: Record<string, string> = {
  'pending': 'Pendiente',
  'confirmed': 'Confirmado',
  'shipped': 'Enviado',
  'delivered': 'Entregado',
  'cancelled': 'Cancelado'
}

const orderStatusColors: Record<string, string> = {
  'pending': 'bg-amber-500/20 text-amber-500',
  'confirmed': 'bg-blue-500/20 text-blue-500',
  'shipped': 'bg-purple-500/20 text-purple-500',
  'delivered': 'bg-emerald-500/20 text-emerald-500',
  'cancelled': 'bg-red-500/20 text-red-500'
}

// Simple toast notification using alert
function showToast(title: string, description?: string, isError?: boolean) {
  if (typeof window !== 'undefined') {
    const message = description ? `${title}: ${description}` : title
    if (isError) {
      console.error(message)
    } else {
      console.log(message)
    }
    // Create a simple toast element
    const existingToast = document.getElementById('simple-toast')
    if (existingToast) {
      existingToast.remove()
    }
    
    const toast = document.createElement('div')
    toast.id = 'simple-toast'
    toast.className = `fixed top-4 right-4 z-[9999] px-6 py-4 rounded-lg shadow-xl transition-all transform translate-x-0 ${
      isError ? 'bg-red-500' : 'bg-emerald-500'
    } text-white font-medium`
    toast.innerHTML = `
      <div class="font-bold">${title}</div>
      ${description ? `<div class="text-sm opacity-90">${description}</div>` : ''}
    `
    document.body.appendChild(toast)
    
    setTimeout(() => {
      toast.style.opacity = '0'
      setTimeout(() => toast.remove(), 300)
    }, 3000)
  }
}

export default function Home() {
  // Auth state
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  // Data state
  const [products, setProducts] = useState<Product[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  
  // Product editing state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
  const [stockAdjustment, setStockAdjustment] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  
  // Order state
  const [cart, setCart] = useState<CartItem[]>([])
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false)
  const [orderCustomer, setOrderCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    discount: '0'
  })
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false)
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  
  // Users management state (admin only)
  const [users, setUsers] = useState<UserWithStats[]>([])
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserWithStats | null>(null)
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'vendedor'
  })

  // Mount effect
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch products
  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') params.append('category', selectedCategory)
      if (searchTerm) params.append('search', searchTerm)
      
      const res = await fetch(`/api/products?${params}`)
      const data = await res.json()
      if (data.products) {
        setProducts(data.products)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  // Fetch stats
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats')
      const data = await res.json()
      if (data) {
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  // Fetch orders
  const fetchOrders = async () => {
    if (!user) return
    try {
      const params = new URLSearchParams()
      if (user.role === 'vendedor') {
        params.append('sellerId', user.id)
      }
      
      const res = await fetch(`/api/orders?${params}`)
      const data = await res.json()
      if (data.orders) {
        setOrders(data.orders)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
  }
  
  // Fetch users (admin only)
  const fetchUsers = async () => {
    if (!user || user.role !== 'admin') return
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      if (data.users) {
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  // Auto refresh effect
  useEffect(() => {
    if (user && autoRefresh) {
      fetchProducts()
      fetchStats()
      fetchOrders()
      if (user.role === 'admin') {
        fetchUsers()
      }
      
      const interval = setInterval(() => {
        fetchProducts()
        fetchStats()
        fetchOrders()
        if (user?.role === 'admin') {
          fetchUsers()
        }
      }, 5000)
      
      return () => clearInterval(interval)
    }
  }, [user, selectedCategory, searchTerm, autoRefresh])

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      })
      
      const data = await res.json()
      
      if (res.ok && data.user) {
        setUser(data.user)
        showToast('¡Bienvenido!', `Hola ${data.user.name}`)
      } else {
        showToast('Error', data.error || 'Credenciales inválidas', true)
      }
    } catch (error) {
      console.error('Login error:', error)
      showToast('Error', 'Error de conexión', true)
    } finally {
      setLoading(false)
    }
  }

  // Logout handler
  const handleLogout = () => {
    setUser(null)
    setCart([])
    setLoginEmail('')
    setLoginPassword('')
    showToast('Sesión cerrada', 'Hasta pronto')
  }

  // Cart functions
  const addToCart = (product: Product, quantity: number = 1) => {
    if (product.stock < quantity) {
      showToast('Stock insuficiente', `Solo hay ${product.stock} unidades`, true)
      return
    }
    
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        const newQty = existing.quantity + quantity
        if (newQty > product.stock) {
          showToast('Stock insuficiente', `Solo hay ${product.stock} unidades`, true)
          return prev
        }
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: newQty }
            : item
        )
      }
      return [...prev, { product, quantity }]
    })
    
    showToast('Producto agregado', `${product.name} agregado al carrito`)
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId))
  }

  const updateCartQuantity = (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId)
    if (!product) return
    
    if (quantity > product.stock) {
      showToast('Stock insuficiente', `Solo hay ${product.stock} unidades`, true)
      return
    }
    
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }
    
    setCart(prev => prev.map(item =>
      item.product.id === productId ? { ...item, quantity } : item
    ))
  }

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
  }

  const getCartItemCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0)
  }

  // Create order
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cart.length === 0 || !user) return
    
    setLoading(true)
    
    try {
      const items = cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity
      }))
      
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          customerName: orderCustomer.name,
          customerEmail: orderCustomer.email || null,
          customerPhone: orderCustomer.phone || null,
          customerAddress: orderCustomer.address || null,
          notes: orderCustomer.notes || null,
          discount: parseFloat(orderCustomer.discount) || 0,
          sellerId: user.id
        })
      })
      
      const data = await res.json()
      
      if (res.ok && data.order) {
        showToast('¡Pedido creado!', `Pedido ${data.order.orderNumber}`)
        setCart([])
        setOrderCustomer({ name: '', email: '', phone: '', address: '', notes: '', discount: '0' })
        setIsOrderDialogOpen(false)
        fetchOrders()
        fetchProducts()
        fetchStats()
      } else {
        showToast('Error', data.error || 'No se pudo crear el pedido', true)
      }
    } catch (error) {
      console.error('Order error:', error)
      showToast('Error', 'Error al crear pedido', true)
    } finally {
      setLoading(false)
    }
  }

  // Update order status
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status })
      })
      
      if (res.ok) {
        showToast('Actualizado', 'El pedido ha sido actualizado')
        fetchOrders()
      }
    } catch (error) {
      showToast('Error', 'Error al actualizar', true)
    }
  }

  // Download order PDF
  const downloadOrderPdf = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/pdf?orderId=${orderId}`)
      if (!response.ok) throw new Error('Error generando PDF')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pedido-${orderId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
      
      showToast('PDF descargado', 'El archivo se ha descargado')
    } catch (error) {
      showToast('Error', 'Error al descargar PDF', true)
    }
  }

  // Image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      showToast('Error', 'Tipo de archivo no permitido. Use JPG, PNG, GIF o WebP', true)
      return
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Error', 'El archivo es demasiado grande. Máximo 5MB', true)
      return
    }
    
    setUploadingImage(true)
    
    try {
      // Create preview
      const reader = new FileReader()
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string)
      }
      reader.readAsDataURL(file)
      
      // Upload file
      const formData = new FormData()
      formData.append('file', file)
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      const data = await res.json()
      
      if (res.ok && data.url) {
        setEditingProduct(prev => prev ? { ...prev, image: data.url } : null)
        showToast('Imagen subida', 'La imagen se ha subido correctamente')
      } else {
        showToast('Error', data.error || 'Error al subir imagen', true)
      }
    } catch (error) {
      showToast('Error', 'Error al subir imagen', true)
    } finally {
      setUploadingImage(false)
    }
  }

  // Product CRUD
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct) return
    setLoading(true)
    
    try {
      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...editingProduct, 
          stockAdjustment: stockAdjustment || undefined,
          userId: user?.id 
        })
      })
      
      const data = await res.json()
      
      if (res.ok && data.product) {
        showToast('Actualizado', `Producto ${data.product.code} actualizado`)
        setEditingProduct(null)
        setStockAdjustment('')
        setImagePreview(null)
        setIsProductDialogOpen(false)
        fetchProducts()
        fetchStats()
      } else {
        showToast('Error', data.error || 'No se pudo actualizar', true)
      }
    } catch (error) {
      showToast('Error', 'Error al actualizar', true)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este producto?')) return
    
    try {
      const res = await fetch('/api/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      
      if (res.ok) {
        showToast('Eliminado', 'Producto eliminado')
        fetchProducts()
        fetchStats()
      }
    } catch (error) {
      showToast('Error', 'Error al eliminar', true)
    }
  }
  
  // User CRUD handlers
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      })
      
      const data = await res.json()
      
      if (res.ok && data.user) {
        showToast('Usuario creado', `${data.user.name} ha sido agregado`)
        setNewUser({ name: '', email: '', password: '', role: 'vendedor' })
        setIsUserDialogOpen(false)
        fetchUsers()
      } else {
        showToast('Error', data.error || 'No se pudo crear el usuario', true)
      }
    } catch (error) {
      showToast('Error', 'Error al crear usuario', true)
    } finally {
      setLoading(false)
    }
  }
  
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    setLoading(true)
    
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          name: editingUser.name,
          email: editingUser.email,
          active: editingUser.active
        })
      })
      
      const data = await res.json()
      
      if (res.ok && data.user) {
        showToast('Actualizado', `Usuario ${data.user.name} actualizado`)
        setEditingUser(null)
        setIsUserDialogOpen(false)
        fetchUsers()
      } else {
        showToast('Error', data.error || 'No se pudo actualizar', true)
      }
    } catch (error) {
      showToast('Error', 'Error al actualizar', true)
    } finally {
      setLoading(false)
    }
  }
  
  const handleDeleteUser = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este usuario?')) return
    
    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        showToast('Eliminado', data.message || 'Usuario eliminado')
        fetchUsers()
      } else {
        showToast('Error', data.error || 'No se pudo eliminar', true)
      }
    } catch (error) {
      showToast('Error', 'Error al eliminar', true)
    }
  }
  
  const handleToggleUserActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: !currentActive })
      })
      
      if (res.ok) {
        showToast('Actualizado', `Usuario ${!currentActive ? 'activado' : 'desactivado'}`)
        fetchUsers()
      }
    } catch (error) {
      showToast('Error', 'Error al actualizar', true)
    }
  }

  // Helper functions
  const getStockStatus = (stock: number, minStock: number) => {
    if (stock === 0) return { status: 'critical', color: 'text-red-500', bg: 'bg-red-500/10', label: 'Sin stock' }
    if (stock <= minStock) return { status: 'low', color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Stock bajo' }
    return { status: 'good', color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Disponible' }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Don't render until mounted (prevents hydration issues)
  if (!mounted) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  // Login screen
  if (!user) {
    return (
      <div className="min-h-screen gradient-bg bg-grid flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>
        </div>
        
        <Card className="w-full max-w-md glass-card glow relative z-10">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-xl shadow-blue-500/25">
              <span className="text-2xl font-bold text-white">A</span>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold gradient-text">Artilamplast</CardTitle>
              <CardDescription className="text-gray-400">Sistema de Gestión de Ventas</CardDescription>
            </div>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="bg-white/5 border-white/10 focus:border-blue-500 focus:ring-blue-500/20"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="bg-white/5 border-white/10 focus:border-blue-500 focus:ring-blue-500/20"
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full btn-primary text-white font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Iniciando sesión...
                  </div>
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>
            </form>
            
            <div className="mt-6 p-4 rounded-lg bg-white/5 border border-white/10">
              <p className="text-sm text-gray-400 text-center mb-3">Usuarios de prueba:</p>
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="flex justify-between text-gray-300">
                  <span>Admin:</span>
                  <span className="font-mono">admin@artilamplast.com / admin123</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Vendedor:</span>
                  <span className="font-mono">vendedor1@artilamplast.com / vendedor123</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main application
  return (
    <div className="min-h-screen gradient-bg bg-grid">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl" />
      </div>
      
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-lg font-bold text-white">A</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Artilamplast</h1>
              <p className="text-xs text-gray-400">Sistema de Gestión</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Cart indicator for sellers */}
            {user.role === 'vendedor' && cart.length > 0 && (
              <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="btn-primary relative">
                    Carrito
                    <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center p-0">
                      {getCartItemCount()}
                    </Badge>
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-card border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-white">Crear Pedido</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Revisa el carrito y completa los datos del cliente
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleCreateOrder} className="space-y-4 mt-4">
                    {/* Customer Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2">
                        <Label className="text-gray-300">Nombre del Cliente *</Label>
                        <Input
                          value={orderCustomer.name}
                          onChange={(e) => setOrderCustomer({...orderCustomer, name: e.target.value})}
                          placeholder="Nombre completo"
                          className="bg-white/5 border-white/10"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-300">Email</Label>
                        <Input
                          type="email"
                          value={orderCustomer.email}
                          onChange={(e) => setOrderCustomer({...orderCustomer, email: e.target.value})}
                          placeholder="correo@ejemplo.com"
                          className="bg-white/5 border-white/10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-300">Teléfono</Label>
                        <Input
                          value={orderCustomer.phone}
                          onChange={(e) => setOrderCustomer({...orderCustomer, phone: e.target.value})}
                          placeholder="809-555-1234"
                          className="bg-white/5 border-white/10"
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label className="text-gray-300">Dirección</Label>
                        <Input
                          value={orderCustomer.address}
                          onChange={(e) => setOrderCustomer({...orderCustomer, address: e.target.value})}
                          placeholder="Dirección de entrega"
                          className="bg-white/5 border-white/10"
                        />
                      </div>
                    </div>
                    
                    {/* Cart Items */}
                    <div className="border border-white/10 rounded-lg overflow-hidden">
                      <div className="bg-white/5 px-4 py-2 text-sm font-medium text-gray-300">
                        Productos ({cart.length})
                      </div>
                      <div className="divide-y divide-white/5">
                        {cart.map((item) => (
                          <div key={item.product.id} className="p-3 flex items-center gap-3">
                            <div className="flex-1">
                              <p className="text-sm text-white">{item.product.name}</p>
                              <p className="text-xs text-gray-400">{item.product.code}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0 border-white/10"
                                onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                              >-</Button>
                              <span className="w-8 text-center text-white">{item.quantity}</span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0 border-white/10"
                                onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                              >+</Button>
                            </div>
                            <div className="w-24 text-right">
                              <p className="text-sm text-white">{formatCurrency(item.product.price * item.quantity)}</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-300"
                              onClick={() => removeFromCart(item.product.id)}
                            >X</Button>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Discount and Totals */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-gray-300">Descuento (DOP)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={orderCustomer.discount}
                          onChange={(e) => setOrderCustomer({...orderCustomer, discount: e.target.value})}
                          placeholder="0.00"
                          className="bg-white/5 border-white/10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-300">Notas</Label>
                        <Input
                          value={orderCustomer.notes}
                          onChange={(e) => setOrderCustomer({...orderCustomer, notes: e.target.value})}
                          placeholder="Notas adicionales"
                          className="bg-white/5 border-white/10"
                        />
                      </div>
                    </div>
                    
                    <div className="bg-white/5 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-gray-300">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(getCartTotal())}</span>
                      </div>
                      {parseFloat(orderCustomer.discount) > 0 && (
                        <div className="flex justify-between text-red-400">
                          <span>Descuento:</span>
                          <span>-{formatCurrency(parseFloat(orderCustomer.discount))}</span>
                        </div>
                      )}
                      <Separator className="bg-white/10" />
                      <div className="flex justify-between text-lg font-bold text-white">
                        <span>Total:</span>
                        <span>{formatCurrency(getCartTotal() - parseFloat(orderCustomer.discount || '0'))}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsOrderDialogOpen(false)}
                        className="flex-1 border-white/10"
                      >Cancelar</Button>
                      <Button
                        type="submit"
                        className="flex-1 btn-primary"
                        disabled={loading || cart.length === 0 || !orderCustomer.name}
                      >{loading ? 'Creando...' : 'Crear Pedido'}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
            
            {/* User info */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-gray-400">
                  {user.role === 'admin' ? 'Administrador' : 'Vendedor'}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleLogout}
                className="text-gray-400 hover:text-white hover:bg-white/10"
              >Salir</Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 relative z-10">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="glass-card p-1 inline-flex w-auto min-w-full">
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 whitespace-nowrap">
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="products" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 whitespace-nowrap">
                Productos
              </TabsTrigger>
              <TabsTrigger value="orders" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 whitespace-nowrap">
                Pedidos
                {orders.filter(o => o.status === 'pending').length > 0 && (
                  <Badge className="ml-1 bg-amber-500 text-white text-xs">
                    {orders.filter(o => o.status === 'pending').length}
                  </Badge>
                )}
              </TabsTrigger>
              {user.role === 'admin' && (
                <TabsTrigger value="inventory" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 whitespace-nowrap">
                  Inventario
                </TabsTrigger>
              )}
              {user.role === 'admin' && (
                <TabsTrigger value="sellers" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 whitespace-nowrap">
                  Vendedores
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {stats ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="glass-card card-hover glow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-400">Productos</p>
                          <p className="text-2xl font-bold text-white">{stats.totalProducts || 0}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                          <span className="text-2xl">📦</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="glass-card card-hover">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-400">Valor Inventario</p>
                          <p className="text-xl font-bold text-white">{formatCurrency(stats.totalInventoryValue?.value || 0)}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                          <span className="text-2xl">💰</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="glass-card card-hover">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-400">Stock Bajo</p>
                          <p className="text-2xl font-bold text-amber-500">{stats.lowStockProducts || 0}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                          <span className="text-2xl">⚠️</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="glass-card card-hover">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-400">Pedidos</p>
                          <p className="text-2xl font-bold text-white">{orders.length || 0}</p>
                          {orders && orders.filter(o => o.status === 'pending').length > 0 && (
                            <p className="text-xs text-amber-400">{orders.filter(o => o.status === 'pending').length} pendientes</p>
                          )}
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                          <span className="text-2xl">🛒</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="text-white">Productos por Categoría</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {stats.categoryStats && stats.categoryStats.length > 0 ? (
                          stats.categoryStats.map((cat) => {
                            const total = stats.totalProducts || 1
                            const percentage = (cat._count.id / total) * 100
                            return (
                              <div key={cat.category} className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-300 flex items-center gap-2">
                                    {categoryIcons[cat.category]} {categories[cat.category] || cat.category}
                                  </span>
                                  <span className="text-white font-medium">{cat._count.id} productos</span>
                                </div>
                                <Progress value={percentage} className="h-2 bg-white/10" />
                              </div>
                            )
                          })
                        ) : (
                          <p className="text-sm text-gray-400 text-center py-4">Sin datos de categorías</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="text-white">Actividad Reciente</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-3">
                          {stats.recentActivity && stats.recentActivity.length > 0 ? (
                            stats.recentActivity.map((activity) => (
                              <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg bg-white/5">
                                <div className={`w-2 h-2 mt-2 rounded-full ${
                                  activity.action === 'CREATE' ? 'bg-emerald-500' :
                                  activity.action === 'UPDATE' ? 'bg-blue-500' :
                                  activity.action === 'DELETE' ? 'bg-red-500' :
                                  activity.action === 'STOCK_UPDATE' ? 'bg-amber-500' :
                                  activity.action === 'ORDER_CREATE' ? 'bg-purple-500' :
                                  'bg-gray-500'
                                }`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-300 truncate">
                                    {activity.action === 'CREATE' && 'Producto creado'}
                                    {activity.action === 'UPDATE' && 'Producto actualizado'}
                                    {activity.action === 'DELETE' && 'Producto eliminado'}
                                    {activity.action === 'STOCK_UPDATE' && 'Stock actualizado'}
                                    {activity.action === 'PRICE_UPDATE' && 'Precio actualizado'}
                                    {activity.action === 'ORDER_CREATE' && 'Nuevo pedido'}
                                  </p>
                                  <p className="text-xs text-gray-500">{formatDate(activity.createdAt)}</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-400 text-center py-4">Sin actividad reciente</p>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Cargando estadísticas...</p>
              </div>
            )}
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="glass-card border-white/10 focus:border-blue-500"
                />
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-48 glass-card border-white/10">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent className="glass-card border-white/10">
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {Object.entries(categories).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {categoryIcons[key]} {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-2 px-4 py-2 glass-card rounded-lg">
                <Switch
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
                <span className="text-sm text-gray-300">Auto-actualizar</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product) => {
                const stockStatus = getStockStatus(product.stock, product.minStock)
                return (
                  <Card key={product.id} className="glass-card card-hover overflow-hidden group">
                    <div className="relative aspect-square bg-gradient-to-br from-white/5 to-white/10">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-6xl opacity-50">{categoryIcons[product.category]}</span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 flex flex-col gap-1">
                        <Badge variant="secondary" className="bg-black/50 backdrop-blur-sm text-xs">
                          {product.code}
                        </Badge>
                        <Badge className={`text-xs ${stockStatus.bg} ${stockStatus.color}`}>
                          {stockStatus.label}
                        </Badge>
                      </div>
                    </div>
                    
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <h3 className="font-medium text-white text-sm leading-tight line-clamp-2">
                          {product.name}
                        </h3>
                        
                        {product.dimensions && (
                          <p className="text-xs text-gray-400">{product.dimensions}</p>
                        )}
                        
                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                          <div>
                            <p className="text-lg font-bold text-white">{formatCurrency(product.price)}</p>
                            {user.role === 'admin' && (
                              <p className="text-xs text-gray-400">Costo: {formatCurrency(product.cost)}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${stockStatus.color}`}>{product.stock}</p>
                            <p className="text-xs text-gray-400">unidades</p>
                          </div>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex gap-2 pt-2">
                          {user.role === 'vendedor' && product.stock > 0 && (
                            <Button
                              className="flex-1 btn-primary"
                              size="sm"
                              onClick={() => addToCart(product)}
                            >+ Agregar</Button>
                          )}
                          {user.role === 'admin' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 border-white/10 hover:bg-white/10"
                                onClick={() => {
                                  setEditingProduct(product)
                                  setStockAdjustment('')
                                  setImagePreview(null)
                                  setIsProductDialogOpen(true)
                                }}
                              >Editar</Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                                onClick={() => handleDeleteProduct(product.id)}
                              >X</Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {products.length === 0 && (
              <div className="text-center py-12">
                <span className="text-6xl">📦</span>
                <p className="text-gray-400 mt-4">No se encontraron productos</p>
              </div>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {user.role === 'admin' ? 'Todos los Pedidos' : 'Mis Pedidos'}
              </h2>
              <Badge variant="secondary" className="bg-white/10">
                {orders.length} pedidos
              </Badge>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-6xl">🛒</span>
                <p className="text-gray-400 mt-4">No hay pedidos registrados</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {orders.map((order) => (
                  <Card key={order.id} className="glass-card">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <span className="text-xl">📄</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-white">{order.orderNumber}</h3>
                              <Badge className={orderStatusColors[order.status]}>
                                {orderStatusLabels[order.status]}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-400">{order.customerName}</p>
                            <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                            {order.seller && user.role === 'admin' && (
                              <p className="text-xs text-blue-400 mt-1">Vendedor: {order.seller.name}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col md:items-end gap-2">
                          <p className="text-xl font-bold text-white">{formatCurrency(order.total)}</p>
                          <p className="text-xs text-gray-400">{order.items.length} productos</p>
                          
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-white/10"
                              onClick={() => {
                                setSelectedOrder(order)
                                setIsOrderDetailOpen(true)
                              }}
                            >Ver Detalles</Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-blue-500/30 text-blue-400"
                              onClick={() => downloadOrderPdf(order.id)}
                            >PDF</Button>
                            {user.role === 'admin' && order.status === 'pending' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-emerald-500/30 text-emerald-400"
                                  onClick={() => handleUpdateOrderStatus(order.id, 'confirmed')}
                                >Confirmar</Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-red-500/30 text-red-400"
                                  onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                                >Cancelar</Button>
                              </>
                            )}
                            {user.role === 'admin' && order.status === 'confirmed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-purple-500/30 text-purple-400"
                                onClick={() => handleUpdateOrderStatus(order.id, 'shipped')}
                              >Enviar</Button>
                            )}
                            {user.role === 'admin' && order.status === 'shipped' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-emerald-500/30 text-emerald-400"
                                onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                              >Entregado</Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Inventory Tab (Admin only) */}
          {user.role === 'admin' && (
            <TabsContent value="inventory" className="space-y-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-white">Gestión de Inventario</CardTitle>
                  <CardDescription className="text-gray-400">
                    Actualiza el stock y precios de los productos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-[#181820]">
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Producto</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Código</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Precio</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Costo</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Stock</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Estado</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((product) => {
                          const stockStatus = getStockStatus(product.stock, product.minStock)
                          return (
                            <tr key={product.id} className="border-b border-white/5 hover:bg-white/5">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">
                                    {product.image ? (
                                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <span>{categoryIcons[product.category]}</span>
                                    )}
                                  </div>
                                  <span className="text-sm text-white truncate max-w-[200px]">{product.name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <Badge variant="secondary" className="bg-white/10">{product.code}</Badge>
                              </td>
                              <td className="py-3 px-4 text-right text-white font-medium">{formatCurrency(product.price)}</td>
                              <td className="py-3 px-4 text-right text-gray-400">{formatCurrency(product.cost)}</td>
                              <td className="py-3 px-4 text-center">
                                <span className={`font-bold ${stockStatus.color}`}>{product.stock}</span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <Badge className={`${stockStatus.bg} ${stockStatus.color}`}>
                                  {stockStatus.label}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="hover:bg-white/10"
                                  onClick={() => {
                                    setEditingProduct(product)
                                    setStockAdjustment('')
                                    setImagePreview(null)
                                    setIsProductDialogOpen(true)
                                  }}
                                >Editar</Button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          )}
          
          {/* Sellers Tab (Admin only) */}
          {user.role === 'admin' && (
            <TabsContent value="sellers" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Gestión de Vendedores</h2>
                <Dialog open={isUserDialogOpen && !editingUser} onOpenChange={(open) => { setIsUserDialogOpen(open); if (!open) setNewUser({ name: '', email: '', password: '', role: 'vendedor' }) }}>
                  <DialogTrigger asChild>
                    <Button className="btn-primary">
                      + Nuevo Vendedor
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glass-card border-white/10 max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-white">Nuevo Vendedor</DialogTitle>
                      <DialogDescription className="text-gray-400">
                        Crea un nuevo usuario vendedor
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateUser} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label className="text-gray-300">Nombre completo *</Label>
                        <Input
                          value={newUser.name}
                          onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                          placeholder="Nombre del vendedor"
                          className="bg-white/5 border-white/10"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-300">Correo electrónico *</Label>
                        <Input
                          type="email"
                          value={newUser.email}
                          onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                          placeholder="correo@ejemplo.com"
                          className="bg-white/5 border-white/10"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-300">Contraseña *</Label>
                        <Input
                          type="password"
                          value={newUser.password}
                          onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                          placeholder="••••••••"
                          className="bg-white/5 border-white/10"
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => { setIsUserDialogOpen(false); setNewUser({ name: '', email: '', password: '', role: 'vendedor' }) }} className="flex-1 border-white/10">
                          Cancelar
                        </Button>
                        <Button type="submit" className="flex-1 btn-primary" disabled={loading}>
                          {loading ? 'Creando...' : 'Crear Vendedor'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-white">Vendedores Registrados</CardTitle>
                  <CardDescription className="text-gray-400">
                    Administra los usuarios vendedores del sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {users.length === 0 ? (
                    <div className="text-center py-12">
                      <span className="text-6xl">👥</span>
                      <p className="text-gray-400 mt-4">No hay vendedores registrados</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {users.filter(u => u.role === 'vendedor').map((seller) => (
                        <div key={seller.id} className={`p-4 rounded-lg border ${seller.active ? 'border-white/10 bg-white/5' : 'border-red-500/20 bg-red-500/5'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${seller.active ? 'bg-blue-500/20' : 'bg-gray-500/20'}`}>
                                <span className="text-2xl">👤</span>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-white">{seller.name}</h3>
                                  {!seller.active && (
                                    <Badge className="bg-red-500/20 text-red-400">Inactivo</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-400">{seller.email}</p>
                                <div className="flex items-center gap-4 mt-1">
                                  <span className="text-xs text-gray-500">
                                    Creado: {seller.createdAt ? formatDate(seller.createdAt) : 'N/A'}
                                  </span>
                                  {seller._count && (
                                    <span className="text-xs text-blue-400">
                                      {seller._count.orders} pedidos
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-white/10"
                                onClick={() => {
                                  setEditingUser(seller)
                                  setIsUserDialogOpen(true)
                                }}
                              >Editar</Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className={seller.active ? 'border-amber-500/30 text-amber-400' : 'border-emerald-500/30 text-emerald-400'}
                                onClick={() => handleToggleUserActive(seller.id, seller.active)}
                              >
                                {seller.active ? 'Desactivar' : 'Activar'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-red-500/30 text-red-400"
                                onClick={() => handleDeleteUser(seller.id)}
                              >Eliminar</Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Admin users section */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-white">Administradores</CardTitle>
                  <CardDescription className="text-gray-400">
                    Usuarios con acceso de administrador
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {users.filter(u => u.role === 'admin').map((admin) => (
                      <div key={admin.id} className="p-4 rounded-lg border border-purple-500/20 bg-purple-500/5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                            <span className="text-2xl">👑</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-white">{admin.name}</h3>
                              <Badge className="bg-purple-500/20 text-purple-400">Admin</Badge>
                              {!admin.active && (
                                <Badge className="bg-red-500/20 text-red-400">Inactivo</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-400">{admin.email}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Edit Product Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="glass-card border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Producto</DialogTitle>
            <DialogDescription className="text-gray-400">
              Modifica los datos del producto
            </DialogDescription>
          </DialogHeader>
          {editingProduct && (
            <form onSubmit={handleUpdateProduct} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Código</Label>
                  <Input
                    value={editingProduct.code}
                    onChange={(e) => setEditingProduct({...editingProduct, code: e.target.value.toUpperCase()})}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Categoría</Label>
                  <Select value={editingProduct.category} onValueChange={(v) => setEditingProduct({...editingProduct, category: v})}>
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card">
                      {Object.entries(categories).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-gray-300">Nombre</Label>
                <Input
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                  className="bg-white/5 border-white/10"
                />
              </div>
              
              {/* Image Upload Section */}
              <div className="space-y-2">
                <Label className="text-gray-300">Imagen del Producto</Label>
                <div className="flex items-start gap-4">
                  <div className="relative w-24 h-24 rounded-lg border border-white/10 overflow-hidden bg-white/5 flex items-center justify-center flex-shrink-0">
                    {imagePreview || editingProduct.image ? (
                      <img 
                        src={imagePreview || editingProduct.image} 
                        alt={editingProduct.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl">{categoryIcons[editingProduct.category]}</span>
                    )}
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="bg-white/5 border-white/10 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-500/20 file:text-blue-400 hover:file:bg-blue-500/30"
                    />
                    <p className="text-xs text-gray-500">
                      Formatos: JPG, PNG, GIF, WebP. Máximo 5MB
                    </p>
                    {editingProduct.image && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        onClick={() => {
                          setEditingProduct({...editingProduct, image: undefined})
                          setImagePreview(null)
                        }}
                      >
                        Quitar imagen
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Precio de Venta (DOP)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Costo (DOP)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingProduct.cost}
                    onChange={(e) => setEditingProduct({...editingProduct, cost: parseFloat(e.target.value)})}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-gray-300">Ajustar Stock (agregar/restar)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={stockAdjustment}
                    onChange={(e) => setStockAdjustment(e.target.value)}
                    placeholder="Ej: 10 o -5"
                    className="bg-white/5 border-white/10 flex-1"
                  />
                  <div className="flex items-center gap-1 text-sm text-gray-400 px-3 glass-card rounded-lg">
                    <span>Actual:</span>
                    <span className={`font-bold ${getStockStatus(editingProduct.stock, editingProduct.minStock).color}`}>
                      {editingProduct.stock}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Stock Mínimo</Label>
                  <Input
                    type="number"
                    value={editingProduct.minStock}
                    onChange={(e) => setEditingProduct({...editingProduct, minStock: parseInt(e.target.value)})}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Und/Bulto</Label>
                  <Input
                    type="number"
                    value={editingProduct.unitsPerBox}
                    onChange={(e) => setEditingProduct({...editingProduct, unitsPerBox: parseInt(e.target.value)})}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsProductDialogOpen(false)} className="flex-1 border-white/10">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 btn-primary" disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Order Detail Dialog */}
      <Dialog open={isOrderDetailOpen} onOpenChange={setIsOrderDetailOpen}>
        <DialogContent className="glass-card border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedOrder?.orderNumber}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Detalles del pedido
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-400">Cliente</Label>
                  <p className="text-white">{selectedOrder.customerName}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-400">Estado</Label>
                  <Badge className={orderStatusColors[selectedOrder.status]}>
                    {orderStatusLabels[selectedOrder.status]}
                  </Badge>
                </div>
                {selectedOrder.customerEmail && (
                  <div className="space-y-2">
                    <Label className="text-gray-400">Email</Label>
                    <p className="text-white">{selectedOrder.customerEmail}</p>
                  </div>
                )}
                {selectedOrder.customerPhone && (
                  <div className="space-y-2">
                    <Label className="text-gray-400">Teléfono</Label>
                    <p className="text-white">{selectedOrder.customerPhone}</p>
                  </div>
                )}
                {selectedOrder.seller && (
                  <div className="space-y-2">
                    <Label className="text-gray-400">Vendedor</Label>
                    <p className="text-white">{selectedOrder.seller.name}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-gray-400">Fecha</Label>
                  <p className="text-white">{formatDate(selectedOrder.createdAt)}</p>
                </div>
              </div>
              
              {selectedOrder.customerAddress && (
                <div className="space-y-2">
                  <Label className="text-gray-400">Dirección</Label>
                  <p className="text-white">{selectedOrder.customerAddress}</p>
                </div>
              )}
              
              <div className="border border-white/10 rounded-lg overflow-hidden">
                <div className="bg-white/5 px-4 py-2 text-sm font-medium text-gray-300">
                  Productos
                </div>
                <div className="divide-y divide-white/5">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="p-3 flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-sm text-white">{item.product.name}</p>
                        <p className="text-xs text-gray-400">{item.product.code}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-white">x{item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-white">{formatCurrency(item.subtotal)}</p>
                        <p className="text-xs text-gray-400">{formatCurrency(item.unitPrice)} c/u</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-gray-300">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-red-400">
                    <span>Descuento:</span>
                    <span>-{formatCurrency(selectedOrder.discount)}</span>
                  </div>
                )}
                <Separator className="bg-white/10" />
                <div className="flex justify-between text-lg font-bold text-white">
                  <span>Total:</span>
                  <span>{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>
              
              {selectedOrder.notes && (
                <div className="space-y-2">
                  <Label className="text-gray-400">Notas</Label>
                  <p className="text-white bg-white/5 p-3 rounded-lg">{selectedOrder.notes}</p>
                </div>
              )}
              
              <Button
                className="w-full btn-primary"
                onClick={() => downloadOrderPdf(selectedOrder.id)}
              >Descargar PDF</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Edit User Dialog */}
      <Dialog open={isUserDialogOpen && !!editingUser} onOpenChange={(open) => { setIsUserDialogOpen(open); if (!open) setEditingUser(null) }}>
        <DialogContent className="glass-card border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Vendedor</DialogTitle>
            <DialogDescription className="text-gray-400">
              Modifica los datos del usuario
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={handleUpdateUser} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Nombre completo</Label>
                <Input
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Correo electrónico</Label>
                <Input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <div>
                  <p className="text-sm text-white">Estado</p>
                  <p className="text-xs text-gray-400">{editingUser.active ? 'Usuario activo' : 'Usuario inactivo'}</p>
                </div>
                <Switch
                  checked={editingUser.active}
                  onCheckedChange={(checked) => setEditingUser({...editingUser, active: checked})}
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => { setIsUserDialogOpen(false); setEditingUser(null) }} className="flex-1 border-white/10">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 btn-primary" disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
