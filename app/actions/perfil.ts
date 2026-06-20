"use server"

import { auth } from "@/app/lib/auth"
import { db } from "@/app/lib/db"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

async function getUsuarioId() {
  const session = await auth()
  if (!session?.user) throw new Error("No autenticado")
  return (session.user as { id: string }).id
}

export async function obtenerPerfil() {
  const id = await getUsuarioId()
  const usuario = await db.usuario.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      correo: true,
      rol: true,
      tema: true,
      densidad: true,
      onboardingCompletado: true,
      metaMensual: true,
      creadoEn: true,
    },
  })
  if (!usuario) throw new Error("Usuario no encontrado")
  return usuario
}

export async function actualizarPerfil(data: { nombre: string }) {
  const id = await getUsuarioId()
  if (!data.nombre?.trim()) throw new Error("El nombre no puede estar vacío")
  await db.usuario.update({ where: { id }, data: { nombre: data.nombre.trim() } })
  revalidatePath("/perfil")
  return { ok: true }
}

export async function cambiarContrasena(data: { actual: string; nueva: string; confirmar: string }) {
  const id = await getUsuarioId()

  if (data.nueva.length < 8) throw new Error("La nueva contraseña debe tener al menos 8 caracteres")
  if (data.nueva !== data.confirmar) throw new Error("Las contraseñas no coinciden")

  const usuario = await db.usuario.findUnique({ where: { id }, select: { contraseñaHash: true } })
  if (!usuario) throw new Error("Usuario no encontrado")

  const valido = await bcrypt.compare(data.actual, usuario.contraseñaHash)
  if (!valido) throw new Error("La contraseña actual es incorrecta")

  const hash = await bcrypt.hash(data.nueva, 12)
  await db.usuario.update({ where: { id }, data: { contraseñaHash: hash } })
  return { ok: true }
}

export async function actualizarTema(tema: "CLARO" | "OSCURO" | "AUTOMATICO") {
  const id = await getUsuarioId()
  await db.usuario.update({ where: { id }, data: { tema } })
  revalidatePath("/perfil")
  return { ok: true }
}

export async function marcarOnboardingCompletado(completado = true) {
  const id = await getUsuarioId()
  await db.usuario.update({ where: { id }, data: { onboardingCompletado: completado } })
  revalidatePath("/")
  return { ok: true }
}
