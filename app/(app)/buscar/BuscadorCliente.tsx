"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { Search, Users, CalendarDays, Wallet, FileText, Clock, Plus } from "lucide-react"
import Link from "next/link"
import { formatFechaCorta, formatMoney } from "@/app/lib/utils"

type Resultado = {
  tipo: "cliente" | "cita" | "pago" | "nota"
  id: string
  titulo: string
  subtitulo?: string
  href: string
  extra?: string
}

async function buscar(q: string): Promise<Resultado[]> {
  if (!q.trim() || q.length < 2) return []
  const res = await fetch(`/api/buscar?q=${encodeURIComponent(q)}`)
  if (!res.ok) return []
  return res.json()
}

const ICONOS = {
  cliente: Users,
  cita: CalendarDays,
  pago: Wallet,
  nota: FileText,
}

const ETIQUETAS = {
  cliente: "Clientes",
  cita: "Citas",
  pago: "Pagos",
  nota: "Notas",
}

export default function BuscadorCliente() {
  const [query, setQuery] = useState("")
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [cargando, setCargando] = useState(false)
  const [recientes, setRecientes] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem("busquedas_recientes")
    if (stored) setRecientes(JSON.parse(stored))
    inputRef.current?.focus()
  }, [])

  const buscarDebounced = useCallback(
    (() => {
      let timer: ReturnType<typeof setTimeout>
      return (q: string) => {
        clearTimeout(timer)
        timer = setTimeout(async () => {
          if (q.length < 2) { setResultados([]); return }
          setCargando(true)
          const res = await buscar(q)
          setResultados(res)
          setCargando(false)
        }, 300)
      }
    })(),
    []
  )

  function onInput(q: string) {
    setQuery(q)
    buscarDebounced(q)
  }

  function guardarReciente(q: string) {
    if (!q.trim()) return
    const nuevos = [q, ...recientes.filter(r => r !== q)].slice(0, 5)
    setRecientes(nuevos)
    localStorage.setItem("busquedas_recientes", JSON.stringify(nuevos))
  }

  const grupos = resultados.reduce((acc, r) => {
    if (!acc[r.tipo]) acc[r.tipo] = []
    acc[r.tipo].push(r)
    return acc
  }, {} as Record<string, Resultado[]>)

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        {cargando && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        )}
        <input
          ref={inputRef}
          value={query}
          onChange={e => onInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && query) guardarReciente(query) }}
          placeholder="Busca por nombre, teléfono, empresa, correo, notas..."
          className="w-full pl-12 pr-10 py-4 text-lg rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-brand shadow-sm"
        />
      </div>

      {query.length < 2 && recientes.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-2 flex items-center gap-1"><Clock className="w-3 h-3" /> Búsquedas recientes</p>
          <div className="flex flex-wrap gap-2">
            {recientes.map(r => (
              <button key={r} onClick={() => onInput(r)}
                className="px-3 py-1.5 text-sm rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-brand/10 hover:text-brand transition-colors">
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {query.length >= 2 && resultados.length === 0 && !cargando && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-500 mb-1">No encontré nada con <strong>"{query}"</strong></p>
          <p className="text-sm text-gray-400 mb-4">Revisa cómo lo escribiste o crea un cliente nuevo.</p>
          <Link href="/clientes/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white text-sm font-medium hover:bg-brand-700 transition-colors">
            <Plus className="w-4 h-4" /> Nuevo cliente
          </Link>
        </div>
      )}

      {Object.entries(grupos).map(([tipo, items]) => {
        const Icon = ICONOS[tipo as keyof typeof ICONOS] || FileText
        return (
          <div key={tipo}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
              <Icon className="w-3 h-3" /> {ETIQUETAS[tipo as keyof typeof ETIQUETAS] || tipo}
            </p>
            <div className="space-y-1">
              {items.map(r => (
                <Link key={r.id} href={r.href} onClick={() => guardarReciente(query)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-brand" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm group-hover:text-brand transition-colors">
                      {r.titulo}
                    </p>
                    {r.subtitulo && <p className="text-xs text-gray-500 truncate">{r.subtitulo}</p>}
                  </div>
                  {r.extra && <span className="ml-auto text-xs text-gray-400 shrink-0">{r.extra}</span>}
                </Link>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
