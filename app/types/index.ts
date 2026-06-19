export type Rol = "ADMIN" | "VENDEDOR" | "SOLO_LECTURA"
export type Tema = "CLARO" | "OSCURO" | "AUTOMATICO"
export type Temperatura = "CALIENTE" | "TIBIO" | "FRIO"
export type Etapa =
  | "NUEVO"
  | "CONTACTADO"
  | "CITA_AGENDADA"
  | "PROPUESTA_ENVIADA"
  | "GANADO"
  | "PERDIDO"
export type EstadoCartera = "ACTIVO" | "GANADO" | "PERDIDO" | "ARCHIVADO"
export type MetodoPago = "TRANSFERENCIA" | "TARJETA" | "LIGA_PAGO"
export type EstatusPago = "PENDIENTE" | "PAGADO" | "VENCIDO"
export type TipoNota =
  | "NOTA"
  | "LLAMADA"
  | "MENSAJE"
  | "REUNION"
  | "CAMBIO_ETAPA"
  | "CAMBIO_ESTADO"
  | "PAGO"
  | "ARCHIVO"
  | "SISTEMA"

export interface UsuarioSesion {
  id: string
  nombre: string
  correo: string
  rol: Rol
}

export const ETAPAS: { valor: Etapa; label: string; orden: number; color: string }[] = [
  { valor: "NUEVO", label: "Nuevo", orden: 0, color: "#6b7280" },
  { valor: "CONTACTADO", label: "Contactado", orden: 1, color: "#3b82f6" },
  { valor: "CITA_AGENDADA", label: "Cita agendada", orden: 2, color: "#8b5cf6" },
  { valor: "PROPUESTA_ENVIADA", label: "Propuesta enviada", orden: 3, color: "#f59e0b" },
  { valor: "GANADO", label: "Cliente ganado", orden: 4, color: "#22c55e" },
  { valor: "PERDIDO", label: "Perdido", orden: 5, color: "#ef4444" },
]

export const TEMPERATURAS: Record<Temperatura, { label: string; emoji: string; color: string }> = {
  CALIENTE: { label: "Caliente", emoji: "🔥", color: "text-red-500" },
  TIBIO: { label: "Tibio", emoji: "🟡", color: "text-yellow-500" },
  FRIO: { label: "Frío", emoji: "🔵", color: "text-blue-500" },
}

export const METODOS_PAGO: { valor: MetodoPago; label: string }[] = [
  { valor: "TRANSFERENCIA", label: "Transferencia" },
  { valor: "TARJETA", label: "Tarjeta" },
  { valor: "LIGA_PAGO", label: "Liga de pago" },
]

export const ESTATUS_PAGO: Record<EstatusPago, { label: string; color: string }> = {
  PENDIENTE: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800" },
  PAGADO: { label: "Pagado", color: "bg-green-100 text-green-800" },
  VENCIDO: { label: "Vencido", color: "bg-red-100 text-red-800" },
}
