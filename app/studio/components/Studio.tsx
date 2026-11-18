"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertTriangle, ArrowRight, BarChart3, Camera, Check, ChevronLeft, Loader2, ScanFace, Settings, ShieldCheck,
  Trash2, Users,
} from "lucide-react"
import { toast } from "sonner"
import type { BarberiaPublica, Contexto, Medidas, TDiagnostico } from "../lib/esquema"
import { revisarCalidad, type Calidad } from "../lib/calidad"
import { miniatura, soloBase64 } from "../lib/imagen"
import { medirRostro, precargarMedicion, type ResultadoMedicion } from "../lib/medidas"
import { AjustesBarberia } from "./AjustesBarberia"
import { Camara, PASOS_CAPTURA, type Vista } from "./Camara"
import { CierreServicio, type DatosCierre } from "./CierreServicio"
import { Clientes } from "./Clientes"
import { Entrar } from "./Entrar"
import { Panel } from "./Panel"
import { Resultados, type Simulacion } from "./Resultados"

type Pantalla = "inicio" | "datos" | "captura" | "analizando" | "resultados" | "clientes" | "panel" | "ajustes"
type Estado = { analisis: boolean; simulacion: boolean; barberia: BarberiaPublica | null; uso: number }
type Actual = {
  id: string
  token: string
  fecha: string
  diagnostico: TDiagnostico
  fotoFrente: string
  medicion: ResultadoMedicion | null
  medidas: Medidas | null
  simulaciones: Record<string, Simulacion>
  cierre: { corte: string; total: number | null; fotoReal: string | null; proximaVisita: string | null } | null
}

const CONTEXTO_VACIO: Contexto = {
  nombre: "",
  telefono: "",
  edad: "",
  ocupacion: "",
  arregloDiario: "10",
  objetivo: "",
  conservarLargo: false,
  abiertoAColor: false,
}

const PASOS_ANALISIS = [
  "Midiendo 478 puntos del rostro",
  "Calculando proporciones y tercios faciales",
  "Estimando la forma del cráneo",
  "Analizando tipo, grosor y densidad de cabello",
  "Eligiendo los 3 cortes que más le favorecen",
  "Preparando la ficha técnica y las recomendaciones",
]

function nombreCorte(d: TDiagnostico, elegido: string) {
  return /^\d$/.test(elegido) ? (d.recomendaciones[Number(elegido)]?.nombre ?? elegido) : elegido
}

export function Studio() {
  const [estado, setEstado] = useState<Estado | null>(null)
  const [pantalla, setPantalla] = useState<Pantalla>("inicio")
  const [contexto, setContexto] = useState<Contexto>(CONTEXTO_VACIO)
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [barbero, setBarbero] = useState<string | null>(null)
  const [consentimiento, setConsentimiento] = useState(false)
  const [fotos, setFotos] = useState<Partial<Record<Vista, string>>>({})
  const [calidad, setCalidad] = useState<Partial<Record<Vista, Calidad>>>({})
  const [camara, setCamara] = useState<Vista | null>(null)
  const [actual, setActual] = useState<Actual | null>(null)
  const [pasoAnalisis, setPasoAnalisis] = useState(0)
  const [cierreAbierto, setCierreAbierto] = useState(false)
  const [clienteAbierto, setClienteAbierto] = useState<string | null>(null)

  const cargarEstado = useCallback(async () => {
    try {
      const r = await fetch("/api/studio/estado")
      setEstado(await r.json())
    } catch {
      setEstado({ analisis: false, simulacion: false, barberia: null, uso: 0 })
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarEstado()
  }, [cargarEstado])

  const sesionExpirada = useCallback((r: Response) => {
    if (r.status === 401) {
      toast.error("Tu sesión terminó. Vuelve a entrar con el PIN.")
      setEstado((e) => (e ? { ...e, barberia: null } : e))
      return true
    }
    return false
  }, [])

  const simular = useCallback(
    async (clave: string, instruccion: string, base?: { id: string; foto: string }) => {
      const destino = base ?? (actual ? { id: actual.id, foto: actual.fotoFrente } : null)
      if (!destino) return
      const fijar = (s: Simulacion) =>
        setActual((a) => (a && a.id === destino.id ? { ...a, simulaciones: { ...a.simulaciones, [clave]: s } } : a))
      fijar({ estado: "cargando" })
      try {
        const r = await fetch("/api/studio/simular", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ diagnosticoId: destino.id, base64: soloBase64(destino.foto), instruccion }),
        })
        if (sesionExpirada(r)) return
        const datos = await r.json()
        if (!r.ok) throw new Error(datos.error ?? "No se pudo simular")
        fijar({ estado: "listo", imagen: datos.imagen })
        // Se guarda en el expediente una versión ligera
        const ligera = await miniatura(datos.imagen, 900)
        fetch(`/api/studio/diagnosticos/${destino.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ simulacion: { clave, imagen: ligera } }),
        }).catch(() => {})
      } catch (e) {
        fijar({ estado: "error", error: e instanceof Error ? e.message : "Error" })
      }
    },
    [actual, sesionExpirada],
  )

  async function tomarFoto(vista: Vista, img: string) {
    setFotos((f) => ({ ...f, [vista]: img }))
    setCalidad((c) => ({ ...c, [vista]: { estado: "revisando", avisos: [] } }))
    const siguiente = PASOS_CAPTURA.find((p) => p.vista !== vista && !fotos[p.vista] && !p.opcional)
    setCamara(siguiente?.vista ?? null)
    const res = await revisarCalidad(img, vista).catch(() => ({ estado: "ok", avisos: [] }) as Calidad)
    setCalidad((c) => ({ ...c, [vista]: res }))
  }

  async function analizar() {
    if (!fotos.frente) return
    setPantalla("analizando")
    setPasoAnalisis(0)
    const intervalo = setInterval(() => setPasoAnalisis((p) => Math.min(p + 1, PASOS_ANALISIS.length - 1)), 4500)
    try {
      const med = await medirRostro(fotos.frente)
      const lista = PASOS_CAPTURA.filter((p) => fotos[p.vista]).map((p) => ({ vista: p.vista, base64: soloBase64(fotos[p.vista]!) }))
      const r = await fetch("/api/studio/analizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fotos: lista, medidas: med?.medidas ?? null, contexto, clienteId, barbero }),
      })
      if (sesionExpirada(r)) return
      const datos = await r.json()
      if (!r.ok) throw new Error(datos.error ?? "No se pudo analizar")
      const diag = datos.diagnostico as TDiagnostico
      const nuevo: Actual = {
        id: datos.id,
        token: datos.token,
        fecha: new Date().toISOString(),
        diagnostico: diag,
        fotoFrente: fotos.frente,
        medicion: med,
        medidas: med?.medidas ?? null,
        simulaciones: {},
        cierre: null,
      }
      setActual(nuevo)
      setClienteId(datos.clienteId)
      setEstado((e) => (e ? { ...e, uso: e.uso + 1 } : e))
      setPantalla("resultados")
      window.scrollTo({ top: 0 })
      if (estado?.simulacion && diag.recomendaciones[0]) {
        simular("0", diag.recomendaciones[0].promptSimulacion, { id: nuevo.id, foto: nuevo.fotoFrente })
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al analizar")
      setPantalla("captura")
    } finally {
      clearInterval(intervalo)
    }
  }

  async function abrirVisita(id: string) {
    const r = await fetch(`/api/studio/diagnosticos/${id}`)
    if (sesionExpirada(r)) return
    const d = await r.json()
    if (!r.ok || !d.diagnostico) return toast.error("No se pudo abrir la visita")
    setContexto({ ...CONTEXTO_VACIO, ...d.contexto })
    setClienteId(d.clienteId)
    setActual({
      id: d.id,
      token: d.token,
      fecha: d.creadoEn,
      diagnostico: d.diagnostico,
      fotoFrente: d.fotoFrente,
      medicion: null,
      medidas: d.medidas,
      simulaciones: Object.fromEntries(
        Object.entries(d.simulaciones as Record<string, string>).map(([k, v]) => [k, { estado: "listo" as const, imagen: v }]),
      ),
      cierre: d.cerradoEn
        ? { corte: nombreCorte(d.diagnostico, d.corteElegido ?? ""), total: d.total, fotoReal: d.fotoReal, proximaVisita: d.proximaVisita }
        : null,
    })
    setPantalla("resultados")
    window.scrollTo({ top: 0 })
  }

  async function cerrarServicio(datos: DatosCierre) {
    if (!actual) return
    const fotoReal = datos.fotoReal ? await miniatura(datos.fotoReal, 900) : null
    const r = await fetch(`/api/studio/diagnosticos/${actual.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cierre: { ...datos, fotoReal } }),
    })
    if (sesionExpirada(r)) return
    if (!r.ok) {
      toast.error("No se pudo cerrar el servicio")
      return
    }
    const total = datos.serviciosVendidos.reduce((s, i) => s + i.precio, 0)
    setActual({
      ...actual,
      cierre: {
        corte: nombreCorte(actual.diagnostico, datos.corteElegido),
        total,
        fotoReal: fotoReal ?? actual.cierre?.fotoReal ?? null,
        proximaVisita: new Date(Date.now() + datos.semanasMantenimiento * 7 * 86400000).toISOString(),
      },
    })
    setCierreAbierto(false)
    toast.success("Servicio cerrado. Ya puedes enviarle su diagnóstico y crear el post.")
  }

  function nuevoDiagnostico(c?: { id: string; nombre: string; telefono: string | null; edad: string | null; ocupacion: string | null }) {
    setContexto(c ? { ...CONTEXTO_VACIO, nombre: c.nombre, telefono: c.telefono ?? "", edad: c.edad ?? "", ocupacion: c.ocupacion ?? "" } : CONTEXTO_VACIO)
    setClienteId(c?.id ?? null)
    setConsentimiento(false)
    setFotos({})
    setCalidad({})
    setActual(null)
    setPantalla("datos")
    window.scrollTo({ top: 0 })
  }

  async function salir() {
    await fetch("/api/studio/sesion", { method: "DELETE" })
    setEstado((e) => (e ? { ...e, barberia: null } : e))
    setPantalla("inicio")
  }

  if (!estado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0b0c]">
        <Loader2 className="h-8 w-8 animate-spin text-[#d4af6a]" />
      </div>
    )
  }
  if (!estado.barberia) return <Entrar onEntrar={cargarEstado} />
  const barberia = estado.barberia

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-white">
      <BarraSuperior
        barberia={barberia}
        pantalla={pantalla}
        onIr={(p) => {
          setClienteAbierto(null)
          setPantalla(p)
        }}
        mostrarAtras={pantalla === "captura" || pantalla === "datos"}
        onAtras={() => setPantalla(pantalla === "captura" ? "datos" : "inicio")}
      />

      {!estado.analisis && (
        <p className="mx-auto max-w-3xl px-4 pt-3 text-center text-sm text-amber-200">
          El servidor aún no tiene configurada la llave de IA para analizar. Avisa a tu proveedor.
        </p>
      )}

      {pantalla === "inicio" && (
        <Inicio
          barberia={barberia}
          uso={estado.uso}
          onNuevo={() => nuevoDiagnostico()}
          onClientes={() => setPantalla("clientes")}
          onPanel={() => setPantalla("panel")}
        />
      )}

      {pantalla === "datos" && (
        <Datos
          barberia={barberia}
          contexto={contexto}
          setContexto={setContexto}
          clienteFrecuente={clienteId !== null}
          barbero={barbero}
          setBarbero={setBarbero}
          consentimiento={consentimiento}
          setConsentimiento={setConsentimiento}
          onContinuar={() => {
            precargarMedicion()
            setPantalla("captura")
          }}
        />
      )}

      {pantalla === "captura" && (
        <Captura
          fotos={fotos}
          calidad={calidad}
          onAbrir={setCamara}
          onQuitar={(v) => {
            setFotos((f) => ({ ...f, [v]: undefined }))
            setCalidad((c) => ({ ...c, [v]: undefined }))
          }}
          onAnalizar={analizar}
        />
      )}

      {pantalla === "analizando" && fotos.frente && <Analizando paso={pasoAnalisis} foto={fotos.frente} />}

      {pantalla === "resultados" && actual && (
        <Resultados
          diagnostico={actual.diagnostico}
          contexto={contexto}
          fotoFrontal={actual.fotoFrente}
          medicion={actual.medicion}
          medidas={actual.medidas}
          simulaciones={actual.simulaciones}
          onSimular={(k, i) => simular(k, i)}
          barberia={barberia}
          token={actual.token}
          fecha={actual.fecha}
          cierre={actual.cierre}
          onCerrarServicio={() => setCierreAbierto(true)}
          simulacionDisponible={estado.simulacion}
          onNuevo={() => nuevoDiagnostico()}
        />
      )}

      {pantalla === "clientes" && (
        <Clientes clienteInicial={clienteAbierto} onAbrirVisita={abrirVisita} onNuevoDiagnostico={nuevoDiagnostico} />
      )}

      {pantalla === "panel" && (
        <Panel
          barberia={barberia}
          onAbrirCliente={(id) => {
            setClienteAbierto(id)
            setPantalla("clientes")
          }}
        />
      )}

      {pantalla === "ajustes" && (
        <AjustesBarberia
          barberia={barberia}
          onGuardado={(b) => setEstado((e) => (e ? { ...e, barberia: b } : e))}
          onSalir={salir}
        />
      )}

      {camara && <Camara vista={camara} onCerrar={() => setCamara(null)} onCapturar={(img) => tomarFoto(camara, img)} />}

      {cierreAbierto && actual && (
        <CierreServicio
          diagnostico={actual.diagnostico}
          barberia={barberia}
          barberoInicial={barbero}
          onCerrar={() => setCierreAbierto(false)}
          onConfirmar={cerrarServicio}
        />
      )}
    </div>
  )
}

function BarraSuperior(p: {
  barberia: BarberiaPublica
  pantalla: Pantalla
  onIr: (p: Pantalla) => void
  mostrarAtras: boolean
  onAtras: () => void
}) {
  const nav: [Pantalla, string, React.ReactNode][] = [
    ["clientes", "Clientes", <Users key="c" className="h-5 w-5" />],
    ["panel", "Panel", <BarChart3 key="p" className="h-5 w-5" />],
    ["ajustes", "Ajustes", <Settings key="a" className="h-5 w-5" />],
  ]
  return (
    <header className="flex items-center justify-between border-b border-white/5 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] print:hidden">
      <div className="flex items-center gap-2">
        {p.mostrarAtras && (
          <button onClick={p.onAtras} className="rounded-full p-1.5 hover:bg-white/10" aria-label="Atrás">
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <button onClick={() => p.onIr("inicio")} className="flex items-center gap-2">
          {p.barberia.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.barberia.logo} alt="" className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#e9cf95] to-[#a8823f] text-black">
              <ScanFace className="h-5 w-5" />
            </span>
          )}
          <span className="text-left leading-tight">
            <span className="block max-w-[11rem] truncate text-sm font-semibold">{p.barberia.nombre}</span>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-white/40">Visage IA</span>
          </span>
        </button>
      </div>
      <nav className="flex gap-1">
        {nav.map(([id, label, icono]) => (
          <button
            key={id}
            onClick={() => p.onIr(id)}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-2 text-sm ${p.pantalla === id ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5"}`}
            aria-label={label}
          >
            {icono}
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </nav>
    </header>
  )
}

function Inicio(p: { barberia: BarberiaPublica; uso: number; onNuevo: () => void; onClientes: () => void; onPanel: () => void }) {
  const pct = Math.min(100, Math.round((p.uso / p.barberia.limiteMensual) * 100))
  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-10">
      <section className="text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-[#d4af6a]">Estudio de visagismo con IA</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          El corte que su rostro
          <br />
          <span className="bg-gradient-to-r from-[#e9cf95] to-[#a8823f] bg-clip-text text-transparent">ya estaba pidiendo</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-white/60">
          4 fotos, 478 puntos medidos, diagnóstico de rostro, cráneo y cabello, y el antes/después antes de cortar.
        </p>
      </section>

      <button onClick={p.onNuevo} className="boton-oro mx-auto mt-8 flex w-full max-w-md justify-center py-4 text-base">
        <Camera className="h-5 w-5" /> Nuevo diagnóstico <ArrowRight className="h-5 w-5" />
      </button>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button onClick={p.onClientes} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left hover:border-[#d4af6a]/50">
          <Users className="mb-2 h-6 w-6 text-[#d4af6a]" />
          <p className="font-semibold">Clientes</p>
          <p className="text-sm text-white/50">Expediente, historial de cortes y nueva visita</p>
        </button>
        <button onClick={p.onPanel} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left hover:border-[#d4af6a]/50">
          <BarChart3 className="mb-2 h-6 w-6 text-[#d4af6a]" />
          <p className="font-semibold">Panel del negocio</p>
          <p className="text-sm text-white/50">Venta adicional, ticket y clientes por volver</p>
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 p-4">
        <div className="mb-2 flex justify-between text-xs text-white/50">
          <span>Diagnósticos este mes · plan {p.barberia.plan}</span>
          <span>
            {p.uso}/{p.barberia.limiteMensual}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10">
          <div className={`h-full rounded-full ${pct >= 90 ? "bg-red-400" : "bg-[#d4af6a]"}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </main>
  )
}

function Datos(p: {
  barberia: BarberiaPublica
  contexto: Contexto
  setContexto: (c: Contexto) => void
  clienteFrecuente: boolean
  barbero: string | null
  setBarbero: (b: string | null) => void
  consentimiento: boolean
  setConsentimiento: (v: boolean) => void
  onContinuar: () => void
}) {
  const c = p.contexto
  const set = <K extends keyof Contexto>(k: K, v: Contexto[K]) => p.setContexto({ ...c, [k]: v })

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-6">
      <h2 className="text-2xl font-semibold">{p.clienteFrecuente ? `Nueva visita de ${c.nombre}` : "Datos del cliente"}</h2>
      <p className="mb-5 text-sm text-white/50">
        {p.clienteFrecuente
          ? "La IA tomará en cuenta su visita anterior para dar continuidad al corte."
          : "Con su WhatsApp le llega su diagnóstico y el recordatorio de su próximo corte."}
      </p>

      <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:grid-cols-2">
        <Campo etiqueta="Nombre del cliente">
          <input className="campo" value={c.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej. Luis" />
        </Campo>
        <Campo etiqueta="WhatsApp">
          <input className="campo" inputMode="tel" value={c.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="222 000 0000" />
        </Campo>
        <Campo etiqueta="Edad">
          <input className="campo" inputMode="numeric" value={c.edad} onChange={(e) => set("edad", e.target.value.slice(0, 3))} placeholder="Ej. 29" />
        </Campo>
        <Campo etiqueta="Ocupación / estilo de vida">
          <input className="campo" value={c.ocupacion} onChange={(e) => set("ocupacion", e.target.value)} placeholder="Ej. Vendedor, oficina, gym" />
        </Campo>
        <Campo etiqueta="¿Qué busca?" ancho>
          <textarea className="campo min-h-20" value={c.objetivo} onChange={(e) => set("objetivo", e.target.value)} placeholder="Ej. Verse más profesional, que no se le pare el cabello, disimular entradas" />
        </Campo>
        <Campo etiqueta="Tiempo diario para peinarse" ancho grupo>
          <div className="grid grid-cols-3 gap-2">
            {(["5", "10", "20"] as const).map((m) => (
              <button
                key={m}
                type="button"
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
        {p.barberia.barberos.length > 0 && (
          <Campo etiqueta="Barbero que atiende" ancho grupo>
            <div className="flex flex-wrap gap-2">
              {p.barberia.barberos.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => p.setBarbero(p.barbero === n ? null : n)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${p.barbero === n ? "border-[#d4af6a] bg-[#d4af6a]/15 text-[#e9cf95]" : "border-white/10 text-white/60"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </Campo>
        )}
      </div>

      <label className="mt-5 flex cursor-pointer gap-3 rounded-2xl border border-white/10 p-4 text-sm text-white/70">
        <input type="checkbox" checked={p.consentimiento} onChange={(e) => p.setConsentimiento(e.target.checked)} className="mt-1 h-5 w-5 accent-[#d4af6a]" />
        <span>
          <ShieldCheck className="mr-1 inline h-4 w-4 text-[#d4af6a]" />
          El cliente autoriza a {p.barberia.nombre} a tomar fotos de su rostro y procesarlas con IA para su diagnóstico de estilo,
          y a guardarlas en su expediente. No se publican sin su permiso (datos personales sensibles, LFPDPPP).
        </span>
      </label>

      <button disabled={!p.consentimiento} onClick={p.onContinuar} className="boton-oro mt-5 w-full justify-center py-4 text-base disabled:opacity-40">
        <Camera className="h-5 w-5" /> Tomar fotos <ArrowRight className="h-5 w-5" />
      </button>
    </main>
  )
}

function Captura(p: {
  fotos: Partial<Record<Vista, string>>
  calidad: Partial<Record<Vista, Calidad>>
  onAbrir: (v: Vista) => void
  onQuitar: (v: Vista) => void
  onAnalizar: () => void
}) {
  const obligatorias = PASOS_CAPTURA.filter((x) => !x.opcional)
  const listas = obligatorias.filter((x) => p.fotos[x.vista]).length
  const avisos = PASOS_CAPTURA.flatMap((x) => (p.calidad[x.vista]?.avisos ?? []).map((a) => `${x.titulo}: ${a}`))
  return (
    <main className="mx-auto max-w-4xl px-4 pb-16 pt-6">
      <h2 className="text-2xl font-semibold">Fotos del cliente</h2>
      <p className="mt-1 text-sm text-white/50">
        Fondo liso, buena luz de frente y el cabello seco como lo trae normalmente. Con perfiles y coronilla el diagnóstico del cráneo es más preciso.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {PASOS_CAPTURA.map((paso) => {
          const foto = p.fotos[paso.vista]
          const q = p.calidad[paso.vista]
          return (
            <div key={paso.vista} className="relative">
              <button
                onClick={() => p.onAbrir(paso.vista)}
                className={`flex aspect-[3/4] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border ${foto ? (q?.estado === "aviso" ? "border-amber-400" : "border-[#d4af6a]") : "border-dashed border-white/20 bg-white/[0.03]"}`}
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
                    {q?.estado === "revisando" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : q?.estado === "aviso" ? (
                      <AlertTriangle className="h-3 w-3 text-amber-300" />
                    ) : (
                      <Check className="h-3 w-3 text-[#d4af6a]" />
                    )}
                    {paso.titulo}
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
      {avisos.length > 0 && (
        <div className="mt-4 space-y-1 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
          {avisos.map((a) => (
            <p key={a} className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {a}
            </p>
          ))}
          <p className="text-xs text-amber-100/60">Toca la foto para repetirla. Puedes continuar, pero el resultado será menos preciso.</p>
        </div>
      )}
      <button disabled={!p.fotos.frente} onClick={p.onAnalizar} className="boton-oro mt-6 w-full justify-center py-4 text-base disabled:opacity-40">
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
      <p className="mt-6 text-center text-xs text-white/40">Toma entre 20 y 60 segundos. Buen momento para ofrecerle una bebida.</p>
    </main>
  )
}

function Campo({ etiqueta, children, ancho, grupo }: { etiqueta: string; children: React.ReactNode; ancho?: boolean; grupo?: boolean }) {
  const clase = `block ${ancho ? "sm:col-span-2" : ""}`
  const titulo = <span className="mb-1.5 block text-xs uppercase tracking-widest text-white/40">{etiqueta}</span>
  // Con varios botones dentro, un <label> les pondría su texto como nombre accesible: se usa un grupo
  return grupo ? (
    <div role="group" aria-label={etiqueta} className={clase}>
      {titulo}
      {children}
    </div>
  ) : (
    <label className={clase}>
      {titulo}
      {children}
    </label>
  )
}

function Interruptor({ etiqueta, valor, onCambio }: { etiqueta: string; valor: boolean; onCambio: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onCambio(!valor)} className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-left text-sm">
      {etiqueta}
      <span className={`relative h-6 w-11 rounded-full transition ${valor ? "bg-[#d4af6a]" : "bg-white/15"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${valor ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  )
}
