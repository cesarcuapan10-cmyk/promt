import { listarPerdidos } from "@/app/actions/clientes"
import { PerdidosCliente } from "./PerdidosCliente"

export const metadata = { title: "Perdidos" }

export default async function PerdidosPage() {
  const { clientes, total, paginas } = await listarPerdidos({ pagina: 1, porPagina: 20 })

  return (
    <PerdidosCliente
      clientes={clientes}
      total={total}
      paginas={paginas}
      paginaInicial={1}
    />
  )
}
