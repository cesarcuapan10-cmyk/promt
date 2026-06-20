"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

const PASOS = [
  {
    titulo: "Bienvenido a tu CRM",
    descripcion: "Este es tu menú — aquí está todo lo que necesitas para gestionar tus ventas.",
  },
  {
    titulo: "Tu lista de seguimiento",
    descripcion: "Aquí ves a quién te toca contactar hoy — ábrelo cada mañana para empezar el día.",
  },
  {
    titulo: "Búsqueda global",
    descripcion: "Este buscador encuentra cualquier cliente, teléfono o nota al instante. Presiona Ctrl+K o / para abrirlo.",
  },
  {
    titulo: "Agregar clientes",
    descripcion: 'Con "+ Nuevo" agregas un cliente en segundos. ¡Nunca dejes escapar un prospecto!',
  },
  {
    titulo: "Expediente del cliente",
    descripcion: "Al hacer clic en el nombre de un cliente ves todo su expediente: historial, pagos, citas y más.",
  },
  {
    titulo: "Personalización",
    descripcion: 'Aquí puedes cambiar el tema (claro/oscuro), y con "Ayuda" relanzas este tour cuando quieras.',
  },
]

interface Props {
  onboardingCompletado: boolean
}

export function OnboardingTour({ onboardingCompletado }: Props) {
  const [visible, setVisible] = useState(!onboardingCompletado)
  const [paso, setPaso] = useState(0)

  const completar = async () => {
    setVisible(false)
    try {
      await fetch("/api/onboarding-complete", { method: "POST" })
    } catch {
      // silenciar
    }
  }

  const siguiente = () => {
    if (paso < PASOS.length - 1) {
      setPaso(paso + 1)
    } else {
      completar()
    }
  }

  const anterior = () => {
    if (paso > 0) setPaso(paso - 1)
  }

  if (!visible) return null

  const pasoActual = PASOS[paso]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Card del tour */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#1f1f1f] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-6 z-10">
        {/* Cerrar */}
        <button
          onClick={completar}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Saltar tour"
        >
          <X size={16} />
        </button>

        {/* Indicadores de paso */}
        <div className="flex gap-1.5 mb-5">
          {PASOS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === paso
                  ? "w-6 bg-brand"
                  : i < paso
                  ? "w-3 bg-brand/40"
                  : "w-3 bg-gray-200 dark:bg-gray-700"
              }`}
            />
          ))}
        </div>

        {/* Número de paso */}
        <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
          Paso {paso + 1} de {PASOS.length}
        </p>

        {/* Contenido */}
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{pasoActual.titulo}</h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-6">{pasoActual.descripcion}</p>

        {/* Botones */}
        <div className="flex items-center justify-between">
          <button
            onClick={completar}
            className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition min-h-[44px] px-2"
          >
            Saltar tour
          </button>
          <div className="flex gap-2">
            {paso > 0 && (
              <button
                onClick={anterior}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition min-h-[44px]"
              >
                <ChevronLeft size={14} />
                Anterior
              </button>
            )}
            <button
              onClick={siguiente}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-brand text-white text-sm font-medium hover:bg-brand/90 transition min-h-[44px]"
            >
              {paso === PASOS.length - 1 ? "¡Empezar!" : "Siguiente"}
              {paso < PASOS.length - 1 && <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
