import { listarPagos } from "@/app/actions/pagos"
import { PagosCliente } from "./PagosCliente"

export const metadata = { title: "Pagos – PROMPT MAESTRO" }

export default async function PagosPage() {
  const datos = await listarPagos()
  return <PagosCliente datosIniciales={datos} />
}
