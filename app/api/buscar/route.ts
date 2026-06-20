import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { db } from "@/app/lib/db"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const userId = session.user.id
  const userRol = (session.user as { rol?: string }).rol ?? "VENDEDOR"
  const esVendedor = userRol !== "ADMIN"

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim() ?? ""

  if (!q || q.length < 2) {
    return NextResponse.json({ clientes: [], notas: [], citas: [], pagos: [] })
  }

  const [clientes, notas, citas, pagos] = await Promise.all([
    db.cliente.findMany({
      where: {
        eliminadoEn: null,
        ...(esVendedor ? { vendedorId: userId } : {}),
        OR: [
          { nombre: { contains: q } },
          { correo: { contains: q } },
          { telefono: { contains: q } },
          { whatsapp: { contains: q } },
          { empresaNombre: { contains: q } },
        ],
      },
      select: { id: true, nombre: true, etapa: true, temperatura: true },
      take: 5,
    }),

    db.nota.findMany({
      where: {
        eliminadoEn: null,
        contenido: { contains: q },
        ...(esVendedor ? { usuarioId: userId } : {}),
      },
      select: {
        id: true,
        contenido: true,
        clienteId: true,
        cliente: { select: { nombre: true } },
      },
      take: 5,
    }),

    db.cita.findMany({
      where: {
        eliminadoEn: null,
        titulo: { contains: q },
        ...(esVendedor ? { vendedorId: userId } : {}),
      },
      select: {
        id: true,
        titulo: true,
        fechaInicio: true,
        clienteId: true,
        cliente: { select: { nombre: true } },
      },
      take: 5,
    }),

    db.pago.findMany({
      where: {
        eliminadoEn: null,
        concepto: { contains: q },
        ...(esVendedor ? { vendedorId: userId } : {}),
      },
      select: {
        id: true,
        monto: true,
        estatus: true,
        concepto: true,
        clienteId: true,
        cliente: { select: { nombre: true } },
      },
      take: 5,
    }),
  ])

  return NextResponse.json({ clientes, notas, citas, pagos })
}
