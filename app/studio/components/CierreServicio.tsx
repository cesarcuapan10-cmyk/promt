"use client"

import { useMemo, useState } from "react"
import { Camera, Check, Loader2, X } from "lucide-react"
import type { BarberiaPublica, ItemCatalogo, TDiagnostico } from "../lib/esquema"
import { Camara } from "./Camara"

export type DatosCierre = {
  corteElegido: string
  barbero: string | null
  fotoReal: string | null
  serviciosVendidos: ItemCatalogo[]
  semanasMantenimiento: number
}

/**
 * Cierre del servicio: qué corte se hizo, foto real, qué se vendió y cuándo regresa.
 * Con estos datos el panel calcula el retorno y la lista de clientes por volver.
 */
export function CierreServicio({
  diagnostico,
  barberia,
  barberoInicial,
  onCerrar,
  onConfirmar,
}: {
  diagnostico: TDiagnostico
  barberia: BarberiaPublica
  barberoInicial: string | null
  onCerrar: () => void
  onConfirmar: (d: DatosCierre) => Promise<void>
}) {
  const [corte, setCorte] = useState("0")
  const [otro, setOtro] = useState("")
  const [barbero, setBarbero] = useState(barberoInicial ?? "")
  const [foto, setFoto] = useState<string | null>(null)
  const [camara, setCamara] = useState(false)
  const recomendadosEnCatalogo = useMemo(() => {
    const nombres = new Set([
      ...diagnostico.serviciosComplementarios.map((s) => s.servicio.toLowerCase()),
      ...diagnostico.productosRecomendados.map((p) => p.producto.toLowerCase()),
    ])
    return new Set(barberia.catalogo.filter((c) => nombres.has(c.nombre.toLowerCase())).map((c) => c.nombre))
  }, [barberia.catalogo, diagnostico])
  const [vendidos, setVendidos] = useState<Set<string>>(() => {
    const primerCorte = barberia.catalogo.find((c) => c.tipo === "corte")
    return new Set(primerCorte ? [primerCorte.nombre] : [])
  })
  const [semanas, setSemanas] = useState(() => {
    const r = diagnostico.recomendaciones[0]
    return Math.max(1, Math.round(r?.fichaTecnica.mantenimientoSemanas ?? 3))
  })
  const [enviando, setEnviando] = useState(false)

  const items = barberia.catalogo.filter((c) => vendidos.has(c.nombre))
  const total = items.reduce((s, i) => s + i.precio, 0)

  function elegirCorte(v: string) {
    setCorte(v)
    const r = /^\d$/.test(v) ? diagnostico.recomendaciones[Number(v)] : null
    if (r) setSemanas(Math.max(1, Math.round(r.fichaTecnica.mantenimientoSemanas)))
  }

  function alternar(nombre: string) {
    setVendidos((s) => {
      const n = new Set(s)
      if (n.has(nombre)) n.delete(nombre)
      else n.add(nombre)
      return n
    })
  }

  async function confirmar() {
    setEnviando(true)
    try {
      await onConfirmar({
        corteElegido: corte === "otro" ? otro.trim() || "Otro" : corte,
        barbero: barbero || null,
        fotoReal: foto,
        serviciosVendidos: items,
        semanasMantenimiento: semanas,
      })
    } finally {
      setEnviando(false)
    }
  }

  if (camara) {
    return (
      <Camara
        vista="frente"
        onCerrar={() => setCamara(false)}
        onCapturar={(img) => {
          setFoto(img)
          setCamara(false)
        }}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4" onClick={onCerrar}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#141416] p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Cerrar servicio</h3>
          <button onClick={onCerrar} aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </div>

        <p className="mb-2 text-xs uppercase tracking-widest text-white/40">¿Qué corte se hizo?</p>
        <div className="space-y-2">
          {diagnostico.recomendaciones.map((r, i) => (
            <Opcion key={i} activo={corte === String(i)} onClick={() => elegirCorte(String(i))}>
              {r.nombre} <span className="text-white/40">· opción {i + 1}</span>
            </Opcion>
          ))}
          <Opcion activo={corte === "otro"} onClick={() => elegirCorte("otro")}>Otro corte</Opcion>
          {corte === "otro" && <input className="campo" value={otro} onChange={(e) => setOtro(e.target.value)} placeholder="¿Cuál?" />}
        </div>

        {barberia.barberos.length > 0 && (
          <>
            <p className="mb-2 mt-5 text-xs uppercase tracking-widest text-white/40">Barbero</p>
            <div className="flex flex-wrap gap-2">
              {barberia.barberos.map((n) => (
                <button key={n} onClick={() => setBarbero(n)} className={`rounded-full border px-3 py-1.5 text-sm ${barbero === n ? "border-[#d4af6a] bg-[#d4af6a]/15 text-[#e9cf95]" : "border-white/10 text-white/60"}`}>
                  {n}
                </button>
              ))}
            </div>
          </>
        )}

        <p className="mb-2 mt-5 text-xs uppercase tracking-widest text-white/40">Foto del resultado real</p>
        <button onClick={() => setCamara(true)} className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-white/20 p-3 text-left text-sm">
          {foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={foto} alt="Resultado" className="h-20 w-16 rounded-lg object-cover" />
          ) : (
            <Camera className="h-6 w-6 text-white/40" />
          )}
          <span className="text-white/60">{foto ? "Repetir foto" : "Tomar foto de frente con el corte terminado (para el antes/después y redes)"}</span>
        </button>

        <p className="mb-2 mt-5 text-xs uppercase tracking-widest text-white/40">Lo que se cobró</p>
        {barberia.catalogo.length === 0 ? (
          <p className="text-sm text-white/40">Carga tu catálogo en Ajustes para registrar ventas.</p>
        ) : (
          <div className="space-y-1.5">
            {barberia.catalogo.map((c) => (
              <button key={c.nombre} onClick={() => alternar(c.nombre)} className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm ${vendidos.has(c.nombre) ? "border-[#d4af6a] bg-[#d4af6a]/10" : "border-white/10"}`}>
                <span className="flex items-center gap-2">
                  <span className={`flex h-5 w-5 items-center justify-center rounded ${vendidos.has(c.nombre) ? "bg-[#d4af6a] text-black" : "border border-white/20"}`}>
                    {vendidos.has(c.nombre) && <Check className="h-3.5 w-3.5" />}
                  </span>
                  {c.nombre}
                  {recomendadosEnCatalogo.has(c.nombre) && <span className="rounded-full bg-[#d4af6a]/20 px-2 text-[10px] text-[#e9cf95]">Recomendado</span>}
                </span>
                <span className="font-mono text-white/60">${c.precio}</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/[0.04] p-3 text-sm">
          <span>Próxima visita en</span>
          <span className="flex items-center gap-2">
            <button onClick={() => setSemanas((s) => Math.max(1, s - 1))} className="h-8 w-8 rounded-full border border-white/15">−</button>
            <b className="w-20 text-center">{semanas} semanas</b>
            <button onClick={() => setSemanas((s) => Math.min(26, s + 1))} className="h-8 w-8 rounded-full border border-white/15">+</button>
          </span>
        </div>

        <button onClick={confirmar} disabled={enviando} className="boton-oro mt-5 w-full justify-center py-3.5 disabled:opacity-50">
          {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Cerrar servicio · ${total}</>}
        </button>
      </div>
    </div>
  )
}

function Opcion({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm ${activo ? "border-[#d4af6a] bg-[#d4af6a]/10" : "border-white/10"}`}>
      {children}
    </button>
  )
}
