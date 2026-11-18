"use client"

import { useCallback, useEffect, useState } from "react"
import {
  ArrowRight, Camera, Check, ChevronLeft, History, Loader2, Lock, ScanFace, Settings, ShieldCheck, Trash2,
} from "lucide-react"
import { toast } from "sonner"
import type { Contexto, TDiagnostico } from "../lib/esquema"
import { ETIQUETA_FORMA } from "../lib/esquema"
import { miniatura, soloBase64 } from "../lib/imagen"
import { medirRostro, precargarMedicion, type ResultadoMedicion } from "../lib/medidas"
import { Camara, PASOS_CAPTURA, type Vista } from "./Camara"
import { Resultados, type Simulacion } from "./Resultados"

type Pantalla = "inicio" | "captura" | "analizando" | "resultados" | "historial"
type Negocio = { nombre: string; whatsapp: string; enlaceAgenda: string }
type Estado = { analisis: boolean; simulacion: boolean; requierePin: boolean }
type Registro = {
  id: string
  fecha: string
  contexto: Contexto
  foto: string
  medicion: ResultadoMedicion | null
  diagnostico: TDiagnostico
  simulaciones: Record<string, Simulacion>
}

const CONTEXTO_VACIO: Contexto = {
  nombre: "",
  edad: "",
  ocupacion: "",
  arregloDiario: "10",
  objetivo: "",
  conservarLargo: false,
  abiertoAColor: false,
}

const NEGOCIO_DEFAULT: Negocio = { nombre: "Tu Barbería", whatsapp: "", enlaceAgenda: "" }

const PASOS_ANALISIS = [
  "Midiendo 478 puntos de tu rostro",
  "Calculando proporciones y tercios faciales",
  "Estimando la forma del cráneo",
  "Analizando tipo, grosor y densidad de cabello",
  "Seleccionando los 3 cortes que más te favorecen",
  "Preparando la ficha técnica para tu barbero",
]

function leer<T>(clave: string, defecto: T): T {
  try {
    const v = localStorage.getItem(clave)
    return v ? (JSON.parse(v) as T) : defecto
  } catch {
    return defecto
  }
}
function guardar(clave: string, valor: unknown) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor))
    return true
  } catch {
    return false
  }
}

export function Studio() {
  const [pantalla, setPantalla] = useState<Pantalla>("inicio")
  const [contexto, setContexto] = useState<Contexto>(CONTEXTO_VACIO)
  const [consentimiento, setConsentimiento] = useState(false)
  const [fotos, setFotos] = useState<Partial<Record<Vista, string>>>({})
  const [camara, setCamara] = useState<Vista | null>(null)
  const [medicion, setMedicion] = useState<ResultadoMedicion | null>(null)
  const [diagnostico, setDiagnostico] = useState<TDiagnostico | null>(null)
  const [simulaciones, setSimulaciones] = useState<Record<string, Simulacion>>({})
  const [pasoAnalisis, setPasoAnalisis] = useState(0)
  const [estado, setEstado] = useState<Estado | null>(null)
  const [negocio, setNegocio] = useState<Negocio>(NEGOCIO_DEFAULT)
  const [pin, setPin] = useState("")
  const [ajustes, setAjustes] = useState(false)
  const [historial, setHistorial] = useState<Registro[]>([])
  const [registroId, setRegistroId] = useState<string | null>(null)

  useEffect(() => {
    // Preferencias del dispositivo (iPad de la barbería)
    setNegocio(leer("studio:negocio", NEGOCIO_DEFAULT))
    setPin(leer("studio:pin", ""))
    setHistorial(leer<Registro[]>("studio:historial", []))
    fetch("/api/studio/estado")
      .then((r) => r.json())
      .then(setEstado)
      .catch(() => setEstado({ analisis: false, simulacion: false, requierePin: false }))
  }, [])

  // Guarda en historial cada vez que cambia el resultado (incluye simulaciones terminadas)
  useEffect(() => {
    if (!diagnostico || !registroId || !fotos.frente) return
    const listas = Object.values(simulaciones).every((s) => s.estado !== "cargando")
    if (!listas) return
    ;(async () => {
      const simsLigeras: Record<string, Simulacion> = {}
      for (const [k, s] of Object.entries(simulaciones)) {
        if (s.estado === "listo" && s.imagen) simsLigeras[k] = { estado: "listo", imagen: await miniatura(s.imagen, 640) }
      }
      const registro: Registro = {
        id: registroId,
        fecha: new Date().toISOString(),
        contexto,
        foto: await miniatura(fotos.frente!, 640),
        medicion,
        diagnostico,
        simulaciones: simsLigeras,
      }
      setHistorial((prev) => {
        let nuevo = [registro, ...prev.filter((r) => r.id !== registroId)].slice(0, 20)
        while (nuevo.length > 1 && !guardar("studio:historial", nuevo)) nuevo = nuevo.slice(0, -1)
        return nuevo
      })
    })()
  }, [diagnostico, simulaciones, registroId, contexto, fotos.frente, medicion])

  const headers = useCallback(
    () => ({ "Content-Type": "application/json", ...(pin ? { "x-studio-pin": pin } : {}) }),
    [pin],
  )

  const simular = useCallback(
    async (clave: string, instruccion: string, foto?: string) => {
      const base = foto ?? fotos.frente
      if (!base) return
      setSimulaciones((s) => ({ ...s, [clave]: { estado: "cargando" } }))
      try {
        const r = await fetch("/api/studio/simular", {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({ base64: soloBase64(base), instruccion }),
        })
        const datos = await r.json()
        if (!r.ok) throw new Error(datos.error ?? "No se pudo simular")
        setSimulaciones((s) => ({ ...s, [clave]: { estado: "listo", imagen: datos.imagen } }))
      } catch (e) {
        setSimulaciones((s) => ({ ...s, [clave]: { estado: "error", error: e instanceof Error ? e.message : "Error" } }))
      }
    },
    [fotos.frente, headers],
  )

  async function analizar() {
    if (!fotos.frente) return
    setPantalla("analizando")
    setPasoAnalisis(0)
    const intervalo = setInterval(() => setPasoAnalisis((p) => Math.min(p + 1, PASOS_ANALISIS.length - 1)), 4500)
    try {
      const med = await medirRostro(fotos.frente)
      setMedicion(med)
      const lista = PASOS_CAPTURA.filter((p) => fotos[p.vista]).map((p) => ({
        vista: p.vista,
        base64: soloBase64(fotos[p.vista]!),
      }))
      const r = await fetch("/api/studio/analizar", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ fotos: lista, medidas: med?.medidas ?? null, contexto }),
      })
      const datos = await r.json()
      if (!r.ok) throw new Error(datos.error ?? "No se pudo analizar")
      const diag = datos.diagnostico as TDiagnostico
      setDiagnostico(diag)
      setSimulaciones({})
      setRegistroId(crypto.randomUUID())
      setPantalla("resultados")
      window.scrollTo({ top: 0 })
      if (estado?.simulacion && diag.recomendaciones[0]) simular("0", diag.recomendaciones[0].promptSimulacion, fotos.frente)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al analizar")
      setPantalla("captura")
    } finally {
      clearInterval(intervalo)
    }
  }

  function nuevoCliente() {
    setContexto(CONTEXTO_VACIO)
    setConsentimiento(false)
    setFotos({})
    setMedicion(null)
    setDiagnostico(null)
    setSimulaciones({})
    setRegistroId(null)
    setPantalla("inicio")
  }

  function abrirRegistro(r: Registro) {
    setContexto(r.contexto)
    setFotos({ frente: r.foto })
    setMedicion(r.medicion)
    setDiagnostico(r.diagnostico)
    setSimulaciones(r.simulaciones)
    setRegistroId(r.id)
    setPantalla("resultados")
  }

  const bloqueado = estado?.requierePin && !pin

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-white">
      <BarraSuperior
        negocio={negocio.nombre}
        onInicio={pantalla !== "analizando" ? nuevoCliente : undefined}
        onHistorial={() => setPantalla("historial")}
        onAjustes={() => setAjustes(true)}
        mostrarAtras={pantalla === "captura" || pantalla === "historial"}
        onAtras={() => setPantalla(pantalla === "captura" ? "inicio" : diagnostico ? "resultados" : "inicio")}
      />

      {estado && !estado.analisis && (
        <p className="mx-auto max-w-3xl px-4 pt-3 text-center text-sm text-amber-200">
          Falta configurar ANTHROPIC_API_KEY en el servidor para analizar.
        </p>
      )}
      {bloqueado && (
        <button onClick={() => setAjustes(true)} className="mx-auto mt-3 flex items-center gap-2 rounded-full bg-[#d4af6a]/15 px-4 py-2 text-sm text-[#e9cf95]">
          <Lock className="h-4 w-4" /> Ingresa el PIN de la barbería para empezar
        </button>
      )}

      {pantalla === "inicio" && (
        <Inicio
          contexto={contexto}
          setContexto={setContexto}
          consentimiento={consentimiento}
          setConsentimiento={setConsentimiento}
          negocio={negocio.nombre}
          onContinuar={() => {
            precargarMedicion()
            setPantalla("captura")
          }}
        />
      )}

      {pantalla === "captura" && (
        <Captura fotos={fotos} onAbrir={setCamara} onQuitar={(v) => setFotos((f) => ({ ...f, [v]: undefined }))} onAnalizar={analizar} />
      )}

      {pantalla === "analizando" && <Analizando paso={pasoAnalisis} foto={fotos.frente!} />}

      {pantalla === "resultados" && diagnostico && fotos.frente && (
        <Resultados
          diagnostico={diagnostico}
          contexto={contexto}
          fotoFrontal={fotos.frente}
          medicion={medicion}
          simulaciones={simulaciones}
          onSimular={(k, i) => simular(k, i)}
          negocio={negocio}
          simulacionDisponible={Boolean(estado?.simulacion)}
          onNuevo={nuevoCliente}
        />
      )}

      {pantalla === "historial" && (
        <Historial
          registros={historial}
          onAbrir={abrirRegistro}
          onBorrar={(id) => {
            const nuevo = historial.filter((r) => r.id !== id)
            setHistorial(nuevo)
            guardar("studio:historial", nuevo)
          }}
        />
      )}

      {camara && (
        <Camara
          vista={camara}
          onCerrar={() => setCamara(null)}
          onCapturar={(img) => {
            setFotos((f) => ({ ...f, [camara]: img }))
            const siguiente = PASOS_CAPTURA.find((p) => p.vista !== camara && !fotos[p.vista] && !p.opcional)
            setCamara(siguiente?.vista ?? null)
          }}
        />
      )}

      {ajustes && (
        <Ajustes
          negocio={negocio}
          pin={pin}
          requierePin={Boolean(estado?.requierePin)}
          onGuardar={(n, p) => {
            setNegocio(n)
            setPin(p)
            guardar("studio:negocio", n)
            guardar("studio:pin", p)
            setAjustes(false)
            toast.success("Ajustes guardados en este dispositivo")
          }}
          onCerrar={() => setAjustes(false)}
        />
      )}
    </div>
  )
}

function BarraSuperior(p: {
  negocio: string
  onInicio?: () => void
  onHistorial: () => void
  onAjustes: () => void
  mostrarAtras: boolean
  onAtras: () => void
}) {
  return (
    <header className="flex items-center justify-between border-b border-white/5 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] print:hidden">
      <div className="flex items-center gap-2">
        {p.mostrarAtras && (
          <button onClick={p.onAtras} className="rounded-full p-1.5 hover:bg-white/10" aria-label="Atrás">
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <button onClick={p.onInicio} className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#e9cf95] to-[#a8823f] text-black">
            <ScanFace className="h-5 w-5" />
          </span>
          <span className="text-left leading-tight">
            <span className="block text-sm font-semibold tracking-wide">VISAGE</span>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-white/40">{p.negocio}</span>
          </span>
        </button>
      </div>
      <div className="flex gap-1">
        <button onClick={p.onHistorial} className="rounded-full p-2 text-white/70 hover:bg-white/10" aria-label="Historial">
          <History className="h-5 w-5" />
        </button>
        <button onClick={p.onAjustes} className="rounded-full p-2 text-white/70 hover:bg-white/10" aria-label="Ajustes">
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}

function Inicio(p: {
  contexto: Contexto
  setContexto: (c: Contexto) => void
  consentimiento: boolean
  setConsentimiento: (v: boolean) => void
  negocio: string
  onContinuar: () => void
}) {
  const c = p.contexto
  const set = <K extends keyof Contexto>(k: K, v: Contexto[K]) => p.setContexto({ ...c, [k]: v })

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-8">
      <section className="mb-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-[#d4af6a]">Estudio de visagismo con IA</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          El corte que tu rostro
          <br />
          <span className="bg-gradient-to-r from-[#e9cf95] to-[#a8823f] bg-clip-text text-transparent">ya estaba pidiendo</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-white/60">
          4 fotos, 478 puntos medidos y un diagnóstico de rostro, cráneo y cabello. Ves cómo te queda antes de cortar.
        </p>
      </section>

      <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:grid-cols-2">
        <Campo etiqueta="Nombre del cliente">
          <input className="campo" value={c.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej. Luis" />
        </Campo>
        <Campo etiqueta="Edad">
          <input className="campo" inputMode="numeric" value={c.edad} onChange={(e) => set("edad", e.target.value.slice(0, 3))} placeholder="Ej. 29" />
        </Campo>
        <Campo etiqueta="Ocupación / estilo de vida" ancho>
          <input className="campo" value={c.ocupacion} onChange={(e) => set("ocupacion", e.target.value)} placeholder="Ej. Vendedor, oficina, entrena 4 veces por semana" />
        </Campo>
        <Campo etiqueta="¿Qué busca?" ancho>
          <textarea className="campo min-h-20" value={c.objetivo} onChange={(e) => set("objetivo", e.target.value)} placeholder="Ej. Verse más profesional, que no se le pare el cabello, disimular entradas" />
        </Campo>
        <Campo etiqueta="Tiempo diario para peinarse" ancho>
          <div className="grid grid-cols-3 gap-2">
            {(["5", "10", "20"] as const).map((m) => (
              <button
                key={m}
                onClick={() => set("arregloDiario", m)}
                className={`rounded-xl border px-3 py-2.5 text-sm ${c.arregloDiario === m ? "border-[#d4af6a] bg-[#d4af6a]/15 text-[#e9cf95]" : "border-white/10 text-white/60"}`}
              >
                {m === "20" ? "20+ min" : `${m} min`}
              </button>
            ))}
          </div>
        </Campo>
        <Interruptor etiqueta="Quiere conservar el largo" valor={c.conservarLargo} onCambio={(v) => set("conservarLargo", v)} />
        <Interruptor etiqueta="Abierto a color / decoloración" valor={c.abiertoAColor} onCambio={(v) => set("abiertoAColor", v)} />
      </div>

      <label className="mt-5 flex cursor-pointer gap-3 rounded-2xl border border-white/10 p-4 text-sm text-white/70">
        <input type="checkbox" checked={p.consentimiento} onChange={(e) => p.setConsentimiento(e.target.checked)} className="mt-1 h-5 w-5 accent-[#d4af6a]" />
        <span>
          <ShieldCheck className="mr-1 inline h-4 w-4 text-[#d4af6a]" />
          El cliente autoriza a {p.negocio} a tomar fotos de su rostro y procesarlas con IA solo para este diagnóstico.
          Las fotos se envían cifradas para el análisis, no se publican y el historial queda únicamente en este dispositivo
          (datos personales sensibles, LFPDPPP).
        </span>
      </label>

      <button
        disabled={!p.consentimiento}
        onClick={p.onContinuar}
        className="boton-oro mt-5 w-full justify-center py-4 text-base disabled:opacity-40"
      >
        <Camera className="h-5 w-5" /> Tomar fotos <ArrowRight className="h-5 w-5" />
      </button>
    </main>
  )
}

function Captura(p: {
  fotos: Partial<Record<Vista, string>>
  onAbrir: (v: Vista) => void
  onQuitar: (v: Vista) => void
  onAnalizar: () => void
}) {
  const obligatorias = PASOS_CAPTURA.filter((x) => !x.opcional)
  const listas = obligatorias.filter((x) => p.fotos[x.vista]).length
  return (
    <main className="mx-auto max-w-4xl px-4 pb-16 pt-6">
      <h2 className="text-2xl font-semibold">Fotos del cliente</h2>
      <p className="mt-1 text-sm text-white/50">
        Fondo liso, buena luz de frente y el cabello seco como lo trae normalmente. Mientras más fotos, más preciso el diagnóstico del cráneo.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {PASOS_CAPTURA.map((paso) => {
          const foto = p.fotos[paso.vista]
          return (
            <div key={paso.vista} className="relative">
              <button
                onClick={() => p.onAbrir(paso.vista)}
                className={`flex aspect-[3/4] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border ${foto ? "border-[#d4af6a]" : "border-dashed border-white/20 bg-white/[0.03]"}`}
              >
                {foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={foto} alt={paso.titulo} className="h-full w-full object-cover" />
                ) : (
                  <>
                    <Camera className="mb-2 h-7 w-7 text-white/40" />
                    <span className="text-sm">{paso.titulo}</span>
                    {paso.opcional && <span className="text-[11px] text-white/40">Opcional</span>}
                  </>
                )}
              </button>
              {foto && (
                <>
                  <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[11px]">
                    <Check className="h-3 w-3 text-[#d4af6a]" /> {paso.titulo}
                  </span>
                  <button onClick={() => p.onQuitar(paso.vista)} className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5" aria-label={`Quitar ${paso.titulo}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>
      <button
        disabled={!p.fotos.frente}
        onClick={p.onAnalizar}
        className="boton-oro mt-6 w-full justify-center py-4 text-base disabled:opacity-40"
      >
        <ScanFace className="h-5 w-5" /> Analizar con IA ({listas}/{obligatorias.length} fotos)
      </button>
      {p.fotos.frente && listas < obligatorias.length && (
        <p className="mt-2 text-center text-xs text-white/40">Puedes analizar solo con la frontal, pero sin perfiles la forma del cráneo será estimada.</p>
      )}
    </main>
  )
}

function Analizando({ paso, foto }: { paso: number; foto: string }) {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-4 pb-16 pt-10">
      <div className="relative w-56 overflow-hidden rounded-3xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={foto} alt="Analizando" className="w-full opacity-70" />
        <div className="escaneo absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#d4af6a] to-transparent shadow-[0_0_20px_#d4af6a]" />
      </div>
      <ul className="mt-8 w-full space-y-3">
        {PASOS_ANALISIS.map((t, i) => (
          <li key={t} className={`flex items-center gap-3 text-sm transition ${i <= paso ? "text-white" : "text-white/25"}`}>
            {i < paso ? <Check className="h-4 w-4 text-[#d4af6a]" /> : i === paso ? <Loader2 className="h-4 w-4 animate-spin text-[#d4af6a]" /> : <span className="h-4 w-4" />}
            {t}
          </li>
        ))}
      </ul>
    </main>
  )
}

function Historial({ registros, onAbrir, onBorrar }: { registros: Registro[]; onAbrir: (r: Registro) => void; onBorrar: (id: string) => void }) {
  return (
    <main className="mx-auto max-w-4xl px-4 pb-16 pt-6">
      <h2 className="text-2xl font-semibold">Historial de clientes</h2>
      <p className="mt-1 text-sm text-white/50">Guardado solo en este dispositivo. Últimos 20 diagnósticos.</p>
      {registros.length === 0 && <p className="mt-10 text-center text-white/40">Aún no hay diagnósticos.</p>}
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {registros.map((r) => (
          <div key={r.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            <button onClick={() => onAbrir(r)} className="block w-full text-left">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.simulaciones["0"]?.imagen ?? r.foto} alt={r.contexto.nombre} className="aspect-[3/4] w-full object-cover" />
              <div className="p-3">
                <p className="font-medium">{r.contexto.nombre || "Sin nombre"}</p>
                <p className="text-xs text-white/50">
                  {ETIQUETA_FORMA[r.diagnostico.rostro.forma]} · {r.diagnostico.recomendaciones[0]?.nombre}
                </p>
                <p className="text-[11px] text-white/30">{new Date(r.fecha).toLocaleDateString("es-MX")}</p>
              </div>
            </button>
            <button onClick={() => onBorrar(r.id)} className="flex w-full items-center justify-center gap-1 border-t border-white/5 py-2 text-xs text-white/40 hover:text-red-300">
              <Trash2 className="h-3 w-3" /> Borrar
            </button>
          </div>
        ))}
      </div>
    </main>
  )
}

function Ajustes(p: {
  negocio: Negocio
  pin: string
  requierePin: boolean
  onGuardar: (n: Negocio, pin: string) => void
  onCerrar: () => void
}) {
  const [n, setN] = useState(p.negocio)
  const [pin, setPin] = useState(p.pin)
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center" onClick={p.onCerrar}>
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#141416] p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-semibold">Ajustes de la barbería</h3>
        <div className="space-y-3">
          <Campo etiqueta="Nombre de la barbería">
            <input className="campo" value={n.nombre} onChange={(e) => setN({ ...n, nombre: e.target.value })} />
          </Campo>
          <Campo etiqueta="WhatsApp para enviar resultados (opcional)">
            <input className="campo" inputMode="tel" value={n.whatsapp} onChange={(e) => setN({ ...n, whatsapp: e.target.value })} placeholder="52 222 000 0000 o vacío para elegir contacto" />
          </Campo>
          <Campo etiqueta="Enlace para agendar (opcional)">
            <input className="campo" value={n.enlaceAgenda} onChange={(e) => setN({ ...n, enlaceAgenda: e.target.value })} placeholder="https://…/agendar" />
          </Campo>
          {p.requierePin && (
            <Campo etiqueta="PIN de acceso">
              <input className="campo" type="password" value={pin} onChange={(e) => setPin(e.target.value)} />
            </Campo>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={p.onCerrar} className="boton-sec">Cancelar</button>
          <button onClick={() => p.onGuardar(n, pin.trim())} className="boton-oro">Guardar</button>
        </div>
      </div>
    </div>
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

function Interruptor({ etiqueta, valor, onCambio }: { etiqueta: string; valor: boolean; onCambio: (v: boolean) => void }) {
  return (
    <button onClick={() => onCambio(!valor)} className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-left text-sm">
      {etiqueta}
      <span className={`relative h-6 w-11 rounded-full transition ${valor ? "bg-[#d4af6a]" : "bg-white/15"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${valor ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  )
}
