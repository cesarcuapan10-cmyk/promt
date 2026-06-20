"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Bell, HelpCircle, Search, Sun, Moon, Monitor } from "lucide-react"
import { useTema } from "@/app/components/providers/ThemeProvider"
import { useSession } from "next-auth/react"
import { BuscadorModal } from "./BuscadorModal"

interface TopBarProps {
  titulo?: string
  subtitulo?: string
}

const TEMAS = [
  { valor: "CLARO" as const, Icon: Sun, label: "Claro" },
  { valor: "OSCURO" as const, Icon: Moon, label: "Oscuro" },
  { valor: "AUTOMATICO" as const, Icon: Monitor, label: "Auto" },
]

export function TopBar({ titulo, subtitulo }: TopBarProps) {
  const { tema, setTema } = useTema()
  const { data: session } = useSession()
  const [modalAbierto, setModalAbierto] = useState(false)

  const actual = TEMAS.find((t) => t.valor === tema) ?? TEMAS[2]
  const { Icon: IconoTema } = actual

  // Atajos globales: "/" y Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      const enInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"

      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setModalAbierto(true)
        return
      }
      if (e.key === "/" && !enInput) {
        e.preventDefault()
        setModalAbierto(true)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <>
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-[#111]/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-4 px-4 md:px-6 h-16">
          <div className="flex-1 min-w-0">
            {titulo && (
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{titulo}</h1>
                {subtitulo && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{subtitulo}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Botón Buscar — visible en desktop */}
            <button
              onClick={() => setModalAbierto(true)}
              className="hidden md:flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition border border-gray-200 dark:border-gray-700"
              aria-label="Buscar (Ctrl+K)"
            >
              <Search size={15} />
              <span>Buscar</span>
              <kbd className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">⌘K</kbd>
            </button>

            {/* Buscar (móvil) */}
            <Link
              href="/buscar"
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition text-gray-600 dark:text-gray-400 md:hidden"
              aria-label="Buscar"
            >
              <Search size={20} />
            </Link>

            {/* Selector de tema */}
            <button
              onClick={() => {
                const i = TEMAS.findIndex((t) => t.valor === tema)
                setTema(TEMAS[(i + 1) % TEMAS.length].valor)
              }}
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition text-gray-600 dark:text-gray-400"
              aria-label={`Tema: ${actual.label}`}
              title={`Tema: ${actual.label}`}
            >
              <IconoTema size={18} />
            </button>

            {/* Campanita */}
            <Link
              href="/seguimiento"
              className="relative p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition text-gray-600 dark:text-gray-400"
              aria-label="Recordatorios"
            >
              <Bell size={18} />
            </Link>

            {/* Ayuda */}
            <Link
              href="/ayuda"
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition text-gray-600 dark:text-gray-400"
              aria-label="Ayuda y tutorial"
            >
              <HelpCircle size={18} />
            </Link>

            {/* Avatar */}
            <Link
              href="/perfil"
              className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center text-white font-semibold text-sm ml-1"
              aria-label="Mi perfil"
            >
              {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
            </Link>
          </div>
        </div>
      </header>

      <BuscadorModal open={modalAbierto} onClose={() => setModalAbierto(false)} />
    </>
  )
}
