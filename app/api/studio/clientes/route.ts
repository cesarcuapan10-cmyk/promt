import { db } from "@/app/lib/db"
import { json, requerirBarberia } from "@/app/studio/lib/servidor"
import type { TDiagnostico } from "@/app/studio/lib/esquema"

/** Búsqueda de clientes de la barbería por nombre o teléfono (o los más recientes). */
export async function GET(req: Request) {
  const b = await requerirBarberia()
  if (b instanceof Response) return b
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? ""
  const digitos = q.replace(/\D/g, "")

  const clientes = await db.clienteVisage.findMany({
    where: {
      barberiaId: b.id,
      ...(q
        ? { OR: [{ nombre: { contains: q } }, ...(digitos.length >= 3 ? [{ telefono: { contains: digitos } }] : [])] }
        : {}),
    },
    orderBy: { actualizadoEn: "desc" },
    take: 40,
    include: {
      diagnosticos: {
        orderBy: { creadoEn: "desc" },
        take: 1,
        select: { id: true, creadoEn: true, diagnostico: true, fotoFrente: true, proximaVisita: true, corteElegido: true },
      },
      _count: { select: { diagnosticos: true } },
    },
  })

  return Response.json(
    clientes.map((c) => {
      const u = c.diagnosticos[0]
      const d = u ? json<Partial<TDiagnostico>>(u.diagnostico, {}) : null
      return {
        id: c.id,
        nombre: c.nombre,
        telefono: c.telefono,
        visitas: c._count.diagnosticos,
        ultima: u
          ? {
              id: u.id,
              fecha: u.creadoEn,
              foto: u.fotoFrente,
              forma: d?.rostro?.forma ?? null,
              corte: d?.recomendaciones?.[0]?.nombre ?? null,
              proximaVisita: u.proximaVisita,
            }
          : null,
      }
    }),
  )
}
