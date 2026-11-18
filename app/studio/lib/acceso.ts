import "server-only"
import { auth } from "@/app/lib/auth"

/**
 * Las APIs del estudio gastan créditos de IA, así que no quedan abiertas:
 * - Usuarios con sesión en el CRM entran directo.
 * - Las barberías entran con el PIN definido en STUDIO_PIN (header x-studio-pin).
 */
export async function verificarAcceso(req: Request): Promise<Response | null> {
  const pin = process.env.STUDIO_PIN?.trim()
  const enviado = req.headers.get("x-studio-pin")?.trim()
  if (pin && enviado && enviado === pin) return null

  const sesion = await auth().catch(() => null)
  if (sesion?.user) return null

  return Response.json(
    { error: pin ? "PIN incorrecto" : "Inicia sesión o configura STUDIO_PIN para dar acceso a la barbería" },
    { status: 401 },
  )
}

export async function GET_estado() {
  return {
    analisis: Boolean(process.env.ANTHROPIC_API_KEY),
    simulacion: Boolean(process.env.GEMINI_API_KEY),
    requierePin: Boolean(process.env.STUDIO_PIN),
  }
}
