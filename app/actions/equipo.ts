"use server"

import { auth } from "@/app/lib/auth"
import { db } from "@/app/lib/db"

export async function obtenerDatosEquipo() {
  const session = await auth()
  if (!session?.user) throw new Error("No autenticado")

  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59)

  const vendedores = await db.usuario.findMany({
    where: { activo: true },
    select: {
      id: true,
      nombre: true,
      correo: true,
      rol: true,
      metaMensual: true,
      clientes: {
        where: { eliminadoEn: null },
        select: {
          id: true,
          estadoCartera: true,
          etapa: true,
          pagos: {
            where: {
              estatus: { in: ["PAGADO", "COBRADO"] },
              fechaPago: { gte: inicioMes, lte: finMes },
            },
            select: { monto: true },
          },
        },
      },
      pagos: {
        where: {
          estatus: "VENCIDO",
          eliminadoEn: null,
        },
        select: { id: true },
      },
    },
    orderBy: { nombre: "asc" },
  })

  return vendedores.map((v) => {
    const clientesActivos = v.clientes.filter((c) => c.estadoCartera === "ACTIVO").length
    const ganadosMes = v.clientes.filter((c) => c.etapa === "GANADO" || c.estadoCartera === "GANADO").length
    const ingresosMes = v.clientes.reduce(
      (sum, c) => sum + c.pagos.reduce((s2, p) => s2 + p.monto, 0),
      0
    )
    const pagoVencidos = v.pagos.length
    const meta = v.metaMensual ?? 0
    const pctMeta = meta > 0 ? Math.round((ganadosMes / meta) * 100) : 0

    return {
      id: v.id,
      nombre: v.nombre,
      correo: v.correo,
      rol: v.rol,
      clientesActivos,
      ganadosMes,
      ingresosMes,
      meta,
      pctMeta,
      pagoVencidos,
    }
  })
}
