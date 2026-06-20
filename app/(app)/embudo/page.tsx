import { obtenerClientesPorEtapa } from "@/app/actions/embudo"
import { EmbudoKanban } from "./EmbudoKanban"

export const metadata = { title: "Embudo – PROMPT MAESTRO" }

export default async function EmbudoPage() {
  const porEtapa = await obtenerClientesPorEtapa()
  return <EmbudoKanban porEtapa={porEtapa} />
}
