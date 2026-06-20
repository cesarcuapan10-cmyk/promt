"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Sun, Moon, Monitor, CheckCircle } from "lucide-react"
import { Card } from "@/app/components/ui/Card"
import { Button } from "@/app/components/ui/Button"
import { Badge } from "@/app/components/ui/Badge"
import { Input } from "@/app/components/ui/Input"
import { actualizarPerfil, cambiarContrasena, actualizarTema, marcarOnboardingCompletado } from "@/app/actions/perfil"

type Perfil = {
  id: string
  nombre: string
  correo: string
  rol: string
  tema: string
  onboardingCompletado: boolean
}

export function PerfilCliente({ perfil: initialPerfil }: { perfil: Perfil }) {
  const [perfil, setPerfil] = useState(initialPerfil)
  const [isPending, startTransition] = useTransition()

  const [nombre, setNombre] = useState(perfil.nombre)
  const [passActual, setPassActual] = useState("")
  const [passNueva, setPassNueva] = useState("")
  const [passConfirmar, setPassConfirmar] = useState("")

  const handleActualizarNombre = () => {
    startTransition(async () => {
      try {
        await actualizarPerfil({ nombre })
        setPerfil((p) => ({ ...p, nombre }))
        toast.success("Nombre actualizado")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error")
      }
    })
  }

  const handleCambiarContrasena = () => {
    startTransition(async () => {
      try {
        await cambiarContrasena({ actual: passActual, nueva: passNueva, confirmar: passConfirmar })
        toast.success("Contraseña actualizada")
        setPassActual("")
        setPassNueva("")
        setPassConfirmar("")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error")
      }
    })
  }

  const handleTema = (tema: "CLARO" | "OSCURO" | "AUTOMATICO") => {
    startTransition(async () => {
      try {
        await actualizarTema(tema)
        setPerfil((p) => ({ ...p, tema }))

        // Aplicar inmediatamente
        if (tema === "OSCURO") {
          document.documentElement.classList.add("dark")
          localStorage.setItem("tema", "OSCURO")
        } else if (tema === "CLARO") {
          document.documentElement.classList.remove("dark")
          localStorage.setItem("tema", "CLARO")
        } else {
          const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
          document.documentElement.classList.toggle("dark", prefersDark)
          localStorage.setItem("tema", "AUTOMATICO")
        }

        toast.success("Tema actualizado")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error")
      }
    })
  }

  const handleRelanzarTour = () => {
    startTransition(async () => {
      try {
        await marcarOnboardingCompletado(false)
        toast.success("El tutorial se mostrará al recargar la página")
        setTimeout(() => window.location.reload(), 1200)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error")
      }
    })
  }

  const temas = [
    { id: "CLARO" as const, label: "Claro", Icon: Sun },
    { id: "OSCURO" as const, label: "Oscuro", Icon: Moon },
    { id: "AUTOMATICO" as const, label: "Automático", Icon: Monitor },
  ]

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#e8b76320" }}>
          <div className="w-5 h-5 flex items-center justify-center font-bold text-sm" style={{ color: "#e8b763" }}>
            {perfil.nombre[0]?.toUpperCase()}
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mi perfil</h1>
          <p className="text-sm text-gray-500">Tu información y preferencias</p>
        </div>
      </div>

      {/* Avatar + Info */}
      <Card>
        <div className="flex items-center gap-5">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white flex-shrink-0"
            style={{ backgroundColor: "#e8b763" }}
          >
            {perfil.nombre[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{perfil.nombre}</h2>
            <p className="text-gray-500 text-sm">{perfil.correo}</p>
            <Badge variante={perfil.rol === "ADMIN" ? "caliente" : "activo"} className="mt-1">{perfil.rol}</Badge>
          </div>
        </div>
      </Card>

      {/* Cambiar nombre */}
      <Card>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Cambiar nombre</h3>
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre"
            />
          </div>
          <Button onClick={handleActualizarNombre} cargando={isPending} tamaño="md">
            Guardar
          </Button>
        </div>
      </Card>

      {/* Cambiar contraseña */}
      <Card>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Cambiar contraseña</h3>
        <div className="space-y-3">
          <Input
            label="Contraseña actual"
            type="password"
            value={passActual}
            onChange={(e) => setPassActual(e.target.value)}
          />
          <Input
            label="Nueva contraseña (mín. 8 caracteres)"
            type="password"
            value={passNueva}
            onChange={(e) => setPassNueva(e.target.value)}
            error={passNueva.length > 0 && passNueva.length < 8 ? "Mínimo 8 caracteres" : undefined}
          />
          <Input
            label="Confirmar nueva contraseña"
            type="password"
            value={passConfirmar}
            onChange={(e) => setPassConfirmar(e.target.value)}
            error={passConfirmar.length > 0 && passConfirmar !== passNueva ? "No coinciden" : undefined}
          />
          <Button
            onClick={handleCambiarContrasena}
            cargando={isPending}
            disabled={!passActual || !passNueva || !passConfirmar}
          >
            Actualizar contraseña
          </Button>
        </div>
      </Card>

      {/* Selector de tema */}
      <Card>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Tema de la interfaz</h3>
        <div className="grid grid-cols-3 gap-3">
          {temas.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => handleTema(id)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition min-h-[80px] ${
                perfil.tema === id
                  ? "border-brand bg-brand/5 text-brand"
                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand/40"
              }`}
            >
              <Icon size={24} />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Tour / onboarding */}
      <Card>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Tutorial de bienvenida</h3>
        {perfil.onboardingCompletado ? (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-3">
            <CheckCircle size={18} />
            <span className="text-sm font-medium">Tour completado</span>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mb-3">Aún no has completado el tour de bienvenida.</p>
        )}
        <Button variante="secundario" onClick={handleRelanzarTour} cargando={isPending} tamaño="sm">
          Ver el tutorial de nuevo
        </Button>
      </Card>
    </div>
  )
}
