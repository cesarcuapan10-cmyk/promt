import type { Metadata } from "next"
import LandingCliente from "./LandingCliente"

export const metadata: Metadata = {
  title: "César Cuapan — Coaching y Mentorías de Ventas",
  description: "Ayudo a profesionales y emprendedores a incrementar sus ventas trabajando desde la raíz: identidad, mentalidad y emociones. Agenda tu cita gratis.",
  openGraph: {
    title: "César Cuapan — Incrementa tus Ventas",
    description: "Ayudo a profesionales y emprendedores a incrementar sus ventas trabajando desde la raíz. Agenda tu cita gratis hoy.",
    type: "website",
    locale: "es_MX",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "César Cuapan Coaching" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "César Cuapan — Coaching y Mentorías de Ventas",
    description: "Agenda tu cita gratis. Incrementa tus ventas desde la raíz.",
  },
}

export default function LandingPage() {
  return <LandingCliente />
}
