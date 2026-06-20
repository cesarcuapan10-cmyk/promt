import { listarRecordatorios } from "@/app/actions/seguimiento"
import { SeguimientoCliente } from "./SeguimientoCliente"

export const metadata = { title: "Seguimiento – PROMPT MAESTRO" }

export default async function SeguimientoPage() {
  const datos = await listarRecordatorios("TODOS")
  return <SeguimientoCliente datosIniciales={datos} />
}
