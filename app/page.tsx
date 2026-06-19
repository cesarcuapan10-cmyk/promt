import { redirect } from "next/navigation"
import { auth } from "@/app/lib/auth"

export default async function RootPage() {
  const session = await auth()
  if (session) {
    redirect("/")
  } else {
    redirect("/login")
  }
}
