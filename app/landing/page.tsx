import type { Metadata } from "next"
import { LandingForm } from "./LandingForm"

// ─────────────────────────────────────────────────────────────────────────────
// ⚙️  CONFIGURA TU EVENTO AQUÍ (cambia estos valores antes de publicar)
// ─────────────────────────────────────────────────────────────────────────────
const EVENTO = {
  titulo: "VENDE SIN TI",
  subtitulo:
    "Cómo hacer que tu negocio cierre ventas caras aunque tú no estés —sin bajar el precio ni rogar.",
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
  "Cómo cobrar lo que vales sin que te digan “está caro”.",
  "La estructura que convierte el “lo voy a pensar” en un sí el mismo día.",
  "Cómo hacer que tu proceso o tu equipo venda por ti (aunque hoy vendas solo tú).",
]

const PILARES = [
  {
    n: "01",
    titulo: "Cobrar sin miedo",
    texto: "Pon tu precio con seguridad y defiéndelo. Adiós a la mentalidad de escasez y a descontar por miedo a perder al cliente.",
  },
  {
    n: "02",
    titulo: "Cerrar sin rogar",
    texto: "La conversación de ventas que desactiva objeciones y lleva a la decisión hoy, no “la próxima semana”.",
  },
  {
    n: "03",
    titulo: "Un sistema que vende por ti",
    texto: "Pasa de “yo soy el único que vende” a un proceso y un equipo que cierran con o sin ti.",
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
          <h2 className="text-2xl sm:text-3xl font-bold">Lo que te vas a llevar</h2>
          <div className="mt-8 grid sm:grid-cols-3 gap-6 text-left">
            {BENEFICIOS.map((b, i) => (
              <div key={i} className="bg-brand-50 rounded-2xl p-6 border border-amber-100">
                <div className="text-brand-700 text-2xl font-extrabold mb-2">✓</div>
                <p className="text-gray-800">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PILARES / AGENDA */}
      <section className="px-4 py-14 bg-brand-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center">
            El sistema, en 3 piezas
          </h2>
          <p className="text-center text-gray-600 mt-2">
            Lo que veremos en vivo, paso a paso.
          </p>
          <div className="mt-10 grid md:grid-cols-3 gap-6">
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
