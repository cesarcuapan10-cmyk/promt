import { db } from "@/app/lib/db"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import AgendaPublicaCliente from "./AgendaPublicaCliente"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const vendedor = await db.usuario.findFirst({
    where: { OR: [{ ligaAgenda: slug }, { id: slug }], activo: true },
    select: { nombre: true },
  })
  if (!vendedor) return { title: "Página no encontrada" }
  return {
    title: `Agenda una cita con ${vendedor.nombre}`,
    description: `Reserva un espacio de 45 minutos con ${vendedor.nombre}.`,
    openGraph: {
      title: `Agenda con ${vendedor.nombre} — César Cuapan`,
      description: "Reserva tu cita en línea. Sin filas, sin llamadas.",
    },
  }
}

export default async function AgendaPublicaPage({ params }: Props) {
  const { slug } = await params
  const vendedor = await db.usuario.findFirst({
    where: { OR: [{ ligaAgenda: slug }, { id: slug }], activo: true },
    select: { id: true, nombre: true, correo: true },
  })
  if (!vendedor) notFound()

  return <AgendaPublicaCliente vendedor={vendedor} />
}
