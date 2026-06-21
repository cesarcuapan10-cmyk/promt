import { Search } from "lucide-react"
import BuscadorCliente from "./BuscadorCliente"

export const metadata = { title: "Buscador global · CRM" }

export default function BuscadorPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
          <Search className="w-5 h-5 text-brand" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Buscador</h1>
          <p className="text-sm text-gray-500">Encuentra cualquier cliente, cita, pago o nota al instante</p>
        </div>
      </div>
      <BuscadorCliente />
    </div>
  )
}
