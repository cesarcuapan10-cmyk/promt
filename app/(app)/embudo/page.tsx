import { KanbanSquare } from "lucide-react"
import { obtenerClientesPorEtapa } from "@/app/actions/embudo"
import { EmbudoKanban } from "./EmbudoKanban"

export const metadata = { title: "Embudo de Ventas" }

export default async function EmbudoPage() {
  const clientesPorEtapa = await obtenerClientesPorEtapa()

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-full mx-auto">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: "#8b5cf620" }}
        >
          <KanbanSquare className="w-5 h-5" style={{ color: "#8b5cf6" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Embudo de Ventas</h1>
          <p className="text-sm text-gray-500">Arrastra clientes entre etapas del pipeline</p>
        </div>
      </div>
      <EmbudoKanban clientesPorEtapa={clientesPorEtapa} />
    </div>
  )
}
