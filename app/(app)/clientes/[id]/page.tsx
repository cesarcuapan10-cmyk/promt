import { notFound } from "next/navigation"
import { obtenerExpediente } from "@/app/actions/clientes"
import { ExpedienteCliente } from "./ExpedienteCliente"

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  try {
    const cliente = await obtenerExpediente(id)
    return { title: `${cliente.nombre} — Expediente` }
  } catch {
    return { title: "Expediente" }
  }
}

export default async function ExpedientePage({ params }: Props) {
  const { id } = await params
  let cliente
  try {
    cliente = await obtenerExpediente(id)
  } catch {
    notFound()
  }

  return <ExpedienteCliente cliente={cliente} />
}
