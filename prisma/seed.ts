import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"
import bcrypt from "bcryptjs"

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL ?? "file:dev.db" })
const prisma = new PrismaClient({ adapter })

async function main() {
  const existentes = await prisma.usuario.count()
  if (existentes > 0) {
    console.log("⚠️  Ya hay datos. El seed no sobrescribe datos reales.")
    console.log("   Para resembrar: borra la base y vuelve a migrar.")
    return
  }

  console.log("🌱 Sembrando datos de ejemplo para cesar cuapan CRM...")

  await prisma.metaNegocio.upsert({
    where: { id: "singleton" },
    create: {},
    update: {},
  })

  const hashAdmin = await bcrypt.hash("Admin2026!", 12)
  const admin = await prisma.usuario.create({
    data: {
      nombre: "César Cuapan",
      correo: "cesar@cuapan.com",
      contraseñaHash: hashAdmin,
      rol: "ADMIN",
      metaMensual: 30,
      ligaAgenda: "cesar",
    },
  })

  const hashVendedor = await bcrypt.hash("Vendedor2026!", 12)
  const vendedor = await prisma.usuario.create({
    data: {
      nombre: "María López",
      correo: "maria@cuapan.com",
      contraseñaHash: hashVendedor,
      rol: "VENDEDOR",
      metaMensual: 15,
      ligaAgenda: "maria",
    },
  })

  const etVip = await prisma.etiqueta.create({ data: { nombre: "VIP", color: "#e8b763" } })
  const etRef = await prisma.etiqueta.create({ data: { nombre: "Referido", color: "#8b5cf6" } })
  const etAnticipo = await prisma.etiqueta.create({ data: { nombre: "Pagó anticipo", color: "#22c55e" } })

  const hoy = new Date()
  const hace = (d: number) => new Date(hoy.getTime() - d * 86400000)
  const en = (d: number) => new Date(hoy.getTime() + d * 86400000)

  // 1. Caliente — Propuesta enviada (acción VENCIDA)
  const c1 = await prisma.cliente.create({
    data: {
      nombre: "Roberto Hernández Silva",
      telefono: "2221234567",
      whatsapp: "2221234567",
      correo: "roberto.hdz@gmail.com",
      origen: "Instagram",
      utmSource: "instagram",
      etapa: "PROPUESTA_ENVIADA",
      estadoCartera: "ACTIVO",
      temperatura: "CALIENTE",
      objecionPrincipal: "Está caro",
      proximaAccion: "Llamar para resolver objeción de precio y cerrar",
      fechaProximaAccion: hace(1),
      ultimoContacto: hace(2),
      valorEstimado: 15000,
      retoPrincipal: "No cierra ventas por miedo a cobrar caro",
      empresaNombre: "Hernández Negocios",
      empresaGiro: "Consultoría de ventas",
      empresaPuesto: "Director General",
      numVendedores: 3,
      vendedorId: admin.id,
      creadoEn: hace(10),
    },
  })
  await prisma.etiquetaCliente.create({ data: { clienteId: c1.id, etiquetaId: etVip.id } })
  await prisma.nota.create({
    data: {
      clienteId: c1.id,
      usuarioId: admin.id,
      contenido: "Primera llamada muy productiva. Interesado pero dice que está caro. Envié propuesta con ROI. Espero respuesta.",
      tipo: "LLAMADA",
      fecha: hace(2),
    },
  })

  // 2. Caliente — Cita agendada
  const c2 = await prisma.cliente.create({
    data: {
      nombre: "Ana Martínez Solís",
      telefono: "2229876543",
      whatsapp: "2229876543",
      correo: "ana.martinez@hotmail.com",
      origen: "Recomendado",
      etapa: "CITA_AGENDADA",
      estadoCartera: "ACTIVO",
      temperatura: "CALIENTE",
      objecionPrincipal: "Lo voy a pensar",
      proximaAccion: "Cita de diagnóstico mañana a las 10am",
      fechaProximaAccion: en(1),
      ultimoContacto: hace(1),
      valorEstimado: 12000,
      retoPrincipal: "Equipo de ventas sin estructura",
      vendedorId: admin.id,
      creadoEn: hace(5),
    },
  })
  await prisma.etiquetaCliente.create({ data: { clienteId: c2.id, etiquetaId: etRef.id } })
  await prisma.cita.create({
    data: {
      clienteId: c2.id,
      vendedorId: admin.id,
      titulo: "Diagnóstico inicial con Ana Martínez",
      fechaInicio: new Date(en(1).setHours(10, 0, 0, 0)),
      fechaFin: new Date(en(1).setHours(10, 45, 0, 0)),
      notas: "Referida por Carlos Méndez. Preparar preguntas.",
    },
  })

  // 3. Tibio — Contactado (vendedora)
  const c3 = await prisma.cliente.create({
    data: {
      nombre: "Luis Fernando Ramos",
      telefono: "2223456789",
      whatsapp: "2223456789",
      correo: "lfernando.ramos@empresa.mx",
      origen: "Facebook",
      utmSource: "facebook",
      etapa: "CONTACTADO",
      estadoCartera: "ACTIVO",
      temperatura: "TIBIO",
      objecionPrincipal: "Tengo que consultarlo con mi pareja/socio",
      proximaAccion: "Enviar WhatsApp con casos de éxito",
      fechaProximaAccion: hoy,
      ultimoContacto: hace(3),
      valorEstimado: 8000,
      retoPrincipal: "Mentalidad de escasez al cobrar",
      empresaNombre: "Soluciones Ramos SA",
      empresaGiro: "Ventas B2B",
      numVendedores: 5,
      vendedorId: vendedor.id,
      creadoEn: hace(8),
    },
  })
  await prisma.pago.create({
    data: {
      clienteId: c3.id,
      vendedorId: vendedor.id,
      monto: 5000,
      metodo: "LIGA_PAGO",
      estatus: "VENCIDO",
      fechaVencimiento: hace(3),
      concepto: "Sesión de diagnóstico",
    },
  })

  // 4. Nuevo — reciente
  await prisma.cliente.create({
    data: {
      nombre: "Patricia Vázquez Ruiz",
      telefono: "2225551234",
      whatsapp: "2225551234",
      correo: "paty.vazquez@gmail.com",
      origen: "Landing",
      utmSource: "landing",
      etapa: "NUEVO",
      estadoCartera: "ACTIVO",
      temperatura: "TIBIO",
      proximaAccion: "Contactar en menos de 24 horas",
      fechaProximaAccion: en(0),
      valorEstimado: 10000,
      vendedorId: admin.id,
      creadoEn: hace(0.2),
    },
  })

  // 5. Nuevo — lead frío por demora
  await prisma.cliente.create({
    data: {
      nombre: "Jorge Castillo Mendoza",
      telefono: "2227778899",
      whatsapp: "2227778899",
      correo: "jorge.castillo@negocios.com",
      origen: "Instagram",
      utmSource: "instagram",
      etapa: "NUEVO",
      estadoCartera: "ACTIVO",
      temperatura: "FRIO",
      proximaAccion: "Contactar URGENTE — más de 24h sin atender",
      fechaProximaAccion: hace(1),
      valorEstimado: 15000,
      vendedorId: vendedor.id,
      creadoEn: hace(2),
    },
  })

  // 6. GANADO — este mes
  const c6 = await prisma.cliente.create({
    data: {
      nombre: "Sofía Reyes Torres",
      telefono: "2221112233",
      whatsapp: "2221112233",
      correo: "sofia.reyes@coaching.mx",
      origen: "Recomendado",
      etapa: "GANADO",
      estadoCartera: "GANADO",
      temperatura: "CALIENTE",
      proximaAccion: "Enviar material de bienvenida",
      fechaProximaAccion: en(2),
      ultimoContacto: hace(1),
      valorEstimado: 18000,
      retoPrincipal: "Estructurar negocio de coaching",
      vendedorId: admin.id,
      creadoEn: hace(15),
    },
  })
  await prisma.etiquetaCliente.create({ data: { clienteId: c6.id, etiquetaId: etAnticipo.id } })
  await prisma.pago.create({
    data: {
      clienteId: c6.id,
      vendedorId: admin.id,
      monto: 9000,
      metodo: "TRANSFERENCIA",
      estatus: "PAGADO",
      fechaPago: hace(1),
      concepto: "Anticipo 50% — Mentoría 3 meses",
    },
  })
  await prisma.pago.create({
    data: {
      clienteId: c6.id,
      vendedorId: admin.id,
      monto: 9000,
      metodo: "TRANSFERENCIA",
      estatus: "PENDIENTE",
      fechaVencimiento: en(30),
      concepto: "Segunda exhibición — Mentoría 3 meses",
    },
  })
  await prisma.nota.create({
    data: {
      clienteId: c6.id,
      usuarioId: admin.id,
      contenido: "¡CERRADA! Sofía pagó anticipo. Excelente referente del programa.",
      tipo: "CAMBIO_ESTADO",
      fecha: hace(1),
    },
  })

  // 7. PERDIDO
  await prisma.cliente.create({
    data: {
      nombre: "Miguel Ángel Ortiz Pérez",
      telefono: "2224445566",
      whatsapp: "2224445566",
      correo: "miguel.ortiz@gmail.com",
      origen: "Facebook",
      utmSource: "facebook",
      etapa: "PERDIDO",
      estadoCartera: "PERDIDO",
      temperatura: "FRIO",
      objecionPrincipal: "Está caro",
      motivoPerdida: "Está caro",
      proximaAccion: "Reactivar en 2 meses",
      fechaProximaAccion: en(60),
      ultimoContacto: hace(7),
      valorEstimado: 12000,
      vendedorId: admin.id,
      creadoEn: hace(20),
    },
  })

  // 8. ARCHIVADO
  await prisma.cliente.create({
    data: {
      nombre: "Claudia Moreno Jiménez",
      telefono: "2226667788",
      origen: "WhatsApp",
      etapa: "CONTACTADO",
      estadoCartera: "ARCHIVADO",
      temperatura: "FRIO",
      vendedorId: vendedor.id,
      creadoEn: hace(45),
      estadoAnterior: "ACTIVO",
      etapaAnterior: "CONTACTADO",
    },
  })

  // 9. VIP con acción vencida
  const c9 = await prisma.cliente.create({
    data: {
      nombre: "Ernesto Domínguez Valle",
      telefono: "2228889900",
      whatsapp: "2228889900",
      correo: "ernesto.dom@hotmail.com",
      origen: "Agenda",
      etapa: "PROPUESTA_ENVIADA",
      estadoCartera: "ACTIVO",
      temperatura: "CALIENTE",
      objecionPrincipal: "Lo voy a pensar",
      proximaAccion: "Llamar para cerrar — usar urgencia y escasez",
      fechaProximaAccion: hace(2),
      ultimoContacto: hace(5),
      valorEstimado: 20000,
      retoPrincipal: "Escalar equipo de ventas de 2 a 10 personas",
      numVendedores: 2,
      vendedorId: admin.id,
      creadoEn: hace(12),
    },
  })
  await prisma.etiquetaCliente.create({ data: { clienteId: c9.id, etiquetaId: etVip.id } })
  await prisma.cita.create({
    data: {
      clienteId: c9.id,
      vendedorId: admin.id,
      titulo: "Llamada de cierre con Ernesto",
      fechaInicio: new Date(en(3).setHours(15, 0, 0, 0)),
      fechaFin: new Date(en(3).setHours(15, 45, 0, 0)),
      notas: "Traer casos de escala de equipos. Tener meses sin intereses.",
    },
  })

  // 10. Frío estancado
  await prisma.cliente.create({
    data: {
      nombre: "Verónica Salinas Mora",
      telefono: "2225544332",
      origen: "Landing",
      utmSource: "landing",
      etapa: "CONTACTADO",
      estadoCartera: "ACTIVO",
      temperatura: "FRIO",
      objecionPrincipal: "Tengo que consultarlo con mi pareja/socio",
      proximaAccion: "Reactivar con plantilla para fríos",
      fechaProximaAccion: hace(5),
      ultimoContacto: hace(10),
      valorEstimado: 9500,
      vendedorId: vendedor.id,
      creadoEn: hace(30),
    },
  })

  // Recordatorios
  await prisma.recordatorio.createMany({
    data: [
      { usuarioId: admin.id, clienteId: c1.id, titulo: "Llamar a Roberto — resolver objeción", fecha: hoy, hora: "10:00" },
      { usuarioId: admin.id, titulo: "Revisar propuestas pendientes del mes", fecha: hoy, hora: "09:00" },
    ],
  })

  // Historial 6 meses para gráficas
  const ingresos = [35000, 42000, 55000, 48000, 62000]
  const nombresH = ["Carmen Juárez Leal", "Ignacio Torres Blanco", "Beatriz Ríos Montoya", "Arturo Navarro Pérez", "Daniela Fuentes Cruz"]
  const origenesH = ["instagram", "facebook", "recomendado", "landing", "whatsapp"]

  for (let i = 0; i < 5; i++) {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    const fechaMes = new Date(d.getFullYear(), d.getMonth(), 15)

    const cH = await prisma.cliente.create({
      data: {
        nombre: nombresH[i],
        telefono: `222000000${i}`,
        origen: origenesH[i],
        utmSource: origenesH[i],
        etapa: "GANADO",
        estadoCartera: "GANADO",
        temperatura: "CALIENTE",
        valorEstimado: ingresos[i],
        vendedorId: i % 2 === 0 ? admin.id : vendedor.id,
        creadoEn: new Date(fechaMes.getTime() - 10 * 86400000),
        ultimoContacto: fechaMes,
      },
    })
    await prisma.pago.create({
      data: {
        clienteId: cH.id,
        vendedorId: i % 2 === 0 ? admin.id : vendedor.id,
        monto: ingresos[i],
        metodo: "TRANSFERENCIA",
        estatus: "PAGADO",
        fechaPago: fechaMes,
        concepto: "Mentoría — pago completo",
        creadoEn: fechaMes,
      },
    })
  }

  // Plantillas de WhatsApp
  await prisma.plantilla.createMany({
    data: [
      { titulo: "Primer contacto — Nuevo lead", contenido: "Hola {nombre}, soy César de Entidad Vendedora.\n\nPara no hacerte perder tiempo, cuéntame en una línea: ¿cuál es tu mayor freno hoy en ventas?\n\nCon eso te puedo armar un mini-diagnóstico rápido.", tipo: "WHATSAPP", etapa: "NUEVO" },
      { titulo: "Vencer: Está caro", contenido: "Hola {nombre}, entiendo. Pero te pregunto: ¿cuánto te cuesta cada mes NO cerrar más ventas?\n\nLo que ofrezco no es un gasto, es la inversión que recuperas en semanas.\n\n¿Hablamos 15 min?", tipo: "WHATSAPP", etapa: "PROPUESTA_ENVIADA", objecion: "Está caro" },
      { titulo: "Vencer: Lo voy a pensar", contenido: "Hola {nombre}, no hay problema. Solo te digo: los que más crecen son los que deciden antes de que se enfríe la motivación.\n\n¿Qué te falta saber para decidir hoy?", tipo: "WHATSAPP", etapa: "PROPUESTA_ENVIADA", objecion: "Lo voy a pensar" },
      { titulo: "Vencer: Consultar con pareja/socio", contenido: "Hola {nombre}, podemos hacer una llamada rápida de 10 min los tres para resolver dudas juntos. ¿Cuándo les viene bien?", tipo: "WHATSAPP", etapa: "PROPUESTA_ENVIADA", objecion: "Tengo que consultarlo con mi pareja/socio" },
      { titulo: "Pedir el sí final — Cierre", contenido: "Hola {nombre}, ¿lo dejamos cerrado hoy?\n\nLos lugares para este mes están casi llenos. Con un 'sí' te mando los detalles para arrancar esta semana.", tipo: "WHATSAPP", etapa: "PROPUESTA_ENVIADA" },
      { titulo: "Confirmación de cita", contenido: "Hola {nombre}, te confirmo nuestra cita 📅\n\nFecha: {fecha_cita}\nSi necesitas reprogramar, avísame con tiempo. ¡Nos vemos!", tipo: "WHATSAPP", etapa: "CITA_AGENDADA" },
      { titulo: "Bienvenida — Post-venta", contenido: "¡Hola {nombre}! 🎉 Bienvenido al programa.\n\nEn las próximas horas te envío acceso al material y agendamos tu primera sesión.", tipo: "WHATSAPP", etapa: "GANADO" },
      { titulo: "Pedir referidos", contenido: "Hola {nombre}, ¿cómo vas?\n\n¿Conoces a alguien que también batallle con sus ventas y a quien le pueda ayudar?\n\nSi me lo presentas y cierra, hay una sorpresa para ti 😊", tipo: "WHATSAPP", etapa: "GANADO" },
      { titulo: "Cobro pendiente — Recordatorio", contenido: "Hola {nombre}, ¿cómo estás? Tenemos un pago pendiente. ¿Te envío la liga para resolverlo hoy?", tipo: "WHATSAPP" },
      { titulo: "Reactivar lead frío", contenido: "Hola {nombre}, es César. Han pasado unos días desde que hablamos.\n\n¿Sigues pensando en mejorar tus ventas? Tengo algo que puede ayudarte. ¿Tienes 10 min esta semana?", tipo: "WHATSAPP", etapa: "CONTACTADO" },
    ],
  })

  await prisma.registroAuditoria.create({
    data: { usuarioId: admin.id, accion: "CREAR", entidad: "Sistema", descripcion: "Sistema inicializado con datos de ejemplo" },
  })

  console.log("✅ Datos sembrados.")
  console.log("   👤 Admin:    cesar@cuapan.com / Admin2026!")
  console.log("   👤 Vendedor: maria@cuapan.com / Vendedor2026!")
  console.log("   📊 10 clientes, 5 meses historial, 10 plantillas")
}

main()
  .catch((e) => { console.error("❌ Error:", e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
