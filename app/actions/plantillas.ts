"use server"
import { auth } from "@/app/lib/auth"
import { db } from "@/app/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const esquemaPlantilla = z.object({
  titulo: z.string().min(1, "El título es requerido"),
  contenido: z.string().min(1, "El contenido es requerido"),
  tipo: z.enum(["WHATSAPP", "CORREO"]).default("WHATSAPP"),
  etapa: z.string().optional().nullable(),
  objecion: z.string().optional().nullable(),
  favorita: z.boolean().optional().default(false),
})

export type EsquemaPlantilla = z.infer<typeof esquemaPlantilla>

export async function listarPlantillas() {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error("No autorizado")

  const plantillas = await db.plantilla.findMany({
    where: {
      OR: [
        { usuarioId: sesion.user.id },
        { usuarioId: null },
      ],
    },
    orderBy: [
      { favorita: "desc" },
      { creadoEn: "desc" },
    ],
  })

  return { plantillas }
}

export async function crearPlantilla(data: EsquemaPlantilla) {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error("No autorizado")

  const parsed = esquemaPlantilla.parse(data)
  const plantilla = await db.plantilla.create({
    data: {
      ...parsed,
      usuarioId: sesion.user.id,
    },
  })

  revalidatePath("/plantillas")
  return { ok: true, plantilla }
}

export async function actualizarPlantilla(
  id: string,
  data: Partial<EsquemaPlantilla>
) {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error("No autorizado")

  const plantilla = await db.plantilla.findUnique({ where: { id } })
  if (!plantilla) return { ok: false, error: "Plantilla no encontrada" }

  // Solo puede editar las propias (no las globales a menos que sea admin)
  const esAdmin = ((sesion.user as { rol?: string }).rol) === "ADMIN"
  if (plantilla.usuarioId !== sesion.user.id && !esAdmin) {
    return { ok: false, error: "Sin permiso para editar esta plantilla" }
  }

  const actualizada = await db.plantilla.update({
    where: { id },
    data: {
      titulo: data.titulo ?? undefined,
      contenido: data.contenido ?? undefined,
      tipo: data.tipo ?? undefined,
      etapa: data.etapa ?? undefined,
      objecion: data.objecion ?? undefined,
      favorita: data.favorita ?? undefined,
    },
  })

  revalidatePath("/plantillas")
  return { ok: true, plantilla: actualizada }
}

export async function eliminarPlantilla(id: string) {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error("No autorizado")

  const plantilla = await db.plantilla.findUnique({ where: { id } })
  if (!plantilla) return { ok: false, error: "Plantilla no encontrada" }

  const esAdmin = ((sesion.user as { rol?: string }).rol) === "ADMIN"
  if (plantilla.usuarioId !== sesion.user.id && !esAdmin) {
    return { ok: false, error: "Sin permiso para eliminar esta plantilla" }
  }

  await db.plantilla.delete({ where: { id } })
  revalidatePath("/plantillas")
  return { ok: true }
}

export async function duplicarPlantilla(id: string) {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error("No autorizado")

  const original = await db.plantilla.findUnique({ where: { id } })
  if (!original) return { ok: false, error: "Plantilla no encontrada" }

  const nueva = await db.plantilla.create({
    data: {
      titulo: `${original.titulo} (copia)`,
      contenido: original.contenido,
      tipo: original.tipo,
      etapa: original.etapa,
      objecion: original.objecion,
      favorita: false,
      usuarioId: sesion.user.id,
    },
  })

  revalidatePath("/plantillas")
  return { ok: true, plantilla: nueva }
}

export async function toggleFavoritaPlantilla(id: string) {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error("No autorizado")

  const plantilla = await db.plantilla.findUnique({ where: { id } })
  if (!plantilla) return { ok: false, error: "Plantilla no encontrada" }

  const actualizada = await db.plantilla.update({
    where: { id },
    data: { favorita: !plantilla.favorita },
  })

  revalidatePath("/plantillas")
  return { ok: true, favorita: actualizada.favorita }
}
