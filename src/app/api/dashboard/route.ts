import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

// GET - Obtener estadísticas del dashboard
export async function GET(request: NextRequest) {
  let prisma;

  try {
    prisma = getPrismaClient();
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const userId = searchParams.get('userId');

    // Obtener fecha actual
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);
    const startOfYear = new Date(currentYear, 0, 1);

    // Estadísticas para Admin
    if (role === 'admin') {
      // Total propiedades activas
      const totalProperties = await prisma.property.count({
        where: { isActive: true },
      });

      // Propiedades ocupadas
      const occupiedProperties = await prisma.property.count({
        where: { status: 'OCUPADA', isActive: true },
      });

      // Total inquilinos activos
      const totalTenants = await prisma.user.count({
        where: { role: 'INQUILINO', isActive: true },
      });

      // Total propietarios activos
      const totalOwners = await prisma.user.count({
        where: { role: 'PROPIETARIO', isActive: true },
      });

      // INGRESOS DEL ADMINISTRADOR: Contratos de ADMINISTRACIÓN vigentes
      // El ingreso del admin viene de los contratos de administración
      const adminContracts = await prisma.contract.findMany({
        where: {
          contractType: 'ADMINISTRACION',
          status: 'VIGENTE',
          startDate: { lte: now },
          endDate: { gte: now },
        },
        select: { 
          monthlyAmount: true, 
          startDate: true, 
          endDate: true,
          property: { select: { title: true } },
          owner: { select: { name: true } },
        },
      });

      // Ingreso mensual del admin = suma de monthlyAmount de contratos de administración vigentes
      const monthAdminIncome = adminContracts.reduce((sum, c) => sum + c.monthlyAmount, 0);

      // Ingreso anual del admin = suma de ingresos de contratos de administración durante el año
      // Para cada contrato, calcular cuántos meses ha estado activo este año
      let yearAdminIncome = 0;
      adminContracts.forEach(contract => {
        const contractStart = new Date(contract.startDate);
        const contractEnd = new Date(contract.endDate);
        
        // Calcular meses activos en el año actual
        const effectiveStart = contractStart > startOfYear ? contractStart : startOfYear;
        const effectiveEnd = contractEnd < now ? contractEnd : now;
        
        if (effectiveEnd >= effectiveStart) {
          const monthsActive = (effectiveEnd.getFullYear() - effectiveStart.getFullYear()) * 12 
            + (effectiveEnd.getMonth() - effectiveStart.getMonth()) + 1;
          yearAdminIncome += contract.monthlyAmount * monthsActive;
        }
      });

      // Calcular porcentaje de ocupación
      const occupancyRate = totalProperties > 0 ? Math.round((occupiedProperties / totalProperties) * 100) : 0;

      // Tickets de soporte
      const openTickets = await prisma.supportTicket.count({
        where: { status: 'ABIERTO' },
      });

      const inProgressTickets = await prisma.supportTicket.count({
        where: { status: 'EN_PROCESO' },
      });

      // Tickets recientes
      const recentTickets = await prisma.supportTicket.findMany({
        where: {
          status: { in: ['ABIERTO', 'EN_PROCESO'] },
        },
        include: {
          property: { select: { title: true } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      // ACTUALIZACIONES RECIENTES
      const activities: Array<{
        id: string;
        type: 'payment' | 'contract' | 'property' | 'ticket' | 'user';
        title: string;
        description: string;
        time: string;
        amount?: string;
      }> = [];

      // Pagos recientes
      const recentPayments = await prisma.payment.findMany({
        where: { status: 'PAGADO' },
        include: {
          property: { select: { title: true } },
          user: { select: { name: true } },
        },
        orderBy: { paidAt: 'desc' },
        take: 3,
      });

      recentPayments.forEach(p => {
        activities.push({
          id: p.id,
          type: 'payment',
          title: 'Pago recibido',
          description: `${p.user?.name || 'N/A'} - ${p.property?.title || 'N/A'}`,
          time: p.paidAt ? getTimeAgo(new Date(p.paidAt)) : 'Reciente',
          amount: `$${p.totalAmount.toLocaleString()}`,
        });
      });

      // Contratos recientes
      const recentContracts = await prisma.contract.findMany({
        include: {
          property: { select: { title: true } },
          tenant: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 2,
      });

      recentContracts.forEach(c => {
        activities.push({
          id: c.id,
          type: 'contract',
          title: c.contractType === 'ADMINISTRACION' ? 'Nuevo contrato de administración' : 'Nuevo contrato de arrendamiento',
          description: `${c.property?.title || 'N/A'} - ${c.tenant?.name || 'Sin inquilino'}`,
          time: getTimeAgo(new Date(c.createdAt)),
        });
      });

      // Propiedades recientes
      const recentProperties = await prisma.property.findMany({
        orderBy: { createdAt: 'desc' },
        take: 2,
      });

      recentProperties.forEach(p => {
        activities.push({
          id: p.id,
          type: 'property',
          title: 'Nueva propiedad registrada',
          description: `${p.title} - ${p.address}`,
          time: getTimeAgo(new Date(p.createdAt)),
        });
      });

      // Usuarios recientes
      const recentUsers = await prisma.user.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 2,
      });

      recentUsers.forEach(u => {
        activities.push({
          id: u.id,
          type: 'user',
          title: `Nuevo ${u.role === 'PROPIETARIO' ? 'propietario' : u.role === 'INQUILINO' ? 'inquilino' : 'usuario'} registrado`,
          description: u.name || 'N/A',
          time: getTimeAgo(new Date(u.createdAt)),
        });
      });

      // Ordenar actividades por tiempo (más recientes primero)
      activities.sort((a, b) => {
        const timeA = getActivityTimestamp(a.time);
        const timeB = getActivityTimestamp(b.time);
        return timeA - timeB;
      });

      return NextResponse.json({
        success: true,
        data: {
          stats: {
            totalProperties,
            occupiedProperties,
            totalTenants,
            totalOwners,
            occupancyRate,
            monthAdminIncome,
            yearAdminIncome,
            activeAdminContracts: adminContracts.length,
            openTickets: openTickets + inProgressTickets,
          },
          recentTickets: recentTickets.map(t => ({
            id: t.id,
            title: t.title,
            property: t.property?.title || 'N/A',
            priority: t.priority.toLowerCase(),
            status: t.status.toLowerCase(),
            user: t.user?.name || 'N/A',
            createdAt: getTimeAgo(new Date(t.createdAt)),
          })),
          activities: activities.slice(0, 8),
        },
      });
    }

    // Estadísticas para Inquilino
    if (role === 'inquilino' && userId) {
      // Obtener propiedad del inquilino
      const property = await prisma.property.findFirst({
        where: { tenantId: userId },
        include: {
          contracts: {
            where: { status: 'VIGENTE' },
            take: 1,
          },
        },
      });

      if (!property) {
        return NextResponse.json({
          success: true,
          data: {
            property: null,
            contract: null,
            nextPayment: null,
            paymentHistory: [],
            tickets: [],
          },
        });
      }

      const contract = property.contracts[0];

      // Próximo pago
      const nextPayment = await prisma.payment.findFirst({
        where: {
          userId,
          propertyId: property.id,
          status: 'PENDIENTE',
        },
        orderBy: { dueDate: 'asc' },
      });

      // Historial de pagos
      const paymentHistory = await prisma.payment.findMany({
        where: {
          userId,
          status: 'PAGADO',
        },
        orderBy: { paidAt: 'desc' },
        take: 5,
      });

      // Tickets del inquilino
      const tickets = await prisma.supportTicket.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      // Obtener administradores para contacto
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true },
        select: { name: true, email: true, phone: true },
      });

      return NextResponse.json({
        success: true,
        data: {
          property: {
            id: property.id,
            title: property.title,
            address: property.address,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            parkingSpaces: property.parkingSpaces,
            area: property.area,
            monthlyRent: property.monthlyRent,
          },
          contract: contract ? {
            id: contract.id,
            contractNumber: contract.contractNumber,
            startDate: contract.startDate,
            endDate: contract.endDate,
            depositAmount: contract.depositAmount,
            status: contract.status,
          } : null,
          nextPayment: nextPayment ? {
            id: nextPayment.id,
            amount: nextPayment.totalAmount,
            dueDate: nextPayment.dueDate,
            daysLeft: Math.ceil((new Date(nextPayment.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
          } : null,
          paymentHistory: paymentHistory.map(p => ({
            id: p.id,
            month: new Date(p.paidAt || p.dueDate).toLocaleDateString('es-PA', { month: 'long', year: 'numeric' }),
            amount: `$${p.totalAmount.toLocaleString()}`,
            date: formatDate(p.paidAt || p.dueDate),
            method: p.paymentMethod || 'Transferencia',
            status: p.status,
          })),
          tickets: tickets.map(t => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            createdAt: formatDate(t.createdAt),
          })),
          admins: admins.map(a => ({
            name: a.name,
            email: a.email,
            phone: a.phone,
          })),
        },
      });
    }

    // Estadísticas para Propietario
    if (role === 'propietario' && userId) {
      // Propiedades del propietario
      const properties = await prisma.property.findMany({
        where: { ownerId: userId },
        include: {
          tenant: { select: { name: true } },
        },
      });

      const propertyIds = properties.map(p => p.id);

      // Ingresos del mes
      const monthPayments = await prisma.payment.findMany({
        where: {
          propertyId: { in: propertyIds },
          paidAt: { gte: startOfMonth, lte: endOfMonth },
          status: 'PAGADO',
        },
        select: { totalAmount: true, itbmsAmount: true },
      });

      const monthIncome = monthPayments.reduce((sum, p) => sum + p.totalAmount, 0);
      const monthItbms = monthPayments.reduce((sum, p) => sum + p.itbmsAmount, 0);

      // Gastos del mes
      const monthExpenses = await prisma.expense.findMany({
        where: {
          propertyId: { in: propertyIds },
          expenseDate: { gte: startOfMonth, lte: endOfMonth },
        },
        select: { totalAmount: true, itbmsAmount: true, expenseType: true, category: true },
      });

      const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.totalAmount, 0);
      const fixedExpenses = monthExpenses.filter(e => e.expenseType === 'FIJO').reduce((sum, e) => sum + e.totalAmount, 0);
      const variableExpenses = monthExpenses.filter(e => e.expenseType === 'VARIABLE').reduce((sum, e) => sum + e.totalAmount, 0);
      const expensesItbms = monthExpenses.reduce((sum, e) => sum + e.itbmsAmount, 0);

      // Neto
      const netIncome = monthIncome - totalExpenses;

      // Ocupación
      const occupiedProperties = properties.filter(p => p.status === 'OCUPADA').length;
      const occupancyRate = properties.length > 0 ? Math.round((occupiedProperties / properties.length) * 100) : 0;

      // Transacciones recientes
      const recentPayments = await prisma.payment.findMany({
        where: {
          propertyId: { in: propertyIds },
          status: 'PAGADO',
        },
        include: { property: { select: { title: true } } },
        orderBy: { paidAt: 'desc' },
        take: 3,
      });

      const recentExpenses = await prisma.expense.findMany({
        where: { propertyId: { in: propertyIds } },
        include: { property: { select: { title: true } } },
        orderBy: { expenseDate: 'desc' },
        take: 2,
      });

      const transactions: Array<{
        id: string;
        type: 'income' | 'expense';
        description: string;
        amount: number;
        date: string;
      }> = [];

      recentPayments.forEach(p => {
        transactions.push({
          id: p.id,
          type: 'income',
          description: `Alquiler - ${p.property?.title || 'N/A'}`,
          amount: p.totalAmount,
          date: formatDate(p.paidAt || p.dueDate),
        });
      });

      recentExpenses.forEach(e => {
        transactions.push({
          id: e.id,
          type: 'expense',
          description: `${e.title} - ${e.property?.title || 'N/A'}`,
          amount: -e.totalAmount,
          date: formatDate(e.expenseDate),
        });
      });

      // Gastos por categoría
      const expensesByCategory: Record<string, number> = {};
      monthExpenses.forEach(e => {
        const cat = e.category;
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + e.totalAmount;
      });

      // Contratos próximos a vencer
      const contractsExpiring = await prisma.contract.findMany({
        where: {
          propertyId: { in: propertyIds },
          status: 'VIGENTE',
          endDate: {
            gte: now,
            lte: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
          },
        },
        include: { property: { select: { title: true } } },
        orderBy: { endDate: 'asc' },
      });

      // Tickets del propietario
      const ownerTickets = await prisma.supportTicket.findMany({
        where: { 
          userId,
          propertyId: { in: propertyIds }
        },
        include: {
          property: { select: { id: true, title: true, address: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      // Obtener administradores para contacto
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true },
        select: { name: true, email: true, phone: true },
      });

      return NextResponse.json({
        success: true,
        data: {
          stats: {
            totalProperties: properties.length,
            occupiedProperties,
            monthIncome,
            monthItbms,
            totalExpenses,
            fixedExpenses,
            variableExpenses,
            expensesItbms,
            netIncome,
            occupancyRate,
          },
          properties: properties.map(p => ({
            id: p.id,
            name: p.title,
            address: p.province,
            monthlyRent: p.monthlyRent,
            status: p.status,
            tenant: p.tenant?.name || null,
          })),
          transactions: transactions.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5),
          expensesByCategory: Object.entries(expensesByCategory).map(([category, amount]) => ({
            category,
            amount,
            percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
          })),
          contractsExpiring: contractsExpiring.map(c => ({
            id: c.id,
            property: c.property?.title || 'N/A',
            endDate: c.endDate,
            daysLeft: Math.ceil((new Date(c.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
          })),
          tickets: ownerTickets.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description,
            category: t.category,
            status: t.status,
            priority: t.priority,
            photos: t.photos,
            createdAt: formatDate(t.createdAt),
            property: {
              id: t.property.id,
              title: t.property.title,
              address: t.property.address,
            },
          })),
          admins: admins.map(a => ({
            name: a.name,
            email: a.email,
            phone: a.phone,
          })),
        },
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Rol o parámetros no válidos',
    }, { status: 400 });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener estadísticas',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

function formatDate(date: Date | string | null): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('es-PA', { day: '2-digit', month: 'short' });
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Hace un momento';
  if (diffMins < 60) return `Hace ${diffMins} minutos`;
  if (diffHours < 24) return `Hace ${diffHours} horas`;
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString('es-PA', { day: '2-digit', month: 'short' });
}

// Helper para obtener timestamp de string de tiempo relativo
function getActivityTimestamp(timeStr: string): number {
  if (timeStr === 'Hace un momento' || timeStr === 'Reciente') return 0;
  
  const minsMatch = timeStr.match(/Hace (\d+) minutos/);
  if (minsMatch) return parseInt(minsMatch[1]) * 60 * 1000;
  
  const hoursMatch = timeStr.match(/Hace (\d+) horas/);
  if (hoursMatch) return parseInt(hoursMatch[1]) * 60 * 60 * 1000;
  
  const daysMatch = timeStr.match(/Hace (\d+) días/);
  if (daysMatch) return parseInt(daysMatch[1]) * 24 * 60 * 60 * 1000;
  
  return Number.MAX_SAFE_INTEGER; // Para fechas absolutas
}
