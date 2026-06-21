import { auth } from "@/app/lib/auth"
import { db } from "@/app/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json([], { status: 401 })

  const user = session.user as { id: string; rol?: string }
  const esAdmin = user.rol === "ADMIN"
  const q = req.nextUrl.searchParams.get("q")?.trim() || ""
  if (q.length < 2) return NextResponse.json([])

  const clienteWhere = {
    eliminadoEn: null,
    ...(esAdmin ? {} : { vendedorId: user.id }),
  }

  const [clientes, notas, pagos] = await Promise.all([
    db.cliente.findMany({
      where: {
        ...clienteWhere,
        OR: [
          { nombre: { contains: q } },
          { telefono: { contains: q } },
          { whatsapp: { contains: q } },
          { correo: { contains: q } },
          { empresaNombre: { contains: q } },
        ],
      },
      select: { id: true, nombre: true, etapa: true, telefono: true, correo: true },
      take: 10,
    }),
    db.nota.findMany({
      where: {
        eliminadoEn: null,
        contenido: { contains: q },
        cliente: { eliminadoEn: null, ...(esAdmin ? {} : { vendedorId: user.id }) },
      },
      select: { id: true, contenido: true, clienteId: true, cliente: { select: { nombre: true } } },
      take: 5,
    }),
    db.pago.findMany({
      where: {
        eliminadoEn: null,
        concepto: { contains: q },
        ...(esAdmin ? {} : { vendedorId: user.id }),
      },
      select: { id: true, monto: true, concepto: true, clienteId: true, cliente: { select: { nombre: true } } },
      take: 5,
    }),
  ])

  type Resultado = { tipo: string; id: string; titulo: string; subtitulo?: string; href: string; extra?: string }
  const resultados: Resultado[] = [
    ...clientes.map(c => ({
      tipo: "cliente",
      id: c.id,
      titulo: c.nombre,
      subtitulo: [c.telefono, c.correo].filter(Boolean).join(" · ") || c.etapa,
      href: `/clientes/${c.id}`,
    })),
    ...notas.map(n => ({
      tipo: "nota",
      id: n.id,
      titulo: n.cliente?.nombre || "Cliente",
      subtitulo: n.contenido.slice(0, 80),
      href: `/clientes/${n.clienteId}`,
    })),
    ...pagos.map(p => ({
      tipo: "pago",
      id: p.id,
      titulo: p.cliente?.nombre || "Cliente",
      subtitulo: p.concepto || "Pago",
      href: `/clientes/${p.clienteId}`,
      extra: `$${p.monto.toLocaleString("es-MX")}`,
    })),
  ]

  return NextResponse.json(resultados)
}
