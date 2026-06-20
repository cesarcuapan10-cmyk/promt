"use client"

import { Wallet } from "lucide-react"
import { Card } from "@/app/components/ui/Card"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function PagosCliente({ datosIniciales }: { datosIniciales: any }) {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#10b98120" }}>
          <Wallet className="w-5 h-5" style={{ color: "#10b981" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pagos</h1>
          <p className="text-sm text-gray-500">Lo que cobraste y lo que falta</p>
        </div>
      </div>
      <Card className="text-center py-16">
        <Wallet className="w-16 h-16 mx-auto mb-4 opacity-20" />
        <p className="text-lg font-medium text-gray-500 mb-2">Sin pagos registrados</p>
        <p className="text-sm text-gray-400">Los pagos aparecerán aquí cuando los registres.</p>
      </Card>
    </div>
  )
}
