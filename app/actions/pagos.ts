"use server"

import { auth } from "@/app/lib/auth"
import { db } from "@/app/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const esquemaPago = z.object({
  clienteId: z.string().min(1),
  monto: z.coerce.number().positive("El monto debe ser positivo"),
  metodo: z.string().min(1, "Selecciona un método de pago"),
  estatus: z.enum(["PENDIENTE", "PAGADO", "VENCIDO", "CANCELADO"]).default("PENDIENTE"),
  concepto: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
  fechaPago: z.string().optional().nullable(),
  fechaVencimiento: z.string().optional().nullable(),
})

export type EsquemaPago = z.infer<typeof esquemaPago>

type SessionUser = { id: string; rol?: string }
async function getSession(): Promise<{ user: SessionUser }> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("No autorizado")
  return session as { user: SessionUser }
}

export async function listarPagos(filtros?: {
  estatus?: string
  clienteId?: string
  vendedorId?: string
  metodo?: string
  desde?: string
  hasta?: string
  pagina?: number
}) {
  const { user } = await getSession()
  const pagina = filtros?.pagina ?? 1
  const porPagina = 20

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    eliminadoEn: null,
    ...(user.rol !== "ADMIN" && { vendedorId: user.id }),
    ...(filtros?.estatus && { estatus: filtros.estatus }),
    ...(filtros?.clienteId && { clienteId: filtros.clienteId }),
    ...(filtros?.vendedorId && user.rol === "ADMIN" && { vendedorId: filtros.vendedorId }),
    ...(filtros?.metodo && { metodo: filtros.metodo }),
    ...((filtros?.desde || filtros?.hasta) && {
      creadoEn: {
        ...(filtros?.desde && { gte: new Date(filtros.desde) }),
        ...(filtros?.hasta && { lte: new Date(filtros.hasta + "T23:59:59") }),
      },
    }),
  }

  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59)

  const [pagos, total, resumenEstatus, cobradoMes, vencidos] = await Promise.all([
    db.pago.findMany({
      where,
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      orderBy: { creadoEn: "desc" },
      include: {
        cliente: { select: { id: true, nombre: true, empresaNombre: true } },
        vendedor: { select: { id: true, nombre: true } },
      },
    }),
    db.pago.count({ where }),
    db.pago.groupBy({
      by: ["estatus"],
      where,
      _sum: { monto: true },
      _count: true,
    }),
    db.pago.aggregate({
      where: {
        ...where,
        estatus: "PAGADO",
        fechaPago: { gte: inicioMes, lte: finMes },
      },
      _sum: { monto: true },
    }),
    db.pago.aggregate({
      where: { ...where, estatus: "VENCIDO" },
      _sum: { monto: true },
      _count: true,
    }),
  ])

  const pendientes = resumenEstatus.find((r) => r.estatus === "PENDIENTE")
  const pagados = resumenEstatus.find((r) => r.estatus === "PAGADO")

  return {
    pagos,
    total,
    paginas: Math.ceil(total / porPagina),
    resumenEstatus,
    cobradoMes: cobradoMes._sum.monto ?? 0,
    pendientesTotal: pendientes?._sum.monto ?? 0,
    pagadosTotal: pagados?._sum.monto ?? 0,
    vencidosTotal: vencidos._sum.monto ?? 0,
    vencidosCount: vencidos._count ?? 0,
  }
}

export async function registrarPago(data: EsquemaPago) {
  const { user } = await getSession()
  const parsed = esquemaPago.parse(data)
  const folio = await generarFolioConsecutivo()

  const pago = await db.pago.create({
    data: {
      ...parsed,
      folio,
      concepto: parsed.concepto || null,
      notas: parsed.notas || null,
      fechaPago: parsed.fechaPago ? new Date(parsed.fechaPago) : null,
      fechaVencimiento: parsed.fechaVencimiento ? new Date(parsed.fechaVencimiento) : null,
      vendedorId: user.id,
    },
  })

  await db.registroAuditoria.create({
    data: {
      accion: "CREAR_PAGO",
      usuarioId: user.id,
      entidad: "Pago",
      entidadId: pago.id,
      descripcion: `Registró pago de $${parsed.monto} — folio #${folio}`,
    },
  })

  revalidatePath("/pagos")
  return { ok: true, pago }
}

export async function actualizarPago(
  id: string,
  data: Partial<EsquemaPago> & { notas?: string }
) {
  const { user } = await getSession()
  const pago = await db.pago.findFirst({ where: { id, eliminadoEn: null } })
  if (!pago) return { ok: false, error: "Pago no encontrado" }
  if (user.rol !== "ADMIN" && pago.vendedorId !== user.id)
    return { ok: false, error: "Sin permiso" }

  await db.pago.update({
    where: { id },
    data: {
      ...data,
      fechaPago: data.fechaPago ? new Date(data.fechaPago) : undefined,
      fechaVencimiento: data.fechaVencimiento ? new Date(data.fechaVencimiento) : undefined,
      ...(data.estatus === "PAGADO" && !pago.fechaPago && { fechaPago: new Date() }),
    },
  })

  revalidatePath("/pagos")
  return { ok: true }
}

export async function eliminarPago(id: string) {
  const { user } = await getSession()
  const pago = await db.pago.findFirst({ where: { id, eliminadoEn: null } })
  if (!pago) return { ok: false, error: "Pago no encontrado" }
  if (user.rol !== "ADMIN" && pago.vendedorId !== user.id)
    return { ok: false, error: "Sin permiso" }

  await db.pago.update({ where: { id }, data: { eliminadoEn: new Date() } })
  revalidatePath("/pagos")
  return { ok: true }
}

export async function generarFolioConsecutivo(): Promise<number> {
  const ultimo = await db.pago.findFirst({
    where: { folio: { not: null } },
    orderBy: { folio: "desc" },
    select: { folio: true },
  })
  return (ultimo?.folio ?? 0) + 1
}
