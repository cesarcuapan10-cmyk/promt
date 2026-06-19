import { cn } from "@/app/lib/utils"

type Variante =
  | "activo"
  | "ganado"
  | "perdido"
  | "archivado"
  | "pendiente"
  | "pagado"
  | "vencido"
  | "caliente"
  | "tibio"
  | "frio"
  | "default"

const estilos: Record<Variante, string> = {
  activo: "bg-brand-50 text-brand-700 border-brand-200",
  ganado: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  perdido: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400",
  archivado: "bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-400",
  pendiente: "bg-yellow-100 text-yellow-800 border-yellow-200",
  pagado: "bg-green-100 text-green-800 border-green-200",
  vencido: "bg-red-100 text-red-800 border-red-200",
  caliente: "bg-red-100 text-red-700 border-red-200",
  tibio: "bg-yellow-100 text-yellow-700 border-yellow-200",
  frio: "bg-blue-100 text-blue-700 border-blue-200",
  default: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300",
}

interface BadgeProps {
  variante?: Variante
  children: React.ReactNode
  className?: string
}

export function Badge({ variante = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap",
        estilos[variante],
        className
      )}
    >
      {children}
    </span>
  )
}
