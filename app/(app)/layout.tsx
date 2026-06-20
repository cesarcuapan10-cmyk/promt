import { auth } from "@/app/lib/auth"
import { redirect } from "next/navigation"
import { AppLayout } from "@/app/components/layout/AppLayout"
import { OnboardingTour } from "@/app/components/OnboardingTour"
import { db } from "@/app/lib/db"

export default async function AppAuthLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  const usuarioId = (session.user as { id: string }).id
  const usuario = await db.usuario.findUnique({
    where: { id: usuarioId },
    select: { onboardingCompletado: true },
  })

  return (
    <AppLayout session={session}>
      <OnboardingTour onboardingCompletado={usuario?.onboardingCompletado ?? true} />
      {children}
    </AppLayout>
  )
}
