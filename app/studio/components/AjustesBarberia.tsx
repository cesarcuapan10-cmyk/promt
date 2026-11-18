"use client"

import { useRef, useState } from "react"
import { ImageUp, LogOut, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { BarberiaPublica, ItemCatalogo } from "../lib/esquema"
import { aJpeg, cargarImagen } from "../lib/imagen"

const TIPOS: { id: ItemCatalogo["tipo"]; nombre: string }[] = [
  { id: "corte", nombre: "Corte" },
  { id: "servicio", nombre: "Servicio extra" },
  { id: "producto", nombre: "Producto" },
]

export function AjustesBarberia({
  barberia,
  onGuardado,
  onSalir,
}: {
  barberia: BarberiaPublica
  onGuardado: (b: BarberiaPublica) => void
  onSalir: () => void
}) {
  const [b, setB] = useState(barberia)
  const [nuevoBarbero, setNuevoBarbero] = useState("")
  const [guardando, setGuardando] = useState(false)
  const logoRef = useRef<HTMLInputElement>(null)

  const set = <K extends keyof BarberiaPublica>(k: K, v: BarberiaPublica[K]) => setB((x) => ({ ...x, [k]: v }))
  const setItem = (i: number, cambio: Partial<ItemCatalogo>) =>
    set("catalogo", b.catalogo.map((it, j) => (j === i ? { ...it, ...cambio } : it)))

  async function subirLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const url = URL.createObjectURL(f)
    const img = await cargarImagen(url)
    URL.revokeObjectURL(url)
    set("logo", aJpeg(img, { ladoMax: 256, calidad: 0.9 }))
  }

  async function guardar() {
    setGuardando(true)
    try {
      const r = await fetch("/api/studio/ajustes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: b.nombre,
          logo: b.logo,
          colorMarca: b.colorMarca,
          whatsapp: b.whatsapp,
          enlaceAgenda: b.enlaceAgenda,
          instagram: b.instagram,
          ciudad: b.ciudad,
          catalogo: b.catalogo.filter((c) => c.nombre.trim()),
          barberos: b.barberos,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      onGuardado(d.barberia)
      toast.success("Ajustes guardados")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pb-28 pt-6">
      <h2 className="text-2xl font-semibold">Ajustes de la barbería</h2>
      <p className="text-sm text-white/50">
        Plan {b.plan} · {b.limiteMensual} diagnósticos al mes · código <span className="font-mono">{b.slug}</span>
      </p>

      <section className="mt-6 grid gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:grid-cols-2">
        <div className="flex items-center gap-4 sm:col-span-2">
          <button onClick={() => logoRef.current?.click()} className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/20">
            {b.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.logo} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <ImageUp className="h-6 w-6 text-white/40" />
            )}
          </button>
          <div className="text-sm text-white/50">
            Logo para el reporte, el enlace del cliente y los posts de Instagram.
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={subirLogo} />
          </div>
        </div>
        <Campo etiqueta="Nombre">
          <input className="campo" value={b.nombre} onChange={(e) => set("nombre", e.target.value)} />
        </Campo>
        <Campo etiqueta="Ciudad">
          <input className="campo" value={b.ciudad} onChange={(e) => set("ciudad", e.target.value)} />
        </Campo>
        <Campo etiqueta="WhatsApp de la barbería">
          <input className="campo" inputMode="tel" value={b.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="222 000 0000" />
        </Campo>
        <Campo etiqueta="Instagram">
          <input className="campo" value={b.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@tubarberia" />
        </Campo>
        <Campo etiqueta="Enlace para agendar" ancho>
          <input className="campo" value={b.enlaceAgenda} onChange={(e) => set("enlaceAgenda", e.target.value)} placeholder="https://…" />
        </Campo>
        <Campo etiqueta="Color de marca">
          <input type="color" className="h-11 w-full cursor-pointer rounded-xl border border-white/10 bg-transparent" value={b.colorMarca} onChange={(e) => set("colorMarca", e.target.value)} />
        </Campo>
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="font-semibold">Catálogo y precios</h3>
        <p className="mb-4 text-sm text-white/50">La IA recomienda servicios y productos de esta lista con su precio real. Así sugiere lo que sí vendes.</p>
        <div className="space-y-2">
          {b.catalogo.map((it, i) => (
            <div key={i} className="grid grid-cols-[1fr_6rem_8rem_auto] gap-2">
              <input className="campo" value={it.nombre} onChange={(e) => setItem(i, { nombre: e.target.value })} placeholder="Nombre" />
              <input className="campo" type="number" min={0} value={it.precio} onChange={(e) => setItem(i, { precio: Number(e.target.value) || 0 })} />
              <select className="campo" value={it.tipo} onChange={(e) => setItem(i, { tipo: e.target.value as ItemCatalogo["tipo"] })}>
                {TIPOS.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
              <button onClick={() => set("catalogo", b.catalogo.filter((_, j) => j !== i))} className="px-2 text-white/40 hover:text-red-300" aria-label="Quitar">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => set("catalogo", [...b.catalogo, { nombre: "", precio: 0, tipo: "servicio" }])} className="boton-sec mt-3">
          <Plus className="h-4 w-4" /> Agregar
        </button>
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="font-semibold">Barberos</h3>
        <p className="mb-4 text-sm text-white/50">Para saber quién atendió y medir ventas por barbero.</p>
        <div className="flex flex-wrap gap-2">
          {b.barberos.map((n) => (
            <span key={n} className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm">
              {n}
              <button onClick={() => set("barberos", b.barberos.filter((x) => x !== n))} aria-label={`Quitar ${n}`}>×</button>
            </span>
          ))}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const n = nuevoBarbero.trim()
            if (n && !b.barberos.includes(n)) set("barberos", [...b.barberos, n])
            setNuevoBarbero("")
          }}
        >
          <input className="campo" value={nuevoBarbero} onChange={(e) => setNuevoBarbero(e.target.value)} placeholder="Nombre del barbero" />
          <button className="boton-sec">Agregar</button>
        </form>
      </section>

      <div className="mt-6 flex items-center justify-between">
        <button onClick={onSalir} className="flex items-center gap-2 text-sm text-white/40 hover:text-white">
          <LogOut className="h-4 w-4" /> Cerrar sesión en este dispositivo
        </button>
        <button onClick={guardar} disabled={guardando} className="boton-oro disabled:opacity-50">
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </main>
  )
}

function Campo({ etiqueta, children, ancho }: { etiqueta: string; children: React.ReactNode; ancho?: boolean }) {
  return (
    <label className={`block ${ancho ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-xs uppercase tracking-widest text-white/40">{etiqueta}</span>
      {children}
    </label>
  )
}
