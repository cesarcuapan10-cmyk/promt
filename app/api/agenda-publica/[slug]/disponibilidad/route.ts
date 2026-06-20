import { NextRequest, NextResponse } from "next/server"
import { db } from "@/app/lib/db"

function pad(n: number): string {
  return n.toString().padStart(2, "0")
}

function generarSlots(): string[] {
  // 09:00 a 18:00, cada 45 min, el slot + 45min debe quedar <= 18:00
  const slots: string[] = []
  let horas = 9
  let minutos = 0
  while (true) {
    const finH = horas + Math.floor((minutos + 45) / 60)
    const finM = (minutos + 45) % 60
    if (finH > 18 || (finH === 18 && finM > 0)) break
    slots.push(`${pad(horas)}:${pad(minutos)}`)
    minutos += 45
    horas += Math.floor(minutos / 60)
    minutos = minutos % 60
  }
  return slots
}

interface RouteContext {
  params: Promise<{ slug: string }>
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = await params
    const fechaStr = req.nextUrl.searchParams.get("fecha")
    if (!fechaStr) {
      return NextResponse.json({ error: "Falta la fecha" }, { status: 400 })
    }

    const vendedor = await db.usuario.findFirst({
      where: { ligaAgenda: slug, activo: true },
      select: { id: true },
    })
    if (!vendedor) {
      return NextResponse.json({ error: "Vendedor no encontrado" }, { status: 404 })
    }

    // Inicio y fin del día solicitado
    const [año, mes, dia] = fechaStr.split("-").map(Number)
    const inicioDia = new Date(año, mes - 1, dia, 0, 0, 0)
    const finDia = new Date(año, mes - 1, dia, 23, 59, 59)

    const citasDelDia = await db.cita.findMany({
      where: {
        vendedorId: vendedor.id,
        eliminadoEn: null,
        fechaInicio: { gte: inicioDia, lte: finDia },
      },
      select: { fechaInicio: true },
    })

    const todos = generarSlots()
    const ocupados = citasDelDia.map((c) => {
      const d = new Date(c.fechaInicio)
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`
    })

    return NextResponse.json({ slots: todos, ocupados })
  } catch (err) {
    console.error("Error en disponibilidad:", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
