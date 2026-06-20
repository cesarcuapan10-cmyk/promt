import { notFound } from "next/navigation"
import { obtenerCliente } from "@/app/actions/clientes"
import { ExpedienteCliente } from "./ExpedienteCliente"

export const metadata = { title: "Expediente de cliente — CRM César Cuapan" }

export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  try {
    const cliente = await obtenerCliente(id)
    return <ExpedienteCliente cliente={cliente} />
  } catch {
    notFound()
  }
}
