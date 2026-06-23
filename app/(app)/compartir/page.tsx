import { auth } from "@/app/lib/auth"
import { db } from "@/app/lib/db"
import { Share2 } from "lucide-react"
import CompartirCliente from "./CompartirCliente"

export const metadata = { title: "Comparte y crece · cesar cuapan" }

export default async function CompartirPage() {
  const session = await auth()
  const user = session?.user as { id: string; rol?: string } | undefined
  const esAdmin = user?.rol === "ADMIN"

  const vendedores = esAdmin
    ? await db.usuario.findMany({ where: { activo: true }, select: { id: true, nombre: true, ligaAgenda: true, correo: true } })
    : await db.usuario.findMany({ where: { id: user?.id }, select: { id: true, nombre: true, ligaAgenda: true, correo: true } })

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
          <Share2 className="w-5 h-5 text-brand" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Comparte y crece</h1>
          <p className="text-sm text-gray-500">Difunde tu landing y mide qué canal vende</p>
        </div>
      </div>
      <CompartirCliente vendedores={vendedores} />
    </div>
  )
}
