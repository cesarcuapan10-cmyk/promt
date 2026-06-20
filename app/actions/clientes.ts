"use server"

import { auth } from "@/app/lib/auth"
import { db } from "@/app/lib/db"
import { z } from "zod"
import { revalidatePath } from "next/cache"

// ─── Schemas ───────────────────────────────────────────────────────────────

const clienteSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  correo: z.string().email("Correo inválido").optional().or(z.literal("")),
  telefono: z.string().optional(),
  whatsapp: z.string().optional(),
  empresa: z.string().optional(),
  cargo: z.string().optional(),
  etapa: z.string().optional(),
  temperatura: z.string().optional(),
  origen: z.string().optional(),
  presupuesto: z.coerce.number().optional(),
  moneda: z.string().optional(),
  notas: z.string().optional(),
  estadoCartera: z.string().optional(),
})

const filtrosSchema = z.object({
  busqueda: z.string().optional(),
  etapa: z.string().optional(),
  temperatura: z.string().optional(),
  estadoCartera: z.string().optional(),
  ordenarPor: z.enum(["nombre", "creadoEn", "valorEstimado"]).optional(),
  orden: z.enum(["asc", "desc"]).optional(),
  pagina: z.coerce.number().min(1).optional().default(1),
  porPagina: z.coerce.number().min(1).max(100).optional().default(20),
})

export type FiltrosClientes = z.infer<typeof filtrosSchema>
export type ClienteData = z.infer<typeof clienteSchema>

// ─── Helpers ───────────────────────────────────────────────────────────────

type SessionUser = { id: string; rol?: string }

async function getSession(): Promise<{ user: SessionUser }> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("No autorizado")
  return session as { user: SessionUser }
}

async function registrarAuditoria(
  usuarioId: string,
  accion: string,
  entidad: string,
  entidadId: string,
  descripcion: string
) {
  await db.registroAuditoria.create({
    data: { usuarioId, accion, entidad, entidadId, descripcion },
  })
}

// ─── Actions ───────────────────────────────────────────────────────────────

export async function listarClientes(filtros: Partial<FiltrosClientes> = {}) {
  const session = await getSession()
  const userId = session.user.id
  const userRol = session.user.rol ?? "VENDEDOR"

  const {
    busqueda,
    etapa,
    temperatura,
    estadoCartera,
    ordenarPor = "creadoEn",
    orden = "desc",
    pagina = 1,
    porPagina = 20,
  } = filtrosSchema.parse(filtros)

  const where: Record<string, unknown> = {
    eliminadoEn: null,
  }

  if (userRol !== "ADMIN") {
    where.vendedorId = userId
  }

  if (busqueda) {
    where.OR = [
      { nombre: { contains: busqueda } },
      { correo: { contains: busqueda } },
      { telefono: { contains: busqueda } },
      { empresaNombre: { contains: busqueda } },
    ]
  }

  if (etapa) where.etapa = etapa
  if (temperatura) where.temperatura = temperatura
  if (estadoCartera) where.estadoCartera = estadoCartera

  const orderField = ordenarPor === "valorEstimado" ? "valorEstimado" : ordenarPor

  const [clientes, total] = await Promise.all([
    db.cliente.findMany({
      where,
      orderBy: { [orderField]: orden },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      include: {
        etiquetas: { include: { etiqueta: true } },
        _count: { select: { pagos: true, notasHistorial: true } },
      },
    }),
    db.cliente.count({ where }),
  ])

  return {
    clientes,
    total,
    paginas: Math.ceil(total / porPagina),
    pagina,
  }
}

export async function obtenerCliente(id: string) {
  const session = await getSession()
  const userId = session.user.id
  const userRol = session.user.rol ?? "VENDEDOR"

  const cliente = await db.cliente.findFirst({
    where: {
      id,
      eliminadoEn: null,
      ...(userRol !== "ADMIN" ? { vendedorId: userId } : {}),
    },
    include: {
      etiquetas: { include: { etiqueta: true } },
      pagos: {
        where: { eliminadoEn: null },
        select: { monto: true, estatus: true },
      },
      notasHistorial: {
        where: { eliminadoEn: null },
        orderBy: { creadoEn: "desc" },
        take: 1,
        select: { contenido: true, creadoEn: true },
      },
    },
  })

  if (!cliente) throw new Error("Cliente no encontrado")
  return cliente
}

export async function crearCliente(data: ClienteData) {
  const session = await getSession()
  const userId = session.user.id

  const parsed = clienteSchema.parse(data)

  const cliente = await db.cliente.create({
    data: {
      nombre: parsed.nombre,
      correo: parsed.correo || null,
      telefono: parsed.telefono || null,
      whatsapp: parsed.telefono || null,
      empresaNombre: parsed.empresa || null,
      empresaPuesto: parsed.cargo || null,
      etapa: parsed.etapa ?? "NUEVO",
      temperatura: parsed.temperatura ?? "TIBIO",
      origen: parsed.origen || null,
      valorEstimado: parsed.presupuesto ?? null,
      notas: parsed.notas || null,
      estadoCartera: parsed.estadoCartera ?? "ACTIVO",
      vendedorId: userId,
    },
  })

  await registrarAuditoria(
    userId,
    "CREAR",
    "Cliente",
    cliente.id,
    `Cliente creado: ${cliente.nombre}`
  )

  revalidatePath("/clientes")
  return { ok: true, cliente }
}

export async function actualizarCliente(id: string, data: ClienteData) {
  const session = await getSession()
  const userId = session.user.id
  const userRol = session.user.rol ?? "VENDEDOR"

  const parsed = clienteSchema.parse(data)

  const cliente = await db.cliente.findFirst({
    where: {
      id,
      eliminadoEn: null,
      ...(userRol !== "ADMIN" ? { vendedorId: userId } : {}),
    },
  })

  if (!cliente) throw new Error("Cliente no encontrado")

  const actualizado = await db.cliente.update({
    where: { id },
    data: {
      nombre: parsed.nombre,
      correo: parsed.correo || null,
      telefono: parsed.telefono || null,
      whatsapp: parsed.telefono || null,
      empresaNombre: parsed.empresa || null,
      empresaPuesto: parsed.cargo || null,
      etapa: parsed.etapa ?? cliente.etapa,
      temperatura: parsed.temperatura ?? cliente.temperatura,
      origen: parsed.origen || cliente.origen,
      valorEstimado: parsed.presupuesto ?? cliente.valorEstimado,
      notas: parsed.notas || null,
      estadoCartera: parsed.estadoCartera ?? cliente.estadoCartera,
    },
  })

  await registrarAuditoria(
    userId,
    "ACTUALIZAR",
    "Cliente",
    id,
    `Cliente actualizado: ${actualizado.nombre}`
  )

  revalidatePath("/clientes")
  return { ok: true, cliente: actualizado }
}

export async function eliminarCliente(id: string) {
  const session = await getSession()
  const userId = session.user.id
  const userRol = session.user.rol ?? "VENDEDOR"

  const cliente = await db.cliente.findFirst({
    where: {
      id,
      eliminadoEn: null,
      ...(userRol !== "ADMIN" ? { vendedorId: userId } : {}),
    },
  })

  if (!cliente) throw new Error("Cliente no encontrado")

  await db.cliente.update({
    where: { id },
    data: { eliminadoEn: new Date() },
  })

  await registrarAuditoria(
    userId,
    "ELIMINAR",
    "Cliente",
    id,
    `Cliente eliminado: ${cliente.nombre}`
  )

  revalidatePath("/clientes")
  return { ok: true }
}

export async function cambiarEtapa(id: string, etapa: string) {
  const session = await getSession()
  const userId = session.user.id
  const userRol = session.user.rol ?? "VENDEDOR"

  const cliente = await db.cliente.findFirst({
    where: {
      id,
      eliminadoEn: null,
      ...(userRol !== "ADMIN" ? { vendedorId: userId } : {}),
    },
  })

  if (!cliente) throw new Error("Cliente no encontrado")

  await db.cliente.update({
    where: { id },
    data: { etapa, etapaAnterior: cliente.etapa },
  })

  await registrarAuditoria(
    userId,
    "CAMBIAR_ETAPA",
    "Cliente",
    id,
    `Etapa cambiada de ${cliente.etapa} a ${etapa}`
  )

  revalidatePath("/clientes")
  return { ok: true }
}

export async function toggleFavorito(clienteId: string) {
  const session = await getSession()
  const userId = session.user.id

  const existente = await db.favoritoCliente.findUnique({
    where: { usuarioId_clienteId: { usuarioId: userId, clienteId } },
  })

  if (existente) {
    await db.favoritoCliente.delete({
      where: { usuarioId_clienteId: { usuarioId: userId, clienteId } },
    })
    return { ok: true, favorito: false }
  } else {
    await db.favoritoCliente.create({
      data: { usuarioId: userId, clienteId },
    })
    return { ok: true, favorito: true }
  }
}
