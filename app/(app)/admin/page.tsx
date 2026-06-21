import { auth } from "@/app/lib/auth"
import { redirect } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import AdminCliente from "./AdminCliente"
import { listarUsuarios, obtenerAuditoria, obtenerMetaNegocio } from "@/app/actions/admin"

export const metadata = { title: "Panel admin · Tu equipo y negocio" }

export default async function AdminPage() {
  const session = await auth()
  const user = session?.user as { id: string; rol?: string } | undefined
  if (user?.rol !== "ADMIN") redirect("/")

  const [usuarios, { registros: auditoria }, metaNegocio] = await Promise.all([
    listarUsuarios(),
    obtenerAuditoria({ pagina: 1 }),
    obtenerMetaNegocio(),
  ])

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-brand" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Panel admin</h1>
          <p className="text-sm text-gray-500">Tu equipo, tus datos, tu negocio</p>
        </div>
      </div>
      <AdminCliente
        usuariosIniciales={usuarios}
        auditoriaInicial={auditoria as Parameters<typeof AdminCliente>[0]["auditoriaInicial"]}
        metaNegocioInicial={metaNegocio}
      />
    </div>
  )
}
