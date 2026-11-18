"use client"

import { useRef, useState } from "react"
import { ChevronsLeftRight } from "lucide-react"

/** Comparador deslizable antes/después. */
export function AntesDespues({ antes, despues, alt }: { antes: string; despues: string; alt: string }) {
  const [pos, setPos] = useState(50)
  const ref = useRef<HTMLDivElement>(null)

  function mover(clientX: number) {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)))
  }

  return (
    <div
      ref={ref}
      className="relative aspect-[3/4] w-full touch-none select-none overflow-hidden rounded-2xl bg-black"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        mover(e.clientX)
      }}
      onPointerMove={(e) => e.buttons === 1 && mover(e.clientX)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={despues} alt={`Simulación: ${alt}`} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={antes} alt="Antes" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      </div>
      <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white">
        Antes
      </span>
      <span className="absolute right-3 top-3 rounded-full bg-[#d4af6a] px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-black">
        Después
      </span>
      <div className="absolute inset-y-0 w-0.5 bg-white/90" style={{ left: `${pos}%` }}>
        <div className="absolute top-1/2 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-lg">
          <ChevronsLeftRight className="h-5 w-5" />
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        className="sr-only"
        aria-label="Comparar antes y después"
      />
    </div>
  )
}
