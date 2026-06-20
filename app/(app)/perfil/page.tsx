import { obtenerPerfil } from "@/app/actions/perfil"
import { PerfilCliente } from "./PerfilCliente"

export const metadata = { title: "Mi perfil" }

export default async function PerfilPage() {
  const perfil = await obtenerPerfil()

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <PerfilCliente perfil={perfil} />
    </div>
  )
}
