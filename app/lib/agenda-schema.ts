import { db } from "@/app/lib/db"

// ─────────────────────────────────────────────────────────────
// Auto-migración ligera para la agenda de citas.
//
// La base de datos de producción corre en Turso/libSQL, donde
// `prisma migrate deploy` no puede aplicarse durante el build. Para que
// las nuevas funciones (servicios, reservas en línea) funcionen sin pasos
// manuales, esta función crea la tabla y columnas nuevas la primera vez
// que se usa la agenda.
//
// Es 100% ADITIVA e idempotente: solo agrega tabla/columnas/índices que
// falten. Nunca borra ni modifica datos existentes. Se ejecuta una sola
// vez por instancia del servidor (memoizada) y cualquier "ya existe" se
// ignora sin problema.
// ─────────────────────────────────────────────────────────────

let listo = false
let enProceso: Promise<void> | null = null

const SENTENCIAS = [
  `CREATE TABLE IF NOT EXISTS "Servicio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio" REAL NOT NULL DEFAULT 0,
    "duracionMin" INTEGER NOT NULL DEFAULT 45,
    "color" TEXT NOT NULL DEFAULT '#e8b763',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eliminadoEn" DATETIME
  )`,
  `CREATE INDEX IF NOT EXISTS "Servicio_activo_idx" ON "Servicio"("activo")`,
  `CREATE INDEX IF NOT EXISTS "Servicio_orden_idx" ON "Servicio"("orden")`,
  `CREATE INDEX IF NOT EXISTS "Servicio_eliminadoEn_idx" ON "Servicio"("eliminadoEn")`,
  // Columnas nuevas en Cita (ADD COLUMN lanza error si ya existe → se ignora)
  `ALTER TABLE "Cita" ADD COLUMN "servicioId" TEXT`,
  `ALTER TABLE "Cita" ADD COLUMN "estado" TEXT NOT NULL DEFAULT 'AGENDADA'`,
  `ALTER TABLE "Cita" ADD COLUMN "origen" TEXT NOT NULL DEFAULT 'INTERNA'`,
  `CREATE INDEX IF NOT EXISTS "Cita_servicioId_idx" ON "Cita"("servicioId")`,
  `CREATE INDEX IF NOT EXISTS "Cita_estado_idx" ON "Cita"("estado")`,
  // Columnas nuevas en MetaNegocio
  `ALTER TABLE "MetaNegocio" ADD COLUMN "diasAtencion" TEXT NOT NULL DEFAULT '[1,2,3,4,5,6]'`,
  `ALTER TABLE "MetaNegocio" ADD COLUMN "anticipacionMinDias" INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE "MetaNegocio" ADD COLUMN "mensajeConfirmacion" TEXT NOT NULL DEFAULT '¡Ya queda agendada tu cita! Te esperamos.'`,
]

export async function asegurarEsquemaAgenda(): Promise<void> {
  if (listo) return
  if (enProceso) return enProceso

  enProceso = (async () => {
    for (const sql of SENTENCIAS) {
      try {
        await db.$executeRawUnsafe(sql)
      } catch {
        // "duplicate column" / "already exists" → ya estaba aplicado, se ignora.
      }
    }
    listo = true
  })()

  try {
    await enProceso
  } finally {
    enProceso = null
  }
}
