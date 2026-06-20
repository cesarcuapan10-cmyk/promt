import { listarClientes } from "@/app/actions/clientes"
import { ClientesCliente } from "./ClientesCliente"

export const metadata = { title: "Clientes — CRM César Cuapan" }

export default async function ClientesPage() {
  const data = await listarClientes({ pagina: 1, porPagina: 25 })
  return <ClientesCliente datosIniciales={data} />
}
