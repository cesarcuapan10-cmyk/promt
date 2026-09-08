import type { Metadata, Viewport } from "next"

export const metadata: Metadata = {
  title: "Agenda tu cita",
  description: "Reserva tu cita en línea, rápido y sin llamadas.",
  manifest: "/agendar-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Agenda cita",
  },
  openGraph: {
    title: "Agenda tu cita",
    description: "Reserva tu cita en línea, rápido y sin llamadas.",
    type: "website",
    locale: "es_MX",
  },
}

export const viewport: Viewport = {
  themeColor: "#e8b763",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function AgendarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#faf7f0] to-white dark:from-[#141414] dark:to-[#0d0d0d] text-gray-900 dark:text-gray-100">
      {children}
    </div>
  )
}
