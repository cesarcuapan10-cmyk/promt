import type { Metadata } from "next"

const EVENTO = {
  fecha: "Jueves 13 de agosto",
  hora: "7:00 PM (hora CDMX)",
  // Tu WhatsApp (ya configurado para recibir mensajes y agendar cita):
  whatsapp: "https://contacto.cesarcuapan.com",
}

export const metadata: Metadata = {
  title: "¡Registro confirmado! — Masterclass Cobra Lo Que Vales",
  robots: { index: false },
}

export default function GraciasPage() {
  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #fdf8ee 0%, #f3d99d 55%, #e8b763 100%)" }}
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 sm:p-10 text-center border border-amber-100">
        <div className="mx-auto w-16 h-16 rounded-full bg-brand text-white text-3xl flex items-center justify-center mb-5">
          ✓
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
          ¡Listo, tu lugar está apartado! 🎉
        </h1>
        <p className="mt-3 text-gray-700">
          Te enviamos la confirmación a tu correo y WhatsApp. Guarda la fecha:
        </p>

        <div className="mt-5 bg-brand-50 rounded-xl p-4 border border-amber-100">
          <p className="font-bold text-gray-900">📅 {EVENTO.fecha}</p>
          <p className="text-gray-800">🕗 {EVENTO.hora}</p>
        </div>

        <div className="mt-6 space-y-3 text-left">
          <p className="text-sm text-gray-700">
            <strong>Paso 1.</strong> Agrega el evento a tu calendario para no perderlo.
          </p>
          <p className="text-sm text-gray-700">
            <strong>Paso 2.</strong> Escríbeme por WhatsApp la palabra <strong>“VOY”</strong>: ahí te confirmo tu acceso y te mando los recordatorios.
          </p>
          <p className="text-sm text-gray-700">
            <strong>Paso 3.</strong> En ese mismo chat cuéntame tu mayor reto vendiendo hoy y te preparo un mini-diagnóstico.
          </p>
        </div>

        <a
          href={EVENTO.whatsapp}
          className="mt-7 inline-block w-full bg-brand hover:bg-brand-700 text-white font-bold py-4 rounded-xl transition-colors uppercase tracking-wide"
        >
          Confirmar por WhatsApp
        </a>

        <p className="mt-4 text-xs text-gray-500">
          Nos vemos en vivo. Prepárate para dejar de ser el único que vende en tu negocio.
        </p>
      </div>
    </main>
  )
}
