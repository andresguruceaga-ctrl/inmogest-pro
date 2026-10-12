import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isMonthOnSchedule,
  parseRecurringSupports,
  recurringSupportAutomationKey,
} from '../src/lib/contract-backfill.ts'

test('un soporte cuatrimestral respeta el mes inicial', () => {
  const firstDate = new Date('2026-01-15T12:00:00.000Z')
  assert.equal(isMonthOnSchedule(firstDate, 4, new Date('2026-05-01T12:00:00.000Z')), true)
  assert.equal(isMonthOnSchedule(firstDate, 4, new Date('2026-04-01T12:00:00.000Z')), false)
})

test('las claves de soporte evitan duplicados al repetir la automatización', () => {
  assert.equal(
    recurringSupportAutomationKey('contract-1', 0, '2026-05'),
    'contract-support:contract-1:0:2026-05'
  )
})

test('ignora configuraciones de soporte incompletas', () => {
  const parsed = parseRecurringSupports(JSON.stringify([
    {
      title: 'Mantenimiento de A/A',
      responsibleParty: 'INQUILINO',
      frequencyMonths: 4,
      firstDate: '2026-01-15',
    },
    { title: '', responsibleParty: 'INQUILINO', frequencyMonths: 4, firstDate: '2026-01-15' },
  ]))
  assert.equal(parsed.length, 1)
})
