"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { registrarLead } from "@/app/actions/landing"

interface Props {
  utm: { source?: string; medium?: string; campaign?: string }
}

export function LandingForm({ utm }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [form, setForm] = useState({ nombre: "", whatsapp: "", correo: "", reto: "" })

  function set(campo: keyof typeof form, valor: string) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!form.nombre.trim() || !form.whatsapp.trim() || !form.correo.trim()) {
      setError("Completa nombre, WhatsApp y correo.")
      return
    }
    startTransition(async () => {
      const res = await registrarLead({
        ...form,
        utmSource: utm.source,
        utmMedium: utm.medium,
        utmCampaign: utm.campaign,
      })
      if (res.ok) {
        router.push("/landing/gracias")
      } else {
        setError(res.error ?? "Ocurrió un error. Intenta de nuevo.")
      }
    })
  }

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition text-gray-900 text-base"

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div>
        <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
          Nombre
        </label>
        <input
          id="nombre"
          type="text"
          value={form.nombre}
          onChange={(e) => set("nombre", e.target.value)}
          placeholder="Tu nombre"
          className={inputClass}
          autoComplete="name"
        />
      </div>
      <div>
        <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-1">
          WhatsApp
        </label>
        <input
          id="whatsapp"
          type="tel"
          value={form.whatsapp}
          onChange={(e) => set("whatsapp", e.target.value)}
          placeholder="Ej. 222 123 4567"
          className={inputClass}
          autoComplete="tel"
        />
      </div>
      <div>
        <label htmlFor="correo" className="block text-sm font-medium text-gray-700 mb-1">
          Correo
        </label>
        <input
          id="correo"
          type="email"
          value={form.correo}
          onChange={(e) => set("correo", e.target.value)}
          placeholder="tu@correo.com"
          className={inputClass}
          autoComplete="email"
        />
      </div>
      <div>
        <label htmlFor="reto" className="block text-sm font-medium text-gray-700 mb-1">
          ¿Cuál es tu mayor reto vendiendo hoy? <span className="text-gray-400">(opcional)</span>
        </label>
        <textarea
          id="reto"
          value={form.reto}
          onChange={(e) => set("reto", e.target.value)}
          placeholder="Ej. sin mí no se vende, me da miedo cobrar caro..."
          rows={2}
          className={inputClass}
        />
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-brand hover:bg-brand-700 text-white font-bold py-4 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-base uppercase tracking-wide"
      >
        {pending ? "Apartando tu lugar..." : "Reservar mi lugar gratis"}
      </button>
      <p className="text-center text-xs text-gray-500">
        Cupo limitado · 100% en línea · Te enviamos el acceso por correo y WhatsApp.
      </p>
    </form>
  )
}
