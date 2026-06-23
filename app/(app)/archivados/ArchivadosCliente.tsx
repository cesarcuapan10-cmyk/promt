"use client"
import { useState, useTransition } from "react"
import { Archive, RotateCcw, Search } from "lucide-react"
import { Button } from "@/app/components/ui/Button"
import { Card } from "@/app/components/ui/Card"
import { Badge } from "@/app/components/ui/Badge"
import { formatFechaCorta } from "@/app/lib/utils"
import Link from "next/link"
import { cambiarEstadoCartera } from "@/app/actions/clientes"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

type Cliente = {
  id: string; nombre: string; estadoAnterior: string | null; etapaAnterior: string | null
  actualizadoEn: Date; vendedor: { nombre: string } | null; valorEstimado: number | null
}

export default function ArchivadosCliente({ clientes }: { clientes: Cliente[] }) {
  const [busqueda, setBusqueda] = useState("")
  const [, startTransition] = useTransition()
  const router = useRouter()

  const filtrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  function restaurar(id: string, nombre: string, estadoAnterior: string | null) {
    const estado = (estadoAnterior || "ACTIVO") as "ACTIVO" | "GANADO" | "PERDIDO" | "ARCHIVADO"
    if (!confirm(`¿Restaurar a ${nombre}? Regresará a su estado anterior.`)) return
    startTransition(async () => {
      const r = await cambiarEstadoCartera(id, estado)
      if (r.ok) { toast.success(`${nombre} restaurado`); router.refresh() }
      else toast.error("No se pudo restaurar")
    })
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar en archivados..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>
      <div className="space-y-3">
        {filtrados.map(c => (
          <Card key={c.id} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                <Archive className="w-5 h-5 text-gray-400" />
              </div>
              <div className="min-w-0">
                <Link href={`/clientes/${c.id}`} className="nombre-cliente text-gray-900 dark:text-white">
                  {c.nombre}
                </Link>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <Badge variante="archivado">Archivado</Badge>
                  <span className="text-xs text-gray-400">{formatFechaCorta(c.actualizadoEn)}</span>
                  {c.vendedor && <span className="text-xs text-gray-400">· {c.vendedor.nombre}</span>}
                </div>
              </div>
            </div>
            <Button variante="fantasma" tamaño="sm" icono={<RotateCcw className="w-4 h-4" />}
              onClick={() => restaurar(c.id, c.nombre, c.estadoAnterior)}>
              Restaurar
            </Button>
          </Card>
        ))}
        {filtrados.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">
            No se encontró ningún cliente con "{busqueda}".
          </p>
        )}
      </div>
    </div>
  )
}
