"use client"

import { useEffect, useState } from "react"
import { ChevronRight, Loader2, Plus, Search } from "lucide-react"
import { ETIQUETA_FORMA } from "../lib/esquema"

type FilaCliente = {
  id: string
  nombre: string
  telefono: string | null
  visitas: number
  ultima: { id: string; fecha: string; foto: string; forma: string | null; corte: string | null; proximaVisita: string | null } | null
}

type Expediente = {
  id: string
  nombre: string
  telefono: string | null
  edad: string | null
  ocupacion: string | null
  visitas: {
    id: string
    fecha: string
    foto: string
    fotoReal: string | null
    forma: string | null
    recomendado: string | null
    corteRealizado: string | null
    total: number | null
    barbero: string | null
    proximaVisita: string | null
  }[]
}

export function Clientes({
  clienteInicial,
  onAbrirVisita,
  onNuevoDiagnostico,
}: {
  clienteInicial: string | null
  onAbrirVisita: (diagnosticoId: string) => void
  onNuevoDiagnostico: (c: { id: string; nombre: string; telefono: string | null; edad: string | null; ocupacion: string | null }) => void
}) {
  const [q, setQ] = useState("")
  const [lista, setLista] = useState<FilaCliente[] | null>(null)
  const [abierto, setAbierto] = useState<string | null>(clienteInicial)
  const [exp, setExp] = useState<Expediente | null>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/studio/clientes?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setLista(Array.isArray(d) ? d : []))
        .catch(() => setLista([]))
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    if (!abierto) return
    let vigente = true
    fetch(`/api/studio/clientes/${abierto}`)
      .then((r) => r.json())
      .then((d) => vigente && setExp(d))
    return () => {
      vigente = false
    }
  }, [abierto])

  if (abierto) {
    const e = exp?.id === abierto ? exp : null
    return (
      <main className="mx-auto max-w-4xl px-4 pb-16 pt-6">
        <button onClick={() => setAbierto(null)} className="mb-4 text-sm text-white/50">← Todos los clientes</button>
        {!e ? (
          <Loader2 className="mx-auto mt-16 h-8 w-8 animate-spin text-[#d4af6a]" />
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-3xl font-semibold">{e.nombre}</h2>
                <p className="text-sm text-white/50">
                  {[e.telefono, e.edad && `${e.edad} años`, e.ocupacion].filter(Boolean).join(" · ") || "Sin datos de contacto"}
                </p>
              </div>
              <button onClick={() => onNuevoDiagnostico(e)} className="boton-oro">
                <Plus className="h-4 w-4" /> Nueva visita
              </button>
            </div>
            <h3 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-widest text-white/40">
              {e.visitas.length} {e.visitas.length === 1 ? "visita" : "visitas"}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {e.visitas.map((v) => (
                <button key={v.id} onClick={() => onAbrirVisita(v.id)} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left">
                  <div className="grid grid-cols-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.foto} alt="Antes" className="aspect-[3/4] w-full object-cover" />
                    {v.fotoReal ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.fotoReal} alt="Después" className="aspect-[3/4] w-full object-cover" />
                    ) : (
                      <div className="flex aspect-[3/4] items-center justify-center bg-white/[0.04] p-2 text-center text-xs text-white/30">Sin foto final</div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-white/40">{new Date(v.fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}</p>
                    <p className="font-medium">{v.corteRealizado ?? v.recomendado}</p>
                    <p className="text-xs text-white/50">
                      {v.forma ? ETIQUETA_FORMA[v.forma as keyof typeof ETIQUETA_FORMA] : ""}
                      {v.total ? ` · $${v.total}` : ""}
                      {v.barbero ? ` · ${v.barbero}` : ""}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-4 pb-16 pt-6">
      <h2 className="text-2xl font-semibold">Clientes</h2>
      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input className="campo pl-9" placeholder="Buscar por nombre o teléfono" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {!lista ? (
        <Loader2 className="mx-auto mt-16 h-8 w-8 animate-spin text-[#d4af6a]" />
      ) : lista.length === 0 ? (
        <p className="mt-12 text-center text-white/40">{q ? "Sin resultados." : "Aún no hay clientes. Haz el primer diagnóstico."}</p>
      ) : (
        <div className="mt-4 divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10">
          {lista.map((c) => (
            <button key={c.id} onClick={() => setAbierto(c.id)} className="flex w-full items-center gap-3 bg-white/[0.02] p-3 text-left hover:bg-white/[0.05]">
              {c.ultima ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.ultima.foto} alt="" className="h-14 w-11 rounded-lg object-cover" />
              ) : (
                <div className="h-14 w-11 rounded-lg bg-white/10" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.nombre}</p>
                <p className="truncate text-xs text-white/50">
                  {c.visitas} {c.visitas === 1 ? "visita" : "visitas"}
                  {c.ultima?.corte ? ` · ${c.ultima.corte}` : ""}
                  {c.telefono ? ` · ${c.telefono}` : ""}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-white/30" />
            </button>
          ))}
        </div>
      )}
    </main>
  )
}
