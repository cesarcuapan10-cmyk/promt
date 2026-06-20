import { listarCompletados } from "@/app/actions/clientes"
import { CompletadosCliente } from "./CompletadosCliente"

export const metadata = { title: "Completados" }

export default async function CompletadosPage() {
  const { clientes, total, paginas } = await listarCompletados({ pagina: 1, porPagina: 20 })

  return (
    <CompletadosCliente
      clientes={clientes}
      total={total}
      paginas={paginas}
      paginaInicial={1}
    />
  )
}
