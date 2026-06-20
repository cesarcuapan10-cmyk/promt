import type { Metadata } from "next"
import { auth } from "@/app/lib/auth"
import { redirect } from "next/navigation"
import { listarPlantillas } from "@/app/actions/plantillas"
import PlantillasCliente from "./PlantillasCliente"

export const metadata: Metadata = {
  title: "Plantillas de mensajes",
}

export default async function PlantillasPage() {
  const sesion = await auth()
  if (!sesion?.user?.id) redirect("/login")

  const { plantillas } = await listarPlantillas()

  return <PlantillasCliente plantillasIniciales={plantillas} />
}
