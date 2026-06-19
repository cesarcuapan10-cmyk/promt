"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, KanbanSquare, ListChecks, Plus } from "lucide-react"
import { cn } from "@/app/lib/utils"

const NAV = [
  { href: "/", label: "Tablero", Icon: LayoutDashboard, exacto: true },
  { href: "/clientes", label: "Clientes", Icon: Users },
  { href: "/embudo", label: "Embudo", Icon: KanbanSquare },
  { href: "/seguimiento", label: "Seguimiento", Icon: ListChecks },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-[#111] border-t border-gray-100 dark:border-gray-800 z-20">
      <div className="flex items-center justify-around px-1 py-2 pb-safe">
        {NAV.map(({ href, label, Icon, exacto }) => {
          const activo = exacto ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[56px]",
                activo ? "text-brand" : "text-gray-500 dark:text-gray-400"
              )}
            >
              <Icon size={22} strokeWidth={activo ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
        <Link href="/clientes/nuevo" className="flex flex-col items-center gap-0.5 min-w-[56px]">
          <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center shadow-md">
            <Plus size={20} className="text-white" />
          </div>
          <span className="text-[10px] font-medium text-brand">Nuevo</span>
        </Link>
      </div>
    </nav>
  )
}
