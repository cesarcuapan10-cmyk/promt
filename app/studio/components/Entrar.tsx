"use client"

import { useState } from "react"
import { Loader2, ScanFace } from "lucide-react"

export function Entrar({ onEntrar }: { onEntrar: () => void }) {
  const [slug, setSlug] = useState("")
  const [pin, setPin] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setCargando(true)
    setError(null)
    try {
      const r = await fetch("/api/studio/sesion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, pin }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      onEntrar()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar")
    } finally {
      setCargando(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#e9cf95] to-[#a8823f] text-black">
        <ScanFace className="h-9 w-9" />
      </div>
      <h1 className="text-center text-3xl font-semibold tracking-tight">VISAGE</h1>
      <p className="mt-1 text-center text-sm text-white/50">Estudio de visagismo con IA para barberías</p>
      <form onSubmit={enviar} className="mt-8 space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-widest text-white/40">Código de la barbería</span>
          <input className="campo" autoCapitalize="none" autoCorrect="off" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="ej. barberia-centro" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-widest text-white/40">PIN</span>
          <input className="campo tracking-[0.4em]" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} />
        </label>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button disabled={cargando || !slug || pin.length < 4} className="boton-oro w-full justify-center py-3.5 disabled:opacity-40">
          {cargando ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar"}
        </button>
      </form>
      <p className="mt-6 text-center text-xs text-white/30">La sesión queda guardada 30 días en este dispositivo.</p>
    </main>
  )
}
