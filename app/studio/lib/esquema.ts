import { z } from "zod/v4"

/**
 * Esquema del diagnóstico de visagismo. Lo usa la API (salida estructurada de Claude)
 * y la interfaz (tipos). Mantener en español: se muestra tal cual al barbero.
 */

export const FORMAS_ROSTRO = [
  "ovalado",
  "redondo",
  "cuadrado",
  "rectangular",
  "alargado",
  "corazon",
  "diamante",
  "triangular",
] as const

export const TIPOS_CRANEO = ["dolicocefalo", "mesocefalo", "braquicefalo", "indeterminado"] as const

const FichaTecnica = z.object({
  laterales: z.string().describe("Técnica y número de máquina/guarda en laterales, p. ej. 'Skin fade a 0.5 → 1.5'"),
  superior: z.string().describe("Largo en cm y técnica en la parte superior"),
  nuca: z.string(),
  transicion: z.string().describe("Tipo de degradado y altura: bajo, medio, alto, taper, etc."),
  herramientas: z.string(),
  texturizado: z.string(),
  peinadoYAcabado: z.string(),
  productos: z.array(z.string()),
  tiempoServicioMin: z.number(),
  mantenimientoSemanas: z.number().describe("Cada cuántas semanas debe volver para conservar la forma"),
  arregloDiarioMin: z.number().describe("Minutos diarios que el cliente necesita para peinarlo"),
})

export const Recomendacion = z.object({
  nombre: z.string(),
  compatibilidad: z.number().describe("0 a 100"),
  porQueFunciona: z.string().describe("Explicación ligada a las medidas y rasgos del cliente"),
  efectoOptico: z.string().describe("Qué corrige o resalta visualmente: alarga, ensancha, equilibra, etc."),
  fichaTecnica: FichaTecnica,
  barba: z.string().describe("Recomendación de barba que acompaña este corte"),
  promptSimulacion: z
    .string()
    .describe(
      "Instrucción EN INGLÉS para un modelo de edición de imagen que describa SOLO el peinado (largo, degradado, textura, dirección, color) y la barba si cambia. Sin describir la cara.",
    ),
})

export const Diagnostico = z.object({
  calidadFotos: z.object({
    aptas: z.boolean(),
    observaciones: z.string(),
  }),
  rostro: z.object({
    forma: z.enum(FORMAS_ROSTRO),
    formaSecundaria: z.enum(FORMAS_ROSTRO).nullable(),
    confianza: z.number().describe("0 a 100"),
    explicacion: z.string(),
    frente: z.string(),
    pomulos: z.string(),
    mandibula: z.string(),
    menton: z.string(),
    nariz: z.string(),
    ojosYCejas: z.string(),
    orejas: z.string(),
    perfil: z.string().describe("Perfil recto, convexo o cóncavo y qué implica"),
    simetria: z.string(),
  }),
  craneo: z.object({
    tipo: z.enum(TIPOS_CRANEO),
    explicacion: z.string(),
    occipital: z.string().describe("Nuca plana, normal o prominente y cómo compensarla"),
    coronilla: z.string(),
    remolinos: z.string(),
    zonasACompensar: z.array(z.string()),
  }),
  cabello: z.object({
    tipoRizo: z.string().describe("Clasificación 1A–4C"),
    descripcion: z.string(),
    grosor: z.enum(["fino", "medio", "grueso"]),
    densidad: z.enum(["baja", "media", "alta"]),
    comportamiento: z.string().describe("Cómo se comporta al cortarlo: se para, cae, se esponja, etc."),
    lineaFrontal: z.string(),
    escalaNorwood: z.string().describe("I a VII o 'No aplica'"),
    canas: z.string(),
    estadoCueroCabelludo: z.string(),
  }),
  barba: z.object({
    presente: z.boolean(),
    densidad: z.string(),
    observaciones: z.string(),
  }),
  recomendaciones: z.array(Recomendacion).describe("Exactamente 3, ordenadas de mayor a menor compatibilidad"),
  evitar: z.array(z.object({ corte: z.string(), razon: z.string() })),
  color: z.object({
    recomendacion: z.string(),
    tonos: z.array(z.string()),
    advertencias: z.string(),
  }),
  cuidadoEnCasa: z.array(z.string()),
  serviciosComplementarios: z
    .array(z.object({ servicio: z.string(), motivo: z.string() }))
    .describe("Servicios adicionales de barbería/estética que sí aportan a este cliente"),
  resumenCliente: z.string().describe("3-4 frases cálidas y claras para explicarle al cliente su diagnóstico"),
  notaSalud: z
    .string()
    .nullable()
    .describe("Solo si se observan señales que ameriten dermatólogo (alopecia activa, descamación severa). Si no, null"),
})

export type TDiagnostico = z.infer<typeof Diagnostico>
export type TRecomendacion = z.infer<typeof Recomendacion>

/** Medidas objetivas obtenidas con malla facial (MediaPipe) en el navegador. */
export type Medidas = {
  largoAncho: number // largo facial / ancho bicigomático
  mandibulaPomulo: number // ancho mandibular / ancho de pómulos
  frentePomulo: number // ancho de frente / ancho de pómulos
  tercios: { superior: number; medio: number; inferior: number } // % del largo facial medido
  ojosBocaLargo: number // distancia vertical ojos-boca / largo facial (Pallett 2010 ≈ 0.36)
  interocularAncho: number // distancia entre pupilas / ancho facial (Pallett 2010 ≈ 0.46)
  simetria: number // 0-100
  inclinacion: number // grados de giro de la cabeza (calidad de foto)
  formaGeometrica: (typeof FORMAS_ROSTRO)[number]
}

export type Contexto = {
  nombre: string
  edad: string
  ocupacion: string
  arregloDiario: "5" | "10" | "20"
  objetivo: string
  conservarLargo: boolean
  abiertoAColor: boolean
}

export const ETIQUETA_FORMA: Record<(typeof FORMAS_ROSTRO)[number], string> = {
  ovalado: "Ovalado",
  redondo: "Redondo",
  cuadrado: "Cuadrado",
  rectangular: "Rectangular",
  alargado: "Alargado",
  corazon: "Corazón",
  diamante: "Diamante",
  triangular: "Triangular",
}

export const ETIQUETA_CRANEO: Record<(typeof TIPOS_CRANEO)[number], string> = {
  dolicocefalo: "Dolicocéfalo (alargado)",
  mesocefalo: "Mesocéfalo (proporcionado)",
  braquicefalo: "Braquicéfalo (ancho/corto)",
  indeterminado: "Indeterminado",
}
