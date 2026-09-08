"use server"
import { auth } from "@/app/lib/auth"
import { db } from "@/app/lib/db"
import { asegurarEsquemaAgenda } from "@/app/lib/agenda-schema"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// ─────────────────────────────────────────────────────────────
// Zona horaria del negocio.
// Ciudad de México dejó de usar horario de verano en 2022, así que el
// desfase es constante (-06:00). Se usa para construir la hora "de pared"
// (lo que ve el cliente) como instante UTC exacto.
// ─────────────────────────────────────────────────────────────
const OFFSET_MX = "-06:00"

/** Fecha de hoy en México como "YYYY-MM-DD" (robusta ante zona horaria del servidor). */
function hoyMX(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date())
}

/** Suma días a una fecha "YYYY-MM-DD" y devuelve otra "YYYY-MM-DD". */
function sumarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + dias))
  return dt.toISOString().slice(0, 10)
}

/** Día de la semana (0=domingo … 6=sábado) de una fecha "YYYY-MM-DD". */
function diaSemana(fecha: string): number {
  const [y, m, d] = fecha.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/** Convierte "YYYY-MM-DD" + "HH:MM" a instante Date en la zona del negocio. */
function instante(fecha: string, hora: string): Date {
  return new Date(`${fecha}T${hora}:00${OFFSET_MX}`)
}

function minutosDeHora(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

function horaDeMinutos(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

const fechaRegex = /^\d{4}-\d{2}-\d{2}$/
const horaRegex = /^\d{2}:\d{2}$/

// ─────────────────────────────────────────────────────────────
// LECTURA PÚBLICA (sin sesión) — para la página que llena el cliente
// ─────────────────────────────────────────────────────────────

export type ConfigAgenda = {
  negocio: {
    nombre: string
    colorMarca: string
    moneda: string
    horarioInicio: string
    horarioFin: string
    duracionCita: number
    anticipacionMinDias: number
    diasAtencion: number[]
    mensajeConfirmacion: string
  }
  personas: { id: string; nombre: string; avatar: string | null }[]
  servicios: { id: string; nombre: string; descripcion: string | null; precio: number; duracionMin: number; color: string }[]
}

export async function obtenerConfigAgenda(): Promise<ConfigAgenda> {
  await asegurarEsquemaAgenda()
  const [meta, personas, servicios] = await Promise.all([
    db.metaNegocio.upsert({ where: { id: "singleton" }, create: {}, update: {} }),
    db.usuario.findMany({
      where: { activo: true },
      orderBy: { creadoEn: "asc" },
      select: { id: true, nombre: true, avatar: true },
    }),
    db.servicio.findMany({
      where: { activo: true, eliminadoEn: null },
      orderBy: [{ orden: "asc" }, { creadoEn: "asc" }],
      select: { id: true, nombre: true, descripcion: true, precio: true, duracionMin: true, color: true },
    }),
  ])

  let diasAtencion: number[] = [1, 2, 3, 4, 5, 6]
  try {
    const parsed = JSON.parse(meta.diasAtencion)
    if (Array.isArray(parsed)) diasAtencion = parsed.map(Number).filter((n) => n >= 0 && n <= 6)
  } catch {
    /* usa el default */
  }

  return {
    negocio: {
      nombre: meta.nombre,
      colorMarca: meta.colorMarca,
      moneda: meta.moneda,
      horarioInicio: meta.horarioInicio,
      horarioFin: meta.horarioFin,
      duracionCita: meta.duracionCita,
      anticipacionMinDias: meta.anticipacionMinDias,
      diasAtencion,
      mensajeConfirmacion: meta.mensajeConfirmacion,
    },
    personas,
    servicios,
  }
}

export type Slot = { hora: string; ocupada: boolean }

/** Devuelve los horarios del día para una persona, marcando los ocupados. */
export async function obtenerDisponibilidad(
  fecha: string,
  personaId: string,
  duracionMin?: number,
): Promise<{ ok: boolean; slots: Slot[]; error?: string }> {
  if (!fechaRegex.test(fecha)) return { ok: false, slots: [], error: "Fecha inválida" }
  await asegurarEsquemaAgenda()

  const meta = await db.metaNegocio.upsert({ where: { id: "singleton" }, create: {}, update: {} })
  const paso = Math.max(15, duracionMin || meta.duracionCita)

  // No se permite agendar antes del mínimo de anticipación (por defecto, no el mismo día).
  const minFecha = sumarDias(hoyMX(), Math.max(0, meta.anticipacionMinDias))
  if (fecha < minFecha) return { ok: true, slots: [] }

  // Día no atendido → sin horarios.
  let diasAtencion: number[] = [1, 2, 3, 4, 5, 6]
  try {
    const parsed = JSON.parse(meta.diasAtencion)
    if (Array.isArray(parsed)) diasAtencion = parsed.map(Number)
  } catch {
    /* default */
  }
  if (!diasAtencion.includes(diaSemana(fecha))) return { ok: true, slots: [] }

  const inicio = minutosDeHora(meta.horarioInicio)
  const fin = minutosDeHora(meta.horarioFin)

  // Citas existentes de esa persona ese día.
  const desde = instante(fecha, "00:00")
  const hasta = instante(sumarDias(fecha, 1), "00:00")
  const citas = await db.cita.findMany({
    where: {
      vendedorId: personaId,
      eliminadoEn: null,
      estado: { not: "CANCELADA" },
      fechaInicio: { gte: desde, lt: hasta },
    },
    select: { fechaInicio: true, fechaFin: true },
  })

  const rangosOcupados = citas.map((c) => ({
    ini: c.fechaInicio.getTime(),
    fin: c.fechaFin.getTime(),
  }))

  const slots: Slot[] = []
  for (let min = inicio; min + paso <= fin; min += paso) {
    const hora = horaDeMinutos(min)
    const sIni = instante(fecha, hora).getTime()
    const sFin = sIni + paso * 60000
    const ocupada = rangosOcupados.some((r) => sIni < r.fin && sFin > r.ini)
    slots.push({ hora, ocupada })
  }

  return { ok: true, slots }
}

// ─────────────────────────────────────────────────────────────
// CREAR RESERVA PÚBLICA (sin sesión)
// ─────────────────────────────────────────────────────────────

const reservaSchema = z.object({
  fecha: z.string().regex(fechaRegex, "Fecha inválida"),
  hora: z.string().regex(horaRegex, "Hora inválida"),
  personaId: z.string().min(1, "Elige quién te atiende"),
  servicioId: z.string().min(1, "Elige un servicio"),
  nombre: z.string().trim().min(2, "Escribe tu nombre").max(80),
  whatsapp: z.string().trim().min(8, "Escribe tu WhatsApp").max(20),
})

export type ResultadoReserva =
  | { ok: true; mensaje: string; citaId: string; resumen: { fecha: string; hora: string; persona: string; servicio: string } }
  | { ok: false; error: string }

export async function crearReservaPublica(input: unknown): Promise<ResultadoReserva> {
  const parsed = reservaSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }
  await asegurarEsquemaAgenda()
  const { fecha, hora, personaId, servicioId, nombre, whatsapp } = parsed.data

  const meta = await db.metaNegocio.upsert({ where: { id: "singleton" }, create: {}, update: {} })

  // Regla: respetar anticipación mínima (por defecto no se agenda el mismo día).
  const minFecha = sumarDias(hoyMX(), Math.max(0, meta.anticipacionMinDias))
  if (fecha < minFecha) {
    return {
      ok: false,
      error:
        meta.anticipacionMinDias >= 1
          ? "Para darte una mejor atención, agenda al menos con un día de anticipación."
          : "Esa fecha ya no está disponible.",
    }
  }

  const [persona, servicio] = await Promise.all([
    db.usuario.findFirst({ where: { id: personaId, activo: true } }),
    db.servicio.findFirst({ where: { id: servicioId, activo: true, eliminadoEn: null } }),
  ])
  if (!persona) return { ok: false, error: "La persona seleccionada no está disponible." }
  if (!servicio) return { ok: false, error: "El servicio seleccionado no está disponible." }

  const fechaInicio = instante(fecha, hora)
  const fechaFin = new Date(fechaInicio.getTime() + servicio.duracionMin * 60000)

  // Dentro del horario del negocio.
  const minSlot = minutosDeHora(hora)
  if (minSlot < minutosDeHora(meta.horarioInicio) || minSlot + servicio.duracionMin > minutosDeHora(meta.horarioFin)) {
    return { ok: false, error: "Ese horario está fuera del horario de atención." }
  }

  // Re-verificar que no haya empalme (control de concurrencia a nivel lectura).
  const choca = await db.cita.findFirst({
    where: {
      vendedorId: personaId,
      eliminadoEn: null,
      estado: { not: "CANCELADA" },
      fechaInicio: { lt: fechaFin },
      fechaFin: { gt: fechaInicio },
    },
    select: { id: true },
  })
  if (choca) return { ok: false, error: "Justo se ocupó ese horario. Elige otra hora, por favor." }

  // Buscar o crear al cliente por WhatsApp (alimenta el CRM como lead nuevo).
  const whatsappLimpio = whatsapp.replace(/\D/g, "")
  let cliente = whatsappLimpio
    ? await db.cliente.findFirst({ where: { whatsapp: whatsappLimpio, eliminadoEn: null } })
    : null

  if (!cliente) {
    cliente = await db.cliente.create({
      data: {
        nombre,
        whatsapp: whatsappLimpio || null,
        telefono: whatsappLimpio || null,
        origen: "AGENDA_ONLINE",
        etapa: "CITA_AGENDADA",
        temperatura: "CALIENTE",
        vendedorId: personaId,
        ultimoContacto: new Date(),
      },
    })
  } else {
    await db.cliente.update({
      where: { id: cliente.id },
      data: { etapa: "CITA_AGENDADA", ultimoContacto: new Date() },
    })
  }

  const cita = await db.cita.create({
    data: {
      clienteId: cliente.id,
      vendedorId: personaId,
      servicioId: servicio.id,
      titulo: `${servicio.nombre} — ${nombre}`,
      fechaInicio,
      fechaFin,
      estado: "AGENDADA",
      origen: "PUBLICA",
      notas: `Reserva en línea. WhatsApp: ${whatsapp}`,
    },
  })

  await db.registroAuditoria.create({
    data: {
      accion: "RESERVA_ONLINE",
      entidad: "Cita",
      entidadId: cita.id,
      descripcion: `Reserva en línea de ${nombre} — ${servicio.nombre} el ${fecha} ${hora}`,
    },
  })

  revalidatePath("/agenda")

  return {
    ok: true,
    citaId: cita.id,
    mensaje: meta.mensajeConfirmacion,
    resumen: { fecha, hora, persona: persona.nombre, servicio: servicio.nombre },
  }
}

// ─────────────────────────────────────────────────────────────
// LADO DUEÑO (con sesión) — calendario y configuración
// ─────────────────────────────────────────────────────────────

async function requerirSesion() {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error("No autorizado")
  await asegurarEsquemaAgenda()
  return sesion
}

export type CitaCalendario = {
  id: string
  titulo: string
  fechaInicio: string
  fechaFin: string
  estado: string
  origen: string
  clienteNombre: string
  clienteWhatsapp: string | null
  personaNombre: string
  servicioNombre: string | null
  color: string
}

/** Citas del rango [desde, hasta) para el calendario del dueño. */
export async function obtenerCitasRango(desdeISO: string, hastaISO: string): Promise<CitaCalendario[]> {
  const sesion = await requerirSesion()
  const rol = (sesion.user as { rol?: string }).rol

  const citas = await db.cita.findMany({
    where: {
      eliminadoEn: null,
      fechaInicio: { gte: new Date(desdeISO), lt: new Date(hastaISO) },
      ...(rol !== "ADMIN" ? { vendedorId: sesion.user!.id } : {}),
    },
    orderBy: { fechaInicio: "asc" },
    include: {
      cliente: { select: { nombre: true, whatsapp: true } },
      vendedor: { select: { nombre: true } },
      servicio: { select: { nombre: true, color: true } },
    },
  })

  return citas.map((c) => ({
    id: c.id,
    titulo: c.titulo,
    fechaInicio: c.fechaInicio.toISOString(),
    fechaFin: c.fechaFin.toISOString(),
    estado: c.estado,
    origen: c.origen,
    clienteNombre: c.cliente.nombre,
    clienteWhatsapp: c.cliente.whatsapp,
    personaNombre: c.vendedor.nombre,
    servicioNombre: c.servicio?.nombre ?? null,
    color: c.servicio?.color ?? "#e8b763",
  }))
}

export async function cambiarEstadoCita(citaId: string, estado: string) {
  const sesion = await requerirSesion()
  const rol = (sesion.user as { rol?: string }).rol
  const cita = await db.cita.findFirst({ where: { id: citaId, eliminadoEn: null } })
  if (!cita) return { ok: false, error: "Cita no encontrada" }
  if (rol !== "ADMIN" && cita.vendedorId !== sesion.user!.id) return { ok: false, error: "Sin permiso" }

  const validos = ["AGENDADA", "CONFIRMADA", "ATENDIDA", "NO_ASISTIO", "CANCELADA"]
  if (!validos.includes(estado)) return { ok: false, error: "Estado inválido" }

  await db.cita.update({
    where: { id: citaId },
    data: { estado, confirmada: estado === "CONFIRMADA" || estado === "ATENDIDA" },
  })
  revalidatePath("/agenda")
  return { ok: true }
}

// ── Servicios (editables por el dueño) ──

export async function listarServicios() {
  await requerirSesion()
  return db.servicio.findMany({
    where: { eliminadoEn: null },
    orderBy: [{ orden: "asc" }, { creadoEn: "asc" }],
  })
}

const servicioSchema = z.object({
  nombre: z.string().trim().min(2, "Nombre muy corto").max(60),
  descripcion: z.string().trim().max(200).optional().or(z.literal("")),
  precio: z.coerce.number().min(0).max(9_999_999),
  duracionMin: z.coerce.number().int().min(5).max(600),
  color: z.string().trim().max(20).optional(),
  activo: z.boolean().optional(),
})

export async function guardarServicio(input: unknown, id?: string) {
  await requerirSesion()
  const parsed = servicioSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  const d = parsed.data

  if (id) {
    await db.servicio.update({
      where: { id },
      data: {
        nombre: d.nombre,
        descripcion: d.descripcion || null,
        precio: d.precio,
        duracionMin: d.duracionMin,
        color: d.color || "#e8b763",
        activo: d.activo ?? true,
      },
    })
  } else {
    const count = await db.servicio.count({ where: { eliminadoEn: null } })
    await db.servicio.create({
      data: {
        nombre: d.nombre,
        descripcion: d.descripcion || null,
        precio: d.precio,
        duracionMin: d.duracionMin,
        color: d.color || "#e8b763",
        activo: d.activo ?? true,
        orden: count,
      },
    })
  }
  revalidatePath("/agenda")
  return { ok: true }
}

export async function eliminarServicio(id: string) {
  await requerirSesion()
  await db.servicio.update({ where: { id }, data: { eliminadoEn: new Date(), activo: false } })
  revalidatePath("/agenda")
  return { ok: true }
}

// ── Configuración de horario/atención ──

const configSchema = z.object({
  horarioInicio: z.string().regex(horaRegex),
  horarioFin: z.string().regex(horaRegex),
  duracionCita: z.coerce.number().int().min(5).max(600),
  anticipacionMinDias: z.coerce.number().int().min(0).max(30),
  diasAtencion: z.array(z.number().int().min(0).max(6)),
  mensajeConfirmacion: z.string().trim().min(4).max(200),
})

export async function guardarConfigAgenda(input: unknown) {
  await requerirSesion()
  const parsed = configSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  const d = parsed.data
  if (minutosDeHora(d.horarioFin) <= minutosDeHora(d.horarioInicio)) {
    return { ok: false, error: "La hora de cierre debe ser mayor a la de apertura." }
  }
  await db.metaNegocio.upsert({
    where: { id: "singleton" },
    create: {
      horarioInicio: d.horarioInicio,
      horarioFin: d.horarioFin,
      duracionCita: d.duracionCita,
      anticipacionMinDias: d.anticipacionMinDias,
      diasAtencion: JSON.stringify(d.diasAtencion),
      mensajeConfirmacion: d.mensajeConfirmacion,
    },
    update: {
      horarioInicio: d.horarioInicio,
      horarioFin: d.horarioFin,
      duracionCita: d.duracionCita,
      anticipacionMinDias: d.anticipacionMinDias,
      diasAtencion: JSON.stringify(d.diasAtencion),
      mensajeConfirmacion: d.mensajeConfirmacion,
    },
  })
  revalidatePath("/agenda")
  return { ok: true }
}
