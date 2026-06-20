"use client"

import { useState, useTransition, useMemo } from "react"
import Link from "next/link"
import { Trophy, RefreshCw, ChevronLeft, ChevronRight, Search } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { Card } from "@/app/components/ui/Card"
import { Button } from "@/app/components/ui/Button"
import { Input } from "@/app/components/ui/Input"
import { formatMoney, formatFecha } from "@/app/lib/utils"
import { reactivarCliente } from "@/app/actions/clientes"

type ClienteCompletado = {
  id: string
  nombre: string
  correo: string | null
  valorEstimado: number | null
  actualizadoEn: Date
  totalCobrado: number
}

interface Props {
  clientes: ClienteCompletado[]
  total: number
  paginas: number
  paginaInicial: number
}

export function CompletadosCliente({ clientes: iniciales, total, paginas, paginaInicial }: Props) {
  const [clientes, setClientes] = useState(iniciales)
  const [pagina, setPagina] = useState(paginaInicial)
  const [busqueda, setBusqueda] = useState("")
  const [ordenar, setOrdenar] = useState<"fecha" | "monto">("fecha")
  const [reactivando, setReactivando] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const clientesFiltrados = useMemo(() => {
    let lista = [...clientes]
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      lista = lista.filter((c) => c.nombre.toLowerCase().includes(q))
    }
    if (ordenar === "fecha") {
      lista.sort((a, b) => new Date(b.actualizadoEn).getTime() - new Date(a.actualizadoEn).getTime())
    } else {
      lista.sort((a, b) => b.totalCobrado - a.totalCobrado)
    }
    return lista
  }, [clientes, busqueda, ordenar])

  const totalIngresos = iniciales.reduce((sum, c) => sum + c.totalCobrado, 0)

  async function handleReactivar(id: string, nombre: string) {
    setReactivando(id)
    try {
      await reactivarCliente(id)
      toast.success(`${nombre} reactivado — ¡a vender de nuevo! 🚀`)
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
        <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-green-100 dark:bg-green-900/30">
          <Trophy className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clientes completados</h1>
          <p className="text-sm text-gray-500">Tu muro de victorias 🏆</p>
        </div>
      </div>

      {/* Banner de ingresos */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <p className="text-sm text-green-700 dark:text-green-400 font-medium">Total cobrado de completados</p>
            <p className="text-3xl font-bold text-green-800 dark:text-green-300">{formatMoney(totalIngresos)}</p>
          </div>
          <div className="sm:ml-auto text-right">
            <p className="text-sm text-green-700 dark:text-green-400">{total} clientes ganados</p>
          </div>
        </div>
      </Card>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            iconoIzquierda={<Search size={16} />}
          />
        </div>
        <select
          value={ordenar}
          onChange={(e) => setOrdenar(e.target.value as "fecha" | "monto")}
          className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white text-sm outline-none focus:border-brand"
        >
          <option value="fecha">Ordenar por fecha</option>
          <option value="monto">Ordenar por monto</option>
        </select>
      </div>

      {/* Lista */}
      {clientesFiltrados.length === 0 ? (
        <Card className="text-center py-16">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-lg font-medium text-gray-500 mb-1">
            {busqueda
              ? `No hay resultados para "${busqueda}"`
              : "Aún no tienes clientes completados — cierra tu primera venta y aparecerá aquí 🎉"}
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
                    <p className="text-xs text-gray-500 mt-0.5">
                      Ganado {formatFecha(cliente.actualizadoEn)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Valor estimado</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {cliente.valorEstimado ? formatMoney(cliente.valorEstimado) : "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Total cobrado</p>
                      <p className="font-semibold text-green-700 dark:text-green-400">
                        {formatMoney(cliente.totalCobrado)}
                      </p>
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
                      Reactivar (recompra)
                    </Button>
                  </div>
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
