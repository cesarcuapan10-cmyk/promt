import {
  listarRecordatorios,
  clientesParaContactarHoy,
  clientesSinProximaAccion,
  clientesEstancados,
} from "@/app/actions/seguimiento"
import { listarClientes } from "@/app/actions/clientes"
import { SeguimientoCliente } from "./SeguimientoCliente"

export const metadata = { title: "Seguimiento – PROMPT MAESTRO" }

export default async function SeguimientoPage() {
  const [datos, contactarHoy, sinAccion, estancados, datosClientes] = await Promise.all([
    listarRecordatorios("TODOS"),
    clientesParaContactarHoy(),
    clientesSinProximaAccion(),
    clientesEstancados(7),
    listarClientes({ porPagina: 200 }),
  ])

  return (
    <SeguimientoCliente
      datosIniciales={datos}
      clientesContactar={contactarHoy as Parameters<typeof SeguimientoCliente>[0]["clientesContactar"]}
      clientesSinAccion={sinAccion as Parameters<typeof SeguimientoCliente>[0]["clientesSinAccion"]}
      clientesEstancados={estancados as Parameters<typeof SeguimientoCliente>[0]["clientesEstancados"]}
      clientes={datosClientes.clientes.map((c) => ({ id: c.id, nombre: c.nombre }))}
    />
  )
}
