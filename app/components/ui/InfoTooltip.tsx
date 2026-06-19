"use client"
import { useState } from "react"
import { Info } from "lucide-react"
import { cn } from "@/app/lib/utils"

interface InfoTooltipProps {
  texto: string
  consejo?: string
  className?: string
}

export function InfoTooltip({ texto, consejo, className }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        onClick={() => setVisible(!visible)}
        className="text-gray-400 hover:text-brand transition-colors p-0.5 rounded"
        aria-label="Más información"
      >
        <Info size={14} />
      </button>
      {visible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-xl p-3 shadow-xl z-50 animate-fade-in pointer-events-none">
          <p className="leading-relaxed">{texto}</p>
          {consejo && (
            <p className="mt-2 pt-2 border-t border-white/20 text-yellow-300">
              💡 {consejo}
            </p>
          )}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-800 rotate-45 -mt-1" />
        </div>
      )}
    </div>
  )
}
