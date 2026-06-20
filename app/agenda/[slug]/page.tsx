import { db } from "@/app/lib/db"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import AgendaPublicaCliente from "./AgendaPublicaCliente"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const usuario = await db.usuario.findFirst({
    where: { ligaAgenda: slug, activo: true },
    select: { nombre: true },
  })
  if (!usuario) {
    return { title: "Agenda no disponible" }
  }
  return {
    title: `Agenda con ${usuario.nombre} · César Cuapan`,
    description: `Reserva una llamada de 45 minutos con ${usuario.nombre}.`,
  }
}

export default async function AgendaSlugPage({ params }: Props) {
  const { slug } = await params
  const usuario = await db.usuario.findFirst({
    where: { ligaAgenda: slug, activo: true },
    select: { id: true, nombre: true, avatar: true, ligaAgenda: true },
  })

  if (!usuario) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#0f0f0f] p-8 text-center">
        <div className="text-5xl mb-4">📅</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Esta página de agenda no está disponible
        </h1>
        <p className="text-gray-500 text-sm">
          El enlace que usaste no corresponde a ningún vendedor activo.
        </p>
      </div>
    )
  }

  return <AgendaPublicaCliente vendedor={usuario} slug={slug} />
}
