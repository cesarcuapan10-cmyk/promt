"use client"

import { useEffect, useState } from "react"
import { Loader2, MessageCircle, TrendingUp, Users } from "lucide-react"
import { ETIQUETA_FORMA, type BarberiaPublica } from "../lib/esquema"

type DatosPanel = {
  mes: string
  diagnosticos: number
  limite: number
  cerrados: number
  tasaRecomendado: number | null
  ticketPromedio: number | null
  ingresos: number
  extras: number
  formas: Record<string, number>
  cortes: [string, number][]
  barberos: [string, { diagnosticos: number; ingresos: number }][]
  porVolver: { clienteId: string; nombre: string; telefono: string | null; corte: string; proximaVisita: string; token: string }[]
}

const dinero = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n)

export function Panel({ barberia, onAbrirCliente }: { barberia: BarberiaPublica; onAbrirCliente: (id: string) => void }) {
  const [d, setD] = useState<DatosPanel | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/studio/panel")
      .then(async (r) => (r.ok ? r.json() : Promise.reject((await r.json()).error)))
      .then(setD)
      .catch((e) => setError(String(e)))
  }, [])

  if (error) return <p className="p-8 text-center text-red-300">{error}</p>
  if (!d) return <Loader2 className="mx-auto mt-20 h-8 w-8 animate-spin text-[#d4af6a]" />

  function mensaje(nombre: string, corte: string, token: string) {
    const enlace = `${location.origin}/v/${token}`
    return encodeURIComponent(
      `Hola ${nombre.split(" ")[0]}, ya toca el retoque de tu ${corte} para que se siga viendo como el primer día. ` +
        `¿Te aparto lugar esta semana?${barberia.enlaceAgenda ? `\nAgenda aquí: ${barberia.enlaceAgenda}` : ""}\nTu diagnóstico: ${enlace}\n— ${barberia.nombre}`,
    )
  }

  const uso = Math.min(100, Math.round((d.diagnosticos / d.limite) * 100))

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-6">
      <h2 className="text-2xl font-semibold">Panel del negocio</h2>
      <p className="text-sm capitalize text-white/50">{d.mes}</p>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi titulo="Venta adicional" valor={dinero(d.extras)} nota="Servicios y productos además del corte" destacado />
        <Kpi titulo="Ticket promedio" valor={d.ticketPromedio !== null ? dinero(d.ticketPromedio) : "—"} nota={`${d.cerrados} servicios cerrados`} />
        <Kpi titulo="Eligieron el corte recomendado" valor={d.tasaRecomendado !== null ? `${d.tasaRecomendado}%` : "—"} nota="Confianza en la recomendación" />
        <Kpi titulo="Diagnósticos" valor={`${d.diagnosticos}/${d.limite}`} nota={`${uso}% de tu plan`} />
      </div>

      <section className="mt-8">
        <h3 className="mb-1 flex items-center gap-2 text-lg font-semibold">
          <MessageCircle className="h-5 w-5 text-[#d4af6a]" /> Clientes que ya deben regresar
        </h3>
        <p className="mb-4 text-sm text-white/50">Su mantenimiento venció o vence en los próximos 3 días. Un mensaje a tiempo es una cita segura.</p>
        {d.porVolver.length === 0 ? (
          <p className="rounded-2xl border border-white/10 p-6 text-center text-sm text-white/40">Nadie pendiente por ahora.</p>
        ) : (
          <div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10">
            {d.porVolver.map((c) => {
              const vencido = new Date(c.proximaVisita) < new Date()
              return (
                <div key={c.clienteId} className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.02] p-4">
                  <button onClick={() => onAbrirCliente(c.clienteId)} className="text-left">
                    <p className="font-medium">{c.nombre}</p>
                    <p className="text-xs text-white/50">
                      {c.corte} · {vencido ? "venció" : "vence"} el {new Date(c.proximaVisita).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                    </p>
                  </button>
                  {c.telefono ? (
                    <a
                      href={`https://wa.me/52${c.telefono.slice(-10)}?text=${mensaje(c.nombre, c.corte, c.token)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="boton-oro"
                    >
                      <MessageCircle className="h-4 w-4" /> Invitar
                    </a>
                  ) : (
                    <span className="text-xs text-white/30">Sin teléfono</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Bloque titulo="Cortes más elegidos" icono={<TrendingUp className="h-4 w-4" />}>
          {d.cortes.length ? (
            d.cortes.map(([n, v]) => <Fila key={n} izq={n} der={String(v)} />)
          ) : (
            <p className="text-sm text-white/40">Cierra servicios para ver datos.</p>
          )}
        </Bloque>
        <Bloque titulo="Formas de rostro atendidas" icono={<Users className="h-4 w-4" />}>
          {Object.entries(d.formas).sort((a, b) => b[1] - a[1]).map(([f, v]) => (
            <Fila key={f} izq={ETIQUETA_FORMA[f as keyof typeof ETIQUETA_FORMA] ?? f} der={String(v)} />
          ))}
        </Bloque>
        <Bloque titulo="Por barbero" icono={<Users className="h-4 w-4" />}>
          {d.barberos.map(([n, v]) => (
            <Fila key={n} izq={`${n} (${v.diagnosticos})`} der={dinero(v.ingresos)} />
          ))}
        </Bloque>
      </div>
    </main>
  )
}

function Kpi({ titulo, valor, nota, destacado }: { titulo: string; valor: string; nota: string; destacado?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${destacado ? "border-[#d4af6a]/50 bg-[#d4af6a]/10" : "border-white/10 bg-white/[0.03]"}`}>
      <p className="text-xs text-white/50">{titulo}</p>
      <p className={`mt-1 text-2xl font-semibold ${destacado ? "text-[#e9cf95]" : ""}`}>{valor}</p>
      <p className="mt-1 text-[11px] text-white/40">{nota}</p>
    </div>
  )
}

function Bloque({ titulo, icono, children }: { titulo: string; icono: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <span className="text-[#d4af6a]">{icono}</span>
        {titulo}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Fila({ izq, der }: { izq: string; der: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-white/75">{izq}</span>
      <span className="font-mono text-white/60">{der}</span>
    </div>
  )
}
