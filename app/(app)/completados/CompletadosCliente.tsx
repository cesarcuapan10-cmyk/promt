"use client"
import { useState, useTransition } from "react"
import { Trophy, RotateCcw, Search } from "lucide-react"
import { Button } from "@/app/components/ui/Button"
import { Card } from "@/app/components/ui/Card"
import { Badge } from "@/app/components/ui/Badge"
import { formatMoney, formatFechaCorta } from "@/app/lib/utils"
import Link from "next/link"
import { cambiarEstadoCartera } from "@/app/actions/clientes"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

type Pago = { monto: number; fechaPago: Date | null; metodo: string }
type Cliente = {
  id: string; nombre: string; valorEstimado: number | null; actualizadoEn: Date
  pagos: Pago[]; vendedor: { nombre: string } | null
}

export default function CompletadosCliente({ clientes }: { clientes: Cliente[] }) {
  const [busqueda, setBusqueda] = useState("")
  const [, startTransition] = useTransition()
  const router = useRouter()

  const filtrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  function reactivar(id: string, nombre: string) {
    if (!confirm(`¿Reactivar a ${nombre}? Regresará al embudo como cliente Nuevo.`)) return
    startTransition(async () => {
      const r = await cambiarEstadoCartera(id, "ACTIVO")
      if (r.ok) { toast.success(`${nombre} reactivado`); router.refresh() }
      else toast.error("No se pudo reactivar")
    })
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar cliente ganado..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      <div className="space-y-3">
        {filtrados.map(c => {
          const totalPagado = c.pagos.reduce((s, p) => s + p.monto, 0)
          const fechaGanado = c.actualizadoEn
          return (
            <Card key={c.id} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <Link href={`/clientes/${c.id}`} className="nombre-cliente text-gray-900 dark:text-white">
                    {c.nombre}
                  </Link>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-500">Ganado el {formatFechaCorta(fechaGanado)}</span>
                    {c.vendedor && <span className="text-xs text-gray-400">· {c.vendedor.nombre}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {totalPagado > 0 && (
                  <span className="text-green-600 font-semibold text-sm">{formatMoney(totalPagado)}</span>
                )}
                <Badge variante="ganado">Ganado</Badge>
                <Button variante="fantasma" tamaño="sm" icono={<RotateCcw className="w-4 h-4" />}
                  onClick={() => reactivar(c.id, c.nombre)}>
                  Reactivar
                </Button>
              </div>
            </Card>
          )
        })}
        {filtrados.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">
            No se encontró ningún cliente con "{busqueda}".
          </p>
        )}
      </div>
    </div>
  )
}
