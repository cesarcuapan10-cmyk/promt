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
}) {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error("No autorizado")

  const pagina = filtros?.pagina ?? 1
  const porPagina = 20

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    eliminadoEn: null,
    ...(((sesion.user as { rol?: string }).rol) !== "ADMIN" && { vendedorId: sesion.user.id }),
    ...(filtros?.estatus && { estatus: filtros.estatus }),
    ...(filtros?.clienteId && { clienteId: filtros.clienteId }),
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
