"use client"
import { useState } from "react"
import { Calendar, Clock, CheckCircle, MessageCircle, ArrowLeft, ArrowRight } from "lucide-react"

type Vendedor = { id: string; nombre: string; correo: string }

const HORAS = ["09:00", "09:45", "10:30", "11:15", "12:00", "12:45", "14:00", "14:45", "15:30", "16:15", "17:00", "17:45"]

function getProximosDias(n: number) {
  const dias: Date[] = []
  const hoy = new Date()
  for (let i = 1; i <= n + 7; i++) {
    const d = new Date(hoy)
    d.setDate(hoy.getDate() + i)
    if (d.getDay() !== 0 && d.getDay() !== 6) dias.push(d)
    if (dias.length >= n) break
  }
  return dias
}

function formatDia(d: Date) {
  return d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })
}

export default function AgendaPublicaCliente({ vendedor }: { vendedor: Vendedor }) {
  const dias = getProximosDias(14)
  const [diaIdx, setDiaIdx] = useState(0)
  const [hora, setHora] = useState("")
  const [form, setForm] = useState({ nombre: "", whatsapp: "", correo: "" })
  const [enviando, setEnviando] = useState(false)
  const [confirmado, setConfirmado] = useState(false)
  const [error, setError] = useState("")

  const diaSeleccionado = dias[diaIdx]

  async function agendar(e: React.FormEvent) {
    e.preventDefault()
    if (!hora) { setError("Selecciona una hora."); return }
    if (!form.nombre.trim() || !form.whatsapp.trim()) { setError("Nombre y WhatsApp son requeridos."); return }
    setEnviando(true); setError("")
    try {
      const fechaInicio = new Date(diaSeleccionado)
      const [h, m] = hora.split(":").map(Number)
      fechaInicio.setHours(h, m, 0, 0)
      const fechaFin = new Date(fechaInicio.getTime() + 45 * 60000)

      const r = await fetch("/api/agenda-publica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, vendedorId: vendedor.id, fechaInicio: fechaInicio.toISOString(), fechaFin: fechaFin.toISOString() }),
      })
      if (r.ok) setConfirmado(true)
      else { const d = await r.json(); setError(d.error || "No se pudo agendar. Intenta de nuevo.") }
    } catch { setError("Error de conexión. Intenta de nuevo.") }
    finally { setEnviando(false) }
  }

  if (confirmado) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fdf8ee] p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Cita confirmada! 🎉</h2>
        <p className="text-gray-600 mb-2">
          <strong>{diaSeleccionado ? formatDia(diaSeleccionado) : ""}</strong> a las <strong>{hora}</strong>
        </p>
        <p className="text-gray-600 mb-6">con <strong>{vendedor.nombre}</strong></p>
        <a href={`https://wa.me/${vendedor.correo.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${vendedor.nombre}, acabo de agendar una cita para el ${diaSeleccionado ? formatDia(diaSeleccionado) : ""} a las ${hora}. ¡Listo!`)}`}
          target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 bg-[#25d366] text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition mb-3">
          <MessageCircle className="w-5 h-5" /> Confirmar por WhatsApp
        </a>
        <p className="text-sm text-gray-400">Recibirás más detalles pronto.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#fdf8ee] p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <div className="w-16 h-16 rounded-full bg-[#e8b763] flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
            {vendedor.nombre[0].toUpperCase()}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda con {vendedor.nombre}</h1>
          <p className="text-gray-600 mt-1">Cita de 45 minutos · Gratis</p>
        </div>

        {/* Selector de día */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-[#e8b763]" />
            <span className="font-semibold text-gray-900 text-sm">Selecciona un día</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {dias.map((d, i) => (
              <button key={i} onClick={() => { setDiaIdx(i); setHora("") }}
                className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl text-xs transition-all ${i === diaIdx ? "bg-[#e8b763] text-white font-bold" : "bg-gray-50 text-gray-700 hover:bg-[#e8b763]/10"}`}>
                <span>{d.toLocaleDateString("es-MX", { weekday: "short" })}</span>
                <span className="font-bold">{d.getDate()}</span>
                <span>{d.toLocaleDateString("es-MX", { month: "short" })}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Selector de hora */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-[#e8b763]" />
            <span className="font-semibold text-gray-900 text-sm">Selecciona una hora</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {HORAS.map(h => (
              <button key={h} onClick={() => setHora(h)}
                className={`py-2 rounded-xl text-sm font-medium transition-all ${h === hora ? "bg-[#e8b763] text-white" : "bg-gray-50 text-gray-700 hover:bg-[#e8b763]/10"}`}>
                {h}
              </button>
            ))}
          </div>
        </div>

        {/* Formulario */}
        {hora && (
          <form onSubmit={agendar} className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <div className="bg-[#e8b763]/10 rounded-xl p-3 text-sm text-gray-700">
              📅 {diaSeleccionado ? formatDia(diaSeleccionado) : ""} · {hora} · 45 min con {vendedor.nombre}
            </div>
            {["nombre", "whatsapp", "correo"].map(campo => (
              <div key={campo}>
                <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">
                  {campo === "whatsapp" ? "WhatsApp" : campo}{campo !== "correo" ? " *" : " (opcional)"}
                </label>
                <input
                  type={campo === "correo" ? "email" : campo === "whatsapp" ? "tel" : "text"}
                  value={form[campo as keyof typeof form]}
                  onChange={e => setForm(p => ({ ...p, [campo]: e.target.value }))}
                  placeholder={campo === "nombre" ? "Tu nombre completo" : campo === "whatsapp" ? "222 123 4567" : "tu@correo.com"}
                  required={campo !== "correo"}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8b763]"
                />
              </div>
            ))}
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">{error}</p>}
            <button type="submit" disabled={enviando}
              className="w-full font-bold py-3 rounded-xl text-[#1a1a1a] transition-all disabled:opacity-60"
              style={{ backgroundColor: "#e8b763" }}>
              {enviando ? "Agendando..." : "Confirmar cita →"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
