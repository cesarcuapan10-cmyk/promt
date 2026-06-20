"use server"

import { auth } from "@/app/lib/auth"
import { db } from "@/app/lib/db"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { z } from "zod"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) throw new Error("No autenticado")
  const usuario = session.user as { id: string; rol: string }
  if (usuario.rol !== "ADMIN") throw new Error("Acceso denegado")
  return usuario
}

// ─── Usuarios ──────────────────────────────────────────────────────────────

export async function listarUsuarios() {
  await requireAdmin()
  return db.usuario.findMany({
    select: {
      id: true,
      nombre: true,
      correo: true,
      rol: true,
      activo: true,
      metaMensual: true,
      creadoEn: true,
      tema: true,
      onboardingCompletado: true,
    },
    orderBy: { creadoEn: "asc" },
  })
}

const crearUsuarioSchema = z.object({
  nombre: z.string().min(1),
  correo: z.string().email(),
  contraseña: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  rol: z.enum(["ADMIN", "VENDEDOR"]),
  metaMensual: z.coerce.number().optional(),
})

export async function crearUsuario(data: {
  nombre: string
  correo: string
  contraseña: string
  rol: string
  metaMensual?: number
}) {
  await requireAdmin()
  const parsed = crearUsuarioSchema.parse(data)

  const existe = await db.usuario.findUnique({ where: { correo: parsed.correo } })
  if (existe) throw new Error("Ya existe un usuario con ese correo")

  const hash = await bcrypt.hash(parsed.contraseña, 12)
  const usuario = await db.usuario.create({
    data: {
      nombre: parsed.nombre,
      correo: parsed.correo,
      contraseñaHash: hash,
      rol: parsed.rol,
      metaMensual: parsed.metaMensual,
    },
  })

  await db.registroAuditoria.create({
    data: {
      accion: "CREAR_USUARIO",
      entidad: "Usuario",
      entidadId: usuario.id,
      descripcion: `Usuario creado: ${parsed.nombre} (${parsed.correo})`,
    },
  })

  revalidatePath("/admin")
  return { ok: true }
}

export async function actualizarUsuario(
  id: string,
  data: {
    nombre?: string
    correo?: string
    rol?: string
    activo?: boolean
    metaMensual?: number | null
  }
) {
  const admin = await requireAdmin()
  await db.usuario.update({ where: { id }, data })

  await db.registroAuditoria.create({
    data: {
      usuarioId: admin.id,
      accion: "ACTUALIZAR_USUARIO",
      entidad: "Usuario",
      entidadId: id,
      descripcion: `Usuario actualizado: ${JSON.stringify(data)}`,
    },
  })

  revalidatePath("/admin")
  return { ok: true }
}

export async function desactivarUsuario(id: string) {
  const admin = await requireAdmin()
  await db.usuario.update({ where: { id }, data: { activo: false } })

  await db.registroAuditoria.create({
    data: {
      usuarioId: admin.id,
      accion: "DESACTIVAR_USUARIO",
      entidad: "Usuario",
      entidadId: id,
      descripcion: `Usuario desactivado`,
    },
  })

  revalidatePath("/admin")
  return { ok: true }
}

export async function resetearContrasena(id: string, nuevaContraseña: string) {
  await requireAdmin()
  if (nuevaContraseña.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres")
  const hash = await bcrypt.hash(nuevaContraseña, 12)
  await db.usuario.update({ where: { id }, data: { contraseñaHash: hash } })
  revalidatePath("/admin")
  return { ok: true }
}

// ─── Configuración del negocio ─────────────────────────────────────────────

export async function obtenerConfigNegocio() {
  await requireAdmin()
  let config = await db.metaNegocio.findUnique({ where: { id: "singleton" } })
  if (!config) {
    config = await db.metaNegocio.create({ data: { id: "singleton" } })
  }
  return config
}

export async function actualizarConfigNegocio(data: {
  nombre?: string
  mensajeWhatsapp?: string
  metaMensual?: number
  umbralEstancamiento?: number
  metodoPago?: string
  motivosPerdida?: string
}) {
  const admin = await requireAdmin()
  await db.metaNegocio.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  })

  await db.registroAuditoria.create({
    data: {
      usuarioId: admin.id,
      accion: "ACTUALIZAR_CONFIG",
      entidad: "MetaNegocio",
      entidadId: "singleton",
      descripcion: "Configuración del negocio actualizada",
    },
  })

  revalidatePath("/admin")
  return { ok: true }
}

// ─── Auditoría ─────────────────────────────────────────────────────────────

export async function listarAuditoria(params?: {
  pagina?: number
  usuario?: string
  desde?: string
  hasta?: string
}) {
  await requireAdmin()
  const pagina = params?.pagina ?? 1
  const skip = (pagina - 1) * 25

  const where: Record<string, unknown> = {}
  if (params?.usuario) where.usuarioId = params.usuario
  if (params?.desde || params?.hasta) {
    where.creadoEn = {
      ...(params.desde ? { gte: new Date(params.desde) } : {}),
      ...(params.hasta ? { lte: new Date(params.hasta) } : {}),
    }
  }

  const [registros, total] = await Promise.all([
    db.registroAuditoria.findMany({
      where,
      include: { usuario: { select: { nombre: true } } },
      orderBy: { creadoEn: "desc" },
      skip,
      take: 25,
    }),
    db.registroAuditoria.count({ where }),
  ])

  return { registros, total, pagina, totalPaginas: Math.ceil(total / 25) }
}

export async function exportarDatos() {
  await requireAdmin()

  const [clientes, citas, pagos, notas] = await Promise.all([
    db.cliente.findMany(),
    db.cita.findMany(),
    db.pago.findMany(),
    db.nota.findMany(),
  ])

  return { clientes, citas, pagos, notas, exportadoEn: new Date().toISOString() }
}

export async function exportarCSV(tipo: "clientes" | "pagos" | "citas") {
  await requireAdmin()

  if (tipo === "clientes") {
    const clientes = await db.cliente.findMany({ include: { vendedor: { select: { nombre: true } } } })
    const headers = "nombre,correo,telefono,etapa,temperatura,origen,vendedor,creadoEn"
    const rows = clientes.map((c) =>
      [c.nombre, c.correo, c.telefono, c.etapa, c.temperatura, c.origen, c.vendedor.nombre, c.creadoEn.toISOString()].join(",")
    )
    return [headers, ...rows].join("\n")
  }

  if (tipo === "pagos") {
    const pagos = await db.pago.findMany({ include: { cliente: { select: { nombre: true } }, vendedor: { select: { nombre: true } } } })
    const headers = "cliente,vendedor,monto,metodo,estatus,concepto,fechaPago,creadoEn"
    const rows = pagos.map((p) =>
      [p.cliente.nombre, p.vendedor.nombre, p.monto, p.metodo, p.estatus, p.concepto, p.fechaPago?.toISOString() ?? "", p.creadoEn.toISOString()].join(",")
    )
    return [headers, ...rows].join("\n")
  }

  if (tipo === "citas") {
    const citas = await db.cita.findMany({ include: { cliente: { select: { nombre: true } }, vendedor: { select: { nombre: true } } } })
    const headers = "cliente,vendedor,titulo,fechaInicio,fechaFin,confirmada"
    const rows = citas.map((c) =>
      [c.cliente.nombre, c.vendedor.nombre, c.titulo, c.fechaInicio.toISOString(), c.fechaFin.toISOString(), c.confirmada].join(",")
    )
    return [headers, ...rows].join("\n")
  }

  return ""
}

// ─── Papelera ──────────────────────────────────────────────────────────────

export async function listarPapelera() {
  await requireAdmin()
  const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  return db.cliente.findMany({
    where: { eliminadoEn: { not: null, gte: hace30Dias } },
    select: { id: true, nombre: true, correo: true, telefono: true, eliminadoEn: true, vendedor: { select: { nombre: true } } },
    orderBy: { eliminadoEn: "desc" },
  })
}

export async function restaurarDePapelera(id: string) {
  const admin = await requireAdmin()
  await db.cliente.update({ where: { id }, data: { eliminadoEn: null } })

  await db.registroAuditoria.create({
    data: {
      usuarioId: admin.id,
      accion: "RESTAURAR_CLIENTE",
      entidad: "Cliente",
      entidadId: id,
      descripcion: "Cliente restaurado de la papelera",
    },
  })

  revalidatePath("/admin")
  return { ok: true }
}

export async function vaciarPapelera() {
  const admin = await requireAdmin()
  const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const resultado = await db.cliente.deleteMany({
    where: { eliminadoEn: { not: null, gte: hace30Dias } },
  })

  await db.registroAuditoria.create({
    data: {
      usuarioId: admin.id,
      accion: "VACIAR_PAPELERA",
      entidad: "Cliente",
      descripcion: `Papelera vaciada: ${resultado.count} clientes eliminados permanentemente`,
    },
  })

  revalidatePath("/admin")
  return { ok: true, eliminados: resultado.count }
}
