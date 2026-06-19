import { Archive } from "lucide-react"
import { Card } from "@/app/components/ui/Card"

export const metadata = { title: "Archivados" }

export default function ArchivadosPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#9ca3af20" }}>
          <Archive className="w-5 h-5" style={{ color: "#9ca3af" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Archivados</h1>
          <p className="text-sm text-gray-500">Guardados sin perder nada</p>
        </div>
      </div>
      <Card className="text-center py-16">
        <Archive className="w-16 h-16 mx-auto mb-4 opacity-20" />
        <p className="text-lg font-medium text-gray-500 mb-2">Módulo en construcción</p>
        <p className="text-sm text-gray-400">Este módulo estará completo muy pronto.</p>
      </Card>
    </div>
  )
}
