-- CreateTable
CREATE TABLE "Servicio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio" REAL NOT NULL DEFAULT 0,
    "duracionMin" INTEGER NOT NULL DEFAULT 45,
    "color" TEXT NOT NULL DEFAULT '#e8b763',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL,
    "eliminadoEn" DATETIME
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Cita" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteId" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "servicioId" TEXT,
    "titulo" TEXT NOT NULL,
    "fechaInicio" DATETIME NOT NULL,
    "fechaFin" DATETIME NOT NULL,
    "googleEventId" TEXT,
    "googleMeetUrl" TEXT,
    "notas" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'AGENDADA',
    "origen" TEXT NOT NULL DEFAULT 'INTERNA',
    "confirmada" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eliminadoEn" DATETIME,
    CONSTRAINT "Cita_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Cita_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Cita_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Cita" ("clienteId", "confirmada", "creadoEn", "eliminadoEn", "fechaFin", "fechaInicio", "googleEventId", "googleMeetUrl", "id", "notas", "titulo", "vendedorId") SELECT "clienteId", "confirmada", "creadoEn", "eliminadoEn", "fechaFin", "fechaInicio", "googleEventId", "googleMeetUrl", "id", "notas", "titulo", "vendedorId" FROM "Cita";
DROP TABLE "Cita";
ALTER TABLE "new_Cita" RENAME TO "Cita";
CREATE INDEX "Cita_clienteId_idx" ON "Cita"("clienteId");
CREATE INDEX "Cita_vendedorId_idx" ON "Cita"("vendedorId");
CREATE INDEX "Cita_servicioId_idx" ON "Cita"("servicioId");
CREATE INDEX "Cita_fechaInicio_idx" ON "Cita"("fechaInicio");
CREATE INDEX "Cita_estado_idx" ON "Cita"("estado");
CREATE INDEX "Cita_eliminadoEn_idx" ON "Cita"("eliminadoEn");
CREATE TABLE "new_MetaNegocio" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "nombre" TEXT NOT NULL DEFAULT 'cesar cuapan',
    "logo" TEXT,
    "colorMarca" TEXT NOT NULL DEFAULT '#e8b763',
    "moneda" TEXT NOT NULL DEFAULT 'MXN',
    "husoHorario" TEXT NOT NULL DEFAULT 'America/Mexico_City',
    "horarioInicio" TEXT NOT NULL DEFAULT '09:00',
    "horarioFin" TEXT NOT NULL DEFAULT '18:00',
    "duracionCita" INTEGER NOT NULL DEFAULT 45,
    "diasAtencion" TEXT NOT NULL DEFAULT '[1,2,3,4,5,6]',
    "anticipacionMinDias" INTEGER NOT NULL DEFAULT 1,
    "mensajeConfirmacion" TEXT NOT NULL DEFAULT '¡Ya queda agendada tu cita! Te esperamos.',
    "mensajeWhatsapp" TEXT NOT NULL DEFAULT 'Hola {nombre}, soy César de Entidad Vendedora.

Para no hacerte perder tiempo, cuéntame en una línea: ¿cuál es tu mayor freno hoy en ventas?

Con eso te puedo armar un mini-diagnóstico rápido de tu situación.',
    "metaMensual" REAL NOT NULL DEFAULT 30,
    "umbralEstancamiento" INTEGER NOT NULL DEFAULT 7,
    "comisionGlobal" REAL,
    "motivosPerdida" TEXT NOT NULL DEFAULT '["Está caro","Lo voy a pensar","Tengo que consultarlo","Se fue con la competencia","No contestó","No era buen momento","No calificaba"]',
    "metodoPago" TEXT NOT NULL DEFAULT '["Transferencia","Tarjeta","Liga de pago"]',
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL
);
INSERT INTO "new_MetaNegocio" ("actualizadoEn", "colorMarca", "comisionGlobal", "creadoEn", "duracionCita", "horarioFin", "horarioInicio", "husoHorario", "id", "logo", "mensajeWhatsapp", "metaMensual", "metodoPago", "moneda", "motivosPerdida", "nombre", "umbralEstancamiento") SELECT "actualizadoEn", "colorMarca", "comisionGlobal", "creadoEn", "duracionCita", "horarioFin", "horarioInicio", "husoHorario", "id", "logo", "mensajeWhatsapp", "metaMensual", "metodoPago", "moneda", "motivosPerdida", "nombre", "umbralEstancamiento" FROM "MetaNegocio";
DROP TABLE "MetaNegocio";
ALTER TABLE "new_MetaNegocio" RENAME TO "MetaNegocio";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Servicio_activo_idx" ON "Servicio"("activo");

-- CreateIndex
CREATE INDEX "Servicio_orden_idx" ON "Servicio"("orden");

-- CreateIndex
CREATE INDEX "Servicio_eliminadoEn_idx" ON "Servicio"("eliminadoEn");
