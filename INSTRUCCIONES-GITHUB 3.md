# 📦 Instrucciones para Subir a GitHub

Sigue estos pasos para subir el proyecto InmoGest Pro a tu repositorio de GitHub.

## 🗂️ Archivos Incluidos

En la carpeta `download/` encontrarás los siguientes archivos:

| Archivo | Descripción |
|---------|-------------|
| `InmoGest-Pro-README.md` | Documentación completa del proyecto |
| `InmoGest-Pro-.gitignore` | Archivos a ignorar en Git |
| `InmoGest-Pro-package.json` | Dependencias y scripts |
| `InmoGest-Pro-tailwind.config.ts` | Configuración de Tailwind CSS |
| `InmoGest-Pro-tsconfig.json` | Configuración de TypeScript |
| `InmoGest-Pro-next.config.ts` | Configuración de Next.js |
| `InmoGest-Pro-postcss.config.mjs` | Configuración de PostCSS |
| `InmoGest-Pro-eslint.config.mjs` | Configuración de ESLint |

## 📋 Pasos para Subir a GitHub

### 1. Crear Repositorio en GitHub
1. Ve a [github.com](https://github.com) y haz login
2. Clic en "New repository"
3. Nombre: `inmogest-pro`
4. Descripción: `Sistema de Gestión Inmobiliaria - Next.js + TypeScript`
5. NO inicializar con README (ya lo tenemos)
6. Crear repositorio

### 2. Preparar Archivos Locales

Renombra los archivos quitando el prefijo "InmoGest-Pro-":

```bash
# En tu carpeta local del proyecto
mv InmoGest-Pro-README.md README.md
mv InmoGest-Pro-.gitignore .gitignore
mv InmoGest-Pro-package.json package.json
mv InmoGest-Pro-tailwind.config.ts tailwind.config.ts
mv InmoGest-Pro-tsconfig.json tsconfig.json
mv InmoGest-Pro-next.config.ts next.config.ts
mv InmoGest-Pro-postcss.config.mjs postcss.config.mjs
mv InmoGest-Pro-eslint.config.mjs eslint.config.mjs
```

### 3. Inicializar Git y Subir

```bash
# Inicializar repositorio
git init

# Agregar todos los archivos
git add .

# Primer commit
git commit -m "Initial commit - InmoGest Pro"

# Agregar remote (reemplaza TU-USUARIO)
git remote add origin https://github.com/TU-USUARIO/inmogest-pro.git

# Subir a GitHub
git push -u origin main
```

## 📁 Estructura Final del Proyecto

```
inmogest-pro/
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── api/
│   │       └── route.ts
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── ... (otros componentes)
│   │   ├── suppliers-section.tsx
│   │   ├── invoices-section.tsx
│   │   ├── fixed-costs-section.tsx
│   │   ├── owner-reports-section.tsx
│   │   ├── owners-section.tsx
│   │   └── tenants-section.tsx
│   ├── lib/
│   │   ├── mock-data.ts
│   │   └── utils.ts
│   ├── store/
│   │   ├── app-store.ts
│   │   └── auth-store.ts
│   ├── hooks/
│   │   ├── use-toast.ts
│   │   └── use-mobile.ts
│   └── types/
│       └── index.ts
├── public/
│   ├── logo.svg
│   └── robots.txt
├── .gitignore
├── README.md
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
└── components.json
```

## 🚀 Para Clonar y Ejecutar

Quien clone el repositorio debe ejecutar:

```bash
# Clonar
git clone https://github.com/TU-USUARIO/inmogest-pro.git
cd inmogest-pro

# Instalar dependencias
npm install
# o
bun install

# Ejecutar
npm run dev
# o
bun run dev
```

## ⚠️ Notas Importantes

1. **NO incluir** la carpeta `node_modules/` (está en .gitignore)
2. **NO incluir** la carpeta `.next/` (está en .gitignore)
3. **NO incluir** archivos `.env` con credenciales
4. **NO incluir** la carpeta `download/` ni `db/`

## ✅ Verificar Antes de Subir

Ejecuta estos comandos para verificar:

```bash
# Verificar que compila
npm run build

# Verificar linting
npm run lint
```

Si todo pasa sin errores, ¡estás listo para subir!

---

**¡Buena suerte con tu proyecto! 🎉**
