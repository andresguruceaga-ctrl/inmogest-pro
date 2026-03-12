'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Building, Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAppStore } from '@/lib/store'

// Demo users
const DEMO_USERS = [
  { id: '1', name: 'Carlos Mendoza', email: 'admin@inmogest.pa', password: 'demo123', role: 'admin' as const, phone: '+507 6123-4567' },
  { id: '2', name: 'Pedro González', email: 'inquilino@inmogest.pa', password: 'demo123', role: 'inquilino' as const, phone: '+507 6666-4444' },
  { id: '3', name: 'Juan Pérez', email: 'propietario@inmogest.pa', password: 'demo123', role: 'propietario' as const, phone: '+507 6666-2222' },
]

export default function LoginPage() {
  const router = useRouter()
  const { setUser } = useAppStore()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Simular delay de autenticación
    await new Promise(resolve => setTimeout(resolve, 500))

    const user = DEMO_USERS.find(u => u.email === email && u.password === password)
    
    if (user) {
      setUser({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      })
      router.push('/')
    } else {
      setError('Credenciales incorrectas. Usa los usuarios demo.')
    }
    
    setLoading(false)
  }

  const handleDemoLogin = (user: typeof DEMO_USERS[0]) => {
    setUser({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
    })
    router.push('/')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
          <Building className="h-6 w-6 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-bold tracking-tight text-white">InmoGest</span>
          <span className="text-sm text-white/60 -mt-1">Pro</span>
        </div>
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-md bg-white/95 backdrop-blur shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
          <CardDescription>
            Ingresa a tu cuenta para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-9 pr-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Iniciando sesión...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Iniciar Sesión
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-muted-foreground text-center mb-4">
              Usuarios de demostración
            </p>
            <div className="space-y-2">
              {DEMO_USERS.map((user) => (
                <Button
                  key={user.id}
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => handleDemoLogin(user)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${
                      user.role === 'admin' ? 'bg-purple-500' :
                      user.role === 'inquilino' ? 'bg-emerald-500' : 'bg-blue-500'
                    }`} />
                    <span className="text-sm">{user.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground capitalize">
                    {user.role === 'admin' ? 'Administrador' : 
                     user.role === 'inquilino' ? 'Inquilino' : 'Propietario'}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="mt-8 text-sm text-white/40 text-center">
        © 2025 InmoGest Pro. Plataforma de administración inmobiliaria para Panamá.
      </p>
      
      <p className="mt-2 text-xs text-white/30">
        Contraseña demo: demo123
      </p>
    </div>
  )
}
