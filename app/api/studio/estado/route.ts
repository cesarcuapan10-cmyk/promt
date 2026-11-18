import { barberiaActual, barberiaPublica, usoDelMes } from "@/app/studio/lib/servidor"

export async function GET() {
  const b = await barberiaActual()
  return Response.json({
    analisis: Boolean(process.env.ANTHROPIC_API_KEY),
    simulacion: Boolean(process.env.GEMINI_API_KEY),
    barberia: b ? barberiaPublica(b) : null,
    uso: b ? await usoDelMes(b.id) : 0,
  })
}
