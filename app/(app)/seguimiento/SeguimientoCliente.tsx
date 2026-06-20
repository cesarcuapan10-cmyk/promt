"use client"

import { Bell } from "lucide-react"
import { Card } from "@/app/components/ui/Card"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function SeguimientoCliente({ datosIniciales }: { datosIniciales: any }) {
  const recordatorios = Array.isArray(datosIniciales) ? datosIniciales : []
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#f5930020" }}>
          <Bell className="w-5 h-5" style={{ color: "#f59300" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Seguimiento</h1>
          <p className="text-sm text-gray-500">Tus recordatorios y tareas pendientes</p>
        </div>
      </div>
      {recordatorios.length === 0 ? (
        <Card className="text-center py-16">
          <Bell className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium text-gray-500 mb-2">Sin recordatorios</p>
          <p className="text-sm text-gray-400">No tienes recordatorios pendientes.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {recordatorios.map((r: { id: string; titulo: string; fecha: string }) => (
            <Card key={r.id} padding="sm">
              <p className="font-medium text-gray-900 dark:text-white">{r.titulo}</p>
              <p className="text-xs text-gray-500">{r.fecha}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
