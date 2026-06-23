import { auth } from "@/app/lib/auth"
import { db } from "@/app/lib/db"
import { Trophy } from "lucide-react"
import { Card } from "@/app/components/ui/Card"
import { formatMoney, formatFechaCorta } from "@/app/lib/utils"
import Link from "next/link"
import CompletadosCliente from "./CompletadosCliente"

export const metadata = { title: "Completados · Tu muro de victorias" }

export default async function CompletadosPage() {
  const session = await auth()
  const user = session?.user as { id: string; rol?: string } | undefined
  const esAdmin = user?.rol === "ADMIN"
  const where = { estadoCartera: "GANADO", eliminadoEn: null, ...(esAdmin ? {} : { vendedorId: user?.id }) }

  const clientes = await db.cliente.findMany({
    where,
    orderBy: { actualizadoEn: "desc" },
    include: {
      pagos: { where: { eliminadoEn: null, estatus: "PAGADO" }, select: { monto: true, fechaPago: true, metodo: true } },
      vendedor: { select: { nombre: true } },
    },
  })

  const totalGanado = clientes.reduce((sum, c) => sum + c.pagos.reduce((s, p) => s + p.monto, 0), 0)

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Completados</h1>
            <p className="text-sm text-gray-500">Tu muro de victorias 🏆</p>
          </div>
        </div>
        {clientes.length > 0 && (
          <div className="text-right">
            <p className="text-2xl font-bold text-green-600">{formatMoney(totalGanado)}</p>
            <p className="text-xs text-gray-500">Total cobrado histórico</p>
          </div>
        )}
      </div>

      {clientes.length === 0 ? (
        <Card className="text-center py-16">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-200" />
          <p className="text-lg font-medium text-gray-500 mb-2">Aún no tienes clientes completados</p>
          <p className="text-sm text-gray-400 mb-6">Cierra tu primera venta y aparecerá aquí 🎉</p>
          <Link href="/embudo" className="text-brand hover:underline text-sm font-medium">Ver embudo →</Link>
        </Card>
      ) : (
        <CompletadosCliente clientes={clientes as Parameters<typeof CompletadosCliente>[0]["clientes"]} />
      )}
    </div>
  )
}
