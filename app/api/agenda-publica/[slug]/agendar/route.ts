import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/app/lib/db"

const schema = z.object({
  nombre: z.string().min(2),
  whatsapp: z.string().min(8),
  correo: z.string().email().optional().or(z.literal("")),
  fechaInicio: z.string().min(1),
})

interface RouteContext {
  params: Promise<{ slug: string }>
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = await params
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 })
    }

    const { nombre, whatsapp, correo, fechaInicio: fechaInicioStr } = parsed.data

    const vendedor = await db.usuario.findFirst({
      where: { ligaAgenda: slug, activo: true },
      select: { id: true, nombre: true },
    })
    if (!vendedor) {
      return NextResponse.json({ ok: false, error: "Vendedor no encontrado" }, { status: 404 })
    }

    const fechaInicio = new Date(fechaInicioStr)
    const fechaFin = new Date(fechaInicio.getTime() + 45 * 60 * 1000)

    // Verificar conflicto
    const conflicto = await db.cita.findFirst({
      where: {
        vendedorId: vendedor.id,
        eliminadoEn: null,
        OR: [{ fechaInicio: { lt: fechaFin }, fechaFin: { gt: fechaInicio } }],
      },
    })
    if (conflicto) {
      return NextResponse.json({ ok: false, error: "Este horario ya está ocupado" }, { status: 409 })
    }

    // Buscar o crear cliente
    let cliente = await db.cliente.findFirst({
      where: { whatsapp, eliminadoEn: null },
    })

    const manana = new Date()
    manana.setDate(manana.getDate() + 1)
    manana.setHours(9, 0, 0, 0)

    if (!cliente) {
      cliente = await db.cliente.create({
        data: {
          nombre,
          whatsapp,
          correo: correo || null,
          etapa: "NUEVO",
          estadoCartera: "ACTIVO",
          origen: `Agenda ${vendedor.nombre}`,
          proximaAccion: "Confirmar cita",
          fechaProximaAccion: fechaInicio,
          vendedorId: vendedor.id,
        },
      })
    }

    // Crear cita
    const titulo = `Llamada con ${nombre}`
    const cita = await db.cita.create({
      data: {
        clienteId: cliente.id,
        vendedorId: vendedor.id,
        titulo,
        fechaInicio,
        fechaFin,
        notas: `Agendado desde la página pública de ${vendedor.nombre}`,
      },
    })

    // Nota en historial
    await db.nota.create({
      data: {
        clienteId: cliente.id,
        usuarioId: vendedor.id,
        contenido: `Cita agendada desde liga pública: "${titulo}" el ${fechaInicio.toLocaleDateString("es-MX", { dateStyle: "long" })} a las ${fechaInicio.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`,
        tipo: "CITA",
        fecha: new Date(),
      },
    })

    await db.registroAuditoria.create({
      data: {
        usuarioId: null,
        accion: "CITA_PUBLICA",
        entidad: "Cita",
        entidadId: cita.id,
        descripcion: `Cita agendada desde liga pública de ${vendedor.nombre}: ${nombre} (${whatsapp})`,
      },
    })

    // Google Calendar: no configurado → googlePendiente=true
    const googlePendiente = !process.env.GOOGLE_CLIENT_ID

    return NextResponse.json({
      ok: true,
      cita: { ...cita, fechaInicio: cita.fechaInicio.toISOString() },
      googlePendiente,
    })
  } catch (err) {
    console.error("Error en /api/agenda-publica/agendar:", err)
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 })
  }
}
