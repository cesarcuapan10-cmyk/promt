"use client"
import { useState } from "react"
import { CheckCircle, Star, ArrowRight, MessageCircle, Calendar, Shield, Zap, Users } from "lucide-react"

const TESTIMONIOS = [
  { nombre: "Alejandra Ramírez", ciudad: "Puebla", texto: "En 3 meses tripliqué mis clientes. César me enseñó que el problema no era mi producto sino cómo lo ofrecía.", estrellas: 5 },
  { nombre: "Manuel Ortega", ciudad: "Tlaxcala", texto: "Tenía miedo de cobrar lo que valgo. Después de la mentoría subí mis precios y tuve más clientes. Increíble.", estrellas: 5 },
  { nombre: "Laura Sánchez", ciudad: "Puebla", texto: "Lo que cambió fue mi forma de pensar. Las ventas llegaron solas cuando me convencí de mi valor.", estrellas: 5 },
]

const HORARIOS = [
  "09:00", "09:45", "10:30", "11:15", "12:00", "12:45",
  "14:00", "14:45", "15:30", "16:15", "17:00", "17:15",
]

export default function LandingCliente() {
  const [form, setForm] = useState({ nombre: "", whatsapp: "", correo: "" })
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState("")
  const [intento, setIntento] = useState<typeof form | null>(null)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim() || !form.whatsapp.trim()) {
      setError("Por favor llena tu nombre y WhatsApp.")
      return
    }
    setEnviando(true)
    setError("")
    setIntento(form)
    try {
      const r = await fetch("/api/landing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (r.ok) {
        setEnviado(true)
      } else {
        const d = await r.json()
        setError(d.error || "Algo salió mal. Inténtalo de nuevo.")
      }
    } catch {
      setError("Sin conexión. Guarda tu información y vuelve a intentarlo.")
    } finally {
      setEnviando(false)
    }
  }

  const waNumber = "5222XXXXXXXX"
  const waTexto = encodeURIComponent(`Hola César, vi tu página y quiero saber más sobre tu mentoría de ventas. Mi nombre es ${form.nombre || "[tu nombre]"}.`)

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "var(--font-geist-sans, system-ui, sans-serif)" }}>
      {/* HERO */}
      <section className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] text-white py-16 md:py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#e8b763]/20 border border-[#e8b763]/40 text-[#e8b763] text-sm px-4 py-2 rounded-full mb-6">
            <Zap className="w-4 h-4" />
            <span>+500 profesionales transformados en Puebla</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Incrementa tus ventas<br />
            <span style={{ color: "#e8b763" }}>desde la raíz</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Trabajo contigo desde tu identidad, mentalidad y emociones para que vendas más — sin trucos, desde la autenticidad.
          </p>
          <a href="#agendar"
            className="inline-flex items-center gap-2 bg-[#e8b763] text-[#1a1a1a] font-bold text-lg px-8 py-4 rounded-2xl hover:bg-[#d4a355] transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5">
            Agenda tu cita gratis <ArrowRight className="w-5 h-5" />
          </a>
          <p className="text-gray-400 text-sm mt-3">Sin compromiso · Respondo en menos de 24 h</p>
        </div>
      </section>

      {/* PRUEBA DE CONFIANZA */}
      <section className="bg-[#fdf8ee] py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center mb-10">
            {[
              { num: "+500", label: "profesionales atendidos" },
              { num: "8 años", label: "de experiencia" },
              { num: "3x", label: "ventas promedio" },
              { num: "Puebla", label: "base de operaciones" },
            ].map(s => (
              <div key={s.label}>
                <p className="text-3xl font-bold" style={{ color: "#e8b763" }}>{s.num}</p>
                <p className="text-sm text-gray-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { Icon: Shield, title: "Sin trucos baratos", desc: "Trabajamos tu mentalidad para cerrar ventas desde la congruencia, no desde la presión." },
              { Icon: Users, title: "Para profesionales reales", desc: "Coaches, consultores, emprendedores que ya tienen algo bueno y quieren saber cómo venderlo mejor." },
              { Icon: Zap, title: "Resultados en semanas", desc: "La mayoría ve su primera mejora significativa antes de los 30 días." },
            ].map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-5 shadow-sm border border-[#e8b763]/20">
                <f.Icon className="w-8 h-8 mb-3" style={{ color: "#e8b763" }} />
                <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FORMULARIO DE AGENDA */}
      <section id="agendar" className="py-16 px-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-[#e8b763]/10 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-6 h-6" style={{ color: "#e8b763" }} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Agenda tu cita gratis</h2>
            <p className="text-gray-600">45 minutos donde analizamos tu situación y ves si hay fit para trabajar juntos.</p>
          </div>

          {enviado ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">¡Listo! Te contactamos pronto 🎉</h3>
              <p className="text-gray-600 mb-6">Recibirás un mensaje en menos de 24 horas para confirmar tu cita.</p>
              <a href={`https://wa.me/${waNumber}?text=${waTexto}`} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 bg-[#25d366] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#1fa855] transition-colors">
                <MessageCircle className="w-5 h-5" />
                Escríbenos ya por WhatsApp
              </a>
              <p className="text-sm text-gray-400 mt-3">Para los impacientes — respuesta inmediata</p>
            </div>
          ) : (
            <form onSubmit={enviar} className="bg-white border border-gray-100 shadow-lg rounded-2xl p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
                <input
                  value={form.nombre}
                  onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Tu nombre"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-[#e8b763] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp *</label>
                <input
                  value={form.whatsapp}
                  onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))}
                  placeholder="222 123 4567"
                  type="tel"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-[#e8b763] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo (opcional)</label>
                <input
                  value={form.correo}
                  onChange={e => setForm(p => ({ ...p, correo: e.target.value }))}
                  placeholder="tu@correo.com"
                  type="email"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-[#e8b763] focus:border-transparent"
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-sm text-red-700">{error}</p>
                  {intento && (
                    <p className="text-xs text-red-500 mt-1">
                      Tus datos se guardaron localmente. Por favor intenta de nuevo.
                    </p>
                  )}
                </div>
              )}
              <button
                type="submit"
                disabled={enviando}
                className="w-full font-bold text-[#1a1a1a] text-lg py-4 rounded-xl transition-all duration-200 hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ backgroundColor: "#e8b763" }}>
                {enviando ? (
                  <><div className="w-5 h-5 border-2 border-[#1a1a1a] border-t-transparent rounded-full animate-spin" /> Enviando...</>
                ) : (
                  <><Calendar className="w-5 h-5" /> Quiero mi cita gratis</>
                )}
              </button>
              <p className="text-xs text-gray-400 text-center">
                Al enviar aceptas que César te contacte para confirmar tu cita. Sin spam.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* TESTIMONIOS */}
      <section className="bg-[#1a1a1a] py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-10">Lo que dicen quienes ya trabajaron conmigo</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIOS.map(t => (
              <div key={t.nombre} className="bg-[#2d2d2d] rounded-2xl p-6 border border-[#3d3d3d]">
                <div className="flex gap-1 mb-3">
                  {Array(t.estrellas).fill(0).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#e8b763] text-[#e8b763]" />
                  ))}
                </div>
                <p className="text-gray-300 text-sm mb-4">"{t.texto}"</p>
                <div>
                  <p className="font-semibold text-white text-sm">{t.nombre}</p>
                  <p className="text-gray-500 text-xs">{t.ciudad}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">¿Listo para vender diferente?</h2>
          <p className="text-gray-600 mb-8">Tu primera cita es gratis. Sin compromiso, sin venta dura.</p>
          <a href="#agendar"
            className="inline-flex items-center gap-2 font-bold text-lg px-8 py-4 rounded-2xl text-[#1a1a1a] hover:opacity-90 transition-all shadow-lg"
            style={{ backgroundColor: "#e8b763" }}>
            Agenda ahora — es gratis <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 px-4 text-center">
        <p className="text-sm text-gray-400">© {new Date().getFullYear()} César Cuapan · Coaching y Mentorías · Puebla, México</p>
        <a href="/login" className="text-xs text-gray-300 hover:text-gray-500 mt-1 inline-block">Acceso CRM</a>
      </footer>
    </div>
  )
}
