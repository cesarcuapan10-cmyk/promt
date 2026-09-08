import Link from "next/link"
import { CalendarPlus, Clock, ShieldCheck } from "lucide-react"
import { obtenerConfigAgenda } from "@/app/actions/agendar"
import { InstallBanner } from "./InstallBanner"

export const dynamic = "force-dynamic"

export default async function AgendarLanding() {
  const config = await obtenerConfigAgenda()
  const marca = config.negocio.colorMarca || "#e8b763"

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-10 pt-[max(2rem,env(safe-area-inset-top))]">
      <header className="mt-6 text-center">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm"
          style={{ backgroundColor: `${marca}20` }}
        >
          <CalendarPlus className="h-8 w-8" style={{ color: marca }} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{config.negocio.nombre}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Reserva tu cita en línea, sin llamadas ni esperas.
        </p>
      </header>

      {/* Banner de instalación: se auto-oculta cuando la app ya está instalada */}
      <InstallBanner nombre={config.negocio.nombre} marca={marca} />

      {/* CTA principal — "Agenda cita" (queda en lugar de los botones al instalar) */}
      <Link
        href="/agendar/reservar"
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-semibold text-white shadow-md transition-transform active:scale-[0.98]"
        style={{ backgroundColor: marca }}
      >
        <CalendarPlus className="h-5 w-5" />
        Agenda tu cita
      </Link>

      <ul className="mt-8 space-y-3 text-sm text-gray-600 dark:text-gray-300">
        <li className="flex items-center gap-3">
          <Clock className="h-5 w-5 shrink-0" style={{ color: marca }} />
          Elige el día, la hora, con quién y el servicio.
        </li>
        <li className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 shrink-0" style={{ color: marca }} />
          Confirmación al instante. Nosotros te esperamos.
        </li>
      </ul>

      <p className="mt-auto pt-10 text-center text-xs text-gray-400">
        {config.negocio.nombre} · Agenda en línea
      </p>
    </main>
  )
}
