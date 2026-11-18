"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Camera, ImageUp, RefreshCw, X } from "lucide-react"
import { aJpeg, archivoAJpeg } from "../lib/imagen"

export type Vista = "frente" | "izquierda" | "derecha" | "superior"

export const PASOS_CAPTURA: { vista: Vista; titulo: string; indicacion: string; opcional?: boolean }[] = [
  { vista: "frente", titulo: "Frente", indicacion: "Mirada al frente, cabello hacia atrás si se puede, sin lentes ni gorra." },
  { vista: "izquierda", titulo: "Perfil izquierdo", indicacion: "Que el cliente gire a su derecha hasta ver solo su perfil izquierdo." },
  { vista: "derecha", titulo: "Perfil derecho", indicacion: "Ahora el otro lado. Barbilla paralela al piso." },
  { vista: "superior", titulo: "Coronilla", indicacion: "Desde arriba y un poco atrás: se ve la forma del cráneo y los remolinos.", opcional: true },
]

type Props = {
  vista: Vista
  onCapturar: (dataUrl: string) => void
  onCerrar: () => void
}

export function Camara({ vista, onCapturar, onCerrar }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const archivoRef = useRef<HTMLInputElement>(null)
  const [frontal, setFrontal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cuenta, setCuenta] = useState<number | null>(null)
  const paso = PASOS_CAPTURA.find((p) => p.vista === vista)!

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelado = false
    ;(async () => {
      try {
        setError(null)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: frontal ? "user" : "environment", width: { ideal: 1920 }, height: { ideal: 1920 } },
          audio: false,
        })
        if (cancelado) return stream.getTracks().forEach((t) => t.stop())
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
      } catch {
        setError("No se pudo abrir la cámara. Da permiso en el navegador o sube una foto.")
      }
    })()
    return () => {
      cancelado = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [frontal])

  const disparar = useCallback(() => {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    onCapturar(aJpeg(v, { espejo: frontal }))
  }, [frontal, onCapturar])

  // Temporizador de 3 s: útil cuando el cliente se toma la foto solo o el barbero sostiene el iPad
  useEffect(() => {
    if (cuenta === null) return
    const t = setTimeout(() => {
      if (cuenta <= 1) {
        disparar()
        setCuenta(null)
      } else setCuenta(cuenta - 1)
    }, 1000)
    return () => clearTimeout(t)
  }, [cuenta, disparar])

  async function subir(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    onCapturar(await archivoAJpeg(f))
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <div className="flex items-center justify-between px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
        <button onClick={onCerrar} className="rounded-full bg-white/10 p-2" aria-label="Cerrar cámara">
          <X className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#d4af6a]">Toma guiada</p>
          <p className="font-semibold">{paso.titulo}</p>
        </div>
        <button
          onClick={() => setFrontal((f) => !f)}
          className="rounded-full bg-white/10 p-2"
          aria-label="Cambiar cámara"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
          style={{ transform: frontal ? "scaleX(-1)" : undefined }}
        />
        <Guia vista={vista} />
        {cuenta !== null && cuenta > 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-8xl font-bold text-white/90 drop-shadow-lg">
            {cuenta}
          </div>
        )}
        {error && (
          <div className="absolute inset-x-6 top-1/3 rounded-2xl bg-black/80 p-5 text-center text-sm">{error}</div>
        )}
        <p className="absolute inset-x-6 bottom-4 rounded-xl bg-black/60 px-4 py-2 text-center text-sm backdrop-blur">
          {paso.indicacion}
        </p>
      </div>

      <div className="flex items-center justify-around px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
        <button
          onClick={() => archivoRef.current?.click()}
          className="flex w-20 flex-col items-center gap-1 text-xs text-white/70"
        >
          <ImageUp className="h-6 w-6" />
          Subir
        </button>
        <button
          onClick={disparar}
          aria-label="Tomar foto"
          className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#d4af6a] bg-white/10 active:scale-95"
        >
          <Camera className="h-8 w-8" />
        </button>
        <button onClick={() => setCuenta(3)} className="flex w-20 flex-col items-center gap-1 text-xs text-white/70">
          <span className="text-lg font-bold leading-6">3s</span>
          Temporizador
        </button>
        <input ref={archivoRef} type="file" accept="image/*" className="hidden" onChange={subir} />
      </div>
    </div>
  )
}

/** Silueta guía sobre la cámara para estandarizar las tomas (mismo encuadre = medición comparable). */
function Guia({ vista }: { vista: Vista }) {
  const trazo = { fill: "none", stroke: "#d4af6a", strokeWidth: 0.6, strokeDasharray: "2 1.5", opacity: 0.9 }
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="pointer-events-none absolute inset-0 h-full w-full">
      {vista === "frente" && (
        <>
          <ellipse cx="50" cy="46" rx="20" ry="27" {...trazo} />
          <line x1="50" y1="15" x2="50" y2="77" stroke="#d4af6a" strokeWidth="0.2" opacity="0.5" />
          <line x1="32" y1="42" x2="68" y2="42" stroke="#d4af6a" strokeWidth="0.2" opacity="0.5" />
        </>
      )}
      {(vista === "izquierda" || vista === "derecha") && (
        <path
          transform={vista === "derecha" ? "translate(100,0) scale(-1,1)" : undefined}
          d="M58 20 C44 18 34 26 33 38 C32 44 33 47 31 50 L28 55 C27 57 29 58 31 58 L31 63 C31 66 33 67 35 67 L35 70 C35 74 40 76 46 75 L50 76 L52 84 M58 20 C68 21 74 30 73 42 C72 52 66 58 60 62"
          {...trazo}
        />
      )}
      {vista === "superior" && <ellipse cx="50" cy="48" rx="22" ry="28" {...trazo} />}
    </svg>
  )
}
