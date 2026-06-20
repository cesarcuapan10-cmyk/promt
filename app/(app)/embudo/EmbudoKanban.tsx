"use client"

import { KanbanSquare } from "lucide-react"
import { Card } from "@/app/components/ui/Card"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function EmbudoKanban({ porEtapa }: { porEtapa: Record<string, any[]> }) {
  const etapas = Object.keys(porEtapa)
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#8b5cf620" }}>
          <KanbanSquare className="w-5 h-5" style={{ color: "#8b5cf6" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Embudo de Ventas</h1>
          <p className="text-sm text-gray-500">Vista kanban de tus clientes por etapa</p>
        </div>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {etapas.map((etapa) => (
          <div key={etapa} className="min-w-[260px]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize">
                {etapa.toLowerCase()}
              </span>
              <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">
                {porEtapa[etapa].length}
              </span>
            </div>
            <div className="space-y-2">
              {porEtapa[etapa].map((cliente) => (
                <Card key={cliente.id} padding="sm" hover>
                  <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{cliente.nombre}</p>
                  {cliente.empresaNombre && (
                    <p className="text-xs text-gray-500 truncate">{cliente.empresaNombre}</p>
                  )}
                </Card>
              ))}
              {porEtapa[etapa].length === 0 && (
                <div className="text-center py-8 text-xs text-gray-400 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl">
                  Sin clientes
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
