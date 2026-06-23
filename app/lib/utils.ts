import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMoney(amount: number, currency = "MXN"): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatFecha(fecha: Date | string | null | undefined): string {
  if (!fecha) return "—"
  const d = typeof fecha === "string" ? new Date(fecha) : fecha
  const ahora = new Date()
  const diffMs = ahora.getTime() - d.getTime()
  const diffDias = Math.floor(diffMs / 86400000)

  if (diffDias === 0) {
    return `Hoy ${d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`
  }
  if (diffDias === 1) return "Ayer"
  if (diffDias < 7) return `hace ${diffDias} días`

  return d.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== ahora.getFullYear() ? "numeric" : undefined,
  })
}

export function diasSinContacto(fecha: Date | null | undefined): number {
  if (!fecha) return 999
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000)
}

export function encodeWhatsApp(numero: string, mensaje: string): string {
  const limpio = numero.replace(/\D/g, "")
  const conLada = limpio.startsWith("52") ? limpio : `52${limpio}`
  return `https://wa.me/${conLada}?text=${encodeURIComponent(mensaje)}`
}

export function sustituirVariables(
  plantilla: string,
  datos: Record<string, string>
): string {
  return plantilla.replace(/\{(\w+)\}/g, (_, clave) => datos[clave] ?? `{${clave}}`)
}

export function slugify(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function formatFechaCorta(fecha: Date | string | null | undefined): string {
  if (!fecha) return "—"
  const d = typeof fecha === "string" ? new Date(fecha) : fecha
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
}

export function formatTelefono(tel: string | null | undefined): string {
  if (!tel) return ""
  const limpio = tel.replace(/\D/g, "")
  if (limpio.length === 10) {
    return `+52 ${limpio.slice(0, 2)} ${limpio.slice(2, 6)} ${limpio.slice(6)}`
  }
  if (limpio.startsWith("52") && limpio.length === 12) {
    return `+${limpio.slice(0, 2)} ${limpio.slice(2, 4)} ${limpio.slice(4, 8)} ${limpio.slice(8)}`
  }
  return tel
}

export function formatWhatsapp(tel: string | null | undefined): string {
  if (!tel) return ""
  const limpio = tel.replace(/\D/g, "")
  if (limpio.startsWith("52")) return limpio
  return `52${limpio}`
}

export function getTemperaturaEmoji(temp: string): string {
  if (temp === "CALIENTE") return "🔥"
  if (temp === "FRIO") return "🔵"
  return "🟡"
}

export function getTemperaturaLabel(temp: string): string {
  if (temp === "CALIENTE") return "Caliente"
  if (temp === "FRIO") return "Frío"
  return "Tibio"
}

export function getDiasDesde(fecha: Date | string | null | undefined): number {
  if (!fecha) return 999
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000)
}

export function etapaLabel(etapa: string): string {
  const map: Record<string, string> = {
    NUEVO: "Nuevo",
    CONTACTADO: "Contactado",
    CITA_AGENDADA: "Cita agendada",
    PROPUESTA_ENVIADA: "Propuesta enviada",
    NEGOCIACION: "Negociación",
    GANADO: "Ganado ✅",
    PERDIDO: "Perdido",
    ARCHIVADO: "Archivado",
  }
  return map[etapa] ?? etapa
}
