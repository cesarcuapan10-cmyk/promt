import { auth } from "@/app/lib/auth"
import { db } from "@/app/lib/db"
import { XCircle } from "lucide-react"
import { Card } from "@/app/components/ui/Card"
import PerdidosCliente from "./PerdidosCliente"

export const metadata = { title: "Perdidos · Aprende y reactiva" }

export default async function PerdidosPage() {
  const session = await auth()
  const user = session?.user as { id: string; rol?: string } | undefined
  const esAdmin = user?.rol === "ADMIN"
  const where = { estadoCartera: "PERDIDO", eliminadoEn: null, ...(esAdmin ? {} : { vendedorId: user?.id }) }

  const clientes = await db.cliente.findMany({
    where,
    orderBy: { actualizadoEn: "desc" },
    include: { vendedor: { select: { nombre: true } } },
  })

  const motivos: Record<string, number> = {}
  clientes.forEach(c => {
    const m = c.motivoPerdida || "Sin motivo"
    motivos[m] = (motivos[m] || 0) + 1
  })

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <XCircle className="w-5 h-5 text-gray-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Perdidos</h1>
          <p className="text-sm text-gray-500">Aprende por qué y reactiva</p>
        </div>
      </div>

      {Object.keys(motivos).length > 0 && (
        <Card>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Por qué perdemos ventas</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(motivos).sort((a, b) => b[1] - a[1]).map(([m, n]) => (
              <span key={m} className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
                {m} · <strong>{n}</strong>
              </span>
            ))}
          </div>
        </Card>
      )}

      {clientes.length === 0 ? (
        <Card className="text-center py-16">
          <XCircle className="w-16 h-16 mx-auto mb-4 text-gray-200" />
          <p className="text-lg font-medium text-gray-500 mb-2">No hay clientes perdidos</p>
          <p className="text-sm text-gray-400">¡Eso es buena señal! Sigue cerrando.</p>
        </Card>
      ) : (
        <PerdidosCliente clientes={clientes as Parameters<typeof PerdidosCliente>[0]["clientes"]} />
      )}
    </div>
  )
}
