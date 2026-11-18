# Visage · Estudio de visagismo con IA para barberías

Producto que se vende por suscripción mensual a barberías y estéticas. Cada barbería tiene su cuenta, su marca, su catálogo y sus clientes.

## Cómo se usa

| Quién | Dónde | Qué hace |
|---|---|---|
| Tú (administrador) | CRM → **Barberías (Visage)** (`/barberias`) | Das de alta cada barbería con su PIN, plan y límite mensual. Ves su uso y sus ventas. Puedes abrir su estudio para configurarlo o hacer una demo. |
| La barbería | **`/studio`** en su iPad o celular (se instala como app) | Entra con su código y PIN. En Ajustes carga su logo, color, WhatsApp, Instagram, enlace de agenda, catálogo con precios y barberos. |
| El cliente final | Enlace **`/v/…`** que recibe por WhatsApp | Ve su antes/después, su diagnóstico, su rutina, los productos recomendados y la fecha de su próximo corte, con la marca de la barbería. |

## Flujo en el sillón

1. **Datos del cliente:** nombre, WhatsApp, objetivo, tiempo para peinarse y barbero que atiende, más el consentimiento (LFPDPPP). Si el cliente ya vino antes, se reconoce por su teléfono.
2. **Fotos guiadas:** frente, perfiles y coronilla. Cada foto pasa un **control de calidad** (luz, nitidez, rostro detectado, inclinación y tamaño).
3. **Medición en el dispositivo:** MediaPipe mide 478 puntos de la cara.
4. **Diagnóstico con Claude:**
   - Rostro, cráneo, cabello y barba.
   - 3 cortes con ficha técnica.
   - Servicios y productos **del catálogo de la barbería con su precio**.
   - Continuidad con la visita anterior.
5. **Simulación antes/después** (Gemini): hasta 6 por cliente.
6. **Cerrar servicio:**
   - El barbero registra el corte que hizo y quién lo hizo.
   - Toma la **foto real del resultado** y marca lo que cobró.
   - Fija la fecha de la próxima visita.
7. **Entrega:** enlace al cliente por WhatsApp, **post antes/después para Instagram** (1080×1350 con logo) y PDF.

## Panel del dueño (lo que justifica la mensualidad)

- **Venta adicional:** servicios y productos cobrados además del corte.
- **Ticket promedio** y porcentaje de clientes que eligieron el corte recomendado.
- **Clientes que ya deben regresar**, cada uno con botón de WhatsApp y un mensaje listo que incluye su diagnóstico.
- Cortes más elegidos, formas de rostro atendidas y ventas por barbero.

## Seguridad y costos bajo control

- La sesión de cada barbería va en una cookie firmada. Con 5 PIN equivocados se bloquea 15 minutos.
- Ninguna barbería ve los datos de otra. Sin sesión, la API responde 401.
- Hay un **límite mensual de diagnósticos por plan**; al llegar al límite se avisa y no se consume IA.
- La ficha técnica no aparece en el enlace del cliente, para proteger el trabajo del barbero.
- Las tablas se crean solas en Turso la primera vez que se usa la función, igual que en la agenda. Solo se agregan tablas; no se toca nada existente.

## Variables de entorno (Vercel)

| Variable | Para qué |
|---|---|
| `ANTHROPIC_API_KEY` | Diagnóstico (ya existe en el CRM) |
| `GEMINI_API_KEY` | Simulación del corte. Se crea en aistudio.google.com/apikey |
| `GEMINI_IMAGE_MODEL` | Opcional. Por defecto `gemini-3.1-flash-image`, con respaldo `gemini-2.5-flash-image` |

## Costo por cliente y planes sugeridos

Costo de IA por cliente: el diagnóstico sale en aprox. US$0.15–0.25; cada simulación cuesta unos centavos de dólar (revisa la tarifa vigente de Gemini). **En total, menos de ~$10 MXN por cliente.**

| Plan | Diagnósticos/mes | Costo IA aprox. (peor caso) |
|---|---|---|
| Básico | 60 | ~$600 MXN |
| Pro | 150 | ~$1,500 MXN |
| Ilimitado | 1,000 (tope técnico) | se cotiza |

Pon el precio con base en el retorno que el panel le muestra a la barbería, no en el costo. Un ejemplo para hacer la cuenta, **no un resultado medido**: si 1 de cada 3 clientes agrega un servicio de $180, con 150 diagnósticos son unos $9,000 MXN extra al mes.

## Archivos

- `app/studio/`: la app de la barbería (componentes y librerías).
- `app/api/studio/*`: API (sesión, análisis, simulación, expediente, clientes, panel y ajustes).
- `app/v/[token]`: página pública del cliente.
- `app/(app)/barberias` y `app/actions/barberias.ts`: tu administración en el CRM.
- `prisma/schema.prisma`: modelos `Barberia`, `ClienteVisage` y `DiagnosticoVisage`, con su migración.
