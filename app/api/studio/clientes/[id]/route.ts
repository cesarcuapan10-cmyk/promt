import { db } from "@/app/lib/db"
import { json, requerirBarberia } from "@/app/studio/lib/servidor"
import type { TDiagnostico } from "@/app/studio/lib/esquema"

/** Expediente del cliente: datos y todas sus visitas (miniaturas, sin el diagnóstico completo). */
export async function GET(_req: Request, ctx: RouteContext<"/api/studio/clientes/[id]">) {
  const b = await requerirBarberia()
  if (b instanceof Response) return b
  const { id } = await ctx.params
  const c = await db.clienteVisage.findFirst({
    where: { id, barberiaId: b.id },
    include: { diagnosticos: { orderBy: { creadoEn: "desc" } } },
  })
  if (!c) return Response.json({ error: "No encontrado" }, { status: 404 })

  return Response.json({
    id: c.id,
    nombre: c.nombre,
    telefono: c.telefono,
    edad: c.edad,
    ocupacion: c.ocupacion,
    visitas: c.diagnosticos.map((d) => {
      const diag = json<Partial<TDiagnostico>>(d.diagnostico, {})
      const elegido =
        d.corteElegido && /^\d$/.test(d.corteElegido)
          ? diag.recomendaciones?.[Number(d.corteElegido)]?.nombre
          : d.corteElegido
      return {
        id: d.id,
        fecha: d.creadoEn,
        foto: d.fotoFrente,
        fotoReal: d.fotoReal,
        forma: diag.rostro?.forma ?? null,
        recomendado: diag.recomendaciones?.[0]?.nombre ?? null,
        corteRealizado: elegido ?? null,
        total: d.total,
        barbero: d.barbero,
        proximaVisita: d.proximaVisita,
      }
    }),
  })
}
