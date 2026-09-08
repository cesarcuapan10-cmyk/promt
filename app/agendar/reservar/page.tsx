import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { obtenerConfigAgenda } from "@/app/actions/agendar"
import { ReservaStepper } from "./ReservaStepper"

export const dynamic = "force-dynamic"
export const metadata = { title: "Agenda tu cita" }

export default async function ReservarPage() {
  const config = await obtenerConfigAgenda()

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 pb-24 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <Link
        href="/agendar"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Inicio
      </Link>
      <ReservaStepper config={config} />
    </main>
  )
}
