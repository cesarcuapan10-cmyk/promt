"use server"

import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod/v4"
import { auth } from "@/app/lib/auth"
import { db } from "@/app/lib/db"
import { asegurarEsquemaVisage, guardarCookieSesion, inicioDeMes } from "@/app/studio/lib/servidor"

// Catálogo inicial típico de barbería en México para que la barbería arranque en 0 min.
// Los precios son referencia editable: cada barbería pone los suyos en Ajustes.
const CATALOGO_INICIAL = [
  { nombre: "Corte de cabello", precio: 250, tipo: "corte" },
  { nombre: "Corte + barba", precio: 380, tipo: "corte" },
  { nombre: "Arreglo de barba con toalla caliente", precio: 180, tipo: "servicio" },
  { nombre: "Perfilado de cejas", precio: 80, tipo: "servicio" },
  { nombre: "Limpieza facial", precio: 300, tipo: "servicio" },
  { nombre: "Decoloración / color", precio: 900, tipo: "servicio" },
  { nombre: "Pasta mate", precio: 280, tipo: "producto" },
  { nombre: "Polvo texturizador", precio: 250, tipo: "producto" },
  { nombre: "Aceite para barba", precio: 260, tipo: "producto" },
]

async function requerirAdmin() {
  const s = await auth()
  if (!s?.user) redirect("/login")
  if ((s.user as { rol?: string }).rol !== "ADMIN") throw new Error("Solo el administrador puede gestionar barberías")
  await asegurarEsquemaVisage()
}

function slugificar(t: string) {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
}

export async function listarBarberias() {
  await requerirAdmin()
  const desde = inicioDeMes()
  const barberias = await db.barberia.findMany({ orderBy: { creadoEn: "desc" } })
  const uso = await db.diagnosticoVisage.groupBy({
    by: ["barberiaId"],
    where: { creadoEn: { gte: desde } },
    _count: { _all: true },
    _sum: { total: true, extras: true },
  })
  const clientes = await db.clienteVisage.groupBy({ by: ["barberiaId"], _count: { _all: true } })
  const mapaUso = new Map(uso.map((u) => [u.barberiaId, u]))
  const mapaClientes = new Map(clientes.map((c) => [c.barberiaId, c._count._all]))
  return barberias.map((b) => ({
    id: b.id,
    slug: b.slug,
    nombre: b.nombre,
    ciudad: b.ciudad,
    plan: b.plan,
    limiteMensual: b.limiteMensual,
    activa: b.activa,
    creadoEn: b.creadoEn,
    usoMes: mapaUso.get(b.id)?._count._all ?? 0,
    ventasMes: mapaUso.get(b.id)?._sum.total ?? 0,
    extrasMes: mapaUso.get(b.id)?._sum.extras ?? 0,
    clientes: mapaClientes.get(b.id) ?? 0,
  }))
}

const NuevaBarberia = z.object({
  nombre: z.string().min(2).max(80),
  ciudad: z.string().max(80),
  pin: z.string().regex(/^\d{4,8}$/, "El PIN debe tener de 4 a 8 dígitos"),
  plan: z.enum(["BASICO", "PRO", "ILIMITADO"]),
  limiteMensual: z.coerce.number().int().min(1).max(100000),
})

export async function crearBarberia(_prev: unknown, form: FormData) {
  await requerirAdmin()
  const parsed = NuevaBarberia.safeParse(Object.fromEntries(form))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  const d = parsed.data

  let slug = slugificar(d.nombre) || "barberia"
  for (let i = 2; await db.barberia.findUnique({ where: { slug } }); i++) slug = `${slugificar(d.nombre)}-${i}`

  await db.barberia.create({
    data: {
      slug,
      nombre: d.nombre,
      ciudad: d.ciudad || null,
      pinHash: await bcrypt.hash(d.pin, 10),
      plan: d.plan,
      limiteMensual: d.limiteMensual,
      catalogo: JSON.stringify(CATALOGO_INICIAL),
    },
  })
  revalidatePath("/barberias")
  return { ok: `Barbería creada. Código de acceso: ${slug}` }
}

const Edicion = z.object({
  id: z.string(),
  plan: z.enum(["BASICO", "PRO", "ILIMITADO"]),
  limiteMensual: z.coerce.number().int().min(1).max(100000),
  activa: z.enum(["true", "false"]),
  pin: z.string().regex(/^(\d{4,8})?$/, "El PIN debe tener de 4 a 8 dígitos"),
})

export async function editarBarberia(_prev: unknown, form: FormData) {
  await requerirAdmin()
  const parsed = Edicion.safeParse(Object.fromEntries(form))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  const d = parsed.data
  await db.barberia.update({
    where: { id: d.id },
    data: {
      plan: d.plan,
      limiteMensual: d.limiteMensual,
      activa: d.activa === "true",
      ...(d.pin ? { pinHash: await bcrypt.hash(d.pin, 10), intentosFallidos: 0, bloqueadoHasta: null } : {}),
    },
  })
  revalidatePath("/barberias")
  return { ok: "Guardado" }
}

/** Abre el estudio como esa barbería (para demos, soporte o configurarla tú mismo). */
export async function abrirEstudio(form: FormData) {
  await requerirAdmin()
  const id = String(form.get("id") ?? "")
  const b = await db.barberia.findUnique({ where: { id } })
  if (!b) throw new Error("No existe")
  await guardarCookieSesion(b.id)
  redirect("/studio")
}
