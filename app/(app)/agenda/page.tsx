import { listarCitas } from "@/app/actions/agenda"
import { listarClientes } from "@/app/actions/clientes"
import { AgendaCliente } from "./AgendaCliente"

export const metadata = { title: "Agenda – PROMPT MAESTRO" }

interface Props {
  searchParams: Promise<{ mes?: string; año?: string }>
}

export default async function AgendaPage({ searchParams }: Props) {
  const params = await searchParams
  const mesParam = params.mes ? parseInt(params.mes, 10) : undefined
  const añoParam = params.año ? parseInt(params.año, 10) : undefined

  const [datosCitas, datosClientes] = await Promise.all([
    listarCitas(mesParam, añoParam),
    listarClientes({ porPagina: 200, estadoCartera: "ACTIVO" }),
  ])

  return (
    <AgendaCliente
      citasIniciales={datosCitas.citas as Parameters<typeof AgendaCliente>[0]["citasIniciales"]}
      mesInicial={datosCitas.mes}
      añoInicial={datosCitas.año}
      clientes={datosClientes.clientes.map((c) => ({ id: c.id, nombre: c.nombre }))}
      tieneGoogle={false}
    />
  )
}
