import { redirect } from "next/navigation"
import { auth } from "@/app/lib/auth"
import { listarUsuarios, obtenerConfigNegocio, listarAuditoria, listarPapelera } from "@/app/actions/admin"
import { AdminCliente } from "./AdminCliente"

export const metadata = { title: "Panel admin" }

export default async function AdminPage() {
  const session = await auth()
  const usuario = session?.user as { id: string; rol: string } | undefined
  if (!usuario || usuario.rol !== "ADMIN") redirect("/")

  const [usuarios, config, auditoria, papelera] = await Promise.all([
    listarUsuarios(),
    obtenerConfigNegocio(),
    listarAuditoria({ pagina: 1 }),
    listarPapelera(),
  ])

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <AdminCliente
        usuarios={usuarios}
        config={config}
        auditoria={auditoria}
        papelera={papelera}
      />
    </div>
  )
}
