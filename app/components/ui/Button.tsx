"use client"
import { forwardRef } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/app/lib/utils"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: "primario" | "secundario" | "fantasma" | "peligro" | "exito"
  tamaño?: "sm" | "md" | "lg"
  cargando?: boolean
  icono?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variante = "primario", tamaño = "md", cargando, icono, children, className, disabled, ...props },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed select-none"

    const variants = {
      primario:
        "bg-brand text-white hover:bg-brand-700 focus-visible:ring-brand active:scale-[0.98] shadow-sm",
      secundario:
        "bg-transparent border border-brand text-brand-700 hover:bg-brand-50 dark:hover:bg-brand/10 focus-visible:ring-brand",
      fantasma:
        "bg-transparent hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300",
      peligro:
        "bg-red-500 hover:bg-red-600 text-white focus-visible:ring-red-500 active:scale-[0.98]",
      exito:
        "bg-green-500 hover:bg-green-600 text-white focus-visible:ring-green-500 active:scale-[0.98]",
    }

    const sizes = {
      sm: "text-sm px-3 py-2 min-h-[36px]",
      md: "text-sm px-4 py-2.5 min-h-[44px]",
      lg: "text-base px-6 py-3.5 min-h-[52px]",
    }

    return (
      <button
        ref={ref}
        disabled={disabled || cargando}
        className={cn(base, variants[variante], sizes[tamaño], className)}
        {...props}
      >
        {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : icono}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"
