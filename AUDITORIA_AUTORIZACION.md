# Auditoria de autorizacion de API

Fecha: 24 de septiembre de 2026

## Regla general

- `ADMIN`: acceso global y mutaciones administrativas/financieras.
- `PROPIETARIO`: lectura de propiedades y registros relacionados donde `ownerId` coincide con la sesion.
- `INQUILINO`: lectura de su propiedad, contrato, pagos y tickets; los tickets propios se pueden crear.
- Los identificadores enviados por query o body nunca amplian el alcance definido por la sesion.

## Matriz aplicada

| Recurso | Lectura | Crear / editar / eliminar | Aislamiento |
| --- | --- | --- | --- |
| Propiedades | Todos los roles autenticados | ADMIN | `ownerId` / `tenantId`; el inquilino no recibe gastos ni reportes financieros |
| Contratos | Todos los roles autenticados | ADMIN | `ownerId` / `tenantId` |
| Gastos | ADMIN, PROPIETARIO | ADMIN | Propiedad del propietario |
| Pagos | Todos los roles autenticados | ADMIN | Propiedad del propietario o `userId` del inquilino |
| Tickets | Todos los roles autenticados | Crear: autenticados; editar/eliminar: ADMIN | Propiedad del propietario o autor del ticket |
| Documentos | Todos los roles autenticados | ADMIN | Propiedad del propietario; inquilino limitado a documentos propios |
| Pagos a propietarios | ADMIN, PROPIETARIO | ADMIN | `ownerId` de la sesion |
| Reportes y balances | ADMIN, PROPIETARIO | Solo lectura | `ownerId` de la sesion |
| Usuarios | ADMIN; usuario sobre su propio perfil | ADMIN; usuario sobre su propio perfil salvo eliminar | ID de la sesion |
| Dashboard | Todos los roles autenticados | Solo lectura | Rol e ID obtenidos de la sesion |

## Rutas publicas intencionales

- `POST /api/auth/login`
- `POST /api/auth/register` (solo crea cuentas `INQUILINO`)
- `GET /api` (estado basico)

Las rutas de seed y configuracion de almacenamiento conservan su proteccion exclusiva para `ADMIN`.
