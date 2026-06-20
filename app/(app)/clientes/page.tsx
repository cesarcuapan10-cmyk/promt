import { listarClientes } from "@/app/actions/clientes"
import { ClientesCliente } from "./ClientesCliente"

export const metadata = { title: "Clientes — PROMPT MAESTRO" }

export default async function ClientesPage() {
  const data = await listarClientes({ pagina: 1, porPagina: 20 })

  return <ClientesCliente datosIniciales={data} />
}
