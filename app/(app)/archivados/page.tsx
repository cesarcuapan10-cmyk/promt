import { auth } from "@/app/lib/auth"
import { db } from "@/app/lib/db"
import { Archive } from "lucide-react"
import { Card } from "@/app/components/ui/Card"
import ArchivadosCliente from "./ArchivadosCliente"

export const metadata = { title: "Archivados · Guardados sin perder nada" }

export default async function ArchivadosPage() {
  const session = await auth()
  const user = session?.user as { id: string; rol?: string } | undefined
  const esAdmin = user?.rol === "ADMIN"
  const where = { estadoCartera: "ARCHIVADO", eliminadoEn: null, ...(esAdmin ? {} : { vendedorId: user?.id }) }

  const clientes = await db.cliente.findMany({
    where,
    orderBy: { actualizadoEn: "desc" },
    include: { vendedor: { select: { nombre: true } } },
  })

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <Archive className="w-5 h-5 text-gray-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Archivados</h1>
          <p className="text-sm text-gray-500">Guardados sin perder nada · {clientes.length} clientes</p>
        </div>
      </div>

      {clientes.length === 0 ? (
        <Card className="text-center py-16">
          <Archive className="w-16 h-16 mx-auto mb-4 text-gray-200" />
          <p className="text-lg font-medium text-gray-500 mb-2">No hay nada archivado</p>
          <p className="text-sm text-gray-400">Los clientes que archives aparecerán aquí. Puedes restaurarlos cuando quieras.</p>
        </Card>
      ) : (
        <ArchivadosCliente clientes={clientes as Parameters<typeof ArchivadosCliente>[0]["clientes"]} />
      )}
    </div>
  )
}
