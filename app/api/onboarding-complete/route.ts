import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { db } from "@/app/lib/db"

export async function POST() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const id = (session.user as { id: string }).id
  await db.usuario.update({ where: { id }, data: { onboardingCompletado: true } })

  return NextResponse.json({ ok: true })
}
