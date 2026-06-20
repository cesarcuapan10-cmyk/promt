import { ListChecks } from "lucide-react"
import { listarRecordatorios } from "@/app/actions/seguimiento"
import { db } from "@/app/lib/db"
import { auth } from "@/app/lib/auth"
import { SeguimientoCliente } from "./SeguimientoCliente"

export const metadata = { title: "Seguimiento" }

export default async function SeguimientoPage() {
  const session = await auth()
  const [recordatorios, clientes] = await Promise.all([
    listarRecordatorios(),
    session?.user?.id
      ? db.cliente.findMany({
          where: { vendedorId: session.user.id, eliminadoEn: null, estadoCartera: "ACTIVO" },
          select: { id: true, nombre: true },
          orderBy: { nombre: "asc" },
        })
      : [],
  ])

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: "#f59e0b20" }}
        >
          <ListChecks className="w-5 h-5" style={{ color: "#f59e0b" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Seguimiento</h1>
          <p className="text-sm text-gray-500">A quién toca contactar hoy</p>
        </div>
      </div>
      <SeguimientoCliente recordatorios={recordatorios} clientes={clientes} />
    </div>
  )
}
