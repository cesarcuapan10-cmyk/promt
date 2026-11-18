import type { Metadata, Viewport } from "next"
import "./studio.css"

export const metadata: Metadata = {
  title: "Visage · Estudio de visagismo con IA",
  description: "Diagnóstico de rostro, cráneo y cabello con IA, recomendación de corte y simulación antes/después.",
  manifest: "/studio-manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Visage" },
}

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <div className="studio">{children}</div>
}
