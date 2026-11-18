import { z } from "zod/v4"
import { db } from "@/app/lib/db"
import { json, requerirBarberia } from "@/app/studio/lib/servidor"
import type { ItemCatalogo } from "@/app/studio/lib/esquema"

const IMAGEN = z.string().startsWith("data:image/").max(1_500_000)

const Cambios = z.object({
  simulacion: z.object({ clave: z.string().max(20), imagen: IMAGEN }).optional(),
  cierre: z
    .object({
      corteElegido: z.string().max(120),
      barbero: z.string().max(60).nullable(),
      fotoReal: IMAGEN.nullable(),
      serviciosVendidos: z
        .array(z.object({ nombre: z.string().max(120), precio: z.number().min(0).max(100000), tipo: z.enum(["corte", "servicio", "producto"]) }))
        .max(30),
      semanasMantenimiento: z.number().min(1).max(26),
    })
    .optional(),
})

async function cargar(id: string, barberiaId: string) {
  return db.diagnosticoVisage.findFirst({ where: { id, barberiaId }, include: { cliente: true } })
}

export async function GET(_req: Request, ctx: RouteContext<"/api/studio/diagnosticos/[id]">) {
  const b = await requerirBarberia()
  if (b instanceof Response) return b
  const { id } = await ctx.params
  const d = await cargar(id, b.id)
  if (!d) return Response.json({ error: "No encontrado" }, { status: 404 })
  return Response.json({
    id: d.id,
    token: d.token,
    clienteId: d.clienteId,
    cliente: d.cliente,
    barbero: d.barbero,
    contexto: json(d.contexto, {}),
    medidas: json(d.medidas, null),
    diagnostico: json(d.diagnostico, null),
    fotoFrente: d.fotoFrente,
    simulaciones: json(d.simulaciones, {}),
    corteElegido: d.corteElegido,
    fotoReal: d.fotoReal,
    serviciosVendidos: json(d.serviciosVendidos, []),
    total: d.total,
    cerradoEn: d.cerradoEn,
    proximaVisita: d.proximaVisita,
    creadoEn: d.creadoEn,
  })
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/studio/diagnosticos/[id]">) {
  const b = await requerirBarberia()
  if (b instanceof Response) return b
  const { id } = await ctx.params
  const d = await cargar(id, b.id)
  if (!d) return Response.json({ error: "No encontrado" }, { status: 404 })

  const parsed = Cambios.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Datos inválidos" }, { status: 400 })
  const { simulacion, cierre } = parsed.data

  if (simulacion) {
    const sims = json<Record<string, string>>(d.simulaciones, {})
    sims[simulacion.clave] = simulacion.imagen
    await db.diagnosticoVisage.update({ where: { id }, data: { simulaciones: JSON.stringify(sims) } })
  }

  if (cierre) {
    const items: ItemCatalogo[] = cierre.serviciosVendidos
    const total = items.reduce((s, i) => s + i.precio, 0)
    const extras = items.filter((i) => i.tipo !== "corte").reduce((s, i) => s + i.precio, 0)
    await db.diagnosticoVisage.update({
      where: { id },
      data: {
        corteElegido: cierre.corteElegido,
        barbero: cierre.barbero ?? d.barbero,
        fotoReal: cierre.fotoReal ?? d.fotoReal,
        serviciosVendidos: JSON.stringify(items),
        total,
        extras,
        cerradoEn: new Date(),
        proximaVisita: new Date(Date.now() + cierre.semanasMantenimiento * 7 * 86400000),
      },
    })
  }

  return Response.json({ ok: true })
}
