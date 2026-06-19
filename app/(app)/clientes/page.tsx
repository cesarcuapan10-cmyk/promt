import { Users } from "lucide-react"
import { Card } from "@/app/components/ui/Card"

export const metadata = { title: "Clientes" }

export default function ClientesPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#3b82f620" }}>
          <Users className="w-5 h-5" style={{ color: "#3b82f6" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clientes</h1>
          <p className="text-sm text-gray-500">Todas tus personas en un solo lugar</p>
        </div>
      </div>
      <Card className="text-center py-16">
        <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
        <p className="text-lg font-medium text-gray-500 mb-2">Módulo en construcción</p>
        <p className="text-sm text-gray-400">Este módulo estará completo muy pronto.</p>
      </Card>
    </div>
  )
}
