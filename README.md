# 🏠 InmoGest Pro

Plataforma de Administración de Propiedades para el mercado de **Panamá**. Gestión completa de propiedades, contratos, inquilinos, pagos y reportes financieros con cálculo automático de ITBMS (7%).

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Ready-blue?style=flat-square&logo=postgresql)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## ✨ Características

### 🔐 Roles de Usuario
- **Administrador**: Control total del sistema, gestión de propiedades, usuarios y reportes
- **Propietario**: Seguimiento de sus propiedades, ingresos y gastos
- **Inquilino**: Información de arrendamiento, pagos y soporte

### 📊 Funcionalidades Principales
- 🏢 **Gestión de Propiedades**: Registro completo con datos legales de Panamá (Finca, Tomo, Folio)
- 📄 **Contratos**: Administración y arrendamiento con generación automática de documentos
- 💰 **Pagos**: Seguimiento de pagos con cálculo automático de ITBMS (7%)
- 📈 **Reportes Financieros**: Balance de ingresos, gastos y utilidades por propiedad
- 🎫 **Tickets de Soporte**: Sistema de soporte integrado con prioridades
- 📁 **Documentos**: Almacenamiento y gestión de contratos, facturas y escrituras

### 🇵🇦 Adaptado para Panamá
- Cálculo automático de **ITBMS (7%)**
- Campos legales: Número de Finca, Tomo, Folio, Asiento
- Ubicación: Provincia, Distrito, Corregimiento
- Moneda: **USD (Balboas)**

## 🛠️ Stack Tecnológico

| Tecnología | Uso |
|------------|-----|
| **Next.js 16** | Framework React con App Router |
| **TypeScript 5** | Tipado estático |
| **Tailwind CSS 4** | Estilos utilitarios |
| **shadcn/ui** | Componentes UI |
| **Prisma** | ORM para base de datos |
| **NextAuth.js** | Autenticación |
| **Zustand** | Estado global |
| **Recharts** | Gráficos |

## 📦 Instalación

### Requisitos
- Node.js 18+ o Bun
- PostgreSQL (producción) o SQLite (desarrollo)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/inmogest-pro.git
cd inmogest-pro

# 2. Instalar dependencias
bun install

# 3. Configurar variables de entorno
cp .env.example .env
# Edita .env con tus configuraciones

# 4. Configurar base de datos
bun run db:push

# 5. Iniciar servidor de desarrollo
bun run dev
```

## 🗄️ Configuración de Base de Datos

### Desarrollo Local (SQLite)

```env
# .env
DATABASE_URL="file:./dev.db"
DIRECT_URL="file:./dev.db"
```

### Producción (PostgreSQL)

#### Opción 1: Supabase (Recomendado)

1. Crea una cuenta en [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Ve a **Settings > Database** y copia la connection string

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

#### Opción 2: Railway

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST].railway.app:[PORT]/railway"
DIRECT_URL="postgresql://postgres:[PASSWORD]@[HOST].railway.app:[PORT]/railway"
```

#### Opción 3: Neon

```env
DATABASE_URL="postgresql://[USER]:[PASSWORD]@[HOST].neon.tech/[DB]?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://[USER]:[PASSWORD]@[HOST].neon.tech/[DB]?sslmode=require"
```

#### Opción 4: Docker (Local)

```bash
docker run --name inmogest-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=inmogest \
  -p 5432:5432 \
  -d postgres
```

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/inmogest"
DIRECT_URL="postgresql://postgres:password@localhost:5432/inmogest"
```

## 📜 Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `bun run dev` | Servidor de desarrollo |
| `bun run build` | Build de producción |
| `bun run start` | Servidor de producción |
| `bun run lint` | Verificar código con ESLint |
| `bun run db:push` | Sincronizar schema con DB |
| `bun run db:generate` | Generar cliente Prisma |
| `bun run db:migrate` | Crear migración |
| `bun run db:studio` | Abrir Prisma Studio |
| `bun run db:reset` | Reiniciar base de datos |

## 👥 Usuarios Demo

El sistema incluye usuarios de prueba:

| Rol | Email | Contraseña |
|-----|-------|------------|
| Administrador | admin@inmogest.pa | demo123 |
| Inquilino | juan.perez@email.com | demo123 |
| Propietario | pedro.gonzalez@email.com | demo123 |

Para crear los usuarios demo, visita: `http://localhost:3000/api/seed`

## 📁 Estructura del Proyecto

```
src/
├── app/                    # Páginas (App Router)
│   ├── api/               # API Routes
│   ├── propiedades/       # Gestión de propiedades
│   ├── contratos/         # Gestión de contratos
│   ├── gastos/            # Control de gastos
│   ├── pagos/             # Seguimiento de pagos
│   ├── documentos/        # Gestión documental
│   ├── soporte/           # Tickets de soporte
│   ├── reportes/          # Reportes y analytics
│   └── ...
├── components/
│   ├── ui/                # Componentes shadcn/ui
│   ├── layout/            # Layout (Sidebar, Header, Footer)
│   ├── dashboards/        # Dashboards por rol
│   └── auth/              # Componentes de autenticación
├── lib/
│   ├── db.ts              # Cliente Prisma
│   ├── auth.ts            # Configuración NextAuth
│   └── store.ts           # Estado global (Zustand)
└── types/                 # Tipos TypeScript
```

## 🚀 Despliegue

### Vercel (Recomendado)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/tu-usuario/inmogest-pro)

1. Conecta tu repositorio de GitHub
2. Configura las variables de entorno
3. ¡Despliega!

### Docker

```dockerfile
# Dockerfile incluido en el proyecto
docker build -t inmogest-pro .
docker run -p 3000:3000 inmogest-pro
```

## 📊 Modelo de Datos

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    User     │────<│  Property   │>────│  Contract   │
└─────────────┘     └─────────────┘     └─────────────┘
                          │                    │
                          ▼                    ▼
                    ┌─────────────┐     ┌─────────────┐
                    │   Expense   │     │   Payment   │
                    └─────────────┘     └─────────────┘
                          │
                          ▼
                    ┌─────────────┐
                    │ Financial   │
                    │   Report    │
                    └─────────────┘
```

## 🤝 Contribuir

1. Fork del repositorio
2. Crear rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'Agrega nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

---

Desarrollado con ❤️ para el mercado inmobiliario de **Panamá** 🇵🇦
