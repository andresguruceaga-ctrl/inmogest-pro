import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canAccessProperty,
  canAccessUser,
  canManageFinancialData,
  propertyScope,
} from '../src/lib/authorization.ts'
import { createAuthorizedHandler, evaluateApiUser } from '../src/lib/http-authorization.ts'

const property = { adminId: 'admin-1', ownerId: 'owner-1', tenantId: 'tenant-1' }

test('cada rol queda aislado a sus propiedades', () => {
  assert.deepEqual(propertyScope({ id: 'admin-1', role: 'ADMIN' }), {})
  assert.deepEqual(propertyScope({ id: 'owner-1', role: 'PROPIETARIO' }), { ownerId: 'owner-1' })
  assert.deepEqual(propertyScope({ id: 'tenant-1', role: 'INQUILINO' }), { tenantId: 'tenant-1' })
  assert.equal(canAccessProperty({ id: 'owner-2', role: 'PROPIETARIO' }, property), false)
  assert.equal(canAccessProperty({ id: 'tenant-1', role: 'INQUILINO' }, property), true)
})

test('solo un administrador gestiona datos financieros', () => {
  assert.equal(canManageFinancialData({ id: 'admin-1', role: 'ADMIN' }), true)
  assert.equal(canManageFinancialData({ id: 'owner-1', role: 'PROPIETARIO' }), false)
  assert.equal(canAccessUser({ id: 'owner-1', role: 'PROPIETARIO' }, 'owner-2'), false)
})

test('el guard HTTP responde 401 sin sesión y 403 con rol insuficiente', async () => {
  const anonymous = evaluateApiUser(null, ['ADMIN'])
  assert.equal(anonymous.ok, false)
  if (!anonymous.ok) assert.equal(anonymous.response.status, 401)

  const owner = evaluateApiUser({
    user: { id: 'owner-1', role: 'PROPIETARIO' },
  }, ['ADMIN'])
  assert.equal(owner.ok, false)
  if (!owner.ok) assert.equal(owner.response.status, 403)

  const admin = evaluateApiUser({
    user: { id: 'admin-1', role: 'ADMIN' },
  }, ['ADMIN'])
  assert.equal(admin.ok, true)
})

test('un handler HTTP no ejecuta el CRUD cuando el rol no tiene permiso', async () => {
  let executions = 0
  const handler = createAuthorizedHandler(['ADMIN'], async (_request, user) => {
    executions += 1
    return Response.json({ userId: user.id }, { status: 201 })
  })

  const denied = await handler(
    new Request('http://localhost/api/expenses', { method: 'POST' }),
    { user: { id: 'owner-1', role: 'PROPIETARIO' } }
  )
  assert.equal(denied.status, 403)
  assert.equal(executions, 0)

  const allowed = await handler(
    new Request('http://localhost/api/expenses', { method: 'POST' }),
    { user: { id: 'admin-1', role: 'ADMIN' } }
  )
  assert.equal(allowed.status, 201)
  assert.equal(executions, 1)
  assert.deepEqual(await allowed.json(), { userId: 'admin-1' })
})
