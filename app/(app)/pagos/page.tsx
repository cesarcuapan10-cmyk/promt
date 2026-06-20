import { listarPagos, resumenPagos } from "@/app/actions/pagos"
import { listarClientes } from "@/app/actions/clientes"
import { PagosCliente } from "./PagosCliente"

export const metadata = { title: "Pagos – PROMPT MAESTRO" }

export default async function PagosPage() {
  const [datos, resumen, datosClientes] = await Promise.all([
    listarPagos(),
    resumenPagos(),
    listarClientes({ porPagina: 200 }),
  ])

  return (
    <PagosCliente
      datosIniciales={datos as Parameters<typeof PagosCliente>[0]["datosIniciales"]}
      resumenInicial={resumen}
      clientesDisponibles={datosClientes.clientes.map((c) => ({ id: c.id, nombre: c.nombre }))}
    />
  )
}
