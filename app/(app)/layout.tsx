import { auth } from "@/app/lib/auth"
import { redirect } from "next/navigation"
import { AppLayout } from "@/app/components/layout/AppLayout"

export default async function AppAuthLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  return <AppLayout session={session}>{children}</AppLayout>
}
