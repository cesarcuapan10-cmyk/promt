"use client"

import { useState, useTransition, useMemo } from "react"
import Link from "next/link"
import { Archive, RotateCcw, ChevronLeft, ChevronRight, Search } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { Card } from "@/app/components/ui/Card"
import { Button } from "@/app/components/ui/Button"
import { Badge } from "@/app/components/ui/Badge"
import { Input } from "@/app/components/ui/Input"
import { formatFecha } from "@/app/lib/utils"
import { restaurarCliente } from "@/app/actions/clientes"

type ClienteArchivado = {
  id: string
  nombre: string
  correo: string | null
  telefono: string | null
  estadoAnterior: string | null
  actualizadoEn: Date
}

interface Props {
  clientes: ClienteArchivado[]
  total: number
  paginas: number
  paginaInicial: number
}

function estadoBadgeVariante(estado: string | null): "activo" | "ganado" | "perdido" | "archivado" | "default" {
  switch (estado) {
    case "ACTIVO": return "activo"
    case "GANADO": return "ganado"
    case "PERDIDO": return "perdido"
    case "ARCHIVADO": return "archivado"
    default: return "default"
  }
}

export function ArchivadosCliente({ clientes: iniciales, total, paginas, paginaInicial }: Props) {
  const [clientes, setClientes] = useState(iniciales)
  const [pagina, setPagina] = useState(paginaInicial)
  const [busqueda, setBusqueda] = useState("")
  const [restaurando, setRestaurando] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const clientesFiltrados = useMemo(() => {
    if (!busqueda.trim()) return clientes
    const q = busqueda.toLowerCase()
    return clientes.filter((c) => c.nombre.toLowerCase().includes(q))
  }, [clientes, busqueda])

  async function handleRestaurar(id: string, nombre: string) {
    setRestaurando(id)
    try {
      await restaurarCliente(id)
      toast.success(`${nombre} restaurado al pipeline activo`)
      setClientes((prev) => prev.filter((c) => c.id !== id))
    } catch {
      toast.error("No se pudo restaurar el cliente")
    } finally {
      setRestaurando(null)
    }
  }

  const inicio = (pagina - 1) * 20 + 1
  const fin = Math.min(pagina * 20, total)

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-stone-100 dark:bg-stone-800">
          <Archive className="w-6 h-6 text-stone-500 dark:text-stone-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Archivados</h1>
          <p className="text-sm text-gray-500">Guardados sin perder nada</p>
        </div>
        <div className="ml-auto">
          <p className="text-sm text-gray-500 text-right">{total} archivados</p>
        </div>
      </div>

      {/* Filtros */}
      <Input
        placeholder="Buscar por nombre..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        iconoIzquierda={<Search size={16} />}
      />

      {/* Lista */}
      {clientesFiltrados.length === 0 ? (
        <Card className="text-center py-16">
          <Archive className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-lg font-medium text-gray-500 mb-1">
            {busqueda ? `No hay resultados para "${busqueda}"` : "No hay nada archivado"}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {clientesFiltrados.map((cliente) => (
              <motion.div
                key={cliente.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card hover className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/clientes/${cliente.id}`}
                      className="text-brand-700 dark:text-brand font-semibold cursor-pointer hover:underline text-base"
                    >
                      {cliente.nombre}
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {cliente.estadoAnterior && (
                        <Badge variante={estadoBadgeVariante(cliente.estadoAnterior)}>
                          Antes: {cliente.estadoAnterior}
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500">
                        Archivado {formatFecha(cliente.actualizadoEn)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variante="secundario"
                    tamaño="sm"
                    icono={<RotateCcw size={14} />}
                    cargando={restaurando === cliente.id}
                    onClick={() => {
                      startTransition(() => {
                        void handleRestaurar(cliente.id, cliente.nombre)
                      })
                    }}
                  >
                    Restaurar
                  </Button>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Paginación */}
      {paginas > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Mostrando {inicio}–{fin} de {total}
          </p>
          <div className="flex gap-2">
            <Button
              variante="fantasma"
              tamaño="sm"
              icono={<ChevronLeft size={16} />}
              disabled={pagina <= 1}
              onClick={() => setPagina((p) => p - 1)}
            >
              Anterior
            </Button>
            <Button
              variante="fantasma"
              tamaño="sm"
              disabled={pagina >= paginas}
              onClick={() => setPagina((p) => p + 1)}
            >
              Siguiente
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
