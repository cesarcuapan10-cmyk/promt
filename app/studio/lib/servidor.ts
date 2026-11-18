import "server-only"
import { cookies } from "next/headers"
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { db } from "@/app/lib/db"
import type { Barberia } from "@prisma/client"
import type { ItemCatalogo } from "./esquema"

// ─────────────────────────────────────────────────────────────
// Auto-migración ADITIVA (mismo patrón que la agenda): en Turso no corre
// `prisma migrate deploy`, así que las tablas se crean la primera vez.
// ─────────────────────────────────────────────────────────────
const SENTENCIAS = [
  `CREATE TABLE IF NOT EXISTS "Barberia" (
    "id" TEXT NOT NULL PRIMARY KEY, "slug" TEXT NOT NULL, "nombre" TEXT NOT NULL, "logo" TEXT,
    "colorMarca" TEXT NOT NULL DEFAULT '#d4af6a', "whatsapp" TEXT, "enlaceAgenda" TEXT, "instagram" TEXT,
    "ciudad" TEXT, "pinHash" TEXT NOT NULL, "plan" TEXT NOT NULL DEFAULT 'PRO',
    "limiteMensual" INTEGER NOT NULL DEFAULT 150, "activa" BOOLEAN NOT NULL DEFAULT true,
    "catalogo" TEXT NOT NULL DEFAULT '[]', "barberos" TEXT NOT NULL DEFAULT '[]',
    "intentosFallidos" INTEGER NOT NULL DEFAULT 0, "bloqueadoHasta" DATETIME,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "actualizadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Barberia_slug_key" ON "Barberia"("slug")`,
  `CREATE INDEX IF NOT EXISTS "Barberia_activa_idx" ON "Barberia"("activa")`,
  `CREATE TABLE IF NOT EXISTS "ClienteVisage" (
    "id" TEXT NOT NULL PRIMARY KEY, "barberiaId" TEXT NOT NULL, "nombre" TEXT NOT NULL, "telefono" TEXT,
    "edad" TEXT, "ocupacion" TEXT, "notas" TEXT,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "actualizadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClienteVisage_barberiaId_fkey" FOREIGN KEY ("barberiaId") REFERENCES "Barberia" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "ClienteVisage_barberiaId_idx" ON "ClienteVisage"("barberiaId")`,
  `CREATE INDEX IF NOT EXISTS "ClienteVisage_telefono_idx" ON "ClienteVisage"("telefono")`,
  `CREATE TABLE IF NOT EXISTS "DiagnosticoVisage" (
    "id" TEXT NOT NULL PRIMARY KEY, "barberiaId" TEXT NOT NULL, "clienteId" TEXT NOT NULL, "barbero" TEXT,
    "contexto" TEXT NOT NULL, "medidas" TEXT, "diagnostico" TEXT NOT NULL, "fotoFrente" TEXT NOT NULL,
    "simulaciones" TEXT NOT NULL DEFAULT '{}', "corteElegido" TEXT, "fotoReal" TEXT,
    "serviciosVendidos" TEXT NOT NULL DEFAULT '[]', "total" REAL, "extras" REAL, "token" TEXT NOT NULL,
    "cerradoEn" DATETIME, "proximaVisita" DATETIME, "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiagnosticoVisage_barberiaId_fkey" FOREIGN KEY ("barberiaId") REFERENCES "Barberia" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DiagnosticoVisage_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "ClienteVisage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "DiagnosticoVisage_token_key" ON "DiagnosticoVisage"("token")`,
  `CREATE INDEX IF NOT EXISTS "DiagnosticoVisage_barberiaId_creadoEn_idx" ON "DiagnosticoVisage"("barberiaId", "creadoEn")`,
  `CREATE INDEX IF NOT EXISTS "DiagnosticoVisage_clienteId_idx" ON "DiagnosticoVisage"("clienteId")`,
  `CREATE INDEX IF NOT EXISTS "DiagnosticoVisage_proximaVisita_idx" ON "DiagnosticoVisage"("proximaVisita")`,
]

let esquemaListo: Promise<void> | null = null
export function asegurarEsquemaVisage() {
  if (!esquemaListo) {
    esquemaListo = (async () => {
      for (const sql of SENTENCIAS) {
        try {
          await db.$executeRawUnsafe(sql)
        } catch {
          // ya existía
        }
      }
    })().catch((e) => {
      esquemaListo = null
      throw e
    })
  }
  return esquemaListo
}

// ─────────────────────────────────────────────────────────────
// Sesión de barbería: cookie firmada con HMAC (AUTH_SECRET), 30 días.
// ─────────────────────────────────────────────────────────────
export const COOKIE_SESION = "visage_sesion"
const DURACION_S = 60 * 60 * 24 * 30

function secreto() {
  const s = process.env.AUTH_SECRET
  if (!s) throw new Error("Falta AUTH_SECRET")
  return s
}

export function firmarSesion(barberiaId: string) {
  const datos = Buffer.from(JSON.stringify({ b: barberiaId, e: Date.now() + DURACION_S * 1000 })).toString("base64url")
  const firma = createHmac("sha256", secreto()).update(datos).digest("base64url")
  return `${datos}.${firma}`
}

function verificarSesion(valor: string | undefined): string | null {
  if (!valor) return null
  const [datos, firma] = valor.split(".")
  if (!datos || !firma) return null
  const esperada = createHmac("sha256", secreto()).update(datos).digest()
  const recibida = Buffer.from(firma, "base64url")
  if (recibida.length !== esperada.length || !timingSafeEqual(recibida, esperada)) return null
  try {
    const { b, e } = JSON.parse(Buffer.from(datos, "base64url").toString())
    return typeof b === "string" && e > Date.now() ? b : null
  } catch {
    return null
  }
}

export async function guardarCookieSesion(barberiaId: string) {
  const c = await cookies()
  c.set(COOKIE_SESION, firmarSesion(barberiaId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_S,
  })
}

export async function barberiaActual(): Promise<Barberia | null> {
  await asegurarEsquemaVisage()
  const c = await cookies()
  const id = verificarSesion(c.get(COOKIE_SESION)?.value)
  if (!id) return null
  const b = await db.barberia.findUnique({ where: { id } })
  return b?.activa ? b : null
}

/** Para route handlers: devuelve la barbería o una respuesta 401 lista para regresar. */
export async function requerirBarberia(): Promise<Barberia | Response> {
  const b = await barberiaActual()
  return b ?? Response.json({ error: "Tu sesión terminó. Vuelve a entrar con el PIN." }, { status: 401 })
}

// ─────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────
export function inicioDeMes(fecha = new Date()) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1)
}

export async function usoDelMes(barberiaId: string) {
  return db.diagnosticoVisage.count({ where: { barberiaId, creadoEn: { gte: inicioDeMes() } } })
}

export function tokenPublico() {
  return randomBytes(12).toString("base64url")
}

export function json<T>(texto: string | null | undefined, defecto: T): T {
  if (!texto) return defecto
  try {
    return JSON.parse(texto) as T
  } catch {
    return defecto
  }
}

export function barberiaPublica(b: Barberia) {
  return {
    id: b.id,
    slug: b.slug,
    nombre: b.nombre,
    logo: b.logo,
    colorMarca: b.colorMarca,
    whatsapp: b.whatsapp ?? "",
    enlaceAgenda: b.enlaceAgenda ?? "",
    instagram: b.instagram ?? "",
    ciudad: b.ciudad ?? "",
    plan: b.plan,
    limiteMensual: b.limiteMensual,
    catalogo: json<ItemCatalogo[]>(b.catalogo, []),
    barberos: json<string[]>(b.barberos, []),
  }
}

export function normalizarTelefono(t: string | null | undefined) {
  const d = (t ?? "").replace(/\D/g, "")
  return d.length >= 10 ? d.slice(-10) : d || null
}
