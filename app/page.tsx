import type { Metadata } from "next"
import { auth } from "@/app/lib/auth"
import LandingCliente from "@/app/components/landing/LandingCliente"

export const metadata: Metadata = {
  title: "Incrementa tus ventas | César Cuapan — Coaching y Mentorías",
  description:
    "Ayudo a profesionales y emprendedores de Puebla a vender más trabajando su identidad, mentalidad y emociones. Agenda tu cita gratis.",
  openGraph: {
    title: "Incrementa tus ventas | César Cuapan — Coaching y Mentorías",
    description:
      "Ayudo a profesionales y emprendedores de Puebla a vender más trabajando su identidad, mentalidad y emociones. Agenda tu cita gratis.",
    images: [{ url: "/og-image.png" }],
  },
}

export default async function LandingPage() {
  const session = await auth()
  const haySesion = !!session?.user?.id
  return <LandingCliente haySesion={haySesion} />
}
