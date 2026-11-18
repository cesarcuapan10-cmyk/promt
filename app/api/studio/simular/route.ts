import { z } from "zod/v4"
import { verificarAcceso } from "@/app/studio/lib/acceso"

export const maxDuration = 90

/**
 * Simulación del corte con un modelo de edición de imagen (Gemini "Nano Banana").
 * Claude no genera imágenes, por eso esta parte usa GEMINI_API_KEY.
 * El modelo se puede cambiar con GEMINI_IMAGE_MODEL sin tocar código.
 */
const MODELOS_RESPALDO = ["gemini-3.1-flash-image", "gemini-2.5-flash-image"]

const Entrada = z.object({
  base64: z.string().min(100),
  instruccion: z.string().min(5).max(1500),
})

type Parte = {
  text?: string
  inlineData?: { mimeType?: string; data?: string }
  inline_data?: { mime_type?: string; data?: string }
}

function construirPrompt(instruccion: string) {
  return `Edit this real photo of a barbershop client to preview a new haircut.

NEW HAIRSTYLE: ${instruccion}

Strict rules:
- Change ONLY the hair on the head (and facial hair only if the instruction says so).
- Keep the exact same person: same face shape, eyes, nose, mouth, skin tone, skin texture, expression, ears, age and identity. Do not beautify, slim or retouch the face.
- Keep the same camera angle, framing, lighting, background and clothing.
- The hair must look photorealistic and physically plausible for this person's natural hair texture and density, as if a professional barber had just cut and styled it.
- Clean, sharp fade transitions and hairline where the style calls for them.
- No text, no watermark, no borders.`
}

export async function POST(req: Request) {
  const bloqueo = await verificarAcceso(req)
  if (bloqueo) return bloqueo

  const llave = process.env.GEMINI_API_KEY
  if (!llave) {
    return Response.json(
      { error: "La simulación necesita GEMINI_API_KEY en el servidor", codigo: "SIN_LLAVE" },
      { status: 503 },
    )
  }

  const parsed = Entrada.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Datos inválidos" }, { status: 400 })

  const modelos = process.env.GEMINI_IMAGE_MODEL
    ? [process.env.GEMINI_IMAGE_MODEL, ...MODELOS_RESPALDO]
    : MODELOS_RESPALDO

  const cuerpo = {
    contents: [
      {
        role: "user",
        parts: [
          { text: construirPrompt(parsed.data.instruccion) },
          { inlineData: { mimeType: "image/jpeg", data: parsed.data.base64 } },
        ],
      },
    ],
    generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
  }

  let ultimoError = "Sin respuesta"
  for (const modelo of [...new Set(modelos)]) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": llave },
          body: JSON.stringify(cuerpo),
        },
      )
      if (r.status === 404) {
        ultimoError = `Modelo ${modelo} no disponible`
        continue
      }
      const datos = await r.json()
      if (!r.ok) {
        ultimoError = datos?.error?.message ?? `HTTP ${r.status}`
        if (r.status === 429) return Response.json({ error: "Límite de simulaciones alcanzado. Espera un minuto." }, { status: 429 })
        continue
      }
      const partes: Parte[] = datos?.candidates?.[0]?.content?.parts ?? []
      for (const p of partes) {
        const data = p.inlineData?.data ?? p.inline_data?.data
        const mime = p.inlineData?.mimeType ?? p.inline_data?.mime_type ?? "image/png"
        if (data) return Response.json({ imagen: `data:${mime};base64,${data}`, modelo })
      }
      ultimoError = "El modelo no devolvió imagen (posible filtro de seguridad)"
    } catch (e) {
      ultimoError = e instanceof Error ? e.message : "Error de red"
    }
  }

  console.error("[studio/simular]", ultimoError)
  return Response.json({ error: "No se pudo generar la simulación. Intenta de nuevo." }, { status: 502 })
}
