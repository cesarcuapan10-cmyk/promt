"use server"

import { auth } from "@/app/lib/auth"
import { db } from "@/app/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import bcrypt from "bcryptjs"

type SessionUser = { id: string; rol?: string }
async function getAdminSession(): Promise<{ user: SessionUser }> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("No autorizado")
  const user = session.user as SessionUser
  if (user.rol !== "ADMIN") throw new Error("Solo administradores")
  return session as { user: SessionUser }
}

const esquemaUsuario = z.object({
  nombre: z.string().min(1),
  correo: z.string().email(),
  contrasena: z.string().min(6),
  rol: z.enum(["ADMIN", "VENDEDOR"]).default("VENDEDOR"),
  metaMensual: z.coerce.number().optional().nullable(),
  comision: z.coerce.number().optional().nullable(),
})

export async function listarUsuarios() {
  await getAdminSession()
  return db.usuario.findMany({
    orderBy: { creadoEn: "asc" },
    select: {
      id: true,
      nombre: true,
      correo: true,
      rol: true,
      activo: true,
      metaMensual: true,
      comision: true,
      ligaAgenda: true,
      creadoEn: true,
      actualizadoEn: true,
      onboardingCompletado: true,
    },
  })
}

export async function crearUsuario(data: z.infer<typeof esquemaUsuario>) {
  const { user } = await getAdminSession()
  const parsed = esquemaUsuario.parse(data)

  const existe = await db.usuario.findUnique({ where: { correo: parsed.correo } })
  if (existe) return { ok: false, error: "Ya existe un usuario con ese correo" }

  const hash = await bcrypt.hash(parsed.contrasena, 10)
  const nuevo = await db.usuario.create({
    data: {
      nombre: parsed.nombre,
      correo: parsed.correo,
      contraseñaHash: hash,
      rol: parsed.rol,
      metaMensual: parsed.metaMensual ?? null,
      comision: parsed.comision ?? null,
    },
  })

  await db.registroAuditoria.create({
    data: {
      accion: "CREAR_USUARIO",
      usuarioId: user.id,
      entidad: "Usuario",
      entidadId: nuevo.id,
      descripcion: `Creó usuario ${parsed.nombre} (${parsed.rol})`,
    },
  })

  revalidatePath("/admin")
  return { ok: true, usuario: { id: nuevo.id, nombre: nuevo.nombre } }
}

export async function actualizarUsuario(
  id: string,
  data: {
    nombre?: string
    correo?: string
    rol?: string
    metaMensual?: number | null
    comision?: number | null
  }
) {
  const { user } = await getAdminSession()

  await db.usuario.update({ where: { id }, data })

  await db.registroAuditoria.create({
    data: {
      accion: "ACTUALIZAR_USUARIO",
      usuarioId: user.id,
      entidad: "Usuario",
      entidadId: id,
      descripcion: `Actualizó datos de usuario`,
    },
  })

  revalidatePath("/admin")
  return { ok: true }
}

export async function desactivarUsuario(id: string) {
  const { user } = await getAdminSession()
  if (id === user.id) return { ok: false, error: "No puedes desactivarte a ti mismo" }

  const u = await db.usuario.findUnique({ where: { id } })
  if (!u) return { ok: false, error: "Usuario no encontrado" }

  await db.usuario.update({ where: { id }, data: { activo: !u.activo } })

  await db.registroAuditoria.create({
    data: {
      accion: u.activo ? "DESACTIVAR_USUARIO" : "ACTIVAR_USUARIO",
      usuarioId: user.id,
      entidad: "Usuario",
      entidadId: id,
      descripcion: `${u.activo ? "Desactivó" : "Activó"} al usuario ${u.nombre}`,
    },
  })

  revalidatePath("/admin")
  return { ok: true }
}

export async function resetearContrasena(id: string, nuevaContrasena: string) {
  const { user } = await getAdminSession()
  if (nuevaContrasena.length < 6) return { ok: false, error: "Mínimo 6 caracteres" }

  const hash = await bcrypt.hash(nuevaContrasena, 10)
  await db.usuario.update({ where: { id }, data: { contraseñaHash: hash } })

  await db.registroAuditoria.create({
    data: {
      accion: "RESET_CONTRASENA",
      usuarioId: user.id,
      entidad: "Usuario",
      entidadId: id,
      descripcion: `Reseteó contraseña del usuario`,
    },
  })

  revalidatePath("/admin")
  return { ok: true }
}

export async function obtenerAuditoria(filtros?: {
  usuarioId?: string
  desde?: string
  hasta?: string
  pagina?: number
}) {
  await getAdminSession()
  const pagina = filtros?.pagina ?? 1
  const porPagina = 50

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    ...(filtros?.usuarioId && { usuarioId: filtros.usuarioId }),
    ...((filtros?.desde || filtros?.hasta) && {
      creadoEn: {
        ...(filtros.desde && { gte: new Date(filtros.desde) }),
        ...(filtros.hasta && { lte: new Date(filtros.hasta + "T23:59:59") }),
      },
    }),
  }

  const [registros, total] = await Promise.all([
    db.registroAuditoria.findMany({
      where,
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      orderBy: { creadoEn: "desc" },
      include: {
        usuario: { select: { id: true, nombre: true, correo: true } },
      },
    }),
    db.registroAuditoria.count({ where }),
  ])

  return { registros, total, paginas: Math.ceil(total / porPagina) }
}

export async function exportarTodo() {
  await getAdminSession()

  const [clientes, pagos, citas, notas, usuarios] = await Promise.all([
    db.cliente.findMany({ where: { eliminadoEn: null } }),
    db.pago.findMany({ where: { eliminadoEn: null } }),
    db.cita.findMany({ where: { eliminadoEn: null } }),
    db.nota.findMany({ where: { eliminadoEn: null } }),
    db.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        correo: true,
        rol: true,
        activo: true,
        metaMensual: true,
        creadoEn: true,
      },
    }),
  ])

  return {
    exportadoEn: new Date().toISOString(),
    clientes,
    pagos,
    citas,
    notas,
    usuarios,
  }
}

export async function obtenerMetaNegocio() {
  await getAdminSession()
  const meta = await db.metaNegocio.findUnique({ where: { id: "singleton" } })
  if (!meta) {
    return db.metaNegocio.create({ data: { id: "singleton" } })
  }
  return meta
}

export async function actualizarMetaNegocio(
  data: Partial<{
    nombre: string
    colorMarca: string
    moneda: string
    husoHorario: string
    horarioInicio: string
    horarioFin: string
    duracionCita: number
    mensajeWhatsapp: string
    metaMensual: number
    umbralEstancamiento: number
    comisionGlobal: number
    motivosPerdida: string
    metodoPago: string
  }>
) {
  const { user } = await getAdminSession()

  await db.metaNegocio.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  })

  await db.registroAuditoria.create({
    data: {
      accion: "ACTUALIZAR_META_NEGOCIO",
      usuarioId: user.id,
      entidad: "MetaNegocio",
      entidadId: "singleton",
      descripcion: "Actualizó configuración del negocio",
    },
  })

  revalidatePath("/admin")
  return { ok: true }
}
