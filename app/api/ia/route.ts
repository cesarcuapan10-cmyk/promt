import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/app/lib/auth"
import { db } from "@/app/lib/db"

const schema = z.object({
  accion: z.enum(["mensaje", "temperatura", "proxima-accion", "resumen", "objecion"]),
  clienteId: z.string().min(1),
})

type Accion = z.infer<typeof schema>["accion"]

interface ClienteCtx {
  nombre: string
  etapa: string
  objecion: string
  ultimaNota: string
  ultimaFecha: string
  notas: string
  pagos: string
}

function buildPrompt(accion: Accion, c: ClienteCtx): string {
  switch (accion) {
    case "mensaje":
      return `Redacta un mensaje de WhatsApp para cerrar la venta con ${c.nombre} que está en etapa ${c.etapa}. Su objeción es: ${c.objecion}. Última nota: ${c.ultimaNota}. Sé directo, cálido y orientado a cerrar. Máximo 150 palabras.`
    case "temperatura":
      return `Analiza este expediente y clasifica la temperatura de compra como CALIENTE, TIBIO o FRÍO. Da una frase de porqué. Cliente: ${c.nombre}. Etapa: ${c.etapa}. Última interacción: ${c.ultimaFecha}. Objeción: ${c.objecion}.`
    case "proxima-accion":
      return `Sugiere la siguiente acción concreta con fecha para cerrar la venta con ${c.nombre} (etapa: ${c.etapa}, objeción: ${c.objecion}). Formato: ACCIÓN: [texto] | FECHA: [N días desde hoy]`
    case "resumen":
      return `Resume en 3-5 líneas todo lo que sabes de este cliente y dónde quedó la última conversación. Cliente: ${c.nombre}. Notas: ${c.notas}. Pagos: ${c.pagos}.`
    case "objecion":
      return `El cliente ${c.nombre} dice '${c.objecion}'. Dame una respuesta específica para manejar esa objeción y el siguiente paso para cerrar.`
  }
}

function plantillaLocal(accion: Accion, c: ClienteCtx): string {
  switch (accion) {
    case "mensaje":
      return `Hola ${c.nombre}, soy César de Entidad Vendedora.\n\nQuería retomar nuestra conversación y ver cómo puedo apoyarte. ¿Qué necesitarías para dar el siguiente paso?`
    case "temperatura":
      return `Basándome en el expediente, ${c.nombre} parece TIBIO. Está en etapa ${c.etapa} y su última objeción fue: "${c.objecion}". Recomiendo un seguimiento cálido en los próximos 2 días.`
    case "proxima-accion":
      return `ACCIÓN: Llamar a ${c.nombre} para resolver su objeción "${c.objecion}" y presentar propuesta concreta | FECHA: 2 días desde hoy`
    case "resumen":
      return `Cliente: ${c.nombre}. Etapa actual: ${c.etapa}. Objeción principal: "${c.objecion}". Última actividad: ${c.ultimaFecha}. Notas recientes: ${c.ultimaNota}.`
    case "objecion":
      return `Ante la objeción "${c.objecion}", te sugiero responder: "Entiendo tu preocupación. Lo que nuestros clientes han encontrado es que la inversión se recupera en los primeros 3 meses. ¿Te gustaría que te mostrara cómo lo han logrado?"\n\nSiguiente paso: agendar una llamada en los próximos 2 días.`
  }
}

async function llamarIA(prompt: string): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk")
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const msg = await client.messages.create(
      {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
        system: "Eres un asistente de ventas experto en coaching comercial. Responde siempre en español, de forma concisa y práctica.",
      },
      { signal: controller.signal }
    )
    clearTimeout(timeout)
    const bloque = msg.content[0]
    if (bloque.type === "text") return bloque.text
    return ""
  } catch {
    clearTimeout(timeout)
    throw new Error("IA timeout o error")
  }
}

export async function POST(req: NextRequest) {
  try {
    const sesion = await auth()
    if (!sesion?.user?.id) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 })
    }

    const { accion, clienteId } = parsed.data

    // Obtener expediente completo del cliente
    const cliente = await db.cliente.findUnique({
      where: { id: clienteId },
      include: {
        notasHistorial: {
          where: { eliminadoEn: null },
          orderBy: { fecha: "desc" },
          take: 5,
        },
        pagos: {
          where: { eliminadoEn: null },
          orderBy: { creadoEn: "desc" },
          take: 3,
        },
      },
    })

    if (!cliente) {
      return NextResponse.json({ ok: false, error: "Cliente no encontrado" }, { status: 404 })
    }

    const ultimaNota = cliente.notasHistorial[0]?.contenido ?? "Sin notas"
    const ultimaFecha = cliente.ultimoContacto
      ? new Date(cliente.ultimoContacto).toLocaleDateString("es-MX")
      : "Sin contacto reciente"
    const notasTexto = cliente.notasHistorial
      .map((n) => `- ${n.contenido}`)
      .join("\n") || "Sin notas"
    const pagosTexto = cliente.pagos
      .map((p) => `${p.concepto ?? "Pago"}: $${p.monto} (${p.estatus})`)
      .join(", ") || "Sin pagos"

    const ctx: ClienteCtx = {
      nombre: cliente.nombre,
      etapa: cliente.etapa,
      objecion: cliente.objecionPrincipal ?? "Ninguna conocida",
      ultimaNota,
      ultimaFecha,
      notas: notasTexto,
      pagos: pagosTexto,
    }

    let resultado: string
    let usoIA = false

    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const prompt = buildPrompt(accion, ctx)
        resultado = await llamarIA(prompt)
        usoIA = true
      } catch {
        resultado = plantillaLocal(accion, ctx)
        usoIA = false
      }
    } else {
      resultado = plantillaLocal(accion, ctx)
      usoIA = false
    }

    return NextResponse.json({ ok: true, resultado, usóIA: usoIA })
  } catch (err) {
    console.error("Error en /api/ia:", err)
    // Nunca retornar error técnico — responder con plantilla genérica
    return NextResponse.json({
      ok: true,
      resultado: "En este momento no puedo procesar la solicitud. Por favor intenta de nuevo en unos momentos.",
      usóIA: false,
    })
  }
}
