import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { z } from "zod/v4"
import { db } from "@/app/lib/db"
import { asegurarEsquemaVisage, COOKIE_SESION, guardarCookieSesion } from "@/app/studio/lib/servidor"

const Entrada = z.object({ slug: z.string().min(2).max(60), pin: z.string().min(4).max(20) })

/** Entrar con el código de la barbería + PIN. 5 intentos fallidos bloquean 15 minutos. */
export async function POST(req: Request) {
  await asegurarEsquemaVisage()
  const parsed = Entrada.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Escribe el código y el PIN" }, { status: 400 })

  const slug = parsed.data.slug.trim().toLowerCase()
  const b = await db.barberia.findUnique({ where: { slug } })
  if (!b || !b.activa) return Response.json({ error: "Código o PIN incorrecto" }, { status: 401 })

  if (b.bloqueadoHasta && b.bloqueadoHasta > new Date()) {
    const min = Math.ceil((b.bloqueadoHasta.getTime() - Date.now()) / 60000)
    return Response.json({ error: `Demasiados intentos. Espera ${min} min.` }, { status: 429 })
  }

  const ok = await bcrypt.compare(parsed.data.pin.trim(), b.pinHash)
  if (!ok) {
    const intentos = b.intentosFallidos + 1
    await db.barberia.update({
      where: { id: b.id },
      data: {
        intentosFallidos: intentos >= 5 ? 0 : intentos,
        bloqueadoHasta: intentos >= 5 ? new Date(Date.now() + 15 * 60000) : null,
      },
    })
    return Response.json({ error: "Código o PIN incorrecto" }, { status: 401 })
  }

  await db.barberia.update({ where: { id: b.id }, data: { intentosFallidos: 0, bloqueadoHasta: null } })
  await guardarCookieSesion(b.id)
  return Response.json({ ok: true })
}

export async function DELETE() {
  const c = await cookies()
  c.delete(COOKIE_SESION)
  return Response.json({ ok: true })
}
