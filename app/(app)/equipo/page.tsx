import { UserCog } from "lucide-react"
import Link from "next/link"
import { auth } from "@/app/lib/auth"
import { obtenerDatosEquipo } from "@/app/actions/equipo"
import { Card } from "@/app/components/ui/Card"
import { Badge } from "@/app/components/ui/Badge"
import { formatMoney } from "@/app/lib/utils"

export const metadata = { title: "Equipo" }

const MEDALLAS = ["🥇", "🥈", "🥉"]

function colorInicialVendedor(nombre: string, idx: number): string {
  const colores = [
    "bg-brand/20 text-brand-700",
    "bg-cyan-100 text-cyan-700",
    "bg-purple-100 text-purple-700",
    "bg-green-100 text-green-700",
    "bg-pink-100 text-pink-700",
    "bg-orange-100 text-orange-700",
  ]
  return colores[idx % colores.length]
}

export default async function EquipoPage() {
  const session = await auth()
  const sessionUser = session?.user as { id: string; rol: string } | undefined
  const datos = await obtenerDatosEquipo()

  const ranking = [...datos].sort((a, b) => b.ganadosMes - a.ganadosMes || b.ingresosMes - a.ingresosMes)

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#06b6d420" }}>
            <UserCog className="w-5 h-5" style={{ color: "#06b6d4" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Equipo</h1>
            <p className="text-sm text-gray-500">Tu gente y sus metas</p>
          </div>
        </div>
        {sessionUser?.rol === "ADMIN" && (
          <Link
            href="/admin"
            className="px-4 py-2 rounded-xl text-sm font-medium border border-brand text-brand hover:bg-brand/5 transition min-h-[44px] flex items-center"
          >
            Gestionar equipo
          </Link>
        )}
      </div>

      {datos.length === 1 && (
        <div className="p-4 bg-brand/5 rounded-xl border border-brand/20 text-sm text-gray-600 dark:text-gray-400">
          Cuando agregues vendedores, aquí verás el ranking del equipo.
        </div>
      )}

      {/* Ranking del mes */}
      <Card padding="none">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Ranking del mes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b dark:border-gray-800 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">#</th>
                <th className="px-5 py-3 font-medium">Vendedor</th>
                <th className="px-5 py-3 font-medium">Ganados</th>
                <th className="px-5 py-3 font-medium">Ingresos cobrados</th>
                <th className="px-5 py-3 font-medium">% Meta</th>
                <th className="px-5 py-3 font-medium">Clientes activos</th>
                <th className="px-5 py-3 font-medium">Pagos vencidos</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-800">
              {ranking.map((v, idx) => {
                const colorPct =
                  v.pctMeta >= 80
                    ? "bg-green-500"
                    : v.pctMeta >= 50
                    ? "bg-amber-400"
                    : "bg-red-400"

                return (
                  <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-5 py-4 text-lg">{MEDALLAS[idx] ?? `${idx + 1}`}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${colorInicialVendedor(v.nombre, idx)}`}>
                          {v.nombre[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{v.nombre}</p>
                          <Badge variante={v.rol === "ADMIN" ? "caliente" : "default"} className="text-[10px]">{v.rol}</Badge>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white">{v.ganadosMes}</td>
                    <td className="px-5 py-4 text-gray-700 dark:text-gray-300">{formatMoney(v.ingresosMes)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all ${colorPct}`}
                            style={{ width: `${Math.min(v.pctMeta, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{v.pctMeta}%</span>
                      </div>
                      {v.meta > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">Meta: {v.meta}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-700 dark:text-gray-300">{v.clientesActivos}</td>
                    <td className="px-5 py-4">
                      {v.pagoVencidos > 0 ? (
                        <Badge variante="vencido">{v.pagoVencidos}</Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
