"use client"
import { useEffect, useRef } from "react"
import { X } from "lucide-react"
import { cn } from "@/app/lib/utils"

interface ModalProps {
  abierto: boolean
  onCerrar: () => void
  titulo?: string
  children: React.ReactNode
  tamaño?: "sm" | "md" | "lg" | "xl"
  className?: string
}

export function Modal({ abierto, onCerrar, titulo, children, tamaño = "md", className }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar()
    }
    document.addEventListener("keydown", handler)
    document.body.style.overflow = "hidden"
    dialogRef.current?.focus()
    return () => {
      document.removeEventListener("keydown", handler)
      document.body.style.overflow = ""
    }
  }, [abierto, onCerrar])

  if (!abierto) return null

  const sizes = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg", xl: "max-w-2xl" }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCerrar}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titulo ? "modal-titulo" : undefined}
        tabIndex={-1}
        className={cn(
          "relative w-full bg-white dark:bg-[#1f1f1f] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 z-10 animate-slide-up max-h-[90vh] overflow-y-auto outline-none",
          sizes[tamaño],
          className
        )}
      >
        {titulo && (
          <div className="flex items-center justify-between p-6 pb-0">
            <h2 id="modal-titulo" className="text-lg font-semibold text-gray-900 dark:text-white">
              {titulo}
            </h2>
            <button
              onClick={onCerrar}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmModal({
  abierto,
  onCerrar,
  onConfirmar,
  titulo,
  mensaje,
  textoConfirmar = "Confirmar",
  peligroso = false,
}: {
  abierto: boolean
  onCerrar: () => void
  onConfirmar: () => void
  titulo: string
  mensaje: string
  textoConfirmar?: string
  peligroso?: boolean
}) {
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={titulo} tamaño="sm">
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">{mensaje}</p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCerrar}
          className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition"
        >
          Cancelar
        </button>
        <button
          onClick={() => { onConfirmar(); onCerrar() }}
          className={cn(
            "px-4 py-2 rounded-xl text-white text-sm font-medium transition",
            peligroso ? "bg-red-500 hover:bg-red-600" : "bg-brand hover:bg-brand-700"
          )}
        >
          {textoConfirmar}
        </button>
      </div>
    </Modal>
  )
}
