import Anthropic from "@anthropic-ai/sdk"
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod"
import { z } from "zod/v4"
import { verificarAcceso } from "@/app/studio/lib/acceso"
import { Diagnostico } from "@/app/studio/lib/esquema"

export const maxDuration = 120

const Foto = z.object({
  vista: z.enum(["frente", "izquierda", "derecha", "superior"]),
  base64: z.string().min(100),
})

const Entrada = z.object({
  fotos: z.array(Foto).min(1).max(4),
  medidas: z.record(z.string(), z.unknown()).nullable(),
  contexto: z.object({
    nombre: z.string().max(80),
    edad: z.string().max(10),
    ocupacion: z.string().max(80),
    arregloDiario: z.enum(["5", "10", "20"]),
    objetivo: z.string().max(300),
    conservarLargo: z.boolean(),
    abiertoAColor: z.boolean(),
  }),
})

const VISTAS: Record<string, string> = {
  frente: "FOTO FRONTAL",
  izquierda: "PERFIL IZQUIERDO",
  derecha: "PERFIL DERECHO",
  superior: "VISTA SUPERIOR / CORONILLA",
}

const SISTEMA = `Eres un visagista y barbero master con 20 años de experiencia en barberías premium de México, formado en antropometría facial y tricología. Analizas fotos de un cliente tomadas en el sillón y entregas un diagnóstico profesional que el barbero ejecuta en ese momento.

Cómo trabajas:
- Basa cada conclusión en lo que se ve en las fotos y en las medidas objetivas que te paso (malla facial de 478 puntos). Si la medición geométrica y lo que ves no coinciden, explica por qué (cabello que tapa la frente, barba que ensancha la mandíbula, ángulo de la foto) y decide.
- Las medidas de la malla no son de cinta métrica: el largo va del alto de la frente (debajo del nacimiento del cabello) al mentón óseo, y el ancho se toma casi a la altura del trago. Por eso "largoAncho" suele quedar entre 1.0 y 1.3 y el tercio superior sale chico. Úsalas para comparar proporciones (mandíbula vs. pómulos vs. frente), no como valores absolutos. "formaGeometrica" es solo una pre-clasificación automática.
- Forma del cráneo: estímala con los perfiles y la vista superior (dolicocéfalo, mesocéfalo, braquicéfalo). Revisa la nuca: la nuca plana es muy común y se compensa con volumen en coronilla y degradado bajo atrás. Si no hay datos suficientes, di "indeterminado".
- Cabello: clasifica el rizo (1A–4C), grosor, densidad y cómo se comporta al cortarlo. El cabello lacio y grueso típico de México se para entre 1 y 3 cm; considera eso al dar largos.
- Revisa línea frontal y entradas (escala Norwood). No prometas cubrir lo que no se puede cubrir.
- Recomienda EXACTAMENTE 3 cortes realistas para su tipo de cabello, ordenados por compatibilidad. Uno puede ser conservador y otro más arriesgado, pero los tres deben favorecerle. Usa nombres que un barbero mexicano entiende (low fade, mid fade, taper, crop texturizado, french crop, buzz cut, pompadour, quiff, side part, mullet moderno, etc.).
- La ficha técnica debe poder ejecutarse sin preguntar: números de máquina/guarda, largo en cm, altura del degradado, herramientas, texturizado, acabado, productos y tiempos.
- Ajusta el mantenimiento al crecimiento de ~1 cm al mes: degradados a piel duran 2–3 semanas.
- Respeta el tiempo diario que el cliente quiere dedicar a peinarse y su ocupación.
- "promptSimulacion" va en inglés y describe solo cabello (y barba si cambia), con el detalle suficiente para que un modelo de edición de imagen lo dibuje con realismo y con la textura real del cliente.
- Escribe en español de México, claro y directo, sin relleno ni frases de vendedor.
- Si las fotos no sirven (borrosas, sin rostro, cara tapada), marca calidadFotos.aptas=false y explica qué repetir, pero entrega tu mejor diagnóstico.
- No hagas juicios sobre atractivo, raza ni etnia de la persona. Hablas de forma, proporción y textura.`

export async function POST(req: Request) {
  const bloqueo = await verificarAcceso(req)
  if (bloqueo) return bloqueo

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "Falta ANTHROPIC_API_KEY en el servidor" }, { status: 503 })
  }

  const parsed = Entrada.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: "Datos inválidos" }, { status: 400 })
  }
  const { fotos, medidas, contexto } = parsed.data

  const contenido: Anthropic.Beta.BetaContentBlockParam[] = []
  for (const foto of fotos) {
    contenido.push({ type: "text", text: VISTAS[foto.vista] })
    contenido.push({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: foto.base64 },
    })
  }
  contenido.push({
    type: "text",
    text: `MEDIDAS OBJETIVAS (foto frontal):
${medidas ? JSON.stringify(medidas, null, 2) : "No disponibles (la malla facial no pudo calcularse). Estima a partir de las fotos."}

Referencias: ojosBocaLargo ideal ≈ 0.36 y interocularAncho ideal ≈ 0.46 (Pallett et al., 2010). Tercios faciales ideales ≈ 33% cada uno (el superior medido aquí sale menor porque la malla no llega al nacimiento del cabello).

CLIENTE:
- Nombre: ${contexto.nombre || "Sin nombre"}
- Edad: ${contexto.edad || "No indicada"}
- Ocupación / estilo de vida: ${contexto.ocupacion || "No indicada"}
- Tiempo diario para peinarse: ${contexto.arregloDiario} minutos
- Lo que busca: ${contexto.objetivo || "Un cambio que le favorezca"}
- ¿Quiere conservar el largo?: ${contexto.conservarLargo ? "Sí" : "No, está abierto a cambiar"}
- ¿Abierto a color/decoloración?: ${contexto.abiertoAColor ? "Sí" : "No"}

Entrega el diagnóstico completo.`,
  })

  const client = new Anthropic()

  try {
    const respuesta = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(Diagnostico) },
      system: SISTEMA,
      messages: [{ role: "user", content: contenido }],
    })

    if (respuesta.stop_reason === "refusal") {
      return Response.json({ error: "La IA no pudo analizar estas fotos. Intenta con otras tomas." }, { status: 422 })
    }
    if (!respuesta.parsed_output) {
      return Response.json({ error: "El análisis llegó incompleto. Intenta de nuevo." }, { status: 502 })
    }
    return Response.json({ diagnostico: respuesta.parsed_output })
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Demasiadas solicitudes. Espera un minuto." }, { status: 429 })
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: "La llave de Anthropic no es válida" }, { status: 500 })
    }
    if (error instanceof Anthropic.APIError) {
      console.error("[studio/analizar]", error.status, error.message)
      return Response.json({ error: "Error del servicio de IA. Intenta de nuevo." }, { status: 502 })
    }
    console.error("[studio/analizar]", error)
    return Response.json({ error: "Error inesperado" }, { status: 500 })
  }
}
