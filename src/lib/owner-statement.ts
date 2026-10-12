export interface OwnerStatementData {
  pendingExpenses: Array<{
    id: string
    description: string
    amount: number
    date: string
    category: string
    property: { id: string; title: string }
  }>
  ownerPayments: Array<{
    id: string
    amount: number
    date: string
    method: string | null
    reference?: string | null
    notes?: string | null
    property?: { id: string; title: string } | null
  }>
}

export interface OwnerStatementMovement {
  id: string
  type: 'GASTO' | 'PAGO'
  date: string
  description: string
  category: string
  amount: number
  signedAmount: number
  balance: number
}

export interface OwnerPropertyStatement {
  property: { id: string; title: string }
  movements: OwnerStatementMovement[]
  expenses: number
  payments: number
  balance: number
}

export function buildOwnerStatements(data: OwnerStatementData): OwnerPropertyStatement[] {
  const properties = new Map<string, { title: string; movements: Omit<OwnerStatementMovement, 'balance'>[] }>()

  for (const expense of data.pendingExpenses) {
    const property = properties.get(expense.property.id) || { title: expense.property.title, movements: [] }
    property.movements.push({
      id: expense.id,
      type: 'GASTO',
      date: expense.date,
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      signedAmount: -expense.amount,
    })
    properties.set(expense.property.id, property)
  }

  for (const payment of data.ownerPayments) {
    const propertyId = payment.property?.id || 'sin-propiedad'
    const property = properties.get(propertyId) || {
      title: payment.property?.title || 'Sin propiedad',
      movements: [],
    }
    property.movements.push({
      id: payment.id,
      type: 'PAGO',
      date: payment.date,
      description: payment.notes || payment.reference || payment.method || 'Pago del propietario',
      category: 'Pago del propietario',
      amount: payment.amount,
      signedAmount: payment.amount,
    })
    properties.set(propertyId, property)
  }

  return Array.from(properties.entries())
    .map(([id, property]) => {
      let balance = 0
      const movements = property.movements
        .sort((a, b) => {
          const dateDifference = new Date(a.date).getTime() - new Date(b.date).getTime()
          if (dateDifference !== 0) return dateDifference
          if (a.type !== b.type) return a.type === 'GASTO' ? -1 : 1
          return a.id.localeCompare(b.id)
        })
        .map(movement => {
          balance += movement.signedAmount
          return { ...movement, balance }
        })

      return {
        property: { id, title: property.title },
        movements,
        expenses: movements.filter(item => item.type === 'GASTO').reduce((sum, item) => sum + item.amount, 0),
        payments: movements.filter(item => item.type === 'PAGO').reduce((sum, item) => sum + item.amount, 0),
        balance,
      }
    })
    .sort((a, b) => a.property.title.localeCompare(b.property.title, 'es'))
}
