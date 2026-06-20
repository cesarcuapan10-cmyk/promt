"use server"

import { auth } from "@/app/lib/auth"
import { db } from "@/app/lib/db"
import { z } from "zod"
import { revalidatePath } from "next/cache"

// ─── Schemas ───────────────────────────────────────────────────────────────

const clienteSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  telefono: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  correo: z.string().email("Correo inválido").optional().nullable().or(z.literal("")),
  origen: z.string().optional().nullable(),
  etapa: z.string().optional().nullable(),
  temperatura: z.string().optional().nullable(),
  estadoCartera: z.string().optional().nullable(),
  objecionPrincipal: z.string().optional().nullable(),
  valorEstimado: z.coerce.number().optional().nullable(),
  proximaAccion: z.string().optional().nullable(),
  fechaProximaAccion: z.string().optional().nullable(),
  retoPrincipal: z.string().optional().nullable(),
  numVendedores: z.coerce.number().int().optional().nullable(),
  empresaNombre: z.string().optional().nullable(),
  empresaGiro: z.string().optional().nullable(),
  empresaPuesto: z.string().optional().nullable(),
  empresaRfc: z.string().optional().nullable(),
  empresaSitio: z.string().optional().nullable(),
  empresaDireccion: z.string().optional().nullable(),
  empresaTamano: z.string().optional().nullable(),
  empresaNotas: z.string().optional().nullable(),
  utmSource: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
})

export type ClienteData = z.infer<typeof clienteSchema>

const filtrosSchema = z.object({
  etapa: z.string().optional(),
  temperatura: z.string().optional(),
  estadoCartera: z.string().optional(),
  vendedorId: z.string().optional(),
  busqueda: z.string().optional(),
  etiquetaId: z.string().optional(),
  sinProximaAccion: z.boolean().optional(),
  pagina: z.coerce.number().min(1).optional().default(1),
  porPagina: z.coerce.number().min(1).max(100).optional().default(25),
})

export type FiltrosClientes = z.infer<typeof filtrosSchema>

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
    vendedorId,
    etiquetaId,
    sinProximaAccion,
    pagina = 1,
    porPagina = 25,
  } = filtrosSchema.parse(filtros)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { eliminadoEn: null }

  if (userRol !== "ADMIN") {
    where.vendedorId = userId
  } else if (vendedorId) {
    where.vendedorId = vendedorId
  }

  if (busqueda) {
    where.OR = [
      { nombre: { contains: busqueda } },
      { correo: { contains: busqueda } },
      { telefono: { contains: busqueda } },
      { whatsapp: { contains: busqueda } },
      { empresaNombre: { contains: busqueda } },
    ]
  }

  if (etapa) where.etapa = etapa
  if (temperatura) where.temperatura = temperatura
  if (estadoCartera) where.estadoCartera = estadoCartera
  if (etiquetaId) where.etiquetas = { some: { etiquetaId } }
  if (sinProximaAccion) where.proximaAccion = null

  const [clientes, total] = await Promise.all([
    db.cliente.findMany({
      where,
      orderBy: [{ temperatura: "asc" }, { fechaProximaAccion: "asc" }, { creadoEn: "desc" }],
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      include: {
        etiquetas: { include: { etiqueta: true } },
        favoritos: { where: { usuarioId: userId }, select: { id: true } },
        _count: { select: { pagos: true, notasHistorial: true } },
      },
    }),
    db.cliente.count({ where }),
  ])

  const totalFavoritos = await db.favoritoCliente.count({ where: { usuarioId: userId } })

  return {
    clientes: clientes.map((c) => ({ ...c, esFavorito: c.favoritos.length > 0 })),
    total,
    paginas: Math.ceil(total / porPagina),
    pagina,
    totalFavoritos,
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
      favoritos: { where: { usuarioId: userId }, select: { id: true } },
      notasHistorial: {
        where: { eliminadoEn: null },
        orderBy: { fecha: "desc" },
        include: { usuario: { select: { nombre: true, avatar: true } } },
      },
      pagos: {
        where: { eliminadoEn: null },
        orderBy: { creadoEn: "desc" },
      },
      citas: {
        where: { eliminadoEn: null },
        orderBy: { fechaInicio: "desc" },
      },
      archivosSubidos: {
        select: {
          id: true,
          nombre: true,
          tipo: true,
          tamano: true,
          etiqueta: true,
          url: true,
          fechaSubida: true,
          usuarioId: true,
        },
        orderBy: { fechaSubida: "desc" },
      },
      vendedor: { select: { nombre: true } },
    },
  })

  if (!cliente) throw new Error("Cliente no encontrado")
  return { ...cliente, esFavorito: cliente.favoritos.length > 0 }
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
      whatsapp: parsed.whatsapp || parsed.telefono || null,
      origen: parsed.origen || null,
      etapa: parsed.etapa ?? "NUEVO",
      temperatura: parsed.temperatura ?? "TIBIO",
      estadoCartera: parsed.estadoCartera ?? "ACTIVO",
      objecionPrincipal: parsed.objecionPrincipal || null,
      valorEstimado: parsed.valorEstimado ?? null,
      proximaAccion: parsed.proximaAccion || null,
      fechaProximaAccion: parsed.fechaProximaAccion ? new Date(parsed.fechaProximaAccion) : null,
      retoPrincipal: parsed.retoPrincipal || null,
      numVendedores: parsed.numVendedores ?? null,
      empresaNombre: parsed.empresaNombre || null,
      empresaGiro: parsed.empresaGiro || null,
      empresaPuesto: parsed.empresaPuesto || null,
      empresaRfc: parsed.empresaRfc || null,
      empresaSitio: parsed.empresaSitio || null,
      empresaDireccion: parsed.empresaDireccion || null,
      empresaTamano: parsed.empresaTamano || null,
      empresaNotas: parsed.empresaNotas || null,
      utmSource: parsed.utmSource || null,
      notas: parsed.notas || null,
      vendedorId: userId,
    },
  })

  await registrarAuditoria(userId, "CREAR", "Cliente", cliente.id, `Cliente creado: ${cliente.nombre}`)

  revalidatePath("/clientes")
  revalidatePath("/embudo")
  return { ok: true, cliente }
}

export async function actualizarCliente(id: string, data: Partial<ClienteData>) {
  const session = await getSession()
  const userId = session.user.id
  const userRol = session.user.rol ?? "VENDEDOR"

  const cliente = await db.cliente.findFirst({
    where: { id, eliminadoEn: null, ...(userRol !== "ADMIN" ? { vendedorId: userId } : {}) },
  })
  if (!cliente) throw new Error("Cliente no encontrado")

  const parsed = clienteSchema.partial().parse(data)

  const actualizado = await db.cliente.update({
    where: { id },
    data: {
      ...(parsed.nombre !== undefined && { nombre: parsed.nombre }),
      ...(parsed.correo !== undefined && { correo: parsed.correo || null }),
      ...(parsed.telefono !== undefined && { telefono: parsed.telefono || null }),
      ...(parsed.whatsapp !== undefined && { whatsapp: parsed.whatsapp || null }),
      ...(parsed.origen !== undefined && { origen: parsed.origen || null }),
      ...(parsed.etapa !== undefined && { etapa: parsed.etapa ?? cliente.etapa }),
      ...(parsed.temperatura !== undefined && { temperatura: parsed.temperatura ?? cliente.temperatura }),
      ...(parsed.estadoCartera !== undefined && { estadoCartera: parsed.estadoCartera ?? cliente.estadoCartera }),
      ...(parsed.objecionPrincipal !== undefined && { objecionPrincipal: parsed.objecionPrincipal || null }),
      ...(parsed.valorEstimado !== undefined && { valorEstimado: parsed.valorEstimado ?? null }),
      ...(parsed.proximaAccion !== undefined && { proximaAccion: parsed.proximaAccion || null }),
      ...(parsed.fechaProximaAccion !== undefined && {
        fechaProximaAccion: parsed.fechaProximaAccion ? new Date(parsed.fechaProximaAccion) : null,
      }),
      ...(parsed.retoPrincipal !== undefined && { retoPrincipal: parsed.retoPrincipal || null }),
      ...(parsed.numVendedores !== undefined && { numVendedores: parsed.numVendedores ?? null }),
      ...(parsed.empresaNombre !== undefined && { empresaNombre: parsed.empresaNombre || null }),
      ...(parsed.empresaGiro !== undefined && { empresaGiro: parsed.empresaGiro || null }),
      ...(parsed.empresaPuesto !== undefined && { empresaPuesto: parsed.empresaPuesto || null }),
      ...(parsed.empresaRfc !== undefined && { empresaRfc: parsed.empresaRfc || null }),
      ...(parsed.empresaSitio !== undefined && { empresaSitio: parsed.empresaSitio || null }),
      ...(parsed.empresaDireccion !== undefined && { empresaDireccion: parsed.empresaDireccion || null }),
      ...(parsed.empresaTamano !== undefined && { empresaTamano: parsed.empresaTamano || null }),
      ...(parsed.empresaNotas !== undefined && { empresaNotas: parsed.empresaNotas || null }),
      ...(parsed.utmSource !== undefined && { utmSource: parsed.utmSource || null }),
      ...(parsed.notas !== undefined && { notas: parsed.notas || null }),
    },
  })

  await registrarAuditoria(userId, "ACTUALIZAR", "Cliente", id, `Cliente actualizado: ${actualizado.nombre}`)

  revalidatePath("/clientes")
  revalidatePath(`/clientes/${id}`)
  revalidatePath("/embudo")
  return { ok: true, cliente: actualizado }
}

export async function cambiarEtapa(clienteId: string, nuevaEtapa: string) {
  const session = await getSession()
  const userId = session.user.id
  const userRol = session.user.rol ?? "VENDEDOR"

  const cliente = await db.cliente.findFirst({
    where: { id: clienteId, eliminadoEn: null, ...(userRol !== "ADMIN" ? { vendedorId: userId } : {}) },
  })
  if (!cliente) throw new Error("Cliente no encontrado")

  await db.cliente.update({
    where: { id: clienteId },
    data: { etapa: nuevaEtapa, etapaAnterior: cliente.etapa },
  })

  await registrarAuditoria(
    userId,
    "CAMBIAR_ETAPA",
    "Cliente",
    clienteId,
    `Etapa cambiada de ${cliente.etapa} a ${nuevaEtapa}`
  )

  revalidatePath("/clientes")
  revalidatePath(`/clientes/${clienteId}`)
  revalidatePath("/embudo")
  return { ok: true }
}

export async function cambiarEstadoCartera(
  clienteId: string,
  nuevoEstado: "ACTIVO" | "GANADO" | "PERDIDO" | "ARCHIVADO",
  motivoPerdida?: string
) {
  const session = await getSession()
  const userId = session.user.id
  const userRol = session.user.rol ?? "VENDEDOR"

  const cliente = await db.cliente.findFirst({
    where: { id: clienteId, eliminadoEn: null, ...(userRol !== "ADMIN" ? { vendedorId: userId } : {}) },
  })
  if (!cliente) throw new Error("Cliente no encontrado")

  await db.cliente.update({
    where: { id: clienteId },
    data: {
      estadoCartera: nuevoEstado,
      estadoAnterior: cliente.estadoCartera,
      ...(motivoPerdida !== undefined && { motivoPerdida }),
      ...(nuevoEstado === "GANADO" && { etapa: "GANADO" }),
      ...(nuevoEstado === "PERDIDO" && { etapa: "PERDIDO" }),
    },
  })

  await db.nota.create({
    data: {
      clienteId,
      usuarioId: userId,
      contenido:
        nuevoEstado === "GANADO"
          ? "🎉 ¡Cliente marcado como Ganado!"
          : nuevoEstado === "PERDIDO"
            ? `❌ Cliente marcado como Perdido${motivoPerdida ? `. Motivo: ${motivoPerdida}` : ""}`
            : `Estado cambiado a ${nuevoEstado}`,
      tipo: "SISTEMA",
    },
  })

  await registrarAuditoria(
    userId,
    "CAMBIAR_ESTADO",
    "Cliente",
    clienteId,
    `Estado de cartera cambiado a ${nuevoEstado}`
  )

  revalidatePath("/clientes")
  revalidatePath(`/clientes/${clienteId}`)
  revalidatePath("/embudo")
  return { ok: true }
}

export async function eliminarCliente(id: string) {
  const session = await getSession()
  const userId = session.user.id
  const userRol = session.user.rol ?? "VENDEDOR"

  const cliente = await db.cliente.findFirst({
    where: { id, eliminadoEn: null, ...(userRol !== "ADMIN" ? { vendedorId: userId } : {}) },
  })
  if (!cliente) throw new Error("Cliente no encontrado")

  await db.cliente.update({ where: { id }, data: { eliminadoEn: new Date() } })

  await registrarAuditoria(userId, "ELIMINAR", "Cliente", id, `Cliente eliminado: ${cliente.nombre}`)

  revalidatePath("/clientes")
  revalidatePath("/embudo")
  return { ok: true }
}

export async function restaurarCliente(id: string) {
  const session = await getSession()
  const userId = session.user.id
  const userRol = session.user.rol ?? "VENDEDOR"

  const cliente = await db.cliente.findFirst({
    where: { id, ...(userRol !== "ADMIN" ? { vendedorId: userId } : {}) },
  })
  if (!cliente) throw new Error("Cliente no encontrado")

  await db.cliente.update({ where: { id }, data: { eliminadoEn: null } })

  await registrarAuditoria(userId, "RESTAURAR", "Cliente", id, `Cliente restaurado: ${cliente.nombre}`)

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
    revalidatePath("/clientes")
    return { ok: true, favorito: false }
  } else {
    await db.favoritoCliente.create({ data: { usuarioId: userId, clienteId } })
    revalidatePath("/clientes")
    return { ok: true, favorito: true }
  }
}

export async function verificarDuplicado(telefono?: string, correo?: string) {
  await getSession()

  if (!telefono && !correo) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const condiciones: any[] = []
  if (telefono) {
    const limpio = telefono.replace(/\D/g, "")
    condiciones.push({ telefono: { contains: limpio } })
    condiciones.push({ whatsapp: { contains: limpio } })
  }
  if (correo) condiciones.push({ correo })

  const cliente = await db.cliente.findFirst({
    where: { eliminadoEn: null, OR: condiciones },
    select: { id: true, nombre: true, telefono: true, correo: true, etapa: true },
  })

  return cliente ?? null
}

export async function agregarNota(
  clienteId: string,
  contenido: string,
  tipo: string,
  fecha?: string
) {
  const session = await getSession()
  const userId = session.user.id

  const cliente = await db.cliente.findFirst({
    where: { id: clienteId, eliminadoEn: null },
  })
  if (!cliente) throw new Error("Cliente no encontrado")

  const nota = await db.nota.create({
    data: {
      clienteId,
      usuarioId: userId,
      contenido,
      tipo,
      fecha: fecha ? new Date(fecha) : new Date(),
    },
  })

  // Actualizar ultimoContacto si es una interacción
  if (["LLAMADA", "WHATSAPP", "CORREO", "CITA"].includes(tipo)) {
    await db.cliente.update({
      where: { id: clienteId },
      data: { ultimoContacto: new Date() },
    })
  }

  revalidatePath(`/clientes/${clienteId}`)
  return { ok: true, nota }
}

export async function duplicarCliente(id: string) {
  const session = await getSession()
  const userId = session.user.id

  const original = await db.cliente.findFirst({
    where: { id, eliminadoEn: null, vendedorId: userId },
  })
  if (!original) throw new Error("Cliente no encontrado")

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, creadoEn: _c, actualizadoEn: _a, eliminadoEn: _e, ...resto } = original

  const duplicado = await db.cliente.create({
    data: {
      ...resto,
      nombre: `${original.nombre} (copia)`,
      vendedorId: userId,
    },
  })

  await registrarAuditoria(userId, "DUPLICAR", "Cliente", duplicado.id, `Cliente duplicado de ${original.nombre}`)

  revalidatePath("/clientes")
  return { ok: true, cliente: duplicado }
}
