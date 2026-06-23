import { auth } from "@/app/lib/auth"
import { db } from "@/app/lib/db"
import { UserCog } from "lucide-react"
import { Card } from "@/app/components/ui/Card"
import { formatMoney } from "@/app/lib/utils"
import Link from "next/link"

export const metadata = { title: "Equipo · Tu gente y sus metas" }

export default async function EquipoPage() {
  const session = await auth()
  const user = session?.user as { id: string; rol?: string } | undefined
  const esAdmin = user?.rol === "ADMIN"

  const vendedores = await db.usuario.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, rol: true, metaMensual: true, comision: true },
  })

  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  const stats = await Promise.all(
    vendedores.map(async v => {
      const [ganados, ingresos, enRiesgo] = await Promise.all([
        db.cliente.count({
          where: { vendedorId: v.id, estadoCartera: "GANADO", actualizadoEn: { gte: inicioMes } },
        }),
        db.pago.aggregate({
          where: { vendedorId: v.id, estatus: "PAGADO", fechaPago: { gte: inicioMes }, eliminadoEn: null },
          _sum: { monto: true },
        }),
        db.cliente.count({
          where: {
            vendedorId: v.id, estadoCartera: "ACTIVO",
            OR: [{ proximaAccion: null }, { fechaProximaAccion: null }],
          },
        }),
      ])
      return {
        ...v,
        ganados,
        ingresos: ingresos._sum.monto ?? 0,
        enRiesgo,
        porcMeta: v.metaMensual ? Math.min(100, Math.round((ganados / v.metaMensual) * 100)) : null,
      }
    })
  )

  stats.sort((a, b) => b.ganados - a.ganados)
  const medallas = ["🥇", "🥈", "🥉"]

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
          <UserCog className="w-5 h-5 text-cyan-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Equipo</h1>
          <p className="text-sm text-gray-500">Tu gente y sus metas del mes</p>
        </div>
      </div>

      {stats.length === 0 ? (
        <Card className="text-center py-12">
          <UserCog className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400">Aún no hay usuarios en el equipo.</p>
          {esAdmin && <Link href="/admin" className="text-brand text-sm hover:underline mt-2 block">Agregar en el panel admin →</Link>}
        </Card>
      ) : (
        <div className="space-y-4">
          {stats.map((v, i) => (
            <Card key={v.id}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center font-bold text-brand text-lg shrink-0">
                  {i < 3 ? medallas[i] : v.nombre[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">{v.nombre}</span>
                    <span className="text-xs text-gray-400">{v.rol}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 flex-wrap text-sm text-gray-600 dark:text-gray-400">
                    <span><strong className="text-gray-900 dark:text-white">{v.ganados}</strong> cerrados</span>
                    <span><strong className="text-brand">{formatMoney(v.ingresos)}</strong> cobrado</span>
                    {v.enRiesgo > 0 && <span className="text-orange-500">{v.enRiesgo} en riesgo</span>}
                  </div>
                  {v.porcMeta !== null && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Meta: {v.ganados}/{v.metaMensual}</span>
                        <span className={v.porcMeta >= 80 ? "text-green-600" : v.porcMeta >= 50 ? "text-amber-500" : "text-red-500"}>
                          {v.porcMeta}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${v.porcMeta >= 80 ? "bg-green-500" : v.porcMeta >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                          style={{ width: `${v.porcMeta}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
