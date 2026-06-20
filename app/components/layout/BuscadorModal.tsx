"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, Users, FileText, Calendar, CreditCard, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
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

interface Props {
  open: boolean
  onClose: () => void
}

export function BuscadorModal({ open, onClose }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [resultados, setResultados] = useState<Resultados | null>(null)
  const [cargando, setCargando] = useState(false)
  const [seleccionado, setSeleccionado] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery("")
      setResultados(null)
      setSeleccionado(-1)
    }
  }, [open])

  const buscar = useCallback(async (q: string) => {
    if (q.length < 2) { setResultados(null); setCargando(false); return }
    setCargando(true)
    try {
      const res = await fetch(`/api/buscar?q=${encodeURIComponent(q)}`)
      setResultados(await res.json())
    } catch {
      setResultados(null)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => buscar(query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, buscar])

  // Flatten navigable items
  type NavItem = { href: string }
  const navItems: NavItem[] = []
  if (resultados) {
    resultados.clientes.forEach((c) => navItems.push({ href: `/clientes/${c.id}` }))
    resultados.notas.forEach((n) => navItems.push({ href: `/clientes/${n.clienteId}` }))
    resultados.citas.forEach(() => navItems.push({ href: `/agenda` }))
    resultados.pagos.forEach(() => navItems.push({ href: `/pagos` }))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") { onClose(); return }
    if (e.key === "ArrowDown") { e.preventDefault(); setSeleccionado((s) => Math.min(s + 1, navItems.length - 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSeleccionado((s) => Math.max(s - 1, -1)) }
    else if (e.key === "Enter" && seleccionado >= 0 && navItems[seleccionado]) {
      router.push(navItems[seleccionado].href)
      onClose()
    }
  }

  function navigate(href: string) {
    router.push(href)
    onClose()
  }

  const totalResultados =
    (resultados?.clientes.length ?? 0) +
    (resultados?.notas.length ?? 0) +
    (resultados?.citas.length ?? 0) +
    (resultados?.pagos.length ?? 0)

  let itemIdx = -1
  function nextIdx() { itemIdx++; return itemIdx }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
          onClick={onClose}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: -8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-xl bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <Search size={18} className="text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSeleccionado(-1) }}
                onKeyDown={handleKeyDown}
                placeholder="Buscar clientes, notas, citas..."
                className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 outline-none text-base"
              />
              {query ? (
                <button onClick={() => { setQuery(""); setResultados(null) }}>
                  <X size={16} className="text-gray-400 hover:text-gray-600" />
                </button>
              ) : (
                <kbd className="hidden sm:block text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Esc</kbd>
              )}
            </div>

            {/* Resultados */}
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {cargando && (
                <div className="space-y-2 p-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
                  ))}
                </div>
              )}

              {!cargando && query.length >= 2 && totalResultados === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">Sin resultados para &ldquo;{query}&rdquo;</p>
                  <Link
                    href="/clientes"
                    onClick={onClose}
                    className="text-sm text-brand hover:underline mt-1 inline-block"
                  >
                    Crear cliente nuevo →
                  </Link>
                </div>
              )}

              {!cargando && resultados && (
                <div className="space-y-1">
                  {resultados.clientes.map((c) => {
                    const i = nextIdx()
                    return (
                      <button
                        key={c.id}
                        onClick={() => navigate(`/clientes/${c.id}`)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition
                          ${seleccionado === i ? "bg-brand/10" : "hover:bg-gray-100 dark:hover:bg-white/5"}`}
                      >
                        <Users size={15} className="text-gray-400 shrink-0" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{c.nombre}</span>
                        <span className="ml-auto text-xs text-gray-400">{c.etapa}</span>
                      </button>
                    )
                  })}

                  {resultados.notas.map((n) => {
                    const i = nextIdx()
                    return (
                      <button
                        key={n.id}
                        onClick={() => navigate(`/clientes/${n.clienteId}`)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition
                          ${seleccionado === i ? "bg-brand/10" : "hover:bg-gray-100 dark:hover:bg-white/5"}`}
                      >
                        <FileText size={15} className="text-gray-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-brand">{n.cliente.nombre}</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{n.contenido}</p>
                        </div>
                      </button>
                    )
                  })}

                  {resultados.citas.map((c) => {
                    const i = nextIdx()
                    return (
                      <button
                        key={c.id}
                        onClick={() => navigate("/agenda")}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition
                          ${seleccionado === i ? "bg-brand/10" : "hover:bg-gray-100 dark:hover:bg-white/5"}`}
                      >
                        <Calendar size={15} className="text-gray-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-brand">{c.cliente.nombre}</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{c.titulo}</p>
                        </div>
                      </button>
                    )
                  })}

                  {resultados.pagos.map((p) => {
                    const i = nextIdx()
                    return (
                      <button
                        key={p.id}
                        onClick={() => navigate("/pagos")}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition
                          ${seleccionado === i ? "bg-brand/10" : "hover:bg-gray-100 dark:hover:bg-white/5"}`}
                      >
                        <CreditCard size={15} className="text-gray-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-brand">{p.cliente.nombre}</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{p.concepto ?? "Pago"}</p>
                        </div>
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                          {formatMoney(p.monto)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {!query && (
                <div className="px-3 py-4 text-center text-sm text-gray-400">
                  Escribe para buscar en tu CRM
                </div>
              )}
            </div>

            {/* Footer hints */}
            <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center gap-4 text-xs text-gray-400">
              <span>↑↓ navegar</span>
              <span>↵ abrir</span>
              <span>Esc cerrar</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
