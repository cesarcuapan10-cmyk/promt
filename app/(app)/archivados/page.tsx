import { listarArchivados } from "@/app/actions/clientes"
import { ArchivadosCliente } from "./ArchivadosCliente"

export const metadata = { title: "Archivados" }

export default async function ArchivadosPage() {
  const { clientes, total, paginas } = await listarArchivados({ pagina: 1, porPagina: 20 })

  return (
    <ArchivadosCliente
      clientes={clientes}
      total={total}
      paginas={paginas}
      paginaInicial={1}
    />
  )
}
