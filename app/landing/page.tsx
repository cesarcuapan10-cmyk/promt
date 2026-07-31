import type { Metadata } from "next"
import { LandingForm } from "./LandingForm"

// ─────────────────────────────────────────────────────────────────────────────
// ⚙️  CONFIGURA TU EVENTO AQUÍ (cambia estos valores antes de publicar)
// ─────────────────────────────────────────────────────────────────────────────
const EVENTO = {
  titulo: "COBRA LO QUE VALES",
  subtitulo:
    "El método para vender caro y cerrar sin depender de ti —sin descuentos ni ruegos.",
  fecha: "Jueves 13 de agosto",
  hora: "7:00 PM (hora CDMX)",
  duracion: "90 minutos en vivo",
  presentador: "César Cuapan",
}

export const metadata: Metadata = {
  title: `Masterclass Gratuita — ${EVENTO.titulo} | ${EVENTO.presentador}`,
  description: EVENTO.subtitulo,
}

const BENEFICIOS = [
  "El error que te hace sonar “caro” en los primeros 30 segundos —y la frase exacta que lo apaga.",
  "La estructura de cierre que convierte un “lo voy a pensar” en un SÍ antes de colgar la llamada.",
  "Cómo hacer que tu negocio cierre ventas aunque tú estés dormido, de viaje o desconectado.",
  "Por qué bajar el precio está espantando a tus MEJORES clientes (y qué hacer en su lugar).",
]

const PILARES = [
  {
    n: "V",
    titulo: "Valor",
    texto: "Rediseña tu oferta y tu precio para que el valor aplaste al “está caro”. De justificar y descontar → a defender tu precio sin titubear.",
  },
  {
    n: "A",
    titulo: "Autoridad",
    texto: "Posicionamiento y marca personal que te hace deseable. De perseguir clientes fríos → a atraer al cliente correcto que ya quiere comprarte.",
  },
  {
    n: "L",
    titulo: "Libreto",
    texto: "El guion de cierre que convierte objeciones en decisión. De “lo voy a pensar” → a un sí el mismo día, sin rogar.",
  },
  {
    n: "E",
    titulo: "Estructura",
    texto: "El proceso (y el equipo) que vende por ti. De “yo soy el único que vende” → a un sistema que cierra con o sin ti.",
  },
]

const PARA_QUIEN = [
  "Dueños de negocio que hoy son el principal (o único) vendedor.",
  "Coaches y consultores que quieren subir su ticket sin perder clientes.",
  "Equipos de ventas sin estructura que dependen del jefe para cerrar.",
]

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ utm_source?: string; utm_medium?: string; utm_campaign?: string }>
}) {
  const sp = await searchParams
  const utm = {
    source: sp.utm_source,
    medium: sp.utm_medium,
    campaign: sp.utm_campaign,
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* HERO */}
      <section
        className="px-4 py-12 sm:py-16"
        style={{ background: "linear-gradient(135deg, #fdf8ee 0%, #f3d99d 55%, #e8b763 100%)" }}
      >
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          {/* Copy */}
          <div>
            <span className="inline-block bg-white/70 text-brand-800 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-5">
              Masterclass gratuita en vivo
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-gray-900">
              {EVENTO.titulo}
            </h1>
            <p className="mt-4 text-lg sm:text-xl text-gray-800 font-medium">
              {EVENTO.subtitulo}
            </p>
            <p className="mt-6 text-base text-gray-800">
              Si tu negocio deja de vender el día que tú no estás, no tienes un negocio:
              tienes un empleo con más estrés. En esta masterclass te muestro el sistema para cambiarlo.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-gray-900">
              <span>📅 {EVENTO.fecha}</span>
              <span>🕗 {EVENTO.hora}</span>
              <span>⏱️ {EVENTO.duracion}</span>
            </div>
          </div>

          {/* Formulario */}
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-amber-100">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Reserva tu lugar gratis</h2>
            <p className="text-sm text-gray-500 mb-5">
              Regístrate y recibe el acceso por correo y WhatsApp.
            </p>
            <LandingForm utm={utm} />
          </div>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section className="px-4 py-14">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold">
            Lo que vas a descubrir EN VIVO <span className="text-brand-600">(y no está en Google)</span>
          </h2>
          <p className="mt-3 text-gray-600">
            Se transmite una sola vez, en directo. Si no te conectas, pierdes el contenido —y el bono del final.
          </p>
          <div className="mt-8 grid sm:grid-cols-2 gap-6 text-left">
            {BENEFICIOS.map((b, i) => (
              <div key={i} className="bg-brand-50 rounded-2xl p-6 border border-amber-100 flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand text-white font-extrabold flex items-center justify-center">
                  {i + 1}
                </div>
                <p className="text-gray-800 font-medium">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PILARES / AGENDA */}
      <section className="px-4 py-14 bg-brand-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center">
            El Método V.A.L.E.™, paso a paso
          </h2>
          <p className="text-center text-gray-600 mt-2">
            Las 4 piezas para cobrar lo que vales y vender sin depender de ti.
          </p>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PILARES.map((p) => (
              <div key={p.n} className="bg-white rounded-2xl p-6 shadow-sm border border-amber-100">
                <div className="text-4xl font-extrabold text-brand-300">{p.n}</div>
                <h3 className="mt-3 text-lg font-bold text-gray-900">{p.titulo}</h3>
                <p className="mt-2 text-gray-700 text-sm leading-relaxed">{p.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PARA QUIEN */}
      <section className="px-4 py-14">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center">¿Es para ti?</h2>
          <ul className="mt-8 space-y-4">
            {PARA_QUIEN.map((p, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-brand text-white text-sm font-bold flex items-center justify-center">
                  ✓
                </span>
                <span className="text-gray-800">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA FINAL */}
      <section
        className="px-4 py-16 text-center"
        style={{ background: "linear-gradient(135deg, #e8b763 0%, #c47c20 100%)" }}
      >
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-white">
            Tu próximo cliente no debería depender de tu energía de hoy.
          </h2>
          <p className="mt-3 text-white/90 text-lg">
            Aparta tu lugar. Cupo limitado y 100% gratis.
          </p>
          <a
            href="#top"
            className="mt-8 inline-block bg-white text-brand-800 font-bold px-8 py-4 rounded-xl uppercase tracking-wide hover:bg-brand-50 transition-colors"
          >
            Quiero mi lugar gratis
          </a>
          <p className="mt-6 text-white/80 text-sm">
            Con {EVENTO.presentador} · {EVENTO.fecha} · {EVENTO.hora}
          </p>
        </div>
      </section>
    </main>
  )
}
