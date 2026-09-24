# Revision tecnica de InmoGest Pro

Fecha de inicio: 24 de septiembre de 2026  
Base revisada: `main` en el commit `5d19585`  
Rama de trabajo: `codex/revision-optimizacion`

## Correcciones completadas

### Gastos sin ITBMS

Los gastos usan ahora siempre el importe base (`amount`) y nunca suman ITBMS:

- La creacion guarda `itbmsAmount = 0` y `totalAmount = amount`.
- La edicion elimina el calculo automatico del 7 % y sanea registros antiguos al modificarlos.
- Los listados y balances ignoran valores historicos inflados en `totalAmount`.
- El panel del propietario, la ficha de propiedad y los reportes mensuales/anuales calculan los gastos con `amount`.
- Los datos de demostracion crean gastos sin ITBMS.
- Los errores de validacion de gastos usan la API vigente de Zod (`issues`).

Los calculos de pagos y alquileres no se cambiaron; esta correccion se limita a gastos.

## Verificacion

- ESLint de todos los archivos modificados: correcto.
- Compilacion de produccion con Next.js: correcta (48 rutas generadas).
- Revision de referencias: no quedan calculos de gastos basados en `expense.totalAmount` dentro de la aplicacion principal.

## Segunda fase completada

### Rutas de mantenimiento y prueba

- `/api/debug-triggers` y `/api/test-expense-create` fueron retiradas.
- `/api/seed` y `/api/setup-storage` exigen una sesion con rol `ADMIN`.
- Las familias de API heredadas sin consumidores ni modelo Prisma fueron retiradas.

### Pruebas financieras

- Se extrajo la regla financiera compartida a `src/lib/finance.ts`.
- Las pruebas comprueban gastos sin ITBMS, registros historicos y utilidad neta.
- Se ejecutan con `npm test` o `node --test tests/finance.test.mts`.

### TypeScript y Prisma

- Se retiraron rutas que apuntaban a modelos inexistentes (`owner`, `supplier`, `fixedCost`, `invoice`, `tenant` y `serviceRequest`).
- Se corrigieron los contratos de tipos restantes, incluido el PDF de contratos y Zod 4.
- `typescript.ignoreBuildErrors` fue eliminado de `next.config.ts`.
- `tsc --noEmit` finaliza correctamente.

### Lint por pantallas

- Se corrigieron los efectos, cargadores y advertencias de accesibilidad.
- ESLint completo finaliza sin errores ni advertencias.

## Hallazgos pendientes

### Autorizacion CRUD (alta)

La proteccion de mantenimiento ya esta resuelta. Aun conviene auditar de forma sistematica la autorizacion y el alcance por propietario/inquilino de todas las rutas CRUD.

## Orden recomendado para continuar

1. Auditar autorizacion y aislamiento de datos en todas las rutas CRUD.
2. Ampliar las pruebas a handlers HTTP y permisos por rol.
3. Iniciar la mejora visual y de experiencia de usuario sobre una base funcional estable.
