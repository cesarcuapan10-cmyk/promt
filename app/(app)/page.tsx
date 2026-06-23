import { auth } from "@/app/lib/auth"
import { db } from "@/app/lib/db"
import {
  LayoutDashboard, TrendingUp, Users, Trophy, AlertCircle,
  Clock, Target, Wallet,
} from "lucide-react"
import { Card } from "@/app/components/ui/Card"
import { Badge } from "@/app/components/ui/Badge"
import { formatMoney } from "@/app/lib/utils"
import Link from "next/link"

export const metadata = { title: "Tablero" }

async function getStats(vendedorId: string, esAdmin: boolean) {
  const where = { eliminadoEn: null, ...(esAdmin ? {} : { vendedorId }) }

  const [
    totalActivos,
    clientesGanadosMes,
    pagosMes,
    pagosVencidos,
    sinProximaAccion,
    leadsNuevos,
    etapas,
  ] = await Promise.all([
    db.cliente.count({ where: { ...where, estadoCartera: "ACTIVO" } }),
    db.cliente.count({
      where: {
        ...where,
        estadoCartera: "GANADO",
        actualizadoEn: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
    db.pago.aggregate({
      where: {
        eliminadoEn: null,
        estatus: "PAGADO",
        fechaPago: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        ...(esAdmin ? {} : { vendedorId }),
      },
      _sum: { monto: true },
    }),
    db.pago.count({
      where: {
        eliminadoEn: null,
        estatus: "VENCIDO",
        ...(esAdmin ? {} : { vendedorId }),
      },
    }),
    db.cliente.count({
      where: {
        ...where,
        estadoCartera: "ACTIVO",
        OR: [
          { proximaAccion: null },
          { fechaProximaAccion: null },
        ],
      },
    }),
    db.cliente.count({
      where: {
        ...where,
        etapa: "NUEVO",
        estadoCartera: "ACTIVO",
        creadoEn: { gte: new Date(Date.now() - 48 * 3600000) },
      },
    }),
    db.cliente.groupBy({
      by: ["etapa"],
      where: { ...where, estadoCartera: "ACTIVO" },
      _count: true,
      _sum: { valorEstimado: true },
    }),
  ])

  // Historial 6 meses
  const historial = await Promise.all(
    Array.from({ length: 6 }, (_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - (5 - i))
      const inicio = new Date(d.getFullYear(), d.getMonth(), 1)
      const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      return db.pago
        .aggregate({
          where: {
            eliminadoEn: null,
            estatus: "PAGADO",
            fechaPago: { gte: inicio, lte: fin },
            ...(esAdmin ? {} : { vendedorId }),
          },
          _sum: { monto: true },
        })
        .then((r: { _sum: { monto: number | null } }) => ({
          mes: d.toLocaleDateString("es-MX", { month: "short" }),
          ingreso: r._sum.monto ?? 0,
        }))
    })
  )

  return {
    totalActivos,
    clientesGanadosMes,
    ingresosMes: pagosMes._sum.monto ?? 0,
    pagosVencidos,
    sinProximaAccion,
    leadsNuevos,
    etapas,
    historial: historial as { mes: string; ingreso: number }[],
  }
}

export default async function DashboardPage() {
  const session = await auth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usuario = session?.user as any
  const esAdmin = usuario?.rol === "ADMIN"
  const stats = await getStats(usuario?.id, esAdmin)

  const metaMes = 30
  const porcMeta = Math.min(100, Math.round((stats.clientesGanadosMes / metaMes) * 100))

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Buen día, {usuario?.nombre?.split(" ")[0] ?? "César"} 👋
            </h1>
            <p className="text-sm text-gray-500">¿Vas a cerrar el mes?</p>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {(stats.sinProximaAccion > 0 || stats.pagosVencidos > 0 || stats.leadsNuevos > 0) && (
        <div className="space-y-2">
          {stats.sinProximaAccion > 0 && (
            <div className="flex items-center gap-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl px-4 py-3">
              <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
              <p className="text-sm text-orange-800 dark:text-orange-300">
                <strong>{stats.sinProximaAccion} clientes activos</strong> sin próxima acción — asígnales una antes de que se enfríen.
              </p>
              <Link href="/clientes" className="ml-auto text-xs font-medium text-orange-600 hover:underline whitespace-nowrap">
                Ver →
              </Link>
            </div>
          )}
          {stats.pagosVencidos > 0 && (
            <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
              <Wallet className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-800 dark:text-red-300">
                <strong>{stats.pagosVencidos} pagos vencidos</strong> — cobra esto hoy, es la venta más fácil.
              </p>
              <Link href="/pagos" className="ml-auto text-xs font-medium text-red-600 hover:underline whitespace-nowrap">
                Cobrar →
              </Link>
            </div>
          )}
          {stats.leadsNuevos > 0 && (
            <div className="flex items-center gap-3 bg-brand-50 border border-brand-200 rounded-xl px-4 py-3">
              <div className="w-2 h-2 rounded-full bg-brand animate-pulse shrink-0" />
              <p className="text-sm text-brand-800">
                <strong>{stats.leadsNuevos} nuevos interesados</strong> recientes sin contactar. El primero que llega, gana.
              </p>
              <Link href="/clientes?etapa=NUEVO" className="ml-auto text-xs font-medium text-brand-700 hover:underline whitespace-nowrap">
                Contactar →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Bento grid - números clave */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <p className="text-4xl font-bold text-gray-900 dark:text-white">{stats.clientesGanadosMes}</p>
          <p className="text-sm text-gray-500 mt-1">Ganados este mes</p>
        </Card>
        <Card className="text-center">
          <p className="text-4xl font-bold text-brand">{formatMoney(stats.ingresosMes)}</p>
          <p className="text-sm text-gray-500 mt-1">Cobrado este mes</p>
        </Card>
        <Card className="text-center">
          <p className="text-4xl font-bold text-purple-600">{stats.totalActivos}</p>
          <p className="text-sm text-gray-500 mt-1">En el embudo</p>
        </Card>
        <Card className="text-center">
          <p className="text-4xl font-bold text-red-500">{stats.pagosVencidos}</p>
          <p className="text-sm text-gray-500 mt-1">Pagos vencidos</p>
        </Card>
      </div>

      {/* Meta del mes */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Target className="w-5 h-5 text-brand" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Meta del mes</h2>
          <Badge variante={porcMeta >= 100 ? "ganado" : porcMeta >= 60 ? "activo" : "perdido"}>
            {porcMeta}%
          </Badge>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>{stats.clientesGanadosMes} clientes ganados</span>
            <span>Meta: {metaMes} clientes</span>
          </div>
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-700"
              style={{ width: `${porcMeta}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            {porcMeta >= 100
              ? "¡Meta alcanzada! 🎉"
              : `Faltan ${metaMes - stats.clientesGanadosMes} clientes para llegar`}
          </p>
        </div>
      </Card>

      {/* Historial 6 meses */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-5 h-5 text-green-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Ingresos últimos 6 meses</h2>
        </div>
        {stats.historial.every((h) => h.ingreso === 0) ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Aún juntando historial, esto se llena solo conforme registres pagos.
          </p>
        ) : (
          <div className="flex items-end gap-2 h-32">
            {stats.historial.map((h, i) => {
              const max = Math.max(...stats.historial.map((x) => x.ingreso), 1)
              const pct = (h.ingreso / max) * 100
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-brand/80 rounded-t-lg transition-all duration-500"
                    style={{ height: `${Math.max(pct, 4)}%` }}
                    title={formatMoney(h.ingreso)}
                  />
                  <span className="text-[10px] text-gray-500">{h.mes}</span>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Estado del embudo */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-5 h-5 text-purple-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Estado del embudo</h2>
        </div>
        <div className="space-y-2">
          {stats.etapas.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Aún no hay clientes activos en el embudo.{" "}
              <Link href="/clientes/nuevo" className="text-brand hover:underline">Agregar uno →</Link>
            </p>
          ) : (
            stats.etapas.map((e: { etapa: string; _count: number; _sum: { valorEstimado: number | null } }) => (
              <div key={e.etapa} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                <span className="text-sm text-gray-700 dark:text-gray-300">{e.etapa.replace("_", " ")}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{e._count} clientes</span>
                  {(e._sum.valorEstimado ?? 0) > 0 && (
                    <span className="text-xs text-gray-500">{formatMoney(e._sum.valorEstimado ?? 0)}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/seguimiento", label: "Hoy te toca", Icon: Clock, color: "text-amber-500 bg-amber-50" },
          { href: "/clientes/nuevo", label: "Nuevo cliente", Icon: Users, color: "text-blue-500 bg-blue-50" },
          { href: "/completados", label: "Completados", Icon: Trophy, color: "text-green-500 bg-green-50" },
          { href: "/pagos", label: "Pagos", Icon: Wallet, color: "text-emerald-500 bg-emerald-50" },
        ].map(({ href, label, Icon, color }) => (
          <Link key={href} href={href}>
            <Card hover className="text-center py-4">
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mx-auto mb-2`}>
                <Icon size={20} />
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
