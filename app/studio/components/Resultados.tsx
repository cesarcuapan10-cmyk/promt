"use client"

import { useState } from "react"
import {
  AlertTriangle, BookOpen, CalendarPlus, Check, CheckCircle2, ChevronDown, Clock, Loader2,
  ImagePlus, Palette, Printer, RefreshCw, Ruler, Scissors, Send, ShoppingBag, Sparkles, Wand2, X,
} from "lucide-react"
import { toast } from "sonner"
import { ETIQUETA_CRANEO, ETIQUETA_FORMA, type BarberiaPublica, type Contexto, type Medidas, type TDiagnostico } from "../lib/esquema"
import { AVISO_CIENTIFICO, ESTUDIOS } from "../lib/estudios"
import type { ResultadoMedicion } from "../lib/medidas"
import { compartirOdescargar, componerPost } from "../lib/post"
import { AntesDespues } from "./AntesDespues"
import { MapaFacial } from "./MapaFacial"

export type Simulacion = { estado: "cargando" | "listo" | "error"; imagen?: string; error?: string }

type Props = {
  diagnostico: TDiagnostico
  contexto: Contexto
  fotoFrontal: string
  medicion: ResultadoMedicion | null
  medidas: Medidas | null
  simulaciones: Record<string, Simulacion>
  onSimular: (clave: string, instruccion: string) => void
  barberia: BarberiaPublica
  token: string
  fecha: string
  cierre: { corte: string; total: number | null; fotoReal: string | null; proximaVisita: string | null } | null
  onCerrarServicio: () => void
  simulacionDisponible: boolean
  onNuevo: () => void
}

const SECCIONES = [
  ["diagnostico", "Diagnóstico"],
  ["cortes", "Cortes"],
  ["cuidado", "Cuidado"],
  ["ciencia", "Ciencia"],
] as const

export function Resultados(p: Props) {
  const { diagnostico: d, contexto, medicion, medidas, barberia } = p
  const [personalizada, setPersonalizada] = useState("")
  const [generandoPost, setGenerandoPost] = useState(false)
  const principal = p.simulaciones["0"]
  const despuesHeroe = p.cierre?.fotoReal ?? (principal?.estado === "listo" ? principal.imagen : undefined)
  const extrasSugeridos = [...d.serviciosComplementarios.map((s) => s.precio), ...d.productosRecomendados.map((x) => x.precio)]
    .filter((n): n is number => typeof n === "number")
    .reduce((a, b) => a + b, 0)

  function enlaceCliente() {
    const tel = contexto.telefono.replace(/\D/g, "").slice(-10)
    const texto = encodeURIComponent(
      `${contexto.nombre ? contexto.nombre.split(" ")[0] + ", aquí" : "Aquí"} está tu diagnóstico de estilo de ${barberia.nombre}: ` +
        `tu corte ideal es ${d.recomendaciones[0].nombre}. Ve tu antes y después, tu rutina en casa y cuándo te toca el retoque:\n` +
        `${location.origin}/v/${p.token}`,
    )
    return tel.length === 10 ? `https://wa.me/52${tel}?text=${texto}` : `https://wa.me/?text=${texto}`
  }

  async function post() {
    const despues = p.cierre?.fotoReal ?? Object.values(p.simulaciones).find((s) => s.estado === "listo")?.imagen
    if (!despues) {
      toast.info("Primero simula un corte o cierra el servicio con la foto real")
      return
    }
    setGenerandoPost(true)
    try {
      const blob = await componerPost({
        antes: p.fotoFrontal,
        despues,
        barberia,
        corte: p.cierre?.corte ?? d.recomendaciones[0].nombre,
        esSimulacion: !p.cierre?.fotoReal,
      })
      await compartirOdescargar(blob, `antes-despues-${(contexto.nombre || "cliente").toLowerCase().replace(/\s+/g, "-")}.jpg`, `${p.cierre?.corte ?? d.recomendaciones[0].nombre} · ${barberia.nombre}`)
    } catch {
      toast.error("No se pudo generar el post")
    } finally {
      setGenerandoPost(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-4 print:max-w-none print:px-0">
      {/* Encabezado */}
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-[#d4af6a]">{barberia.nombre} · Visagismo IA</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{contexto.nombre || "Diagnóstico del cliente"}</h1>
          <p className="text-sm text-white/50">
            {new Date(p.fecha).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button onClick={() => window.print()} className="boton-sec">
            <Printer className="h-4 w-4" /> PDF
          </button>
          <a href={enlaceCliente()} target="_blank" rel="noreferrer" className="boton-sec">
            <Send className="h-4 w-4" /> Enviar al cliente
          </a>
          <button onClick={post} disabled={generandoPost} className="boton-sec disabled:opacity-50">
            {generandoPost ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} Post para redes
          </button>
          {p.cierre ? (
            <button onClick={p.onNuevo} className="boton-oro">
              <RefreshCw className="h-4 w-4" /> Nuevo cliente
            </button>
          ) : (
            <button onClick={p.onCerrarServicio} className="boton-oro">
              <CheckCircle2 className="h-4 w-4" /> Cerrar servicio
            </button>
          )}
        </div>
      </header>

      {p.cierre && (
        <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          <CheckCircle2 className="h-4 w-4" />
          <span>Servicio cerrado: <b>{p.cierre.corte}</b></span>
          {p.cierre.total !== null && <span>Total ${p.cierre.total}</span>}
          {p.cierre.proximaVisita && (
            <span>Regresa el {new Date(p.cierre.proximaVisita).toLocaleDateString("es-MX", { day: "numeric", month: "long" })}</span>
          )}
        </div>
      )}

      <nav className="sticky top-0 z-30 -mx-4 mb-6 flex gap-1 overflow-x-auto bg-[#0b0b0c]/90 px-4 py-2 backdrop-blur print:hidden">
        {SECCIONES.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="whitespace-nowrap rounded-full border border-white/10 px-4 py-1.5 text-sm text-white/70 hover:border-[#d4af6a] hover:text-white">
            {label}
          </a>
        ))}
      </nav>

      {!d.calidadFotos.aptas && (
        <Aviso icono={<AlertTriangle className="h-4 w-4" />} texto={`Fotos con poca calidad: ${d.calidadFotos.observaciones}`} />
      )}

      {/* Héroe: antes/después del corte principal */}
      <section className="grid gap-5 md:grid-cols-2">
        <div>
          {despuesHeroe ? (
            <AntesDespues antes={p.fotoFrontal} despues={despuesHeroe} alt={p.cierre?.corte ?? d.recomendaciones[0].nombre} />
          ) : (
            <div className="relative">
              <MapaFacial foto={p.fotoFrontal} medicion={medicion} />
              {principal?.estado === "cargando" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-black/60 text-sm backdrop-blur-sm">
                  <Loader2 className="h-8 w-8 animate-spin text-[#d4af6a]" />
                  Simulando {d.recomendaciones[0].nombre}…
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center gap-4">
          <p className="text-[11px] uppercase tracking-[0.25em] text-white/40">Tu corte ideal</p>
          <h2 className="text-4xl font-semibold leading-tight">{d.recomendaciones[0].nombre}</h2>
          <Compat valor={d.recomendaciones[0].compatibilidad} />
          <p className="text-white/80">{d.resumenCliente}</p>
          {!principal && p.simulacionDisponible && (
            <button onClick={() => p.onSimular("0", d.recomendaciones[0].promptSimulacion)} className="boton-oro w-fit print:hidden">
              <Wand2 className="h-4 w-4" /> Ver cómo te queda
            </button>
          )}
          {principal?.estado === "error" && <p className="text-sm text-red-300">{principal.error}</p>}
        </div>
      </section>

      {/* Diagnóstico */}
      <Seccion id="diagnostico" titulo="Diagnóstico" icono={<Ruler className="h-5 w-5" />}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Tarjeta titulo="Rostro" etiqueta={ETIQUETA_FORMA[d.rostro.forma] + (d.rostro.formaSecundaria ? ` · tendencia ${ETIQUETA_FORMA[d.rostro.formaSecundaria].toLowerCase()}` : "")}>
            <p className="mb-3 text-sm text-white/70">{d.rostro.explicacion}</p>
            {medidas && (
              <div className="mb-4 space-y-3">
                <Barra etiqueta="Largo / ancho (malla)" valor={medidas.largoAncho} min={0.85} max={1.4} formato={(v) => v.toFixed(2)} />
                <Barra etiqueta="Mandíbula / pómulos" valor={medidas.mandibulaPomulo} min={0.6} max={1.05} formato={(v) => v.toFixed(2)} />
                <Barra etiqueta="Frente / pómulos" valor={medidas.frentePomulo} min={0.6} max={1.05} formato={(v) => v.toFixed(2)} />
                <Barra etiqueta="Ojos-boca / largo (ref. 0.36)" valor={medidas.ojosBocaLargo} min={0.25} max={0.45} ideal={0.36} formato={(v) => v.toFixed(2)} />
                <Barra etiqueta="Entre pupilas / ancho (ref. 0.46)" valor={medidas.interocularAncho} min={0.3} max={0.6} ideal={0.46} formato={(v) => v.toFixed(2)} />
                <Tercios t={medidas.tercios} />
                <p className="text-xs text-white/40">
                  Simetría {medidas.simetria}% · Pre-clasificación geométrica: {ETIQUETA_FORMA[medidas.formaGeometrica]}
                  {Math.abs(medidas.inclinacion) > 6 && ` · Cabeza inclinada ${medidas.inclinacion}°, repetir foto para mayor precisión`}
                </p>
              </div>
            )}
            <Lista
              items={[
                ["Frente", d.rostro.frente],
                ["Pómulos", d.rostro.pomulos],
                ["Mandíbula", d.rostro.mandibula],
                ["Mentón", d.rostro.menton],
                ["Nariz", d.rostro.nariz],
                ["Ojos y cejas", d.rostro.ojosYCejas],
                ["Orejas", d.rostro.orejas],
                ["Perfil", d.rostro.perfil],
                ["Simetría", d.rostro.simetria],
              ]}
            />
          </Tarjeta>

          <div className="grid gap-4">
            <Tarjeta titulo="Cráneo" etiqueta={ETIQUETA_CRANEO[d.craneo.tipo]}>
              <DiagramaCraneo tipo={d.craneo.tipo} />
              <p className="mb-3 text-sm text-white/70">{d.craneo.explicacion}</p>
              <Lista items={[["Nuca", d.craneo.occipital], ["Coronilla", d.craneo.coronilla], ["Remolinos", d.craneo.remolinos]]} />
              {d.craneo.zonasACompensar.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {d.craneo.zonasACompensar.map((z) => (
                    <span key={z} className="rounded-full bg-[#d4af6a]/15 px-3 py-1 text-xs text-[#e9cf95]">{z}</span>
                  ))}
                </div>
              )}
            </Tarjeta>
            <Tarjeta titulo="Cabello" etiqueta={`Tipo ${d.cabello.tipoRizo} · ${d.cabello.grosor} · densidad ${d.cabello.densidad}`}>
              <p className="mb-3 text-sm text-white/70">{d.cabello.descripcion}</p>
              <Lista
                items={[
                  ["Al cortarlo", d.cabello.comportamiento],
                  ["Línea frontal", d.cabello.lineaFrontal],
                  ["Norwood", d.cabello.escalaNorwood],
                  ["Canas", d.cabello.canas],
                  ["Cuero cabelludo", d.cabello.estadoCueroCabelludo],
                ]}
              />
            </Tarjeta>
            <Tarjeta titulo="Barba" etiqueta={d.barba.presente ? d.barba.densidad : "Sin barba"}>
              <p className="text-sm text-white/70">{d.barba.observaciones}</p>
            </Tarjeta>
          </div>
        </div>
        {d.notaSalud && <Aviso icono={<AlertTriangle className="h-4 w-4" />} texto={d.notaSalud} />}
      </Seccion>

      {/* Cortes */}
      <Seccion id="cortes" titulo="Cortes recomendados" icono={<Scissors className="h-5 w-5" />}>
        <div className="grid gap-5 lg:grid-cols-3">
          {d.recomendaciones.map((r, i) => (
            <TarjetaCorte
              key={i}
              indice={i}
              r={r}
              foto={p.fotoFrontal}
              sim={p.simulaciones[String(i)]}
              disponible={p.simulacionDisponible}
              onSimular={() => p.onSimular(String(i), r.promptSimulacion)}
            />
          ))}
        </div>

        {p.simulacionDisponible && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 print:hidden">
            <p className="mb-2 text-sm font-medium">¿El cliente trae una idea propia?</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={personalizada}
                onChange={(e) => setPersonalizada(e.target.value)}
                placeholder="Ej. french crop con decoloración platinada y barba de candado"
                className="campo flex-1"
              />
              <button
                disabled={personalizada.trim().length < 5 || p.simulaciones.personalizada?.estado === "cargando"}
                onClick={() => p.onSimular("personalizada", personalizada.trim())}
                className="boton-oro justify-center disabled:opacity-40"
              >
                <Wand2 className="h-4 w-4" /> Simular idea
              </button>
            </div>
            <SimulacionBloque foto={p.fotoFrontal} sim={p.simulaciones.personalizada} alt={personalizada} />
          </div>
        )}

        {d.evitar.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/50">Evitar</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {d.evitar.map((e) => (
                <div key={e.corte} className="flex gap-3 rounded-xl border border-red-400/20 bg-red-400/5 p-3">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                  <div>
                    <p className="text-sm font-medium">{e.corte}</p>
                    <p className="text-sm text-white/60">{e.razon}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Seccion>

      {/* Cuidado */}
      <Seccion id="cuidado" titulo="Color, cuidado y servicios" icono={<Palette className="h-5 w-5" />}>
        <div className="grid gap-4 md:grid-cols-3">
          <Tarjeta titulo="Color" etiqueta={d.color.tonos.join(" · ") || "—"}>
            <p className="text-sm text-white/70">{d.color.recomendacion}</p>
            {d.color.advertencias && <p className="mt-2 text-xs text-white/40">{d.color.advertencias}</p>}
          </Tarjeta>
          <Tarjeta titulo="En casa" etiqueta="Rutina">
            <ul className="space-y-2 text-sm text-white/70">
              {d.cuidadoEnCasa.map((c) => (
                <li key={c} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#d4af6a]" />{c}</li>
              ))}
            </ul>
          </Tarjeta>
          <Tarjeta titulo="Servicios que te aportan" etiqueta="Complementos">
            <ListaVenta items={d.serviciosComplementarios.map((x) => ({ nombre: x.servicio, precio: x.precio, motivo: x.motivo }))} />
          </Tarjeta>
        </div>
        {d.productosRecomendados.length > 0 && (
          <div className="mt-4">
            <Tarjeta titulo="Productos para tu cabello" etiqueta="Para casa">
              <ListaVenta items={d.productosRecomendados.map((x) => ({ nombre: x.producto, precio: x.precio, motivo: x.motivo }))} />
            </Tarjeta>
          </div>
        )}
        {extrasSugeridos > 0 && (
          <p className="mt-3 flex items-center gap-2 text-sm text-[#e9cf95] print:hidden">
            <ShoppingBag className="h-4 w-4" /> Si toma lo recomendado: +${extrasSugeridos} al ticket
          </p>
        )}
        {barberia.enlaceAgenda && (
          <a href={barberia.enlaceAgenda} target="_blank" rel="noreferrer" className="boton-oro mt-5 w-full justify-center py-3 print:hidden">
            <CalendarPlus className="h-5 w-5" /> Agendar mantenimiento en {d.recomendaciones[0].fichaTecnica.mantenimientoSemanas} semanas
          </a>
        )}
      </Seccion>

      {/* Ciencia */}
      <Seccion id="ciencia" titulo="Base científica" icono={<BookOpen className="h-5 w-5" />}>
        <p className="mb-4 text-sm text-white/50">{AVISO_CIENTIFICO}</p>
        <div className="grid gap-3 md:grid-cols-2">
          {ESTUDIOS.map((e) => (
            <details key={e.id} className="group rounded-xl border border-white/10 bg-white/[0.03] p-4 open:border-[#d4af6a]/40">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#d4af6a]">{e.tema}</p>
                  <p className="font-medium">{e.titulo}</p>
                </div>
                <ChevronDown className="mt-1 h-4 w-4 shrink-0 transition group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm text-white/75">{e.hallazgo}</p>
              <p className="mt-2 text-sm text-[#e9cf95]">En tu caso: {e.aplicacion}</p>
              <p className="mt-2 text-xs italic text-white/40">{e.cita}</p>
            </details>
          ))}
        </div>
      </Seccion>
    </div>
  )
}

function TarjetaCorte({
  r, indice, foto, sim, disponible, onSimular,
}: {
  r: TDiagnostico["recomendaciones"][number]
  indice: number
  foto: string
  sim?: Simulacion
  disponible: boolean
  onSimular: () => void
}) {
  const f = r.fichaTecnica
  return (
    <article className="flex flex-col rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-4 break-inside-avoid">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.2em] text-white/40">Opción {indice + 1}</span>
        <Compat valor={r.compatibilidad} compacto />
      </div>
      <h3 className="text-xl font-semibold">{r.nombre}</h3>
      <p className="mt-2 text-sm text-white/75">{r.porQueFunciona}</p>
      <p className="mt-2 flex gap-2 text-sm text-[#e9cf95]">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0" /> {r.efectoOptico}
      </p>

      <div className="my-4">
        {disponible && !sim && (
          <button onClick={onSimular} className="boton-sec w-full justify-center print:hidden">
            <Wand2 className="h-4 w-4" /> Simular con IA
          </button>
        )}
        <SimulacionBloque foto={foto} sim={sim} alt={r.nombre} onReintentar={onSimular} />
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
        <Dato icono={<Clock className="h-4 w-4" />} valor={`${f.tiempoServicioMin} min`} etiqueta="Servicio" />
        <Dato icono={<RefreshCw className="h-4 w-4" />} valor={`${f.mantenimientoSemanas} sem`} etiqueta="Retoque" />
        <Dato icono={<Sparkles className="h-4 w-4" />} valor={`${f.arregloDiarioMin} min`} etiqueta="Peinado diario" />
      </div>

      <details className="group mt-auto rounded-xl bg-black/30 p-3" open={indice === 0}>
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
          Ficha técnica para el barbero
          <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
        </summary>
        <div className="mt-3">
          <Lista
            items={[
              ["Laterales", f.laterales],
              ["Superior", f.superior],
              ["Nuca", f.nuca],
              ["Transición", f.transicion],
              ["Herramientas", f.herramientas],
              ["Texturizado", f.texturizado],
              ["Acabado", f.peinadoYAcabado],
              ["Productos", f.productos.join(", ")],
              ["Barba", r.barba],
            ]}
          />
        </div>
      </details>
    </article>
  )
}

function SimulacionBloque({ foto, sim, alt, onReintentar }: { foto: string; sim?: Simulacion; alt: string; onReintentar?: () => void }) {
  if (!sim) return null
  if (sim.estado === "cargando")
    return (
      <div className="mt-3 flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#d4af6a]/40 text-sm text-white/60">
        <Loader2 className="h-7 w-7 animate-spin text-[#d4af6a]" />
        Generando simulación…
        <span className="text-xs text-white/40">10–30 segundos</span>
      </div>
    )
  if (sim.estado === "error")
    return (
      <div className="mt-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-200">
        {sim.error}
        {onReintentar && (
          <button onClick={onReintentar} className="ml-2 underline">Reintentar</button>
        )}
      </div>
    )
  return (
    <div className="mt-3">
      <AntesDespues antes={foto} despues={sim.imagen!} alt={alt} />
    </div>
  )
}

function ListaVenta({ items }: { items: { nombre: string; precio: number | null; motivo: string }[] }) {
  return (
    <ul className="space-y-3 text-sm">
      {items.map((x) => (
        <li key={x.nombre}>
          <p className="flex justify-between gap-3 font-medium">
            <span>{x.nombre}</span>
            {x.precio !== null && <span className="font-mono text-[#e9cf95]">${x.precio}</span>}
          </p>
          <p className="text-white/60">{x.motivo}</p>
        </li>
      ))}
    </ul>
  )
}

function Seccion({ id, titulo, icono, children }: { id: string; titulo: string; icono: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-12 scroll-mt-16 break-before-page">
      <h2 className="mb-5 flex items-center gap-2 text-2xl font-semibold">
        <span className="text-[#d4af6a]">{icono}</span> {titulo}
      </h2>
      {children}
    </section>
  )
}

function Tarjeta({ titulo, etiqueta, children }: { titulo: string; etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 break-inside-avoid">
      <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">{titulo}</p>
      <p className="mb-3 text-lg font-semibold text-[#e9cf95]">{etiqueta}</p>
      {children}
    </div>
  )
}

function Lista({ items }: { items: [string, string][] }) {
  return (
    <dl className="divide-y divide-white/5 text-sm">
      {items.filter(([, v]) => v).map(([k, v]) => (
        <div key={k} className="grid grid-cols-[7.5rem_1fr] gap-3 py-2">
          <dt className="text-white/40">{k}</dt>
          <dd className="text-white/80">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function Compat({ valor, compacto }: { valor: number; compacto?: boolean }) {
  const v = Math.round(Math.max(0, Math.min(100, valor)))
  if (compacto) return <span className="rounded-full bg-[#d4af6a] px-2.5 py-0.5 text-xs font-bold text-black">{v}%</span>
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-[#a8823f] to-[#e9cf95]" style={{ width: `${v}%` }} />
      </div>
      <span className="text-sm font-semibold text-[#e9cf95]">{v}% compatible</span>
    </div>
  )
}

function Barra({ etiqueta, valor, min, max, ideal, formato }: { etiqueta: string; valor: number; min: number; max: number; ideal?: number; formato: (v: number) => string }) {
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100))
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-white/50">{etiqueta}</span>
        <span className="font-mono text-white/80">{formato(valor)}</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-white/10">
        {ideal !== undefined && (
          <div className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-white/40" style={{ left: `${pct(ideal)}%` }} title="Referencia Pallett 2010" />
        )}
        <div className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d4af6a] ring-2 ring-black" style={{ left: `${pct(valor)}%` }} />
      </div>
    </div>
  )
}

function Tercios({ t }: { t: { superior: number; medio: number; inferior: number } }) {
  return (
    <div>
      <p className="mb-1 text-xs text-white/50">Tercios faciales (medidos)</p>
      <div className="flex h-6 overflow-hidden rounded-md text-[10px] font-semibold text-black">
        <div className="flex items-center justify-center bg-[#e9cf95]" style={{ width: `${t.superior}%` }}>{t.superior}%</div>
        <div className="flex items-center justify-center bg-[#d4af6a]" style={{ width: `${t.medio}%` }}>{t.medio}%</div>
        <div className="flex items-center justify-center bg-[#a8823f]" style={{ width: `${t.inferior}%` }}>{t.inferior}%</div>
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-white/40">
        <span>Superior*</span><span>Medio</span><span>Inferior</span>
      </div>
      <p className="text-[10px] text-white/30">*La malla no llega al nacimiento del cabello: el superior real es mayor.</p>
    </div>
  )
}

function Dato({ icono, valor, etiqueta }: { icono: React.ReactNode; valor: string; etiqueta: string }) {
  return (
    <div className="rounded-lg bg-white/[0.04] px-2 py-2">
      <div className="mx-auto mb-1 flex justify-center text-[#d4af6a]">{icono}</div>
      <p className="font-semibold">{valor}</p>
      <p className="text-white/40">{etiqueta}</p>
    </div>
  )
}

function Aviso({ icono, texto }: { icono: React.ReactNode; texto: string }) {
  return (
    <div className="my-4 flex gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
      <span className="mt-0.5 shrink-0">{icono}</span>
      {texto}
    </div>
  )
}

/** Vista superior esquemática del cráneo (como la lámina del barbero), resaltando el tipo detectado. */
function DiagramaCraneo({ tipo }: { tipo: TDiagnostico["craneo"]["tipo"] }) {
  const formas = [
    { id: "dolicocefalo", rx: 15, ry: 24, label: "Dolico" },
    { id: "mesocefalo", rx: 18, ry: 22, label: "Meso" },
    { id: "braquicefalo", rx: 21, ry: 21, label: "Braqui" },
  ] as const
  return (
    <div className="mb-3 grid grid-cols-3 gap-2">
      {formas.map((f) => {
        const activo = f.id === tipo
        return (
          <div key={f.id} className={`rounded-xl p-2 text-center ${activo ? "bg-[#d4af6a]/15 ring-1 ring-[#d4af6a]" : "bg-white/[0.03]"}`}>
            <svg viewBox="0 0 60 60" className="mx-auto h-16 w-16">
              <ellipse cx="30" cy="30" rx={f.rx} ry={f.ry} fill={activo ? "#d4af6a" : "#ffffff22"} />
              <line x1="30" y1={30 - f.ry} x2="30" y2={30 + f.ry} stroke="#0b0b0c" strokeWidth="1" />
              <line x1={30 - f.rx} y1="30" x2={30 + f.rx} y2="30" stroke="#0b0b0c" strokeWidth="1" />
              <path d="M27 6 L30 2 L33 6" fill="none" stroke={activo ? "#d4af6a" : "#ffffff44"} strokeWidth="1.2" />
            </svg>
            <p className={`text-[11px] ${activo ? "text-[#e9cf95]" : "text-white/40"}`}>{f.label}</p>
          </div>
        )
      })}
    </div>
  )
}
