import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/app/lib/db"

const schema = z.object({
  nombre: z.string().min(2),
  whatsapp: z.string().min(8),
  correo: z.string().email().optional().or(z.literal("")),
  preferencia: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 })
    }

    const { nombre, whatsapp, correo, preferencia, utmSource, utmMedium, utmCampaign } = parsed.data

    // Buscar vendedor admin por defecto (primer admin activo)
    const vendedor = await db.usuario.findFirst({
      where: { activo: true, rol: "ADMIN" },
      orderBy: { creadoEn: "asc" },
    })

    if (!vendedor) {
      return NextResponse.json({ ok: false, error: "No hay vendedor disponible" }, { status: 500 })
    }

    // Verificar si ya existe cliente con ese WhatsApp
    const existente = await db.cliente.findFirst({
      where: { whatsapp, eliminadoEn: null },
    })

    if (existente) {
      await db.registroAuditoria.create({
        data: {
          usuarioId: null,
          accion: "LEAD_DUPLICADO",
          entidad: "Cliente",
          entidadId: existente.id,
          descripcion: `Lead duplicado desde landing: ${nombre} (${whatsapp})`,
          ip: req.headers.get("x-forwarded-for") ?? undefined,
        },
      })
      return NextResponse.json({ ok: true, cliente: existente, duplicado: true })
    }

    // Calcular fecha próxima acción (mañana)
    const manana = new Date()
    manana.setDate(manana.getDate() + 1)
    manana.setHours(9, 0, 0, 0)

    const cliente = await db.cliente.create({
      data: {
        nombre,
        whatsapp,
        correo: correo || null,
        etapa: "NUEVO",
        estadoCartera: "ACTIVO",
        origen: "Landing",
        proximaAccion: "Contactar en menos de 24 h",
        fechaProximaAccion: manana,
        notas: preferencia ? `Preferencia de contacto: ${preferencia}` : null,
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
        vendedorId: vendedor.id,
      },
    })

    await db.registroAuditoria.create({
      data: {
        usuarioId: null,
        accion: "LEAD_LANDING",
        entidad: "Cliente",
        entidadId: cliente.id,
        descripcion: `Nuevo lead desde landing: ${nombre} (${whatsapp})`,
        ip: req.headers.get("x-forwarded-for") ?? undefined,
      },
    })

    return NextResponse.json({ ok: true, cliente })
  } catch (err) {
    console.error("Error en /api/landing/lead:", err)
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 })
  }
}
