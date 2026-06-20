"use client"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { CheckCircle, MessageCircle, Star, Sparkles } from "lucide-react"

interface Props {
  haySesion: boolean
}

interface FormData {
  nombre: string
  whatsapp: string
  correo: string
  preferencia: string
}

const TESTIMONIOS = [
  {
    texto: "Tripliqué mis citas en 3 meses aplicando lo que aprendí con César.",
    autor: "María G.",
    empresa: "Puebla",
  },
  {
    texto: "Por fin entendí que mi mayor freno era yo mismo. Ahora cierro sin miedo.",
    autor: "Roberto H.",
    empresa: "Empresario, Puebla",
  },
  {
    texto: "Pasé de evitar hablar de precios a cobrar lo que valgo.",
    autor: "Diana R.",
    empresa: "Consultora, Puebla",
  },
]

const STATS = [
  { valor: "+500", etiqueta: "profesionales atendidos" },
  { valor: "+8", etiqueta: "años de experiencia" },
  { valor: "🏆", etiqueta: "Resultados comprobados" },
]

const BENEFICIOS = [
  { texto: "Diagnóstico de tu situación real en ventas" },
  { texto: "Un plan personalizado para ti" },
  { texto: "Claridad de cuál es tu primer paso" },
]

export default function LandingCliente({ haySesion }: Props) {
  const [form, setForm] = useState<FormData>({
    nombre: "",
    whatsapp: "",
    correo: "",
    preferencia: "",
  })
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState("")
  const retryRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // UTM params
  const [utms, setUtms] = useState({ utm_source: "", utm_medium: "", utm_campaign: "" })
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    setUtms({
      utm_source: p.get("utm_source") ?? "",
      utm_medium: p.get("utm_medium") ?? "",
      utm_campaign: p.get("utm_campaign") ?? "",
    })
  }, [])

  const enviarLead = async (data: FormData & { utms: typeof utms }) => {
    const res = await fetch("/api/landing/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: data.nombre,
        whatsapp: data.whatsapp,
        correo: data.correo,
        preferencia: data.preferencia,
        utmSource: data.utms.utm_source,
        utmMedium: data.utms.utm_medium,
        utmCampaign: data.utms.utm_campaign,
      }),
    })
    if (!res.ok) throw new Error("Error al enviar")
    return res.json()
  }

  const reintentarPendientes = () => {
    try {
      const raw = localStorage.getItem("leads_pendientes")
      if (!raw) return
      const pendientes: Array<FormData & { utms: typeof utms }> = JSON.parse(raw)
      if (!pendientes.length) return
      const nuevo: typeof pendientes = []
      for (const lead of pendientes) {
        enviarLead(lead)
          .then(() => {
            // Removido exitosamente
          })
          .catch(() => nuevo.push(lead))
          .finally(() => {
            if (nuevo.length === 0) {
              localStorage.removeItem("leads_pendientes")
            } else {
              localStorage.setItem("leads_pendientes", JSON.stringify(nuevo))
            }
          })
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    reintentarPendientes()
    retryRef.current = setInterval(reintentarPendientes, 30000)
    return () => {
      if (retryRef.current) clearInterval(retryRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    setError("")
    const payload = { ...form, utms }
    try {
      await enviarLead(payload)
      setEnviado(true)
    } catch {
      // Guardar en localStorage y reintentar
      try {
        const raw = localStorage.getItem("leads_pendientes")
        const pendientes = raw ? JSON.parse(raw) : []
        pendientes.push(payload)
        localStorage.setItem("leads_pendientes", JSON.stringify(pendientes))
      } catch {
        // ignore
      }
      setEnviado(true) // Mostramos confirmación de todas formas
    } finally {
      setEnviando(false)
    }
  }

  const waLink =
    "https://wa.me/522221234567?text=Hola%20C%C3%A9sar%2C%20acabo%20de%20agendar%20mi%20cita%20y%20quisiera%20conectar%20de%20inmediato"

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f0f] text-gray-900 dark:text-gray-100 flex flex-col">
      {/* NAV */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#0f0f0f]/90 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white">César Cuapan</span>
          </div>
          {haySesion && (
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl bg-brand text-white font-semibold text-sm hover:opacity-90 transition"
            >
              Ir a mi CRM
            </Link>
          )}
        </div>
      </header>

      {/* HERO */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24 max-w-3xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 bg-brand/10 text-brand px-4 py-2 rounded-full text-sm font-medium mb-6">
          <Star className="w-4 h-4 fill-brand" />
          Coaching y Mentorías en Ventas · Puebla
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 text-gray-900 dark:text-white">
          Incrementa tus ventas <span className="text-brand">desde la raíz</span>
        </h1>
        <h2 className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-xl">
          Ayudo a profesionales y emprendedores a vender más trabajando su identidad, mentalidad y emociones.
        </h2>
        <a
          href="#formulario"
          className="inline-flex items-center gap-2 bg-brand hover:opacity-90 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-lg transition-all"
        >
          Agenda tu cita gratis →
        </a>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
          Sin costo. Sin compromiso. Agenda en menos de 1 minuto.
        </p>
      </section>

      {/* CONFIANZA */}
      <section className="bg-[#fdf8ee] dark:bg-[#1a1508] py-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-14">
            {STATS.map((s) => (
              <div key={s.etiqueta} className="text-center">
                <div className="text-3xl md:text-4xl font-extrabold text-brand">{s.valor}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{s.etiqueta}</div>
              </div>
            ))}
          </div>

          {/* Testimonios */}
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIOS.map((t) => (
              <div
                key={t.autor}
                className="bg-white dark:bg-[#1f1f1f] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800"
              >
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-brand text-brand" />
                  ))}
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4">
                  &ldquo;{t.texto}&rdquo;
                </p>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  — {t.autor}
                </div>
                <div className="text-xs text-gray-500">{t.empresa}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FORMULARIO */}
      <section id="formulario" className="py-20 px-4 bg-white dark:bg-[#0f0f0f]">
        <div className="max-w-lg mx-auto">
          <h2 className="text-3xl font-extrabold text-center mb-2 text-gray-900 dark:text-white">
            Agenda tu cita ahora
          </h2>
          <p className="text-center text-gray-500 mb-10 text-sm">
            Completamente gratis. Sin compromiso.
          </p>

          {enviado ? (
            <div className="text-center space-y-6 p-8 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="text-5xl">🎉</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                ¡Listo! Te contactamos en menos de 24 horas
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Si prefieres conectar de inmediato, escríbenos por WhatsApp:
              </p>
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-xl transition"
              >
                <MessageCircle className="w-5 h-5" />
                Conectar por WhatsApp ahora
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Tu nombre completo"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1f1f1f] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  minLength={8}
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  placeholder="33 1234 5678"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1f1f1f] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Correo electrónico <span className="text-gray-400">(opcional)</span>
                </label>
                <input
                  type="email"
                  value={form.correo}
                  onChange={(e) => setForm({ ...form, correo: e.target.value })}
                  placeholder="tu@correo.com"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1f1f1f] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ¿Cuándo prefieres que te contactemos?
                </label>
                <select
                  value={form.preferencia}
                  onChange={(e) => setForm({ ...form, preferencia: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1f1f1f] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="">Selecciona una opción</option>
                  <option value="Mañana (9-12 h)">Mañana (9-12 h)</option>
                  <option value="Tarde (12-15 h)">Tarde (12-15 h)</option>
                  <option value="Tarde-noche (15-18 h)">Tarde-noche (15-18 h)</option>
                  <option value="Lo antes posible">Lo antes posible</option>
                </select>
              </div>
              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}
              <button
                type="submit"
                disabled={enviando}
                className="w-full bg-brand hover:opacity-90 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-lg transition-all disabled:opacity-60"
              >
                {enviando ? "Enviando..." : "Agendar mi cita →"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* QUÉ TE LLEVAS */}
      <section className="py-16 px-4 bg-[#fdf8ee] dark:bg-[#1a1508]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-extrabold mb-10 text-gray-900 dark:text-white">
            Qué te llevas de tu primera cita
          </h2>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            {BENEFICIOS.map((b) => (
              <div key={b.texto} className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-brand shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300 font-medium">{b.texto}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-4 border-t border-gray-100 dark:border-gray-800 text-center text-sm text-gray-500">
        © 2026 César Cuapan. Puebla, Puebla.{" "}
        <Link href="/privacidad" className="underline hover:text-brand transition">
          Política de privacidad
        </Link>
      </footer>
    </div>
  )
}
