"use client"

import { useState, useEffect } from "react"
import { Copy, Check, ExternalLink, Download } from "lucide-react"
import { Card } from "@/app/components/ui/Card"
import { Button } from "@/app/components/ui/Button"
import { toast } from "sonner"

type Canal = {
  nombre: string
  params: string
  icono: string
}

const CANALES: Canal[] = [
  { nombre: "Instagram", params: "?utm_source=instagram&utm_medium=social", icono: "📸" },
  { nombre: "WhatsApp", params: "?utm_source=whatsapp&utm_medium=mensaje", icono: "💬" },
  { nombre: "Facebook", params: "?utm_source=facebook&utm_medium=social", icono: "👥" },
  { nombre: "Volante físico", params: "?utm_source=volante&utm_medium=offline", icono: "🗋" },
]

function CopyButton({ text }: { text: string }) {
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiado(true)
      toast.success("¡Copiado!")
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      toast.error("No se pudo copiar")
    }
  }

  return (
    <button
      onClick={copiar}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand/90 transition min-h-[44px] whitespace-nowrap"
    >
      {copiado ? <Check size={14} /> : <Copy size={14} />}
      {copiado ? "¡Copiado!" : "Copiar"}
    </button>
  )
}

export function CompartirCliente() {
  const [origin, setOrigin] = useState("")
  const [qrSrc, setQrSrc] = useState<string | null>(null)

  useEffect(() => {
    const base = window.location.origin
    setOrigin(base)
    // Cargar QR desde el API
    fetch(`/api/qr?url=${encodeURIComponent(base + "/")}`)
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        setQrSrc(url)
      })
      .catch(() => {
        // silenciar error de QR
      })
  }, [])

  const landingUrl = origin + "/"

  const descargarQR = () => {
    if (!qrSrc) return
    const a = document.createElement("a")
    a.href = qrSrc
    a.download = "qr-landing.png"
    a.click()
  }

  const compartirWhatsApp = () => {
    const url = `${origin}/?utm_source=whatsapp&utm_medium=mensaje`
    const msg = `Hola! Agenda tu cita conmigo aquí: ${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank")
  }

  const compartirFacebook = () => {
    const url = `${origin}/?utm_source=facebook&utm_medium=social`
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank")
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Liga principal */}
      <Card>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Tu liga de agendamiento</h2>
        <p className="text-sm text-gray-500 mb-4">Comparte esta liga con tus prospectos para que agendan directamente contigo.</p>
        <div className="flex gap-2">
          <input
            readOnly
            value={landingUrl}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-white/5 outline-none"
          />
          <CopyButton text={landingUrl} />
        </div>
      </Card>

      {/* Variantes UTM */}
      <Card>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Ligas por canal (con rastreo UTM)</h2>
        <p className="text-sm text-gray-500 mb-4">
          Estas ligas te dicen de dónde viene cada cliente. Cuando alguien llene el formulario por la liga de Instagram, aparecerá en tu CRM con origen &quot;Instagram&quot;.
        </p>
        <div className="space-y-3">
          {CANALES.map((canal) => {
            const url = origin + canal.params
            return (
              <div key={canal.nombre} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                <span className="text-xl flex-shrink-0">{canal.icono}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{canal.nombre}</p>
                  <p className="text-xs text-gray-400 truncate">{url}</p>
                </div>
                <CopyButton text={url} />
              </div>
            )
          })}
        </div>
      </Card>

      {/* Compartir rápido */}
      <Card>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Compartir rápido</h2>
        <div className="flex flex-wrap gap-3">
          <Button
            variante="exito"
            icono={<ExternalLink size={16} />}
            onClick={compartirWhatsApp}
          >
            Compartir en WhatsApp
          </Button>
          <Button
            variante="secundario"
            icono={<ExternalLink size={16} />}
            onClick={compartirFacebook}
          >
            Compartir en Facebook
          </Button>
        </div>
      </Card>

      {/* Código QR */}
      <Card>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Código QR descargable</h2>
        <p className="text-sm text-gray-500 mb-4">Imprime este QR en tarjetas, volantes o tu local para que los clientes puedan escanear y agendar.</p>
        {qrSrc ? (
          <div className="flex flex-col items-center gap-4">
            <img src={qrSrc} alt="Código QR de la landing" className="w-52 h-52 rounded-xl border border-gray-100 dark:border-gray-700" />
            <Button variante="secundario" icono={<Download size={16} />} onClick={descargarQR}>
              Descargar QR como PNG
            </Button>
          </div>
        ) : (
          <div className="w-52 h-52 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm text-gray-400">
            Generando QR...
          </div>
        )}
      </Card>
    </div>
  )
}
