"use client"
import { useEffect, useMemo, useState, useTransition } from "react"
import {
  CalendarDays, ChevronLeft, ChevronRight, Clock, User, Tag,
  Check, CalendarCheck, PartyPopper, Loader2, CalendarPlus,
} from "lucide-react"
import {
  obtenerDisponibilidad, crearReservaPublica,
  type ConfigAgenda, type Slot, type ResultadoReserva,
} from "@/app/actions/agendar"

const DIAS_CORTOS = ["D", "L", "M", "M", "J", "V", "S"]
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]

const pad = (n: number) => String(n).padStart(2, "0")
const aFechaStr = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`

function hoyMX(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date())
}
function sumarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10)
}
function formatoLargo(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number)
  const dt = new Date(y, m - 1, d)
  const dia = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][dt.getDay()]
  return `${dia} ${d} de ${MESES[m - 1]}`
}
function money(n: number, moneda: string) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: moneda, minimumFractionDigits: 0 }).format(n)
}

type Paso = "dia" | "persona" | "servicio" | "hora" | "datos" | "listo"

export function ReservaStepper({ config }: { config: ConfigAgenda }) {
  const { negocio, personas, servicios } = config
  const marca = negocio.colorMarca || "#e8b763"
  const unaPersona = personas.length <= 1

  const minFecha = useMemo(() => sumarDias(hoyMX(), Math.max(0, negocio.anticipacionMinDias)), [negocio.anticipacionMinDias])

  const [paso, setPaso] = useState<Paso>("dia")
  const [fecha, setFecha] = useState<string>("")
  const [personaId, setPersonaId] = useState<string>(unaPersona && personas[0] ? personas[0].id : "")
  const [servicioId, setServicioId] = useState<string>("")
  const [hora, setHora] = useState<string>("")
  const [nombre, setNombre] = useState("")
  const [whatsapp, setWhatsapp] = useState("")

  const [slots, setSlots] = useState<Slot[]>([])
  const [cargandoSlots, setCargandoSlots] = useState(false)
  const [error, setError] = useState<string>("")
  const [resultado, setResultado] = useState<Extract<ResultadoReserva, { ok: true }> | null>(null)
  const [enviando, startEnviar] = useTransition()

  const servicioSel = servicios.find((s) => s.id === servicioId)

  // Cargar horarios al llegar al paso "hora"
  useEffect(() => {
    if (paso !== "hora" || !fecha || !personaId) return
    let vivo = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCargandoSlots(true)
    obtenerDisponibilidad(fecha, personaId, servicioSel?.duracionMin)
      .then((r) => {
        if (!vivo) return
        setSlots(r.ok ? r.slots : [])
      })
      .finally(() => vivo && setCargandoSlots(false))
    return () => {
      vivo = false
    }
  }, [paso, fecha, personaId, servicioSel?.duracionMin])

  function avanzarDesdeDia() {
    setPaso(unaPersona ? "servicio" : "persona")
  }

  function confirmar() {
    setError("")
    startEnviar(async () => {
      const r = await crearReservaPublica({ fecha, hora, personaId, servicioId, nombre, whatsapp })
      if (r.ok) {
        setResultado(r)
        setPaso("listo")
      } else {
        setError(r.error)
      }
    })
  }

  // ── Pantalla de éxito ──
  if (paso === "listo" && resultado) {
    return <Confirmacion resultado={resultado} negocio={negocio} marca={marca} />
  }

  const pasosVisibles: Paso[] = unaPersona
    ? ["dia", "servicio", "hora", "datos"]
    : ["dia", "persona", "servicio", "hora", "datos"]
  const idxActual = pasosVisibles.indexOf(paso)

  return (
    <div>
      {/* Progreso */}
      <div className="mb-6 flex items-center gap-1.5">
        {pasosVisibles.map((p, i) => (
          <div
            key={p}
            className="h-1.5 flex-1 rounded-full transition-colors"
            style={{ backgroundColor: i <= idxActual ? marca : "rgba(120,120,120,0.2)" }}
          />
        ))}
      </div>

      {/* ── Paso: Día ── */}
      {paso === "dia" && (
        <Seccion icono={<CalendarDays />} marca={marca} titulo="¿Qué día te viene bien?" subtitulo="Elige una fecha disponible.">
          <Calendario
            marca={marca}
            minFecha={minFecha}
            diasAtencion={negocio.diasAtencion}
            seleccionada={fecha}
            onSelect={(f) => setFecha(f)}
          />
          <BotonPrimario marca={marca} disabled={!fecha} onClick={avanzarDesdeDia}>
            Continuar
          </BotonPrimario>
        </Seccion>
      )}

      {/* ── Paso: Persona ── */}
      {paso === "persona" && (
        <Seccion icono={<User />} marca={marca} titulo="¿Con quién te gustaría?" subtitulo="Selecciona a quien te atienda.">
          <div className="grid grid-cols-2 gap-3">
            {personas.map((p) => (
              <Opcion key={p.id} activa={personaId === p.id} marca={marca} onClick={() => setPersonaId(p.id)}>
                <span className="text-sm font-semibold">{p.nombre}</span>
              </Opcion>
            ))}
          </div>
          <div className="flex gap-3">
            <BotonSecundario onClick={() => setPaso("dia")}>Atrás</BotonSecundario>
            <BotonPrimario marca={marca} disabled={!personaId} onClick={() => setPaso("servicio")}>
              Continuar
            </BotonPrimario>
          </div>
        </Seccion>
      )}

      {/* ── Paso: Servicio ── */}
      {paso === "servicio" && (
        <Seccion icono={<Tag />} marca={marca} titulo="¿Qué servicio quieres?" subtitulo="Escoge una opción.">
          {servicios.length === 0 ? (
            <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500 dark:bg-[#1a1a1a]">
              Aún no hay servicios configurados. Contáctanos por WhatsApp.
            </p>
          ) : (
            <div className="space-y-2.5">
              {servicios.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setServicioId(s.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition-all"
                  style={{
                    borderColor: servicioId === s.id ? marca : "rgba(120,120,120,0.2)",
                    backgroundColor: servicioId === s.id ? `${marca}12` : "transparent",
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{s.nombre}</span>
                    {s.descripcion && (
                      <span className="block truncate text-xs text-gray-500">{s.descripcion}</span>
                    )}
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="h-3 w-3" /> {s.duracionMin} min
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-bold" style={{ color: marca }}>
                    {s.precio > 0 ? money(s.precio, negocio.moneda) : "Gratis"}
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            <BotonSecundario onClick={() => setPaso(unaPersona ? "dia" : "persona")}>Atrás</BotonSecundario>
            <BotonPrimario marca={marca} disabled={!servicioId} onClick={() => setPaso("hora")}>
              Continuar
            </BotonPrimario>
          </div>
        </Seccion>
      )}

      {/* ── Paso: Hora ── */}
      {paso === "hora" && (
        <Seccion icono={<Clock />} marca={marca} titulo="Elige la hora" subtitulo={formatoLargo(fecha)}>
          {cargandoSlots ? (
            <div className="flex justify-center py-8 text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : slots.length === 0 ? (
            <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500 dark:bg-[#1a1a1a]">
              No hay horarios disponibles ese día. Elige otra fecha.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {slots.map((s) => (
                <button
                  key={s.hora}
                  disabled={s.ocupada}
                  onClick={() => setHora(s.hora)}
                  title={s.ocupada ? "Horario ocupado" : undefined}
                  className="rounded-xl border py-2.5 text-sm font-medium transition-all disabled:cursor-not-allowed"
                  style={
                    s.ocupada
                      ? { borderColor: "transparent", backgroundColor: "rgba(120,120,120,0.12)", color: "rgba(120,120,120,0.55)", textDecoration: "line-through" }
                      : hora === s.hora
                        ? { borderColor: marca, backgroundColor: marca, color: "#fff" }
                        : { borderColor: "rgba(120,120,120,0.25)" }
                  }
                >
                  {s.hora}
                </button>
              ))}
            </div>
          )}
          <p className="text-center text-xs text-gray-400">Los horarios tachados ya están ocupados.</p>
          <div className="flex gap-3">
            <BotonSecundario onClick={() => setPaso("servicio")}>Atrás</BotonSecundario>
            <BotonPrimario marca={marca} disabled={!hora} onClick={() => setPaso("datos")}>
              Continuar
            </BotonPrimario>
          </div>
        </Seccion>
      )}

      {/* ── Paso: Datos + resumen ── */}
      {paso === "datos" && (
        <Seccion icono={<CalendarCheck />} marca={marca} titulo="Últimos datos" subtitulo="Para confirmarte la cita.">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Tu nombre</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre y apellido"
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-transparent focus:ring-2 dark:border-gray-700 dark:bg-[#161616]"
                style={{ "--tw-ring-color": marca } as React.CSSProperties}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Tu WhatsApp</label>
              <input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                inputMode="tel"
                placeholder="10 dígitos"
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-transparent focus:ring-2 dark:border-gray-700 dark:bg-[#161616]"
                style={{ "--tw-ring-color": marca } as React.CSSProperties}
              />
            </div>
          </div>

          <div className="rounded-xl border border-dashed p-3.5 text-sm" style={{ borderColor: `${marca}66` }}>
            <Resumen label="Día" valor={formatoLargo(fecha)} />
            <Resumen label="Hora" valor={hora} />
            {!unaPersona && <Resumen label="Con" valor={personas.find((p) => p.id === personaId)?.nombre ?? ""} />}
            <Resumen label="Servicio" valor={servicioSel?.nombre ?? ""} />
          </div>

          {error && <p className="text-sm font-medium text-red-500">{error}</p>}

          <div className="flex gap-3">
            <BotonSecundario onClick={() => setPaso("hora")}>Atrás</BotonSecundario>
            <BotonPrimario
              marca={marca}
              disabled={nombre.trim().length < 2 || whatsapp.replace(/\D/g, "").length < 8 || enviando}
              onClick={confirmar}
            >
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Confirmar cita
            </BotonPrimario>
          </div>
        </Seccion>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Pantalla de confirmación
// ─────────────────────────────────────────────────────────────
function Confirmacion({
  resultado, negocio, marca,
}: {
  resultado: Extract<ResultadoReserva, { ok: true }>
  negocio: ConfigAgenda["negocio"]
  marca: string
}) {
  function agregarACalendario() {
    const { fecha, hora } = resultado.resumen
    const inicio = new Date(`${fecha}T${hora}:00-06:00`)
    const fin = new Date(inicio.getTime() + negocio.duracionCita * 60000)
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//agenda//ES", "BEGIN:VEVENT",
      `UID:${resultado.citaId}@agenda`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(inicio)}`,
      `DTEND:${fmt(fin)}`,
      `SUMMARY:${resultado.resumen.servicio} — ${negocio.nombre}`,
      `DESCRIPTION:Cita con ${resultado.resumen.persona}`,
      "END:VEVENT", "END:VCALENDAR",
    ].join("\n")
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "mi-cita.ics"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: `${marca}20` }}>
        <PartyPopper className="h-10 w-10" style={{ color: marca }} />
      </div>
      <h2 className="text-xl font-bold">{resultado.mensaje}</h2>
      <p className="mt-2 text-sm text-gray-500">Guarda estos datos:</p>

      <div className="mt-5 w-full rounded-2xl border p-4 text-left text-sm" style={{ borderColor: `${marca}44` }}>
        <Resumen label="Día" valor={formatoLargo(resultado.resumen.fecha)} />
        <Resumen label="Hora" valor={resultado.resumen.hora} />
        <Resumen label="Con" valor={resultado.resumen.persona} />
        <Resumen label="Servicio" valor={resultado.resumen.servicio} />
      </div>

      <button
        onClick={agregarACalendario}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold text-white shadow-md active:scale-[0.98]"
        style={{ backgroundColor: marca }}
      >
        <CalendarPlus className="h-4 w-4" />
        Agregar a mi calendario
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Calendario mensual
// ─────────────────────────────────────────────────────────────
function Calendario({
  marca, minFecha, diasAtencion, seleccionada, onSelect,
}: {
  marca: string
  minFecha: string
  diasAtencion: number[]
  seleccionada: string
  onSelect: (f: string) => void
}) {
  const [y0, m0] = minFecha.split("-").map(Number)
  const [anio, setAnio] = useState(y0)
  const [mes, setMes] = useState(m0 - 1) // 0-based

  const primerDia = new Date(anio, mes, 1).getDay()
  const diasEnMes = new Date(anio, mes + 1, 0).getDate()
  const celdas: (number | null)[] = [
    ...Array(primerDia).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ]

  // No retroceder antes del mes mínimo
  const puedeRetroceder = `${anio}-${pad(mes + 1)}` > `${y0}-${pad(m0)}`

  function cambiarMes(delta: number) {
    let nm = mes + delta
    let na = anio
    if (nm < 0) { nm = 11; na-- }
    if (nm > 11) { nm = 0; na++ }
    setMes(nm)
    setAnio(na)
  }

  return (
    <div className="rounded-2xl border border-gray-100 p-3 dark:border-gray-800">
      <div className="mb-2 flex items-center justify-between px-1">
        <button
          onClick={() => cambiarMes(-1)}
          disabled={!puedeRetroceder}
          className="rounded-lg p-1.5 text-gray-500 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-white/10"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold capitalize">{MESES[mes]} {anio}</span>
        <button
          onClick={() => cambiarMes(1)}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium text-gray-400">
        {DIAS_CORTOS.map((d, i) => <span key={i}>{d}</span>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {celdas.map((d, i) => {
          if (d === null) return <span key={i} />
          const f = aFechaStr(anio, mes, d)
          const weekday = new Date(anio, mes, d).getDay()
          const deshabilitada = f < minFecha || !diasAtencion.includes(weekday)
          const activa = f === seleccionada
          return (
            <button
              key={i}
              disabled={deshabilitada}
              onClick={() => onSelect(f)}
              className="aspect-square rounded-lg text-sm transition-all disabled:cursor-not-allowed disabled:text-gray-300 dark:disabled:text-gray-700"
              style={
                activa
                  ? { backgroundColor: marca, color: "#fff", fontWeight: 700 }
                  : !deshabilitada
                    ? { backgroundColor: `${marca}12` }
                    : undefined
              }
            >
              {d}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Piezas de UI
// ─────────────────────────────────────────────────────────────
function Seccion({
  icono, titulo, subtitulo, marca, children,
}: {
  icono: React.ReactNode
  titulo: string
  subtitulo?: string
  marca: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${marca}20`, color: marca }}>
          {icono}
        </span>
        <div>
          <h2 className="text-lg font-bold leading-tight">{titulo}</h2>
          {subtitulo && <p className="text-sm capitalize text-gray-500">{subtitulo}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

function Opcion({
  activa, marca, onClick, children,
}: {
  activa: boolean
  marca: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center rounded-xl border px-3 py-4 transition-all"
      style={{
        borderColor: activa ? marca : "rgba(120,120,120,0.25)",
        backgroundColor: activa ? `${marca}12` : "transparent",
      }}
    >
      {children}
    </button>
  )
}

function BotonPrimario({
  marca, disabled, onClick, children,
}: {
  marca: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="mt-2 flex flex-1 items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold text-white shadow-md transition-transform active:scale-[0.98] disabled:opacity-40"
      style={{ backgroundColor: marca }}
    >
      {children}
    </button>
  )
}

function BotonSecundario({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="mt-2 rounded-2xl border border-gray-200 px-5 py-3.5 text-sm font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300"
    >
      {children}
    </button>
  )
}

function Resumen({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-gray-100 py-1.5 last:border-0 dark:border-gray-800">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium capitalize">{valor}</span>
    </div>
  )
}
