"use server"

import { auth } from "@/app/lib/auth"
import { db } from "@/app/lib/db"

type SessionUser = { id: string; rol?: string }
async function getSession(): Promise<{ user: SessionUser }> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("No autorizado")
  return session as { user: SessionUser }
}

async function getCliente(clienteId: string) {
  const cliente = await db.cliente.findFirst({
    where: { id: clienteId, eliminadoEn: null },
    include: {
      vendedor: { select: { nombre: true } },
      notasHistorial: {
        where: { eliminadoEn: null },
        orderBy: { creadoEn: "desc" },
        take: 5,
        select: { contenido: true, creadoEn: true },
      },
    },
  })
  if (!cliente) throw new Error("Cliente no encontrado")
  return cliente
}

async function llamarClaude(prompt: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      }),
    })

    if (!res.ok) return null
    const data = await res.json()
    return data?.content?.[0]?.text ?? null
  } catch {
    return null
  }
}

export async function redactarMensajeIA(
  clienteId: string,
  tipo: "whatsapp" | "correo"
): Promise<{ ok: boolean; mensaje: string; fuenteIA: boolean }> {
  await getSession()
  const cliente = await getCliente(clienteId)

  const etapaLabels: Record<string, string> = {
    NUEVO: "Nuevo lead",
    CONTACTADO: "Ya fue contactado",
    CITA_AGENDADA: "Tiene cita agendada",
    PROPUESTA_ENVIADA: "Tiene propuesta enviada",
    NEGOCIACION: "En negociación",
    GANADO: "Ya cerró",
    PERDIDO: "Se perdió",
    ARCHIVADO: "Archivado",
  }

  const contexto = `
Cliente: ${cliente.nombre}
Empresa: ${cliente.empresaNombre ?? "No especificada"}
Etapa: ${etapaLabels[cliente.etapa] ?? cliente.etapa}
Temperatura: ${cliente.temperatura}
Objeción principal: ${cliente.objecionPrincipal ?? "Ninguna"}
Próxima acción: ${cliente.proximaAccion ?? "Sin definir"}
Notas recientes: ${cliente.notasHistorial.map((n) => n.contenido).join(" | ") || "Ninguna"}
Vendedor: ${cliente.vendedor.nombre}
`

  const prompt =
    tipo === "whatsapp"
      ? `Eres un asesor de ventas experto en consultoría y coaching. Redacta un mensaje de WhatsApp breve (máx 120 palabras), personalizado, cálido y con orientación al cierre para este prospecto. NO uses emojis en exceso. Termina con una pregunta o llamada a la acción clara. Contexto:\n${contexto}`
      : `Eres un asesor de ventas experto en consultoría y coaching. Redacta un correo profesional de seguimiento (máx 180 palabras) con asunto incluido, personalizado y orientado al cierre. Usa líneas de asunto atractivas. Contexto:\n${contexto}`

  const respuestaIA = await llamarClaude(prompt)

  if (respuestaIA) {
    return { ok: true, mensaje: respuestaIA, fuenteIA: true }
  }

  // Fallback por etapa
  const fallbacks: Record<string, string> = {
    NUEVO: `Hola ${cliente.nombre}, soy ${cliente.vendedor.nombre}. Vi que te interesa mejorar tus ventas. ¿Tienes 15 minutos esta semana para una llamada rápida donde te cuento cómo lo logramos con otros como tú?`,
    CONTACTADO: `Hola ${cliente.nombre}, sigo pensando en tu caso. Creo que tenemos exactamente lo que necesitas. ¿Cuándo podemos agendar esa llamada?`,
    CITA_AGENDADA: `Hola ${cliente.nombre}, te confirmo nuestra cita. Prepárate para llevarte ideas concretas que puedas aplicar de inmediato.`,
    PROPUESTA_ENVIADA: `Hola ${cliente.nombre}, ¿tuviste oportunidad de revisar la propuesta? Con gusto aclaro cualquier duda.`,
    NEGOCIACION: `Hola ${cliente.nombre}, quiero asegurarme de que obtienes el mayor valor. ¿Hay algo que necesites para tomar la decisión hoy?`,
  }

  const mensaje =
    fallbacks[cliente.etapa] ??
    `Hola ${cliente.nombre}, espero que estés bien. Me gustaría retomar nuestra conversación. ¿Tienes disponibilidad esta semana?`

  return { ok: true, mensaje, fuenteIA: false }
}

export async function clasificarTemperaturaIA(
  clienteId: string
): Promise<{ ok: boolean; temperatura: string; razon: string; fuenteIA: boolean }> {
  await getSession()
  const cliente = await getCliente(clienteId)

  const prompt = `Analiza este prospecto y clasifica su temperatura de compra como CALIENTE, TIBIO o FRIO. Responde SOLO en formato JSON: {"temperatura":"CALIENTE|TIBIO|FRIO","razon":"frase corta de por qué"}

Datos del prospecto:
- Etapa: ${cliente.etapa}
- Temperatura actual: ${cliente.temperatura}
- Objeción: ${cliente.objecionPrincipal ?? "ninguna"}
- Próxima acción: ${cliente.proximaAccion ?? "no definida"}
- Notas: ${cliente.notasHistorial.map((n) => n.contenido).join(". ") || "sin notas"}`

  const respuestaIA = await llamarClaude(prompt)

  if (respuestaIA) {
    try {
      const parsed = JSON.parse(respuestaIA.trim())
      if (parsed.temperatura && parsed.razon) {
        return { ok: true, temperatura: parsed.temperatura, razon: parsed.razon, fuenteIA: true }
      }
    } catch {
      // fallback
    }
  }

  return {
    ok: true,
    temperatura: cliente.temperatura,
    razon: "Mantenida según datos actuales",
    fuenteIA: false,
  }
}

export async function sugerirProximaAccionIA(
  clienteId: string
): Promise<{ ok: boolean; accion: string; fechaSugerida: string; fuenteIA: boolean }> {
  await getSession()
  const cliente = await getCliente(clienteId)

  const hoy = new Date()
  const manana = new Date(hoy.getTime() + 86400000).toISOString().split("T")[0]
  const enTresDias = new Date(hoy.getTime() + 3 * 86400000).toISOString().split("T")[0]

  const prompt = `Sugiere la próxima acción concreta (máx 15 palabras) y una fecha sugerida para este prospecto. Responde SOLO en JSON: {"accion":"texto","fechaSugerida":"YYYY-MM-DD"}

Datos: Etapa: ${cliente.etapa}, Temperatura: ${cliente.temperatura}, Objeción: ${cliente.objecionPrincipal ?? "ninguna"}, Última acción: ${cliente.proximaAccion ?? "ninguna"}`

  const respuestaIA = await llamarClaude(prompt)

  if (respuestaIA) {
    try {
      const parsed = JSON.parse(respuestaIA.trim())
      if (parsed.accion && parsed.fechaSugerida) {
        return { ok: true, accion: parsed.accion, fechaSugerida: parsed.fechaSugerida, fuenteIA: true }
      }
    } catch {
      // fallback
    }
  }

  const fallbacks: Record<string, { accion: string; fecha: string }> = {
    NUEVO: { accion: "Enviar mensaje de bienvenida y agendar llamada", fecha: manana },
    CONTACTADO: { accion: "Hacer seguimiento y proponer cita", fecha: manana },
    CITA_AGENDADA: { accion: "Confirmar asistencia a la cita", fecha: manana },
    PROPUESTA_ENVIADA: { accion: "Llamar para resolver dudas sobre la propuesta", fecha: enTresDias },
    NEGOCIACION: { accion: "Enviar propuesta final y pedir el sí", fecha: manana },
  }

  const fb = fallbacks[cliente.etapa] ?? { accion: "Hacer seguimiento personalizado", fecha: enTresDias }
  return { ok: true, accion: fb.accion, fechaSugerida: fb.fecha, fuenteIA: false }
}

export async function resumirExpedienteIA(
  clienteId: string
): Promise<{ ok: boolean; resumen: string; fuenteIA: boolean }> {
  await getSession()
  const cliente = await getCliente(clienteId)

  const prompt = `Resume en 3-5 líneas el historial y situación actual de este prospecto para un vendedor. Sé directo y útil.

Datos: Nombre: ${cliente.nombre}, Empresa: ${cliente.empresaNombre ?? "no especificada"}, Etapa: ${cliente.etapa}, Temperatura: ${cliente.temperatura}, Objeción: ${cliente.objecionPrincipal ?? "ninguna"}, Valor estimado: ${cliente.valorEstimado ? "$" + cliente.valorEstimado : "no definido"}, Reto: ${cliente.retoPrincipal ?? "no especificado"}, Notas: ${cliente.notasHistorial.map((n) => n.contenido).join(". ") || "sin notas"}`

  const respuestaIA = await llamarClaude(prompt)
  if (respuestaIA) {
    return { ok: true, resumen: respuestaIA, fuenteIA: true }
  }

  const resumen = [
    `${cliente.nombre} está en etapa ${cliente.etapa} con temperatura ${cliente.temperatura}.`,
    cliente.empresaNombre ? `Trabaja en ${cliente.empresaNombre}.` : "",
    cliente.objecionPrincipal ? `Su objeción principal es: ${cliente.objecionPrincipal}.` : "",
    cliente.valorEstimado ? `Valor estimado del negocio: $${cliente.valorEstimado}.` : "",
    cliente.proximaAccion ? `Próxima acción: ${cliente.proximaAccion}.` : "",
  ]
    .filter(Boolean)
    .join(" ")

  return { ok: true, resumen, fuenteIA: false }
}

export async function manejarObjecionIA(
  clienteId: string,
  objecion?: string
): Promise<{ ok: boolean; respuesta: string; fuenteIA: boolean }> {
  await getSession()
  const cliente = await getCliente(clienteId)
  const objecionFinal = objecion ?? cliente.objecionPrincipal ?? "precio"

  const prompt = `Eres un experto en ventas de consultoría. Da una respuesta concreta (máx 100 palabras) para manejar la objeción "${objecionFinal}" de un prospecto que ya conoce el producto y está en etapa ${cliente.etapa}. Sé empático, no agresivo, y cierra con una pregunta.`

  const respuestaIA = await llamarClaude(prompt)
  if (respuestaIA) {
    return { ok: true, respuesta: respuestaIA, fuenteIA: true }
  }

  const fallbacks: Record<string, string> = {
    precio: `Entiendo que el precio es importante. Lo que nuestros clientes descubren es que el costo de NO resolver esto es mucho mayor. ¿Podemos revisar juntos qué retorno verías en los primeros 90 días?`,
    pensar: `Claro, es una decisión importante. ¿Qué información adicional te ayudaría a decidir? Así no pierdes tiempo y yo te doy exactamente lo que necesitas.`,
    consultar: `Perfecto. ¿Qué necesitas para presentárselo? Puedo preparar un resumen ejecutivo de 1 página para que sea fácil de explicar.`,
    competencia: `Respeto tu proceso de comparación. ¿Qué criterio es el más importante para ti? Así te digo honestamente si somos la mejor opción para ese punto.`,
  }

  const clave = Object.keys(fallbacks).find((k) => objecionFinal.toLowerCase().includes(k))
  const respuesta = clave
    ? fallbacks[clave]
    : `Gracias por ser honesto. Cuéntame más sobre tu duda principal. Quiero asegurarme de que, si decides avanzar, sea porque tiene sentido para ti.`

  return { ok: true, respuesta, fuenteIA: false }
}
