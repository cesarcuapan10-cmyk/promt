import { auth } from "@/app/lib/auth"
import { listarCitas } from "@/app/actions/citas"
import { AgendaCliente } from "./AgendaCliente"

export const metadata = { title: "Agenda – PROMPT MAESTRO" }

export default async function AgendaPage() {
  const session = await auth()
  const ahora = new Date()
  const mes = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`
  const citas = await listarCitas({ mes })
  return <AgendaCliente citasIniciales={citas} userId={(session?.user as { id: string })?.id} />
}
