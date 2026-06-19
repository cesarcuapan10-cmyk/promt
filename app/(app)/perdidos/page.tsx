import { XCircle } from "lucide-react"
import { Card } from "@/app/components/ui/Card"

export const metadata = { title: "Perdidos" }

export default function PerdidosPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#6b728020" }}>
          <XCircle className="w-5 h-5" style={{ color: "#6b7280" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Perdidos</h1>
          <p className="text-sm text-gray-500">Aprende por qué y reactiva</p>
        </div>
      </div>
      <Card className="text-center py-16">
        <XCircle className="w-16 h-16 mx-auto mb-4 opacity-20" />
        <p className="text-lg font-medium text-gray-500 mb-2">Módulo en construcción</p>
        <p className="text-sm text-gray-400">Este módulo estará completo muy pronto.</p>
      </Card>
    </div>
  )
}
