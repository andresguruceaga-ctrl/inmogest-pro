import { NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'
import { db } from '@/lib/db'
import { buildFinancialWorkbook } from '@/lib/financial-import'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const auth = await requireApiUser(['ADMIN'])
    if (!auth.ok) return auth.response

    const [expenses, tenantPayments, ownerPayments] = await Promise.all([
      db.expense.findMany({
        include: { property: { select: { title: true } } },
        orderBy: [{ expenseDate: 'asc' }, { createdAt: 'asc' }],
      }),
      db.payment.findMany({
        include: {
          property: { select: { title: true } },
          user: { select: { name: true } },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
      }),
      db.ownerPayment.findMany({
        include: {
          owner: { select: { name: true } },
          property: { select: { title: true } },
        },
        orderBy: [{ paymentDate: 'asc' }, { createdAt: 'asc' }],
      }),
    ])

    const workbook = await buildFinancialWorkbook({
      expenses: expenses.map(expense => ({
        id: expense.id,
        propertyId: expense.propertyId,
        propertyName: expense.property.title,
        title: expense.title,
        description: expense.description,
        category: expense.category,
        expenseType: expense.expenseType,
        amount: expense.amount,
        expenseDate: expense.expenseDate,
        invoiceNumber: expense.invoiceNumber,
        invoiceDate: expense.invoiceDate,
        supplier: expense.supplier,
        paidByAdmin: expense.paidByAdmin,
        reimbursedByOwner: expense.reimbursedByOwner,
      })),
      tenantPayments: tenantPayments.map(payment => ({
        id: payment.id,
        propertyId: payment.propertyId,
        propertyName: payment.property.title,
        userId: payment.userId,
        tenantName: payment.user.name,
        contractId: payment.contractId,
        paymentType: payment.paymentType,
        amount: payment.amount,
        referenceNumber: payment.referenceNumber,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        dueDate: payment.dueDate,
        paidAt: payment.paidAt,
      })),
      ownerPayments: ownerPayments.map(payment => ({
        id: payment.id,
        ownerId: payment.ownerId,
        ownerName: payment.owner.name,
        propertyId: payment.propertyId,
        propertyName: payment.property?.title || null,
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod,
        referenceNumber: payment.referenceNumber,
        notes: payment.notes,
      })),
    })

    return new NextResponse(new Uint8Array(workbook), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="registros-financieros-inmogest.xlsx"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Error exporting financial workbook:', error)
    return NextResponse.json({ success: false, error: 'No se pudo generar el archivo Excel.' }, { status: 500 })
  }
}
