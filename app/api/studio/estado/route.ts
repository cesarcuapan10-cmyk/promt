import { GET_estado } from "@/app/studio/lib/acceso"

export async function GET() {
  return Response.json(await GET_estado())
}
