import { db } from "@/app/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({
  nombre: z.string().min(1).max(100),
  whatsapp: z.string().min(8).max(20),
  correo: z.string().email().optional().or(z.literal("")),
  utm_source: z.string().optional(),
  objecion_principal: z.string().optional().nullable(),
  reto_principal: z.string().optional().nullable(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.parse(body)

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"
    const unaHoraAtras = new Date(Date.now() - 3600000)
    const recientes = await db.registroAuditoria.count({
      where: { ip, accion: "LEAD_LANDING", creadoEn: { gte: unaHoraAtras } },
    })
    if (recientes >= 5) {
      return NextResponse.json({ error: "Demasiadas solicitudes. Intenta más tarde." }, { status: 429 })
    }

    const admin = await db.usuario.findFirst({ where: { rol: "ADMIN", activo: true } })
    if (!admin) return NextResponse.json({ error: "No hay vendedor disponible." }, { status: 500 })

    const limpio = parsed.whatsapp.replace(/\D/g, "")
    const duplicado = await db.cliente.findFirst({
      where: { whatsapp: { contains: limpio.slice(-8) }, eliminadoEn: null },
    })

    let clienteId: string

    if (duplicado) {
      clienteId = duplicado.id
      await db.cliente.update({
        where: { id: clienteId },
        data: {
          ...(parsed.objecion_principal ? { objecionPrincipal: parsed.objecion_principal } : {}),
          ...(parsed.reto_principal ? { retoPrincipal: parsed.reto_principal } : {}),
        },
      })
    } else {
      const origen = parsed.utm_source || "Landing"
      const cliente = await db.cliente.create({
        data: {
          nombre: parsed.nombre,
          whatsapp: limpio,
          correo: parsed.correo || null,
          origen,
          utmSource: parsed.utm_source || null,
          etapa: "NUEVO",
          estadoCartera: "ACTIVO",
          temperatura: "TIBIO",
          proximaAccion: "Contactar en menos de 24 horas",
          fechaProximaAccion: new Date(Date.now() + 86400000),
          objecionPrincipal: parsed.objecion_principal || null,
          retoPrincipal: parsed.reto_principal || null,
          vendedorId: admin.id,
        },
      })
      clienteId = cliente.id

      await db.nota.create({
        data: {
          clienteId,
          usuarioId: admin.id,
          contenido: `Lead llegó por la landing pública${parsed.utm_source ? ` (canal: ${parsed.utm_source})` : ""}.`,
          tipo: "SISTEMA",
        },
      })
    }

    await db.registroAuditoria.create({
      data: {
        accion: "LEAD_LANDING",
        entidad: "Cliente",
        entidadId: clienteId,
        descripcion: `Lead "${parsed.nombre}" llegó por la landing`,
        ip,
      },
    })

    return NextResponse.json({ ok: true, clienteId })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos. Verifica nombre y WhatsApp." }, { status: 400 })
    }
    console.error("Error landing:", err)
    return NextResponse.json({ error: "Error al procesar tu solicitud." }, { status: 500 })
