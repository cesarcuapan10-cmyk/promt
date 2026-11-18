"use client"

import { useActionState, useState } from "react"
import { ExternalLink, Plus } from "lucide-react"
import { abrirEstudio, crearBarberia, editarBarberia } from "@/app/actions/barberias"
import { formatMoney } from "@/app/lib/utils"

type Resultado = { ok?: string; error?: string } | undefined

const campo =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#d4af6a] dark:border-gray-700 dark:bg-[#111] dark:text-white"

const PLANES = [
  { id: "BASICO", nombre: "Básico", limite: 60 },
  { id: "PRO", nombre: "Pro", limite: 150 },
  { id: "ILIMITADO", nombre: "Ilimitado", limite: 1000 },
]

export function FormNuevaBarberia() {
  const [estado, accion, pendiente] = useActionState<Resultado, FormData>(crearBarberia, undefined)
  const [plan, setPlan] = useState("PRO")
  return (
    <form action={accion} className="grid gap-3 rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-[#151515] md:grid-cols-6">
      <input name="nombre" required placeholder="Nombre de la barbería" className={`${campo} md:col-span-2`} />
      <input name="ciudad" placeholder="Ciudad" className={campo} />
      <input name="pin" required inputMode="numeric" pattern="\d{4,8}" placeholder="PIN (4-8 dígitos)" className={campo} />
      <select name="plan" value={plan} onChange={(e) => setPlan(e.target.value)} className={campo}>
        {PLANES.map((p) => (
          <option key={p.id} value={p.id}>{p.nombre}</option>
        ))}
      </select>
      <input
        key={plan}
        name="limiteMensual"
        type="number"
        min={1}
        defaultValue={PLANES.find((p) => p.id === plan)?.limite}
        className={campo}
        title="Diagnósticos por mes"
      />
      <button disabled={pendiente} className="flex items-center justify-center gap-2 rounded-xl bg-[#d4af6a] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50 md:col-span-6 md:w-fit">
        <Plus className="h-4 w-4" /> {pendiente ? "Creando…" : "Crear barbería"}
      </button>
      {estado?.ok && <p className="text-sm text-green-600 md:col-span-6">{estado.ok}</p>}
      {estado?.error && <p className="text-sm text-red-500 md:col-span-6">{estado.error}</p>}
    </form>
  )
}

type Fila = {
  id: string
  slug: string
  nombre: string
  ciudad: string | null
  plan: string
  limiteMensual: number
  activa: boolean
  usoMes: number
  ventasMes: number
  extrasMes: number
  clientes: number
  creadoEn: string
}

export function FilaBarberia({ b }: { b: Fila }) {
  const [estado, accion, pendiente] = useActionState<Resultado, FormData>(editarBarberia, undefined)
  const pct = Math.min(100, Math.round((b.usoMes / b.limiteMensual) * 100))
  return (
    <div className="border-b border-gray-100 p-4 last:border-0 dark:border-gray-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">
            {b.nombre} {!b.activa && <span className="ml-2 rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600">Pausada</span>}
          </p>
          <p className="text-xs text-gray-500">
            Código: <b className="font-mono">{b.slug}</b>
            {b.ciudad ? ` · ${b.ciudad}` : ""} · {b.clientes} clientes · desde {new Date(b.creadoEn).toLocaleDateString("es-MX")}
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="text-gray-900 dark:text-white">
            {b.usoMes}/{b.limiteMensual} diagnósticos
          </p>
          <div className="mt-1 h-1.5 w-40 rounded-full bg-gray-100 dark:bg-gray-800">
            <div className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : "bg-[#d4af6a]"}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Ventas {formatMoney(b.ventasMes)} · extra {formatMoney(b.extrasMes)}
          </p>
        </div>
      </div>
      <form action={accion} className="mt-3 flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={b.id} />
        <select name="plan" defaultValue={b.plan} className={`${campo} w-auto`}>
          {PLANES.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
        <input name="limiteMensual" type="number" min={1} defaultValue={b.limiteMensual} className={`${campo} w-28`} title="Límite mensual" />
        <select name="activa" defaultValue={String(b.activa)} className={`${campo} w-auto`}>
          <option value="true">Activa</option>
          <option value="false">Pausada</option>
        </select>
        <input name="pin" inputMode="numeric" pattern="\d{4,8}" placeholder="Nuevo PIN (opcional)" className={`${campo} w-44`} />
        <button disabled={pendiente} className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:text-white">
          {pendiente ? "…" : "Guardar"}
        </button>
        {estado?.ok && <span className="text-xs text-green-600">{estado.ok}</span>}
        {estado?.error && <span className="text-xs text-red-500">{estado.error}</span>}
      </form>
      <form action={abrirEstudio} className="mt-2">
        <input type="hidden" name="id" value={b.id} />
        <button className="flex items-center gap-1 text-sm font-medium text-[#b8913f] hover:underline">
          <ExternalLink className="h-4 w-4" /> Abrir su estudio
        </button>
      </form>
    </div>
  )
}
