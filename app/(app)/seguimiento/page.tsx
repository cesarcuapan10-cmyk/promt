import { auth } from "@/app/lib/auth"
import { db } from "@/app/lib/db"
import { SeguimientoCliente } from "./SeguimientoCliente"

export const metadata = { title: "Seguimiento — CRM César Cuapan" }

export default async function SeguimientoPage() {
  const session = await auth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usuario = session?.user as any
  const userId = usuario?.id as string
  const isAdmin = usuario?.rol === "ADMIN"

  const ahora = new Date()
  const hoyInicio = new Date(ahora)
  hoyInicio.setHours(0, 0, 0, 0)
  const hoyFin = new Date(ahora)
  hoyFin.setHours(23, 59, 59, 999)
  const hace24h = new Date(ahora.getTime() - 24 * 60 * 60 * 1000)
  const hace7dias = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000)

  const filtroBase = {
    eliminadoEn: null as null,
    estadoCartera: "ACTIVO",
    ...(isAdmin ? {} : { vendedorId: userId }),
  }

  const [
    accionesHoy,
    accionesVencidas,
    leadsNuevosFrios,
    clientesRiesgo,
    recordatoriosHoy,
  ] = await Promise.all([
    // Clientes con próxima acción HOY
    db.cliente.findMany({
      where: {
        ...filtroBase,
        fechaProximaAccion: { gte: hoyInicio, lte: hoyFin },
      },
      orderBy: [{ temperatura: "asc" }, { valorEstimado: "desc" }],
      select: {
        id: true, nombre: true, telefono: true, whatsapp: true, correo: true,
        temperatura: true, etapa: true, valorEstimado: true,
        proximaAccion: true, fechaProximaAccion: true, ultimoContacto: true,
        empresaNombre: true,
      },
    }),
    // Acciones vencidas (fechaProximaAccion < hoy)
    db.cliente.findMany({
      where: {
        ...filtroBase,
        fechaProximaAccion: { lt: hoyInicio },
      },
      orderBy: [{ fechaProximaAccion: "asc" }],
      take: 20,
      select: {
        id: true, nombre: true, telefono: true, whatsapp: true, correo: true,
        temperatura: true, etapa: true, valorEstimado: true,
        proximaAccion: true, fechaProximaAccion: true, ultimoContacto: true,
        empresaNombre: true,
      },
    }),
    // Leads nuevos sin contactar en >24h
    db.cliente.findMany({
      where: {
        ...filtroBase,
        etapa: "NUEVO",
        OR: [
          { ultimoContacto: null },
          { ultimoContacto: { lt: hace24h } },
        ],
      },
      orderBy: { creadoEn: "asc" },
      take: 10,
      select: {
        id: true, nombre: true, telefono: true, whatsapp: true, correo: true,
        temperatura: true, etapa: true, valorEstimado: true,
        proximaAccion: true, fechaProximaAccion: true, ultimoContacto: true,
        empresaNombre: true, creadoEn: true,
      },
    }),
    // Clientes en riesgo (sin contacto >7 días, temperatura CALIENTE o TIBIO)
    db.cliente.count({
      where: {
        ...filtroBase,
        temperatura: { in: ["CALIENTE", "TIBIO"] },
        OR: [
          { ultimoContacto: null },
          { ultimoContacto: { lt: hace7dias } },
        ],
      },
    }),
    // Recordatorios de hoy
    db.recordatorio.findMany({
      where: {
        usuarioId: userId,
        completado: false,
        fecha: { gte: hoyInicio, lte: hoyFin },
      },
      include: {
        cliente: { select: { id: true, nombre: true } },
      },
      orderBy: { fecha: "asc" },
    }),
  ])

  return (
    <SeguimientoCliente
      accionesHoy={accionesHoy}
      accionesVencidas={accionesVencidas}
      leadsNuevosFrios={leadsNuevosFrios}
      clientesEnRiesgo={clientesRiesgo}
      recordatoriosHoy={recordatoriosHoy}
    />
  )
}
