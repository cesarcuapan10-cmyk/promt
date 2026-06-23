import { db } from "@/app/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({
  nombre: z.string().min(1).max(100),
  whatsapp: z.string().min(8).max(20),
  correo: z.string().email().optional().or(z.literal("")),
  vendedorId: z.string(),
  fechaInicio: z.string(),
  fechaFin: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = schema.parse(body)

    const vendedor = await db.usuario.findUnique({ where: { id: data.vendedorId, activo: true } })
    if (!vendedor) return NextResponse.json({ error: "Vendedor no encontrado." }, { status: 404 })

    const inicio = new Date(data.fechaInicio)
    const fin = new Date(data.fechaFin)

    // Verificar que no haya choque
    const choque = await db.cita.findFirst({
      where: {
        vendedorId: data.vendedorId,
        eliminadoEn: null,
        OR: [
          { fechaInicio: { lt: fin }, fechaFin: { gt: inicio } },
        ],
      },
    })
    if (choque) return NextResponse.json({ error: "Ese horario ya no está disponible. Elige otro." }, { status: 409 })

    // Crear o encontrar cliente
    const limpio = data.whatsapp.replace(/\D/g, "")
    let cliente = await db.cliente.findFirst({ where: { whatsapp: { contains: limpio.slice(-8) }, eliminadoEn: null } })

    if (!cliente) {
      cliente = await db.cliente.create({
        data: {
          nombre: data.nombre,
          whatsapp: limpio,
          correo: data.correo || null,
          origen: `Agenda ${vendedor.nombre}`,
          etapa: "NUEVO",
          estadoCartera: "ACTIVO",
          temperatura: "CALIENTE",
          proximaAccion: "Confirmar cita",
          fechaProximaAccion: inicio,
          vendedorId: data.vendedorId,
        },
      })
    }

    const cita = await db.cita.create({
      data: {
        clienteId: cliente.id,
        vendedorId: data.vendedorId,
        titulo: `Cita con ${data.nombre}`,
        fechaInicio: inicio,
        fechaFin: fin,
        confirmada: true,
      },
    })

    await db.nota.create({
      data: {
        clienteId: cliente.id,
        usuarioId: data.vendedorId,
        contenido: `Cita agendada por la página pública de ${vendedor.nombre} para el ${inicio.toLocaleDateString("es-MX")}.`,
        tipo: "CITA",
      },
    })

    return NextResponse.json({ ok: true, citaId: cita.id })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 })
    console.error("Error agenda pública:", err)
    return NextResponse.json({ error: "Error al procesar tu solicitud." }, { status: 500 })
  }
}
