"use client"
import { useState } from "react"
import { Copy, Check, Share2, Link, QrCode } from "lucide-react"
import { Card } from "@/app/components/ui/Card"
import { Button } from "@/app/components/ui/Button"
import { toast } from "sonner"

type Vendedor = { id: string; nombre: string; ligaAgenda: string | null; correo: string }

const CANALES = [
  { id: "instagram", label: "Instagram", color: "#e1306c" },
  { id: "whatsapp", label: "WhatsApp", color: "#25d366" },
  { id: "facebook", label: "Facebook", color: "#1877f2" },
  { id: "volante", label: "Volante", color: "#6b7280" },
]

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin
  return ""
}

function copiar(texto: string, msg = "¡Liga copiada!") {
  navigator.clipboard.writeText(texto).then(() => toast.success(msg))
}

function compartirWhatsApp(url: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent("Agenda tu cita aquí: " + url)}`, "_blank")
}

function compartirFacebook(url: string) {
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank")
}

// QR minimalista usando una URL de API pública gratuita (sin librerías)
function QRDisplay({ url }: { url: string }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`
  return (
    <div className="flex flex-col items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrUrl} alt="Código QR" width={160} height={160} className="rounded-xl border border-gray-100 dark:border-gray-700" />
      <a href={qrUrl} download="qr-landing.png" target="_blank" rel="noreferrer">
        <Button variante="secundario" tamaño="sm" icono={<QrCode className="w-4 h-4" />}>
          Descargar QR
        </Button>
      </a>
    </div>
  )
}

export default function CompartirCliente({ vendedores }: { vendedores: Vendedor[] }) {
  const [canal, setCanal] = useState("instagram")
  const [copiado, setCopiado] = useState<string | null>(null)

  const base = getBaseUrl()
  const landingBase = base + "/"
  const landingConUtm = `${base}/?utm_source=${canal}&utm_medium=social&utm_campaign=crm`

  function copiarConFeedback(texto: string, key: string) {
    copiar(texto)
    setCopiado(key)
    setTimeout(() => setCopiado(null), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Landing pública */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Link className="w-4 h-4 text-brand" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Tu landing pública</h2>
        </div>
        <p className="text-sm text-gray-500">Esta es la página que ven tus clientes potenciales para agendar una cita.</p>

        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-0 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 truncate font-mono">
            {base}/
          </div>
          <Button tamaño="sm" icono={copiado === "landing" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            onClick={() => copiarConFeedback(landingBase, "landing")}>
            {copiado === "landing" ? "¡Copiada!" : "Copiar liga"}
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variante="fantasma" tamaño="sm" onClick={() => compartirWhatsApp(landingBase)}
            icono={<Share2 className="w-4 h-4" />} style={{ color: "#25d366" }}>
            WhatsApp
          </Button>
          <Button variante="fantasma" tamaño="sm" onClick={() => compartirFacebook(landingBase)}
            icono={<Share2 className="w-4 h-4" />} style={{ color: "#1877f2" }}>
            Facebook
          </Button>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
          <QRDisplay url={landingBase} />
        </div>
      </Card>

      {/* UTM por canal */}
      <Card className="space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">Liga marcada por canal</h2>
        <p className="text-sm text-gray-500">Usa una liga diferente por canal para saber de dónde llegan tus clientes en el dashboard.</p>
        <div className="flex flex-wrap gap-2">
          {CANALES.map(c => (
            <button key={c.id} onClick={() => setCanal(c.id)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${canal === c.id ? "border-brand bg-brand/10 text-brand" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand/50"}`}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="flex-1 min-w-0 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300 truncate font-mono">
            {landingConUtm}
          </div>
          <Button tamaño="sm" icono={copiado === canal ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            onClick={() => copiarConFeedback(landingConUtm, canal)}>
            {copiado === canal ? "¡Copiada!" : "Copiar"}
          </Button>
        </div>
      </Card>

      {/* Ligas de agenda */}
      {vendedores.length > 0 && (
        <Card className="space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Páginas de agenda personales</h2>
          <p className="text-sm text-gray-500">Cada vendedor tiene su propia página para que los clientes agenden directamente con esa persona.</p>
          <div className="space-y-3">
            {vendedores.map(v => {
              const slug = v.ligaAgenda || v.id
              const agendaUrl = `${base}/agenda/${slug}`
              return (
                <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                  <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center font-bold text-brand text-sm shrink-0">
                    {v.nombre[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{v.nombre}</p>
                    <p className="text-xs text-gray-400 font-mono truncate">/agenda/{slug}</p>
                  </div>
                  <Button variante="fantasma" tamaño="sm"
                    icono={copiado === v.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    onClick={() => copiarConFeedback(agendaUrl, v.id)}>
                    Copiar
                  </Button>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
