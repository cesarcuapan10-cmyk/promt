# Notas del Proyecto — CRM César Cuapan

## Cómo correrlo en tu computadora

```bash
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Abre http://localhost:3000

**Usuario admin:** cesar@cuapan.com | **Contraseña:** Admin2026!
**Usuario vendedor de prueba:** maria@cuapan.com | **Contraseña:** Vendedor2026!

---

## Cómo publicarlo en Vercel (guía rápida)

### Paso 1: Crear base de datos gratis en Neon
1. Ve a https://neon.tech y crea cuenta gratis (sin tarjeta)
2. Crea un nuevo proyecto, elige región "US East" o la más cercana
3. En el panel, copia la **Connection String** (empieza con `postgresql://...`)

### Paso 2: Variables de entorno en Vercel
En tu proyecto de Vercel → Settings → Environment Variables, agrega:

| Variable | Valor | Obligatoria |
|---|---|---|
| `DATABASE_URL` | La URL de Neon que copiaste | ✅ Sí |
| `AUTH_SECRET` | Texto largo aleatorio (corre `openssl rand -base64 32` en tu terminal) | ✅ Sí |
| `ANTHROPIC_API_KEY` | Tu llave de Anthropic (console.anthropic.com → API Keys) | ⚪ Opcional |
| `GOOGLE_CLIENT_ID` | De Google Cloud Console | ⚪ Opcional |
| `GOOGLE_CLIENT_SECRET` | De Google Cloud Console | ⚪ Opcional |

### Paso 3: Configurar el build en Vercel
En Vercel → Settings → General → Build Command, pon:
```
npx prisma generate && npx prisma migrate deploy && npm run build
```

### Paso 4: Primer deploy
- Conecta tu repo de GitHub en Vercel
- Dale "Deploy"
- Cuando termine, abre la URL y debería entrar directo

### Paso 5: Sembrar los datos de ejemplo (primera vez)
Después del primer deploy, en la terminal de tu computadora:
```bash
DATABASE_URL="<tu-url-de-neon>" npx prisma db seed
```

---

## Cómo hacer respaldo manual de la base de datos (Postgres en Neon)

### Opción 1 — Desde el panel de Neon (más fácil)
1. Ve a https://console.neon.tech
2. Entra a tu proyecto → "Branches" → tu rama "main"
3. Busca el botón "Download" o "Export" (en la sección Storage)

### Opción 2 — Con pg_dump desde tu terminal
```bash
# Instala pg_dump si no lo tienes: https://www.postgresql.org/download/
pg_dump "tu_url_de_neon" --file="respaldo-crm-$(date +%Y%m%d).sql"
```

### Opción 3 — Desde el CRM (más fácil)
En el CRM → Panel Admin → Respaldo → "Descargar JSON completo"
Esto descarga TODOS tus datos (sin contraseñas) en un archivo JSON.

---

## Cambios importantes registrados

### 2026-06-20
- Proyecto inicial creado con Next.js 16 + Prisma + Auth.js
- Esquema de base de datos completo con todos los modelos
- Seed con 10+ clientes de ejemplo de Puebla, datos de 6 meses
- Build limpio verificado

### Correcciones de TypeScript
- `Uint8Array` vs `Buffer` en Prisma v7: se usa `Buffer.from(data.datos)` al guardar archivos
- Tipos explícitos para HistorialItem y EtapaItem en el dashboard
- Tipos explícitos en filtros de recordatorios

---

## Arquitectura del proyecto

```
app/
  (app)/          ← Rutas protegidas por login
    page.tsx       ← Dashboard / Tablero
    clientes/      ← Lista y expediente de clientes
    embudo/        ← Kanban arrastrar y soltar
    agenda/        ← Calendario de citas
    pagos/         ← Gestión de cobros
    seguimiento/   ← Hoy te toca + recordatorios
    completados/   ← Clientes ganados
    perdidos/      ← Clientes perdidos
    archivados/    ← Clientes archivados
    admin/         ← Panel de administrador (solo ADMIN)
    equipo/        ← Ranking y metas del equipo
    buscar/        ← Buscador global
    compartir/     ← Ligas + QR para difundir
    perfil/        ← Mi perfil y configuración
    ayuda/         ← Tutorial y atajos
    plantillas/    ← Biblioteca de mensajes
  (auth)/         ← Login (sin autenticación)
  agenda/[slug]/  ← Agenda pública por vendedor (sin auth)
  api/            ← Endpoints de API
  actions/        ← Server Actions (lógica de negocio)
  components/     ← Componentes reutilizables
  lib/            ← Utilidades (auth, db, utils)
prisma/
  schema.prisma   ← Esquema de la base de datos
  seed.ts         ← Datos de ejemplo
  migrations/     ← Historial de cambios a la DB
```

## Configuración de producción (Postgres vs SQLite)

- **Local (desarrollo):** SQLite con Turso/LibSQL adapter → `DATABASE_URL="file:./dev.db"`
- **Producción (Vercel):** Cambiar a Postgres de Neon → `DATABASE_URL="postgresql://..."`

El schema.prisma actualmente usa `provider = "sqlite"`. Para producción con Postgres:
1. Cambia `provider = "sqlite"` a `provider = "postgresql"` en schema.prisma
2. Corre `npx prisma migrate deploy` (no migrate dev, no reset)
3. El CRM funciona igual, Prisma maneja ambos

**NUNCA corras `prisma migrate reset` en producción — borra todos los datos.**
