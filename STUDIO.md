# Visage · Estudio de visagismo con IA para barberías

Ruta: **`/studio`**. Funciona en iPad, celular o computadora y se puede instalar como app (Compartir → Agregar a inicio).

## Flujo en el sillón

1. **Datos y consentimiento.** Nombre, edad, ocupación, qué busca, tiempo diario para peinarse, si quiere conservar el largo y si acepta color. El consentimiento de fotos es obligatorio porque son datos personales sensibles (LFPDPPP).
2. **Toma guiada de 4 fotos:** frente, perfil izquierdo, perfil derecho y coronilla (opcional). Cada toma trae una silueta guía, temporizador de 3 s y la opción de subir una foto.
3. **Medición objetiva en el dispositivo.** MediaPipe Face Landmarker mide 478 puntos de la cara: largo/ancho, mandíbula/pómulos, frente/pómulos, tercios faciales, proporciones de Pallett (2010) y simetría. Este paso no sale del dispositivo.
4. **Diagnóstico con Claude** (fotos + medidas + contexto):
   - Rostro: forma, rasgos y perfil.
   - Cráneo: dolicocéfalo, mesocéfalo o braquicéfalo, forma de la nuca y remolinos.
   - Cabello: tipo 1A–4C, grosor, densidad, cómo se comporta al cortarlo, escala Norwood y canas.
   - Barba.
   - 3 cortes ordenados por compatibilidad, cada uno con **ficha técnica** (guardas, degradado, largos, texturizado, productos, tiempo y semanas de mantenimiento).
   - Qué evitar, color sugerido, cuidado en casa y servicios complementarios.
5. **Simulación antes/después** con Gemini (Nano Banana). El corte principal se simula solo; los otros dos y cualquier idea del cliente se simulan con un botón. El comparador es deslizable.
6. **Entrega.** PDF (imprimir), resumen por WhatsApp, botón para agendar el mantenimiento y un historial de los últimos 20 clientes, guardado solo en ese dispositivo.
7. **Base científica.** 11 referencias publicadas, cada una con lo que dice y cómo se aplica al diagnóstico.

## Variables de entorno (Vercel → Settings → Environment Variables)

| Variable | Para qué | Obligatoria |
|---|---|---|
| `ANTHROPIC_API_KEY` | Diagnóstico (ya la usa el CRM) | Sí |
| `GEMINI_API_KEY` | Simulación del corte. Se crea en aistudio.google.com/apikey | Para simular |
| `STUDIO_PIN` | PIN que le das a la barbería para usar `/studio` sin cuenta del CRM | Recomendado |
| `GEMINI_IMAGE_MODEL` | Cambiar el modelo de imagen (por defecto `gemini-3.1-flash-image`, con respaldo `gemini-2.5-flash-image`) | No |

Sin `STUDIO_PIN`, solo entra quien tenga sesión en el CRM. Así nadie gasta tus créditos de IA con el enlace público.

## Costo aproximado por cliente

- Diagnóstico (Claude Opus 5.5, US$4 / US$20 por millón de tokens): con 4 fotos son ~8k tokens de entrada y ~5–8k de salida, alrededor de **US$0.15–0.25**.
- Cada simulación con Gemini cuesta unos centavos de dólar. Revisa la tarifa vigente del modelo de imagen en Google AI Studio.

## Archivos

- `app/studio/`: interfaz (cámara, resultados, comparador, historial) y librerías (`esquema.ts`, `medidas.ts`, `estudios.ts`).
- `app/api/studio/analizar`: diagnóstico con salida estructurada.
- `app/api/studio/simular`: edición de imagen.
- `app/api/studio/estado`: indica qué llaves están configuradas.
