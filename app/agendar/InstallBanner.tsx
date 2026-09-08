"use client"
import { useEffect, useState } from "react"
import { Smartphone, Wallet, X, Share } from "lucide-react"

// Evento no tipado en lib estándar de TS.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function InstallBanner({ nombre, marca }: { nombre: string; marca: string }) {
  const [instalada, setInstalada] = useState(true) // asume instalada hasta comprobar (evita parpadeo)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [esIOS, setEsIOS] = useState(false)
  const [mostrarAyudaIOS, setMostrarAyudaIOS] = useState(false)
  const [oculto, setOculto] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // Safari iOS
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInstalada(!!standalone)

    const ua = window.navigator.userAgent.toLowerCase()
    const ios = /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream
    setEsIOS(ios)

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setInstalada(true)
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  // Ya instalada → los botones desaparecen por completo.
  if (instalada || oculto) return null

  async function agregarAlTelefono() {
    if (deferred) {
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      if (outcome === "accepted") setInstalada(true)
      setDeferred(null)
    } else if (esIOS) {
      setMostrarAyudaIOS(true)
    } else {
      setMostrarAyudaIOS(true)
    }
  }

  function guardarEnWallet() {
    // Genera una tarjeta de contacto (.vcf) que el teléfono guarda en
    // contactos/wallet — acceso directo al negocio para volver a agendar.
    const url = typeof window !== "undefined" ? window.location.origin + "/agendar" : "/agendar"
    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${nombre}`,
      `ORG:${nombre}`,
      `URL:${url}`,
      `NOTE:Agenda tu cita en línea: ${url}`,
      "END:VCARD",
    ].join("\n")
    const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" })
    const enlace = document.createElement("a")
    enlace.href = URL.createObjectURL(blob)
    enlace.download = `${nombre.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.vcf`
    document.body.appendChild(enlace)
    enlace.click()
    document.body.removeChild(enlace)
    URL.revokeObjectURL(enlace.href)
  }

  return (
    <div className="my-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#161616]">
      <div className="mb-3 flex items-start justify-between">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Ten esto a la mano
        </p>
        <button
          onClick={() => setOculto(true)}
          aria-label="Cerrar"
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={agregarAlTelefono}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 text-center text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-800 dark:bg-[#1e1e1e] dark:text-gray-200 dark:hover:bg-[#242424]"
        >
          <Smartphone className="h-5 w-5" style={{ color: marca }} />
          Agregar a mi teléfono
        </button>
        <button
          onClick={guardarEnWallet}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 text-center text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-800 dark:bg-[#1e1e1e] dark:text-gray-200 dark:hover:bg-[#242424]"
        >
          <Wallet className="h-5 w-5" style={{ color: marca }} />
          Guardar en wallet
        </button>
      </div>

      {mostrarAyudaIOS && (
        <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:bg-[#1e1e1e] dark:text-gray-400">
          <Share className="h-3.5 w-3.5 shrink-0" />
          Toca el botón <b>Compartir</b> y luego <b>&ldquo;Agregar a inicio&rdquo;</b>.
        </p>
      )}
    </div>
  )
}
