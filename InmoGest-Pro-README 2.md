# 🏢 InmoGest Pro - Sistema de Gestión Inmobiliaria

Sistema completo de gestión inmobiliaria desarrollado con **Next.js 15**, **TypeScript**, **Tailwind CSS** y **shadcn/ui**. Incluye gestión de propiedades, contratos, propietarios, inquilinos, facturación y reportes financieros.

![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC)
![License](https://img.shields.io/badge/License-MIT-green)

## 📋 Características Principales

### Gestión de Propiedades
- Registro completo de propiedades con fotos
- Estados: Disponible, Alquilado, Mantenimiento
- Tipos: Apartamento, Casa, Oficina, Local Comercial, Nave Industrial
- Características y Amenidades

### Gestión de Usuarios
- **Administrador**: Acceso completo al sistema
- **Propietario**: Vista de sus propiedades y reportes financieros
- **Inquilino**: Solicitud de servicios y vista de contrato

### Módulo Financiero
- Registro de proveedores
- Gestión de facturas con IVA
- Costos fijos por propiedad
- Cálculo automático: **Canon - Costos Fijos - Gastos Proveedores = Resultado**
- Reportes mensuales para propietarios

### Solicitudes de Servicio
- Sistema de tickets para incidencias
- Prioridades y categorías
- Fotos de averías
- Seguimiento de estado

## 🚀 Instalación

### Prerrequisitos
- Node.js 18+ o Bun
- npm, yarn, pnpm o bun

### Pasos de Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/tu-usuario/inmogest-pro.git
cd inmogest-pro
```

2. **Instalar dependencias**
```bash
npm install
# o
bun install
```

3. **Ejecutar en modo desarrollo**
```bash
npm run dev
# o
bun run dev
```

4. **Abrir en el navegador**
```
http://localhost:3000
```

## 🔐 Credenciales de Demo

### Administrador
- **Usuario:** `admin`
- **Contraseña:** `admin123`

### Propietarios
- **Usuario:** `maria.rodriguez`
- **Contraseña:** `maria2024`

- **Usuario:** `antonio.fernandez`
- **Contraseña:** `antonio2024`

### Inquilinos
- **Usuario:** `juan.martinez`
- **Contraseña:** `juan2024`

- **Usuario:** `laura.sanchez`
- **Contraseña:** `laura2024`

## 📁 Estructura del Proyecto

```
inmogest-pro/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Página principal
│   │   ├── layout.tsx        # Layout principal
│   │   ├── globals.css       # Estilos globales
│   │   └── api/              # API Routes
│   ├── components/
│   │   ├── ui/               # Componentes shadcn/ui
│   │   ├── suppliers-section.tsx
│   │   ├── invoices-section.tsx
│   │   ├── fixed-costs-section.tsx
│   │   ├── owner-reports-section.tsx
│   │   ├── owners-section.tsx
│   │   └── tenants-section.tsx
│   ├── lib/
│   │   ├── mock-data.ts      # Datos de demostración
│   │   └── utils.ts          # Utilidades
│   ├── store/
│   │   ├── app-store.ts      # Estado global (Zustand)
│   │   └── auth-store.ts     # Autenticación
│   ├── hooks/
│   │   └── use-toast.ts      # Notificaciones
│   └── types/
│       └── index.ts          # Tipos TypeScript
├── public/
│   └── logo.svg
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

## 🛠️ Tecnologías Utilizadas

- **[Next.js 15](https://nextjs.org/)** - Framework React
- **[TypeScript](https://www.typescriptlang.org/)** - Tipado estático
- **[Tailwind CSS](https://tailwindcss.com/)** - Estilos utilitarios
- **[shadcn/ui](https://ui.shadcn.com/)** - Componentes UI
- **[Zustand](https://zustand-demo.pmnd.rs/)** - Estado global
- **[Lucide React](https://lucide.dev/)** - Iconos
- **[date-fns](https://date-fns.org/)** - Manejo de fechas

## 📸 Capturas de Pantalla

### Panel de Administrador
- Dashboard con KPIs
- Gestión de propiedades con fotos
- Lista de contratos activos
- Solicitudes de servicio

### Panel de Propietario
- Vista de propiedades propias
- Reportes financieros mensuales
- Estado de contratos

### Panel de Inquilino
- Información de propiedad alquilada
- Solicitud de servicios con fotos
- Vista de contrato

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Compilar para producción
npm run build

# Ejecutar en producción
npm run start

# Verificar código con ESLint
npm run lint
```

## 📝 Notas Importantes

- Los datos se almacenan en memoria (demo mode)
- Las fotos se convierten a base64 para almacenamiento local
- Para producción, implementar base de datos (PostgreSQL, MySQL, etc.)

## 🤝 Contribuir

1. Fork del repositorio
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👨‍💻 Autor

Desarrollado con ❤️ para la gestión inmobiliaria profesional.

---

**⭐ Si te gusta este proyecto, dale una estrella en GitHub!**
