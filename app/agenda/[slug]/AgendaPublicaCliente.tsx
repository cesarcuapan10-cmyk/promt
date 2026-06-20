"use client"
import { useState } from "react"
import { Sparkles, Clock, Video, MessageCircle, Calendar, ChevronLeft, ChevronRight } from "lucide-react"

interface Vendedor {
  id: string
  nombre: string
  avatar: string | null
  ligaAgenda: string | null
}

interface Props {
  vendedor: Vendedor
  slug: string
}

interface DisponibilidadResp {
  slots: string[]
  ocupados: string[]
}

function pad(n: number): string {
  return n.toString().padStart(2, "0")
}

function isoFecha(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function generarDiasDelMes(año: number, mes: number): (Date | null)[] {
  const primerDia = new Date(año, mes, 1).getDay()
  const diasEnMes = new Date(año, mes + 1, 0).getDate()
  const celdas: (Date | null)[] = Array(primerDia).fill(null)
  for (let d = 1; d <= diasEnMes; d++) {
    celdas.push(new Date(año, mes, d))
  }
  return celdas
}

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
]

export default function AgendaPublicaCliente({ vendedor, slug }: Props) {
  const hoy = new Date()
  const [mesVista, setMesVista] = useState({ año: hoy.getFullYear(), mes: hoy.getMonth() })
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | null>(null)
  const [slots, setSlots] = useState<string[]>([])
  const [ocupados, setOcupados] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotSel, setSlotSel] = useState<string | null>(null)

  const [form, setForm] = useState({ nombre: "", whatsapp: "", correo: "" })
  const [enviando, setEnviando] = useState(false)
  const [confirmacion, setConfirmacion] = useState<{
    cita: { fechaInicio: string; titulo: string }
    googlePendiente: boolean
  } | null>(null)
  const [errMsg, setErrMsg] = useState("")

  const dias = generarDiasDelMes(mesVista.año, mesVista.mes)

  const seleccionarFecha = async (fecha: Date) => {
    setFechaSeleccionada(fecha)
    setSlotSel(null)
    setLoadingSlots(true)
    try {
      const resp = await fetch(
        `/api/agenda-publica/${slug}/disponibilidad?fecha=${isoFecha(fecha)}`
      )
      const data: DisponibilidadResp = await resp.json()
      setSlots(data.slots ?? [])
      setOcupados(data.ocupados ?? [])
    } catch {
      setSlots([])
      setOcupados([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleAgendar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fechaSeleccionada || !slotSel) return
    setEnviando(true)
    setErrMsg("")
    try {
      const [horas, mins] = slotSel.split(":").map(Number)
      const fechaInicio = new Date(fechaSeleccionada)
      fechaInicio.setHours(horas, mins, 0, 0)

      const res = await fetch(`/api/agenda-publica/${slug}/agendar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre,
          whatsapp: form.whatsapp,
          correo: form.correo,
          fechaInicio: fechaInicio.toISOString(),
        }),
      })
      const data = await res.json()
      if (!data.ok) {
        setErrMsg(data.error ?? "Error al agendar")
        return
      }
      setConfirmacion({ cita: data.cita, googlePendiente: data.googlePendiente })
    } catch {
      setErrMsg("Error de conexión. Inténtalo de nuevo.")
    } finally {
      setEnviando(false)
    }
  }

  // Generar ICS
  const generarICS = () => {
    if (!confirmacion) return ""
    const inicio = new Date(confirmacion.cita.fechaInicio)
    const fin = new Date(inicio.getTime() + 45 * 60 * 1000)
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `DTSTART:${fmt(inicio)}`,
      `DTEND:${fmt(fin)}`,
      `SUMMARY:Llamada con ${vendedor.nombre}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n")
    return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`
  }

  const avanzarMes = (delta: number) => {
    setMesVista((prev) => {
      let mes = prev.mes + delta
      let año = prev.año
      if (mes > 11) { mes = 0; año++ }
      if (mes < 0) { mes = 11; año-- }
      return { año, mes }
    })
    setFechaSeleccionada(null)
    setSlots([])
    setSlotSel(null)
  }

  if (confirmacion) {
    const fechaCita = new Date(confirmacion.cita.fechaInicio)
    const waMsg = encodeURIComponent(
      `Hola ${vendedor.nombre}, acabo de agendar mi cita para el ${fechaCita.toLocaleDateString("es-MX", { dateStyle: "long" })} a las ${fechaCita.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}. ¡Nos vemos pronto!`
    )
    return (
      <div className="min-h-screen bg-white dark:bg-[#0f0f0f] flex flex-col items-center justify-center p-8 text-center">
        <div className="max-w-md w-full">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            ¡Cita confirmada!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            {fechaCita.toLocaleDateString("es-MX", { dateStyle: "full" })} a las{" "}
            {fechaCita.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="text-gray-500 text-sm mb-6">Con {vendedor.nombre} · 45 minutos · Videollamada</p>

          {confirmacion.googlePendiente && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6 text-sm text-amber-700 dark:text-amber-400">
              Tu cita está guardada. El vendedor te enviará el enlace de videollamada pronto.
            </div>
          )}

          <div className="flex flex-col gap-3">
            <a
              href={generarICS()}
              download="cita.ics"
              className="flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition"
            >
              <Calendar className="w-4 h-4" />
              Agrégalo a tu calendario
            </a>
            <a
              href={`https://wa.me/522221234567?text=${waMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl px-4 py-3 text-sm transition"
            >
              <MessageCircle className="w-4 h-4" />
              Escríbenos por WhatsApp
            </a>
          </div>
        </div>
      </div>
    )
  }

  const inicial = vendedor.nombre.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-[#fdf8ee] dark:bg-[#0f0f0f] flex flex-col">
      {/* Header */}
      <header className="bg-white/90 dark:bg-[#111]/90 backdrop-blur border-b border-gray-100 dark:border-gray-800 py-3 px-4">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand" />
          <span className="font-bold text-gray-900 dark:text-white text-sm">César Cuapan</span>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
        {/* Perfil */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-full bg-brand flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
            {vendedor.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={vendedor.avatar} alt={vendedor.nombre} className="w-full h-full object-cover rounded-full" />
            ) : (
              inicial
            )}
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{vendedor.nombre}</h1>
          <p className="text-brand font-semibold mt-1">Agenda una llamada conmigo</p>
          <div className="flex items-center justify-center gap-4 mt-2 text-sm text-gray-500">
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> 45 minutos</span>
            <span className="flex items-center gap-1"><Video className="w-4 h-4" /> Videollamada</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Calendario */}
          <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => avanzarMes(-1)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-semibold text-gray-900 dark:text-white text-sm">
                {MESES[mesVista.mes]} {mesVista.año}
              </span>
              <button onClick={() => avanzarMes(1)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-xs text-gray-400 text-center mb-2">
              {["Do","Lu","Ma","Mi","Ju","Vi","Sa"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {dias.map((dia, i) => {
                if (!dia) return <div key={i} />
                const pasado = dia < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
                const esFin = dia.getDay() === 0 || dia.getDay() === 6
                const seleccionado = fechaSeleccionada ? isoFecha(dia) === isoFecha(fechaSeleccionada) : false
                const disabled = pasado || esFin
                return (
                  <button
                    key={i}
                    disabled={disabled}
                    onClick={() => seleccionarFecha(dia)}
                    className={[
                      "h-9 w-full rounded-lg text-sm font-medium transition",
                      disabled ? "text-gray-300 dark:text-gray-700 cursor-not-allowed" : "hover:bg-brand/10 hover:text-brand",
                      seleccionado ? "bg-brand text-white hover:bg-brand hover:text-white" : "",
                    ].join(" ")}
                  >
                    {dia.getDate()}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Slots + Formulario */}
          <div className="space-y-4">
            {fechaSeleccionada && (
              <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">
                  Horarios disponibles
                </h3>
                {loadingSlots ? (
                  <p className="text-sm text-gray-400">Cargando...</p>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-gray-400">No hay horarios disponibles este día.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map((slot) => {
                      const ocupado = ocupados.includes(slot)
                      return (
                        <button
                          key={slot}
                          disabled={ocupado}
                          onClick={() => setSlotSel(slot)}
                          className={[
                            "py-2 px-3 rounded-lg text-xs font-medium border transition",
                            ocupado ? "border-gray-100 dark:border-gray-800 text-gray-300 dark:text-gray-700 cursor-not-allowed" : "border-gray-200 dark:border-gray-700 hover:border-brand hover:text-brand",
                            slotSel === slot ? "bg-brand text-white border-brand" : "",
                          ].join(" ")}
                        >
                          {slot}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {slotSel && fechaSeleccionada && (
              <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-4">
                  Tus datos
                </h3>
                <form onSubmit={handleAgendar} className="space-y-3">
                  <input
                    required
                    placeholder="Tu nombre *"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                  <input
                    required
                    placeholder="WhatsApp *"
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                  <input
                    placeholder="Correo (opcional)"
                    type="email"
                    value={form.correo}
                    onChange={(e) => setForm({ ...form, correo: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                  {errMsg && <p className="text-red-500 text-xs">{errMsg}</p>}
                  <button
                    type="submit"
                    disabled={enviando}
                    className="w-full bg-brand text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 transition disabled:opacity-60"
                  >
                    {enviando ? "Confirmando..." : "Confirmar cita"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
