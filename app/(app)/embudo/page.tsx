import { KanbanSquare } from "lucide-react"
import { obtenerClientesPorEtapa } from "@/app/actions/embudo"
import { EmbudoKanban } from "./EmbudoKanban"
import { auth } from "@/app/lib/auth"
import { db } from "@/app/lib/db"

export const metadata = { title: "Embudo de Ventas — CRM César Cuapan" }

export default async function EmbudoPage() {
  const session = await auth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usuario = session?.user as any
  const userId = usuario?.id as string
  const isAdmin = usuario?.rol === "ADMIN"

  const [porEtapa, completados, perdidos, archivados] = await Promise.all([
    obtenerClientesPorEtapa(),
    db.cliente.count({
      where: { eliminadoEn: null, estadoCartera: "GANADO", ...(isAdmin ? {} : { vendedorId: userId }) },
    }),
    db.cliente.count({
      where: { eliminadoEn: null, estadoCartera: "PERDIDO", ...(isAdmin ? {} : { vendedorId: userId }) },
    }),
    db.cliente.count({
      where: { eliminadoEn: null, estadoCartera: "ARCHIVADO", ...(isAdmin ? {} : { vendedorId: userId }) },
    }),
  ])

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-full mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-100 dark:bg-purple-900/30">
          <KanbanSquare className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Embudo de Ventas</h1>
          <p className="text-sm text-gray-500">Arrastra clientes entre etapas para actualizar su progreso</p>
        </div>
      </div>
      <EmbudoKanban
        porEtapa={porEtapa}
        resumen={{ completados, perdidos, archivados }}
      />
    </div>
  )
}
