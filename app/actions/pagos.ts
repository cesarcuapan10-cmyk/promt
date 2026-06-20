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

export async function listarPagos(filtros?: {
  estatus?: string
  clienteId?: string
  pagina?: number
  mes?: string
}) {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error("No autorizado")

  const pagina = filtros?.pagina ?? 1
  const porPagina = 20

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mesWhere: Record<string, unknown> = {}
  if (filtros?.mes) {
    const [y, m] = filtros.mes.split("-").map(Number)
    const inicio = new Date(y, m - 1, 1)
    const fin = new Date(y, m, 1)
    mesWhere = { creadoEn: { gte: inicio, lt: fin } }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    eliminadoEn: null,
    ...(((sesion.user as { rol?: string }).rol) !== "ADMIN" && { vendedorId: sesion.user.id }),
    ...(filtros?.estatus && { estatus: filtros.estatus }),
    ...(filtros?.clienteId && { clienteId: filtros.clienteId }),
    ...mesWhere,
  }

  const [pagos, total, resumen] = await Promise.all([
    db.pago.findMany({
      where,
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      orderBy: { creadoEn: "desc" },
      include: {
        cliente: { select: { id: true, nombre: true, empresaNombre: true } },
      },
    }),
    db.pago.count({ where }),
    db.pago.aggregate({
      where,
      _sum: { monto: true },
    }),
  ])

  const resumenEstatus = await db.pago.groupBy({
    by: ["estatus"],
    where: { ...where },
    _sum: { monto: true },
    _count: true,
  })

  return {
    pagos,
    total,
    paginas: Math.ceil(total / porPagina),
    totalMonto: resumen._sum.monto ?? 0,
    resumenEstatus,
  }
}

export async function crearPago(data: EsquemaPago) {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error("No autorizado")

  const parsed = esquemaPago.parse(data)
  const pago = await db.pago.create({
    data: {
      ...parsed,
      concepto: parsed.concepto || null,
      notas: parsed.notas || null,
      fechaPago: parsed.fechaPago ? new Date(parsed.fechaPago) : null,
      fechaVencimiento: parsed.fechaVencimiento ? new Date(parsed.fechaVencimiento) : null,
      vendedorId: sesion.user.id,
    },
  })

  await db.registroAuditoria.create({
    data: {
      accion: "CREAR_PAGO",
      usuarioId: sesion.user.id,
      entidad: "Pago",
      entidadId: pago.id,
      descripcion: `Registró pago de $${parsed.monto} para cliente ${parsed.clienteId}`,
    },
  })

  revalidatePath("/pagos")
  return { ok: true, pago }
}

export async function actualizarEstatusPago(id: string, estatus: string) {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error("No autorizado")

  const pago = await db.pago.findFirst({ where: { id, eliminadoEn: null } })
  if (!pago) return { ok: false, error: "Pago no encontrado" }
  if (((sesion.user as { rol?: string }).rol) !== "ADMIN" && pago.vendedorId !== sesion.user.id)
    return { ok: false, error: "Sin permiso" }

  await db.pago.update({
    where: { id },
    data: {
      estatus,
      ...(estatus === "PAGADO" && { fechaPago: new Date() }),
    },
  })

  revalidatePath("/pagos")
  return { ok: true }
}

export async function eliminarPago(id: string) {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error("No autorizado")

  const pago = await db.pago.findFirst({ where: { id, eliminadoEn: null } })
  if (!pago) return { ok: false, error: "Pago no encontrado" }
  if (((sesion.user as { rol?: string }).rol) !== "ADMIN" && pago.vendedorId !== sesion.user.id)
    return { ok: false, error: "Sin permiso" }

  await db.pago.update({ where: { id }, data: { eliminadoEn: new Date() } })
  revalidatePath("/pagos")
  return { ok: true }
}

const esquemaActualizarPago = z.object({
  estatus: z.enum(["PENDIENTE", "PAGADO", "VENCIDO", "CANCELADO"]).optional(),
  fechaPago: z.string().optional().nullable(),
  monto: z.coerce.number().positive().optional(),
  concepto: z.string().optional().nullable(),
  metodo: z.string().optional(),
  fechaVencimiento: z.string().optional().nullable(),
})

export type EsquemaActualizarPago = z.infer<typeof esquemaActualizarPago>

export async function actualizarPago(id: string, data: EsquemaActualizarPago) {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error("No autorizado")

  const pago = await db.pago.findFirst({ where: { id, eliminadoEn: null } })
  if (!pago) return { ok: false, error: "Pago no encontrado" }
  if (((sesion.user as { rol?: string }).rol) !== "ADMIN" && pago.vendedorId !== sesion.user.id)
    return { ok: false, error: "Sin permiso" }

  const parsed = esquemaActualizarPago.parse(data)
  await db.pago.update({
    where: { id },
    data: {
      ...(parsed.estatus && { estatus: parsed.estatus }),
      ...(parsed.monto !== undefined && { monto: parsed.monto }),
      ...(parsed.metodo && { metodo: parsed.metodo }),
      ...(parsed.concepto !== undefined && { concepto: parsed.concepto }),
      ...(parsed.fechaPago !== undefined && { fechaPago: parsed.fechaPago ? new Date(parsed.fechaPago) : null }),
      ...(parsed.fechaVencimiento !== undefined && { fechaVencimiento: parsed.fechaVencimiento ? new Date(parsed.fechaVencimiento) : null }),
    },
  })

  revalidatePath("/pagos")
  return { ok: true }
}

export async function generarFolio(): Promise<string> {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error("No autorizado")

  const ultimo = await db.pago.findFirst({
    where: { folio: { not: null } },
    orderBy: { creadoEn: "desc" },
    select: { folio: true },
  })

  if (!ultimo?.folio) return "REC-0001"
  const num = ultimo.folio || 0
  return `REC-${String(num + 1).padStart(4, "0")}`
}

export async function resumenPagos() {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error("No autorizado")

  const esAdmin = ((sesion.user as { rol?: string }).rol) === "ADMIN"
  const vendedorWhere = esAdmin ? {} : { vendedorId: sesion.user.id }

  const hoy = new Date()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1)

  const [cobradoMes, pendiente, vencido] = await Promise.all([
    db.pago.aggregate({
      where: { ...vendedorWhere, eliminadoEn: null, estatus: "PAGADO", fechaPago: { gte: inicioMes, lt: finMes } },
      _sum: { monto: true },
    }),
    db.pago.aggregate({
      where: { ...vendedorWhere, eliminadoEn: null, estatus: "PENDIENTE" },
      _sum: { monto: true },
    }),
    db.pago.aggregate({
      where: { ...vendedorWhere, eliminadoEn: null, estatus: "VENCIDO" },
      _sum: { monto: true },
    }),
  ])

  const totalMes = await db.pago.aggregate({
    where: { ...vendedorWhere, eliminadoEn: null, creadoEn: { gte: inicioMes, lt: finMes } },
    _sum: { monto: true },
  })

  return {
    cobradoMes: cobradoMes._sum.monto ?? 0,
    pendiente: pendiente._sum.monto ?? 0,
    vencido: vencido._sum.monto ?? 0,
    totalMes: totalMes._sum.monto ?? 0,
  }
}
