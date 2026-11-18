-- Visage: barberías, clientes y diagnósticos de visagismo
CREATE TABLE "Barberia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "logo" TEXT,
    "colorMarca" TEXT NOT NULL DEFAULT '#d4af6a',
    "whatsapp" TEXT,
    "enlaceAgenda" TEXT,
    "instagram" TEXT,
    "ciudad" TEXT,
    "pinHash" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'PRO',
    "limiteMensual" INTEGER NOT NULL DEFAULT 150,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "catalogo" TEXT NOT NULL DEFAULT '[]',
    "barberos" TEXT NOT NULL DEFAULT '[]',
    "intentosFallidos" INTEGER NOT NULL DEFAULT 0,
    "bloqueadoHasta" DATETIME,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Barberia_slug_key" ON "Barberia"("slug");
CREATE INDEX "Barberia_activa_idx" ON "Barberia"("activa");

CREATE TABLE "ClienteVisage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "barberiaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "edad" TEXT,
    "ocupacion" TEXT,
    "notas" TEXT,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClienteVisage_barberiaId_fkey" FOREIGN KEY ("barberiaId") REFERENCES "Barberia" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ClienteVisage_barberiaId_idx" ON "ClienteVisage"("barberiaId");
CREATE INDEX "ClienteVisage_telefono_idx" ON "ClienteVisage"("telefono");

CREATE TABLE "DiagnosticoVisage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "barberiaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "barbero" TEXT,
    "contexto" TEXT NOT NULL,
    "medidas" TEXT,
    "diagnostico" TEXT NOT NULL,
    "fotoFrente" TEXT NOT NULL,
    "simulaciones" TEXT NOT NULL DEFAULT '{}',
    "corteElegido" TEXT,
    "fotoReal" TEXT,
    "serviciosVendidos" TEXT NOT NULL DEFAULT '[]',
    "total" REAL,
    "extras" REAL,
    "token" TEXT NOT NULL,
    "cerradoEn" DATETIME,
    "proximaVisita" DATETIME,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiagnosticoVisage_barberiaId_fkey" FOREIGN KEY ("barberiaId") REFERENCES "Barberia" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DiagnosticoVisage_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "ClienteVisage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DiagnosticoVisage_token_key" ON "DiagnosticoVisage"("token");
CREATE INDEX "DiagnosticoVisage_barberiaId_creadoEn_idx" ON "DiagnosticoVisage"("barberiaId", "creadoEn");
CREATE INDEX "DiagnosticoVisage_clienteId_idx" ON "DiagnosticoVisage"("clienteId");
CREATE INDEX "DiagnosticoVisage_proximaVisita_idx" ON "DiagnosticoVisage"("proximaVisita");
