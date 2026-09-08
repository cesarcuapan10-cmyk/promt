import { obtenerConfigAgenda } from "@/app/actions/agendar"
import { AgendaCliente } from "./AgendaCliente"

export const metadata = { title: "Agenda" }
export const dynamic = "force-dynamic"

export default async function AgendaPage() {
  const config = await obtenerConfigAgenda()
  return <AgendaCliente config={config} />
}
