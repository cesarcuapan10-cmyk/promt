"use client"

import { useState, useTransition, useMemo } from "react"
import Link from "next/link"
import { XCircle, RefreshCw, ChevronLeft, ChevronRight, Search } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { Card } from "@/app/components/ui/Card"
import { Button } from "@/app/components/ui/Button"
import { Badge } from "@/app/components/ui/Badge"
import { Input } from "@/app/components/ui/Input"
import { formatFecha } from "@/app/lib/utils"
import { reactivarCliente } from "@/app/actions/clientes"

type ClientePerdido = {
  id: string
  nombre: string
  correo: string | null
  telefono: string | null
  motivoPerdida: string | null
  estadoAnterior: string | null
  actualizadoEn: Date
  temperatura: string
}

interface Props {
  clientes: ClientePerdido[]
  total: number
  paginas: number
  paginaInicial: number
}

function resumenMotivos(clientes: ClientePerdido[]): { motivo: string; count: number }[] {
  const conteo: Record<string, number> = {}
  for (const c of clientes) {
    const m = c.motivoPerdida ?? "Sin motivo"
    conteo[m] = (conteo[m] ?? 0) + 1
  }
  return Object.entries(conteo)
    .map(([motivo, count]) => ({ motivo, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}

export function PerdidosCliente({ clientes: iniciales, total, paginas, paginaInicial }: Props) {
  const [clientes, setClientes] = useState(iniciales)
  const [pagina, setPagina] = useState(paginaInicial)
  const [busqueda, setBusqueda] = useState("")
  const [reactivando, setReactivando] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const clientesFiltrados = useMemo(() => {
    if (!busqueda.trim()) return clientes
    const q = busqueda.toLowerCase()
    return clientes.filter((c) => c.nombre.toLowerCase().includes(q))
  }, [clientes, busqueda])

  const motivos = useMemo(() => resumenMotivos(iniciales), [iniciales])

  async function handleReactivar(id: string, nombre: string) {
    setReactivando(id)
    try {
      await reactivarCliente(id)
      toast.success(`${nombre} reactivado — ¡segunda oportunidad! 💪`)
      setClientes((prev) => prev.filter((c) => c.id !== id))
    } catch {
      toast.error("No se pudo reactivar el cliente")
    } finally {
      setReactivando(null)
    }
  }

  const inicio = (pagina - 1) * 20 + 1
  const fin = Math.min(pagina * 20, total)

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <XCircle className="w-6 h-6 text-gray-500 dark:text-gray-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clientes perdidos</h1>
          <p className="text-sm text-gray-500">Aprende por qué y reactiva</p>
        </div>
        <div className="ml-auto">
          <p className="text-sm text-gray-500 text-right">{total} clientes perdidos</p>
        </div>
      </div>

      {/* Resumen de motivos */}
      {motivos.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Motivos más comunes de pérdida
          </h2>
          <div className="flex flex-wrap gap-2">
            {motivos.map(({ motivo, count }) => (
              <div
                key={motivo}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm"
              >
                <span className="text-gray-700 dark:text-gray-300">{motivo}</span>
                <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-bold rounded-full px-2 py-0.5">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

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
          <XCircle className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-lg font-medium text-gray-500 mb-1">
            {busqueda
              ? `No hay resultados para "${busqueda}"`
              : "No hay clientes perdidos — eso es buena señal 🙌"}
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
                      {cliente.motivoPerdida ? (
                        <Badge variante="perdido">{cliente.motivoPerdida}</Badge>
                      ) : (
                        <Badge variante="default">Sin motivo</Badge>
                      )}
                      <span className="text-xs text-gray-500">{formatFecha(cliente.actualizadoEn)}</span>
                    </div>
                  </div>
                  <Button
                    variante="secundario"
                    tamaño="sm"
                    icono={<RefreshCw size={14} />}
                    cargando={reactivando === cliente.id}
                    onClick={() => {
                      startTransition(() => {
                        void handleReactivar(cliente.id, cliente.nombre)
                      })
                    }}
                  >
                    Reactivar
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
