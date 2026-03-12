import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hash } from 'bcryptjs';

// GET - Crear datos de demostración (si no existen) y mostrar estado
export async function GET() {
  try {
    // Verificar si ya hay datos
    const existingUsers = await db.user.count();
    
    if (existingUsers > 0) {
      // Ya hay datos, solo mostrar estado
      const properties = await db.property.count();
      const contracts = await db.contract.count();
      const expenses = await db.expense.count();
      const payments = await db.payment.count();
      const tickets = await db.supportTicket.count();
      const documents = await db.document.count();
      const notifications = await db.notification.count();

      return NextResponse.json({
        success: true,
        message: 'La base de datos ya contiene datos.',
        data: {
          isSeeded: true,
          counts: {
            users: existingUsers,
            properties,
            contracts,
            expenses,
            payments,
            tickets,
            documents,
            notifications,
          },
        },
      });
    }

    // No hay datos, crear datos de demostración
    // Hash de contraseñas
    const hashedPassword = await hash('demo123', 10);

    // Crear usuarios de demostración
    const admin = await db.user.create({
      data: {
        email: 'admin@inmogest.pa',
        password: hashedPassword,
        name: 'Carlos Administrador',
        phone: '+507 6666-1111',
        role: 'ADMIN',
        isActive: true,
      },
    });

    const owner1 = await db.user.create({
      data: {
        email: 'juan.perez@email.com',
        password: hashedPassword,
        name: 'Juan Pérez',
        phone: '+507 6666-2222',
        role: 'PROPIETARIO',
        isActive: true,
      },
    });

    const owner2 = await db.user.create({
      data: {
        email: 'maria.rodriguez@email.com',
        password: hashedPassword,
        name: 'María Rodríguez',
        phone: '+507 6666-3333',
        role: 'PROPIETARIO',
        isActive: true,
      },
    });

    const tenant1 = await db.user.create({
      data: {
        email: 'pedro.gonzalez@email.com',
        password: hashedPassword,
        name: 'Pedro González',
        phone: '+507 6666-4444',
        role: 'INQUILINO',
        isActive: true,
      },
    });

    const tenant2 = await db.user.create({
      data: {
        email: 'ana.martinez@email.com',
        password: hashedPassword,
        name: 'Ana Martínez',
        phone: '+507 6666-5555',
        role: 'INQUILINO',
        isActive: true,
      },
    });

    const tenant3 = await db.user.create({
      data: {
        email: 'luis.herrera@email.com',
        password: hashedPassword,
        name: 'Luis Herrera',
        phone: '+507 6666-6666',
        role: 'INQUILINO',
        isActive: true,
      },
    });

    // Crear propiedades de demostración
    const property1 = await db.property.create({
      data: {
        title: 'Apartamento Vista Mar',
        description: 'Hermoso apartamento con vista al mar, completamente amoblado. 3 recámaras, 2 baños, cocina moderna.',
        propertyType: 'APARTAMENTO',
        province: 'Panamá',
        district: 'Panamá',
        corregimiento: 'San Francisco',
        neighborhood: 'Punta Paitilla',
        address: 'Ave. Balboa, Torre Vista Mar, Apto 15-03',
        buildingName: 'Torre Vista Mar',
        totalArea: 150.5,
        builtArea: 120.0,
        bedrooms: 3,
        bathrooms: 2,
        parkingSpaces: 2,
        floorNumber: 15,
        fincaNumber: 'FN-123456',
        tomoNumber: 'T-789',
        folioNumber: 'F-456',
        asientoNumber: 'A-123',
        monthlyRent: 2500.00,
        itbmsRate: 7.0,
        depositAmount: 2500.00,
        status: 'OCUPADA',
        ownerId: owner1.id,
        adminId: admin.id,
        tenantId: tenant1.id,
      },
    });

    const property2 = await db.property.create({
      data: {
        title: 'Casa en Condado del Rey',
        description: 'Casa familiar en urbanización privada con parque infantil y área social.',
        propertyType: 'CASA',
        province: 'Panamá',
        district: 'Panamá',
        corregimiento: 'Juan Díaz',
        neighborhood: 'Condado del Rey',
        address: 'Calle Las Gardenias, Casa 45',
        totalArea: 280.0,
        builtArea: 200.0,
        bedrooms: 4,
        bathrooms: 3,
        parkingSpaces: 2,
        fincaNumber: 'FN-234567',
        tomoNumber: 'T-890',
        folioNumber: 'F-567',
        asientoNumber: 'A-234',
        monthlyRent: 1800.00,
        itbmsRate: 7.0,
        depositAmount: 1800.00,
        status: 'OCUPADA',
        ownerId: owner2.id,
        adminId: admin.id,
        tenantId: tenant2.id,
      },
    });

    const property3 = await db.property.create({
      data: {
        title: 'Local Comercial El Dorado',
        description: 'Local comercial en zona de alto tráfico, ideal para restaurante o retail.',
        propertyType: 'LOCAL_COMERCIAL',
        province: 'Panamá',
        district: 'Panamá',
        corregimiento: 'Betania',
        neighborhood: 'El Dorado',
        address: 'Centro Comercial El Dorado, Local 25',
        totalArea: 120.0,
        builtArea: 100.0,
        bedrooms: 0,
        bathrooms: 2,
        parkingSpaces: 4,
        fincaNumber: 'FN-345678',
        tomoNumber: 'T-901',
        folioNumber: 'F-678',
        asientoNumber: 'A-345',
        monthlyRent: 3500.00,
        itbmsRate: 7.0,
        depositAmount: 3500.00,
        status: 'DISPONIBLE',
        ownerId: owner1.id,
        adminId: admin.id,
      },
    });

    const property4 = await db.property.create({
      data: {
        title: 'Oficina Torre de las Américas',
        description: 'Oficina ejecutiva con vista panorámica, incluye estacionamiento.',
        propertyType: 'OFICINA',
        province: 'Panamá',
        district: 'Panamá',
        corregimiento: 'San Francisco',
        neighborhood: 'Punta Pacífica',
        address: 'Torre de las Américas, Piso 25, Oficina 2501',
        buildingName: 'Torre de las Américas',
        totalArea: 85.0,
        builtArea: 75.0,
        bedrooms: 0,
        bathrooms: 2,
        parkingSpaces: 3,
        floorNumber: 25,
        fincaNumber: 'FN-456789',
        tomoNumber: 'T-012',
        folioNumber: 'F-789',
        asientoNumber: 'A-456',
        monthlyRent: 4200.00,
        itbmsRate: 7.0,
        depositAmount: 4200.00,
        status: 'OCUPADA',
        ownerId: owner2.id,
        adminId: admin.id,
        tenantId: tenant3.id,
      },
    });

    const property5 = await db.property.create({
      data: {
        title: 'PH en Costa del Este',
        description: 'Penthouse de lujo con terraza privada y piscina. Acabados de primera.',
        propertyType: 'PH',
        province: 'Panamá',
        district: 'Panamá',
        corregimiento: 'San Francisco',
        neighborhood: 'Costa del Este',
        address: 'Ave. Costa del Este, PH Nogal, Piso 20',
        buildingName: 'PH Nogal',
        totalArea: 350.0,
        builtArea: 280.0,
        bedrooms: 4,
        bathrooms: 4,
        parkingSpaces: 4,
        floorNumber: 20,
        fincaNumber: 'FN-567890',
        tomoNumber: 'T-123',
        folioNumber: 'F-890',
        asientoNumber: 'A-567',
        monthlyRent: 6500.00,
        itbmsRate: 7.0,
        depositAmount: 6500.00,
        status: 'DISPONIBLE',
        ownerId: owner1.id,
        adminId: admin.id,
      },
    });

    // Crear contratos
    await db.contract.createMany({
      data: [
        {
          contractType: 'ARRENDAMIENTO',
          contractNumber: 'CTR-2024-001',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2025-12-31'),
          monthlyAmount: 2500.00,
          itbmsAmount: 175.00,
          depositAmount: 2500.00,
          terms: 'Contrato de arrendamiento estándar con opción a renovación.',
          status: 'VIGENTE',
          propertyId: property1.id,
          ownerId: owner1.id,
          tenantId: tenant1.id,
        },
        {
          contractType: 'ARRENDAMIENTO',
          contractNumber: 'CTR-2024-002',
          startDate: new Date('2024-03-01'),
          endDate: new Date('2025-02-28'),
          monthlyAmount: 1800.00,
          itbmsAmount: 126.00,
          depositAmount: 1800.00,
          terms: 'Contrato de arrendamiento para casa familiar.',
          status: 'VIGENTE',
          propertyId: property2.id,
          ownerId: owner2.id,
          tenantId: tenant2.id,
        },
        {
          contractType: 'ARRENDAMIENTO',
          contractNumber: 'CTR-2024-003',
          startDate: new Date('2024-06-01'),
          endDate: new Date('2025-05-31'),
          monthlyAmount: 4200.00,
          itbmsAmount: 294.00,
          depositAmount: 4200.00,
          terms: 'Contrato de arrendamiento de oficina ejecutiva.',
          status: 'VIGENTE',
          propertyId: property4.id,
          ownerId: owner2.id,
          tenantId: tenant3.id,
        },
      ],
    });

    // Crear gastos
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    await db.expense.createMany({
      data: [
        {
          title: 'Mantenimiento PH Enero',
          description: 'Mantenimiento mensual del edificio',
          category: 'MANTENIMIENTO_PH',
          expenseType: 'FIJO',
          amount: 250.00,
          itbmsAmount: 17.50,
          totalAmount: 267.50,
          invoiceNumber: 'INV-PH-001',
          invoiceDate: new Date(currentYear, currentMonth, 1),
          supplier: 'Administración Torre Vista Mar',
          expenseDate: new Date(currentYear, currentMonth, 5),
          propertyId: property1.id,
        },
        {
          title: 'Reparación aire acondicionado',
          description: 'Mantenimiento preventivo de AC',
          category: 'SERVICIO_TECNICO',
          expenseType: 'VARIABLE',
          amount: 150.00,
          itbmsAmount: 10.50,
          totalAmount: 160.50,
          invoiceNumber: 'INV-AC-001',
          invoiceDate: new Date(currentYear, currentMonth, 10),
          supplier: 'Cool Air Panamá',
          expenseDate: new Date(currentYear, currentMonth, 12),
          propertyId: property1.id,
        },
        {
          title: 'Seguro de propiedad',
          description: 'Póliza de seguro anual',
          category: 'SEGURO',
          expenseType: 'FIJO',
          amount: 500.00,
          itbmsAmount: 35.00,
          totalAmount: 535.00,
          invoiceNumber: 'POL-2024-001',
          invoiceDate: new Date(currentYear, currentMonth, 1),
          supplier: 'Seguros Panamá',
          expenseDate: new Date(currentYear, currentMonth, 15),
          propertyId: property2.id,
        },
      ],
    });

    // Crear pagos
    await db.payment.createMany({
      data: [
        {
          paymentType: 'ALQUILER',
          amount: 2500.00,
          itbmsAmount: 175.00,
          totalAmount: 2675.00,
          referenceNumber: 'TRF-2024-001',
          paymentMethod: 'TRANSFERENCIA',
          status: 'PAGADO',
          paidAt: new Date(currentYear, currentMonth, 5),
          dueDate: new Date(currentYear, currentMonth, 5),
          propertyId: property1.id,
          userId: tenant1.id,
        },
        {
          paymentType: 'ALQUILER',
          amount: 1800.00,
          itbmsAmount: 126.00,
          totalAmount: 1926.00,
          referenceNumber: 'TRF-2024-002',
          paymentMethod: 'TRANSFERENCIA',
          status: 'PAGADO',
          paidAt: new Date(currentYear, currentMonth, 3),
          dueDate: new Date(currentYear, currentMonth, 3),
          propertyId: property2.id,
          userId: tenant2.id,
        },
        {
          paymentType: 'ALQUILER',
          amount: 4200.00,
          itbmsAmount: 294.00,
          totalAmount: 4494.00,
          status: 'PENDIENTE',
          dueDate: new Date(currentYear, currentMonth, 15),
          propertyId: property4.id,
          userId: tenant3.id,
        },
      ],
    });

    // Crear tickets de soporte
    await db.supportTicket.createMany({
      data: [
        {
          title: 'Fuga de agua en cocina',
          description: 'Se detectó una fuga de agua debajo del fregadero de la cocina.',
          category: 'Plomería',
          priority: 'ALTA',
          status: 'EN_PROCESO',
          propertyId: property1.id,
          userId: tenant1.id,
        },
        {
          title: 'Aire acondicionado no enfría',
          description: 'El aire acondicionado del cuarto principal no está enfriando correctamente.',
          category: 'AC',
          priority: 'MEDIA',
          status: 'ABIERTO',
          propertyId: property1.id,
          userId: tenant1.id,
        },
      ],
    });

    // Crear documentos
    await db.document.createMany({
      data: [
        {
          title: 'Contrato de Arrendamiento - Apt 15-03',
          description: 'Contrato de arrendamiento vigente',
          documentType: 'CONTRATO_ARRENDAMIENTO',
          fileUrl: '/documents/contrato_001.pdf',
          fileName: 'contrato_001.pdf',
          fileSize: 524288,
          mimeType: 'application/pdf',
          propertyId: property1.id,
          uploadedBy: admin.id,
        },
        {
          title: 'Escritura de Propiedad - Vista Mar',
          description: 'Escritura pública de la propiedad',
          documentType: 'ESCRITURA',
          fileUrl: '/documents/escritura_001.pdf',
          fileName: 'escritura_001.pdf',
          fileSize: 1048576,
          mimeType: 'application/pdf',
          propertyId: property1.id,
          uploadedBy: owner1.id,
        },
      ],
    });

    // Crear notificaciones
    await db.notification.createMany({
      data: [
        {
          title: 'Bienvenido a InmoGest Pro',
          message: 'Su cuenta ha sido creada exitosamente.',
          type: 'SYSTEM',
          userId: admin.id,
        },
        {
          title: 'Nuevo pago registrado',
          message: 'Se ha registrado el pago de alquiler correspondiente a este mes.',
          type: 'PAYMENT',
          link: '/payments',
          userId: owner1.id,
        },
      ],
    });

    // Crear estadísticas del dashboard
    await db.dashboardStats.create({
      data: {
        totalProperties: 5,
        activeContracts: 3,
        pendingPayments: 1,
        openTickets: 2,
        monthlyRevenue: 9095.00,
        totalExpenses: 1551.50,
      },
    });

    return NextResponse.json({
      success: true,
      message: '¡Base de datos poblada exitosamente con datos de demostración!',
      data: {
        users: {
          admins: 1,
          owners: 2,
          tenants: 3,
        },
        properties: 5,
        contracts: 3,
        expenses: 3,
        payments: 3,
        tickets: 2,
        documents: 2,
        notifications: 2,
        credentials: {
          admin: 'admin@inmogest.pa',
          owner1: 'juan.perez@email.com',
          owner2: 'maria.rodriguez@email.com',
          tenant1: 'pedro.gonzalez@email.com',
          tenant2: 'ana.martinez@email.com',
          tenant3: 'luis.herrera@email.com',
          password: 'demo123',
        },
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error al poblar la base de datos:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al poblar la base de datos',
      message: error instanceof Error ? error.message : 'Error desconocido',
    }, { status: 500 });
  }
}

// POST - Igual que GET para compatibilidad
export async function POST() {
  return GET();
}
