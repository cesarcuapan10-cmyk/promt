"use client"
import { useState, useTransition } from "react"
import { User, Moon, Sun, Monitor, Save } from "lucide-react"
import { Button } from "@/app/components/ui/Button"
import { Card } from "@/app/components/ui/Card"
import { Input } from "@/app/components/ui/Input"
import { useTema as useTheme } from "@/app/components/providers/ThemeProvider"
import { toast } from "sonner"
import { useSession } from "next-auth/react"

export default function PerfilPage() {
  const { data: session } = useSession()
  const user = session?.user as { id: string; nombre?: string; email?: string; rol?: string } | undefined
  const { tema, setTema } = useTheme()
  const [nombre, setNombre] = useState(user?.nombre || "")
  const [, startTransition] = useTransition()
  const [pwd, setPwd] = useState({ actual: "", nueva: "", confirmar: "" })

  function guardarPerfil() {
    toast.success("Perfil actualizado")
  }

  function cambiarPassword() {
    if (pwd.nueva !== pwd.confirmar) { toast.error("Las contraseñas no coinciden"); return }
    if (pwd.nueva.length < 8) { toast.error("Mínimo 8 caracteres"); return }
    startTransition(async () => {
      const r = await fetch("/api/perfil/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual: pwd.actual, nueva: pwd.nueva }),
      })
      if (r.ok) { toast.success("Contraseña actualizada"); setPwd({ actual: "", nueva: "", confirmar: "" }) }
      else { const d = await r.json(); toast.error(d.error || "Error al cambiar contraseña") }
    })
  }

  const TEMAS = [
    { id: "CLARO", Icon: Sun, label: "Claro" },
    { id: "OSCURO", Icon: Moon, label: "Oscuro" },
    { id: "AUTOMATICO", Icon: Monitor, label: "Automático" },
  ] as const

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
          <User className="w-5 h-5 text-brand" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mi perfil</h1>
          <p className="text-sm text-gray-500">Tu información y preferencias</p>
        </div>
      </div>

      {/* Avatar */}
      <Card className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-brand flex items-center justify-center text-white text-2xl font-bold">
          {(user?.nombre || user?.email || "U")[0].toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{user?.nombre || user?.email}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <span className="text-xs bg-brand/10 text-brand px-2 py-0.5 rounded-full mt-1 inline-block">{user?.rol}</span>
        </div>
      </Card>

      {/* Tema */}
      <Card className="space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-white">Apariencia</h2>
        <div className="flex gap-2">
          {TEMAS.map(t => (
            <button key={t.id} onClick={() => setTema(t.id)}
              className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-xl border-2 transition-colors ${tema === t.id ? "border-brand bg-brand/5" : "border-gray-200 dark:border-gray-700 hover:border-brand/40"}`}>
              <t.Icon className={`w-5 h-5 ${tema === t.id ? "text-brand" : "text-gray-400"}`} />
              <span className={`text-xs font-medium ${tema === t.id ? "text-brand" : "text-gray-500"}`}>{t.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Cambiar contraseña */}
      <Card className="space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">Cambiar contraseña</h2>
        <Input label="Contraseña actual" type="password" value={pwd.actual} onChange={e => setPwd(p => ({ ...p, actual: e.target.value }))} />
        <Input label="Nueva contraseña" type="password" value={pwd.nueva} onChange={e => setPwd(p => ({ ...p, nueva: e.target.value }))} ayuda="Mínimo 8 caracteres" />
        <Input label="Confirmar contraseña" type="password" value={pwd.confirmar} onChange={e => setPwd(p => ({ ...p, confirmar: e.target.value }))} />
        <Button icono={<Save className="w-4 h-4" />} onClick={cambiarPassword} disabled={!pwd.actual || !pwd.nueva}>
          Actualizar contraseña
        </Button>
      </Card>
    </div>
  )
}
