"use server"

import { auth } from "@/app/lib/auth"
import { db } from "@/app/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"

type SessionUser = { id: string; rol?: string }
async function getSession(): Promise<{ user: SessionUser }> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("No autorizado")
  return session as { user: SessionUser }
}

const esquemaPlantilla = z.object({
  titulo: z.string().min(1),
  contenido: z.string().min(1),
  tipo: z.enum(["WHATSAPP", "CORREO"]).default("WHATSAPP"),
  etapa: z.string().optional().nullable(),
  objecion: z.string().optional().nullable(),
})

export type EsquemaPlantilla = z.infer<typeof esquemaPlantilla>

export interface PlantillaSistema {
  id: string
  titulo: string
  contenido: string
  tipo: "WHATSAPP" | "CORREO"
  etapa?: string
  objecion?: string
  esSistema: true
}

export async function listarPlantillas(tipo?: "WHATSAPP" | "CORREO") {
  const { user } = await getSession()
  return db.plantilla.findMany({
    where: {
      usuarioId: user.id,
      ...(tipo && { tipo }),
    },
    orderBy: [{ favorita: "desc" }, { creadoEn: "desc" }],
  })
}

export async function crearPlantilla(data: EsquemaPlantilla) {
  const { user } = await getSession()
  const parsed = esquemaPlantilla.parse(data)
  const plantilla = await db.plantilla.create({
    data: { ...parsed, usuarioId: user.id },
  })
  revalidatePath("/plantillas")
  return { ok: true, plantilla }
}

export async function actualizarPlantilla(
  id: string,
  data: Partial<EsquemaPlantilla>
) {
  const { user } = await getSession()
  const plantilla = await db.plantilla.findFirst({ where: { id } })
  if (!plantilla) return { ok: false, error: "Plantilla no encontrada" }
  if (plantilla.usuarioId !== user.id && user.rol !== "ADMIN")
    return { ok: false, error: "Sin permiso" }

  await db.plantilla.update({ where: { id }, data })
  revalidatePath("/plantillas")
  return { ok: true }
}

export async function eliminarPlantilla(id: string) {
  const { user } = await getSession()
  const plantilla = await db.plantilla.findFirst({ where: { id } })
  if (!plantilla) return { ok: false, error: "Plantilla no encontrada" }
  if (plantilla.usuarioId !== user.id && user.rol !== "ADMIN")
    return { ok: false, error: "Sin permiso" }

  await db.plantilla.delete({ where: { id } })
  revalidatePath("/plantillas")
  return { ok: true }
}

export async function toggleFavoritaPlantilla(id: string) {
  const { user } = await getSession()
  const plantilla = await db.plantilla.findFirst({ where: { id } })
  if (!plantilla) return { ok: false, error: "Plantilla no encontrada" }
  if (plantilla.usuarioId !== user.id && user.rol !== "ADMIN")
    return { ok: false, error: "Sin permiso" }

  await db.plantilla.update({
    where: { id },
    data: { favorita: !plantilla.favorita },
  })
  revalidatePath("/plantillas")
  return { ok: true }
}

export function getPlantillasSistema(): PlantillaSistema[] {
  return [
    {
      id: "sys-reactivar-frio",
      titulo: "Reactivar un frío",
      tipo: "WHATSAPP",
      etapa: "CONTACTADO",
      esSistema: true,
      contenido: `Hola {nombre}, soy {vendedor}. Han pasado unos días desde nuestra última conversación y quería saber cómo van las cosas.

Te pregunto directo: ¿sigue siendo un reto para ti [el problema que platicamos]?

Si ya lo resolviste, fantástico. Si no, tengo 15 minutos libres esta semana y podría ayudarte. Sin compromiso.

¿Qué dices?`,
    },
    {
      id: "sys-esta-caro",
      titulo: "Vencer \"está caro\"",
      tipo: "WHATSAPP",
      objecion: "precio",
      esSistema: true,
      contenido: `Hola {nombre}, entiendo perfectamente la preocupación por el precio.

Déjame preguntarte algo: ¿cuánto te está costando HOY no resolver {objecion}?

La mayoría de mis clientes en {empresa} recuperan la inversión en los primeros 60-90 días.

¿Puedo mostrarte cómo en una llamada de 20 minutos?`,
    },
    {
      id: "sys-voy-a-pensar",
      titulo: "El \"lo voy a pensar\"",
      tipo: "WHATSAPP",
      objecion: "pensar",
      esSistema: true,
      contenido: `Hola {nombre}, claro que sí, es una decisión importante.

Para que tu análisis sea más fácil, déjame preguntarte: ¿qué es lo que más te genera duda?

Puede ser el precio, el tiempo, si funcionará para tu caso... dímelo y te doy información exacta sobre ese punto.

¿Qué es lo que más te tiene pensando?`,
    },
    {
      id: "sys-confirmar-cita",
      titulo: "Confirmar cita",
      tipo: "WHATSAPP",
      etapa: "CITA_AGENDADA",
      esSistema: true,
      contenido: `Hola {nombre} 👋

Te confirmo nuestra cita de mañana. Esto es lo que vamos a revisar en {valor} minutos:

✅ Tu situación actual en ventas
✅ Las 2-3 palancas de mayor impacto para tu caso
✅ Próximos pasos concretos

Si necesitas reagendar, avísame. Si no, nos vemos puntual.

¡Hasta mañana, {vendedor}!`,
    },
    {
      id: "sys-pago-vencido",
      titulo: "Recuperar pago vencido",
      tipo: "WHATSAPP",
      etapa: "GANADO",
      esSistema: true,
      contenido: `Hola {nombre}, espero que todo vaya genial.

Vi que el pago de {valor} del {objecion} quedó pendiente. ¿Hubo algún problema con el proceso?

Si fue un olvido, aquí te mando de nuevo el link de pago: [LINK]

Si hay algo más que necesitas, con gusto lo revisamos. 🙏`,
    },
    {
      id: "sys-urgencia",
      titulo: "Cerrar con urgencia/escasez",
      tipo: "WHATSAPP",
      etapa: "NEGOCIACION",
      esSistema: true,
      contenido: `Hola {nombre}, quería avisarte antes de que se llene.

Tengo solo 2 lugares disponibles para comenzar este mes. Después de eso, el siguiente inicio sería en 6 semanas.

No te digo esto para presionarte — simplemente no quiero que pierdas tu lugar si ya decidiste.

¿Arrancamos esta semana?`,
    },
    {
      id: "sys-pedir-si",
      titulo: "Pedir el sí final",
      tipo: "WHATSAPP",
      etapa: "NEGOCIACION",
      esSistema: true,
      contenido: `Hola {nombre}, después de todo lo que hemos platicado...

Creo que tenemos todo claro: el problema, la solución, los números. Solo falta dar el paso.

¿Qué necesitas de mí para que arranquemos esta semana?

Estoy listo cuando tú lo estés. 🤝`,
    },
    {
      id: "sys-postventa",
      titulo: "Post-venta / onboarding",
      tipo: "WHATSAPP",
      etapa: "GANADO",
      esSistema: true,
      contenido: `¡Hola {nombre}! Bienvenido al equipo 🎉

Estoy muy contento de que hayamos arrancado juntos. En los próximos días recibirás:

1. Acceso a tu área de trabajo
2. Correo con los primeros pasos
3. Mi contacto directo para cualquier duda

Mi compromiso: que veas resultados concretos antes de 30 días.

Cualquier cosa, escríbeme directo aquí. ¡Vamos con todo! — {vendedor}`,
    },
    {
      id: "sys-referidos",
      titulo: "Pedir referidos",
      tipo: "WHATSAPP",
      etapa: "GANADO",
      esSistema: true,
      contenido: `Hola {nombre}, ¿cómo van las cosas? Espero que estés viendo buenos resultados.

Te hago una pregunta directa: ¿conoces a alguien más — un colega, amigo o socio — que también tenga este reto en sus ventas?

Si me das su contacto y él decide trabajar conmigo, para ti hay [BENEFICIO].

No es obligatorio, pero si alguien viene a tu mente... te lo agradecería mucho. 🙏`,
    },
  ]
}
