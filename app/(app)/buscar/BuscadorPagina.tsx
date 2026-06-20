"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, Users, FileText, Calendar, CreditCard, Clock, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Card } from "@/app/components/ui/Card"
import { Button } from "@/app/components/ui/Button"
import { formatMoney } from "@/app/lib/utils"

type ResultadoCliente = { id: string; nombre: string; etapa: string; temperatura: string }
type ResultadoNota = { id: string; contenido: string; clienteId: string; cliente: { nombre: string } }
type ResultadoCita = { id: string; titulo: string; fechaInicio: string; clienteId: string; cliente: { nombre: string } }
type ResultadoPago = { id: string; monto: number; estatus: string; concepto: string | null; clienteId: string; cliente: { nombre: string } }

type Resultados = {
  clientes: ResultadoCliente[]
  notas: ResultadoNota[]
  citas: ResultadoCita[]
  pagos: ResultadoPago[]
}

const STORAGE_KEY = "crm_busquedas_recientes"
const MAX_RECIENTES = 5

function cargarRecientes(): string[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")
  } catch {
    return []
  }
}

function guardarReciente(q: string) {
  const prev = cargarRecientes()
  const updated = [q, ...prev.filter((x) => x !== q)].slice(0, MAX_RECIENTES)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

function resaltarTexto(texto: string, termino: string): React.ReactNode {
  if (!termino.trim()) return texto
  const idx = texto.toLowerCase().indexOf(termino.toLowerCase())
  if (idx === -1) return texto
  return (
    <>
      {texto.slice(0, idx)}
      <strong className="text-gray-900 dark:text-white">{texto.slice(idx, idx + termino.length)}</strong>
      {texto.slice(idx + termino.length)}
    </>
  )
}

export function BuscadorPagina() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [resultados, setResultados] = useState<Resultados | null>(null)
  const [cargando, setCargando] = useState(false)
  const [recientes, setRecientes] = useState<string[]>([])
  const [seleccionado, setSeleccionado] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setRecientes(cargarRecientes())
    inputRef.current?.focus()
  }, [])

  const buscar = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResultados(null)
      setCargando(false)
      return
    }
    setCargando(true)
    try {
      const res = await fetch(`/api/buscar?q=${encodeURIComponent(q)}`)
      const data: Resultados = await res.json()
      setResultados(data)
      guardarReciente(q)
      setRecientes(cargarRecientes())
    } catch {
      setResultados(null)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => buscar(query), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, buscar])

  // Construir lista plana de resultados navegables
  type NavItem = { href: string; label: string }
  const navItems: NavItem[] = []
  if (resultados) {
    resultados.clientes.forEach((c) => navItems.push({ href: `/clientes/${c.id}`, label: c.nombre }))
    resultados.notas.forEach((n) => navItems.push({ href: `/clientes/${n.clienteId}`, label: n.contenido }))
    resultados.citas.forEach((c) => navItems.push({ href: `/agenda`, label: c.titulo }))
    resultados.pagos.forEach((p) => navItems.push({ href: `/pagos`, label: p.concepto ?? `Pago $${p.monto}` }))
  }

  const totalResultados =
    (resultados?.clientes.length ?? 0) +
    (resultados?.notas.length ?? 0) +
    (resultados?.citas.length ?? 0) +
    (resultados?.pagos.length ?? 0)

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSeleccionado((s) => Math.min(s + 1, navItems.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSeleccionado((s) => Math.max(s - 1, -1))
    } else if (e.key === "Enter" && seleccionado >= 0 && navItems[seleccionado]) {
      router.push(navItems[seleccionado].href)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-brand/10">
          <Search className="w-6 h-6 text-brand" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Buscador</h1>
          <p className="text-sm text-gray-500">Encuentra lo que sea, al instante</p>
        </div>
      </div>

      {/* Input principal */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSeleccionado(-1) }}
          onKeyDown={handleKeyDown}
          placeholder="Busca clientes, notas, citas, pagos..."
          className="w-full pl-12 pr-12 py-4 text-lg rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResultados(null); setSeleccionado(-1) }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Skeleton */}
      {cargando && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Resultados */}
      <AnimatePresence mode="wait">
        {!cargando && resultados && query.length >= 2 && (
          <motion.div
            key="resultados"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Empty state */}
            {totalResultados === 0 && (
              <Card className="text-center py-12">
                <Search className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                  No encontré nada con &ldquo;{query}&rdquo;
                </p>
                <p className="text-sm text-gray-500 mb-4">¿Quieres crear un cliente nuevo?</p>
                <Link href="/clientes">
                  <Button variante="primario" tamaño="sm">Crear cliente</Button>
                </Link>
              </Card>
            )}

            {/* Clientes */}
            {resultados.clientes.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Users size={14} /> Clientes ({resultados.clientes.length})
                </h2>
                <div className="space-y-2">
                  {resultados.clientes.map((c, i) => (
                    <Link
                      key={c.id}
                      href={`/clientes/${c.id}`}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer hover:underline
                        ${seleccionado === i ? "bg-brand/10 border-brand" : "border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5"}`}
                    >
                      <Users size={16} className="text-gray-400 shrink-0" />
                      <span className="font-medium text-brand-700 dark:text-brand">
                        {resaltarTexto(c.nombre, query)}
                      </span>
                      <span className="ml-auto text-xs text-gray-400">{c.etapa}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Notas */}
            {resultados.notas.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FileText size={14} /> Notas ({resultados.notas.length})
                </h2>
                <div className="space-y-2">
                  {resultados.notas.map((n, i) => {
                    const idx = resultados.clientes.length + i
                    return (
                      <Link
                        key={n.id}
                        href={`/clientes/${n.clienteId}`}
                        className={`flex flex-col gap-1 p-3 rounded-xl border transition cursor-pointer
                          ${seleccionado === idx ? "bg-brand/10 border-brand" : "border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5"}`}
                      >
                        <span className="text-xs text-brand-700 dark:text-brand font-medium hover:underline cursor-pointer">
                          {n.cliente.nombre}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {resaltarTexto(n.contenido, query)}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Citas */}
            {resultados.citas.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Calendar size={14} /> Citas ({resultados.citas.length})
                </h2>
                <div className="space-y-2">
                  {resultados.citas.map((c, i) => {
                    const idx = resultados.clientes.length + resultados.notas.length + i
                    return (
                      <Link
                        key={c.id}
                        href="/agenda"
                        className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer
                          ${seleccionado === idx ? "bg-brand/10 border-brand" : "border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5"}`}
                      >
                        <Calendar size={16} className="text-gray-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm text-gray-900 dark:text-white">
                            {resaltarTexto(c.titulo, query)}
                          </span>
                          <span className="block text-xs text-brand-700 dark:text-brand hover:underline">
                            {c.cliente.nombre}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(c.fechaInicio).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Pagos */}
            {resultados.pagos.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <CreditCard size={14} /> Pagos ({resultados.pagos.length})
                </h2>
                <div className="space-y-2">
                  {resultados.pagos.map((p, i) => {
                    const idx = resultados.clientes.length + resultados.notas.length + resultados.citas.length + i
                    return (
                      <Link
                        key={p.id}
                        href="/pagos"
                        className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer
                          ${seleccionado === idx ? "bg-brand/10 border-brand" : "border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5"}`}
                      >
                        <CreditCard size={16} className="text-gray-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-gray-900 dark:text-white">
                            {p.concepto ? resaltarTexto(p.concepto, query) : "Sin concepto"}
                          </span>
                          <span className="block text-xs text-brand-700 dark:text-brand hover:underline">
                            {p.cliente.nombre}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {formatMoney(p.monto)}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Búsquedas recientes */}
      {!query && recientes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <Clock size={14} /> Búsquedas recientes
            </h2>
            <button
              onClick={() => { localStorage.removeItem(STORAGE_KEY); setRecientes([]) }}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              Limpiar
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recientes.map((r) => (
              <button
                key={r}
                onClick={() => setQuery(r)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 transition"
              >
                <Clock size={12} className="text-gray-400" />
                {r}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
