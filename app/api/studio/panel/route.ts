import { db } from "@/app/lib/db"
import { inicioDeMes, json, requerirBarberia } from "@/app/studio/lib/servidor"
import type { TDiagnostico } from "@/app/studio/lib/esquema"

/**
 * Métricas para el dueño: lo que demuestra el retorno de la herramienta.
 * - Uso del plan, tasa de cierre, ticket promedio y venta adicional del mes.
 * - Clientes cuyo mantenimiento ya toca (motor de recompra por WhatsApp).
 */
export async function GET() {
  const b = await requerirBarberia()
  if (b instanceof Response) return b

  const desde = inicioDeMes()
  const delMes = await db.diagnosticoVisage.findMany({
    where: { barberiaId: b.id, creadoEn: { gte: desde } },
    select: { corteElegido: true, total: true, extras: true, cerradoEn: true, barbero: true, diagnostico: true },
  })

  const cerrados = delMes.filter((d) => d.cerradoEn)
  const recomendados = cerrados.filter((d) => d.corteElegido && /^[0-2]$/.test(d.corteElegido)).length
  const ingresos = cerrados.reduce((s, d) => s + (d.total ?? 0), 0)
  const extras = cerrados.reduce((s, d) => s + (d.extras ?? 0), 0)

  const formas: Record<string, number> = {}
  const cortes: Record<string, number> = {}
  const barberos: Record<string, { diagnosticos: number; ingresos: number }> = {}
  for (const d of delMes) {
    const diag = json<Partial<TDiagnostico>>(d.diagnostico, {})
    if (diag.rostro?.forma) formas[diag.rostro.forma] = (formas[diag.rostro.forma] ?? 0) + 1
    if (d.corteElegido) {
      const nombre = /^\d$/.test(d.corteElegido) ? diag.recomendaciones?.[Number(d.corteElegido)]?.nombre : d.corteElegido
      if (nombre) cortes[nombre] = (cortes[nombre] ?? 0) + 1
    }
    const quien = d.barbero || "Sin asignar"
    barberos[quien] ??= { diagnosticos: 0, ingresos: 0 }
    barberos[quien].diagnosticos++
    barberos[quien].ingresos += d.total ?? 0
  }

  // Clientes por volver: su visita más reciente tiene mantenimiento vencido o en los próximos 3 días
  const limite = new Date(Date.now() + 3 * 86400000)
  const candidatos = await db.diagnosticoVisage.findMany({
    where: { barberiaId: b.id, proximaVisita: { lte: limite } },
    orderBy: { proximaVisita: "asc" },
    take: 200,
    include: { cliente: { select: { id: true, nombre: true, telefono: true } } },
  })
  const ultimos = await db.diagnosticoVisage.groupBy({
    by: ["clienteId"],
    where: { barberiaId: b.id, clienteId: { in: [...new Set(candidatos.map((c) => c.clienteId))] } },
    _max: { creadoEn: true },
  })
  const ultimaPorCliente = new Map(ultimos.map((u) => [u.clienteId, u._max.creadoEn?.getTime() ?? 0]))
  const porVolver = candidatos
    .filter((c) => c.creadoEn.getTime() === ultimaPorCliente.get(c.clienteId))
    .slice(0, 50)
    .map((c) => {
      const diag = json<Partial<TDiagnostico>>(c.diagnostico, {})
      const corte = c.corteElegido && /^\d$/.test(c.corteElegido) ? diag.recomendaciones?.[Number(c.corteElegido)]?.nombre : c.corteElegido
      return {
        clienteId: c.cliente.id,
        diagnosticoId: c.id,
        nombre: c.cliente.nombre,
        telefono: c.cliente.telefono,
        corte: corte ?? diag.recomendaciones?.[0]?.nombre ?? "tu corte",
        proximaVisita: c.proximaVisita,
        token: c.token,
      }
    })

  return Response.json({
    mes: desde.toLocaleDateString("es-MX", { month: "long", year: "numeric" }),
    diagnosticos: delMes.length,
    limite: b.limiteMensual,
    cerrados: cerrados.length,
    tasaRecomendado: cerrados.length ? Math.round((recomendados / cerrados.length) * 100) : null,
    ticketPromedio: cerrados.length ? Math.round(ingresos / cerrados.length) : null,
    ingresos,
    extras,
    formas,
    cortes: Object.entries(cortes).sort((a, b) => b[1] - a[1]).slice(0, 5),
    barberos: Object.entries(barberos).sort((a, b) => b[1].ingresos - a[1].ingresos),
    porVolver,
  })
}
