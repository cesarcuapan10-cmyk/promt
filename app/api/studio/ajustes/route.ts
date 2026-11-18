import { z } from "zod/v4"
import { db } from "@/app/lib/db"
import { barberiaPublica, requerirBarberia } from "@/app/studio/lib/servidor"

const Entrada = z.object({
  nombre: z.string().min(2).max(80),
  logo: z.string().startsWith("data:image/").max(300_000).nullable(),
  colorMarca: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  whatsapp: z.string().max(20),
  enlaceAgenda: z.string().max(300),
  instagram: z.string().max(60),
  ciudad: z.string().max(80),
  catalogo: z
    .array(z.object({ nombre: z.string().min(1).max(120), precio: z.number().min(0).max(100000), tipo: z.enum(["corte", "servicio", "producto"]) }))
    .max(80),
  barberos: z.array(z.string().min(1).max(60)).max(30),
})

/** La barbería edita su marca, catálogo y equipo. El PIN y el plan solo los cambia el administrador. */
export async function PUT(req: Request) {
  const b = await requerirBarberia()
  if (b instanceof Response) return b
  const parsed = Entrada.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Revisa los datos" }, { status: 400 })
  const d = parsed.data
  const actualizado = await db.barberia.update({
    where: { id: b.id },
    data: {
      nombre: d.nombre,
      logo: d.logo,
      colorMarca: d.colorMarca,
      whatsapp: d.whatsapp.replace(/\D/g, "") || null,
      enlaceAgenda: d.enlaceAgenda.trim() || null,
      instagram: d.instagram.replace(/^@/, "").trim() || null,
      ciudad: d.ciudad.trim() || null,
      catalogo: JSON.stringify(d.catalogo),
      barberos: JSON.stringify(d.barberos),
    },
  })
  return Response.json({ barberia: barberiaPublica(actualizado) })
}
