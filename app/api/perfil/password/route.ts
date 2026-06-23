import { auth } from "@/app/lib/auth"
import { db } from "@/app/lib/db"
import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"

const schema = z.object({
  actual: z.string().min(1),
  nueva: z.string().min(8, "Mínimo 8 caracteres"),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const body = await req.json()
    const { actual, nueva } = schema.parse(body)

    const usuario = await db.usuario.findUnique({ where: { id: session.user.id } })
    if (!usuario) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })

    const valido = await bcrypt.compare(actual, usuario.contraseñaHash)
    if (!valido) return NextResponse.json({ error: "La contraseña actual no es correcta" }, { status: 400 })

    const hash = await bcrypt.hash(nueva, 12)
    await db.usuario.update({ where: { id: session.user.id }, data: { contraseñaHash: hash } })

    await db.registroAuditoria.create({
      data: {
        usuarioId: session.user.id,
        accion: "CAMBIO_CONTRASENA",
        entidad: "Usuario",
        entidadId: session.user.id,
        descripcion: "Cambió su contraseña",
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? "Datos inválidos" }, { status: 400 })
    return NextResponse.json({ error: "Error al cambiar contraseña" }, { status: 500 })
  }
}
