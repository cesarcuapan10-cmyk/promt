"use client"

import type { FaceLandmarker } from "@mediapipe/tasks-vision"
import type { FORMAS_ROSTRO, Medidas } from "./esquema"
import { cargarImagen } from "./imagen"

/**
 * Medición facial objetiva con MediaPipe Face Landmarker (478 puntos), 100% en el navegador:
 * la foto no sale del dispositivo para este paso.
 */

const VERSION = "1.2.3"
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`
const MODELO =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"

// Índices de la malla facial de MediaPipe
const P = {
  frenteSup: 10,
  menton: 152,
  glabela: 9,
  subnasal: 2,
  bocaCentro: 13,
  pomuloIzq: 234,
  pomuloDer: 454,
  mandibulaIzq: 172,
  mandibulaDer: 397,
  frenteIzq: 54,
  frenteDer: 284,
  pupilaIzq: 468,
  pupilaDer: 473,
  ojoExtIzq: 33,
  ojoExtDer: 263,
  narizPunta: 1,
}

// Pares izquierda/derecha para el índice de simetría
const PARES: [number, number][] = [
  [33, 263],
  [133, 362],
  [61, 291],
  [234, 454],
  [172, 397],
  [70, 300],
  [105, 334],
  [129, 358],
]

let landmarkerPromesa: Promise<FaceLandmarker> | null = null

function obtenerLandmarker() {
  if (!landmarkerPromesa) {
    landmarkerPromesa = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision")
      const fileset = await FilesetResolver.forVisionTasks(WASM)
      return FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODELO, delegate: "CPU" },
        runningMode: "IMAGE",
        numFaces: 1,
      })
    })().catch((e) => {
      landmarkerPromesa = null
      throw e
    })
  }
  return landmarkerPromesa
}

/** Precarga el modelo mientras el barbero toma las fotos. */
export function precargarMedicion() {
  obtenerLandmarker().catch(() => {})
}

export type Punto = { x: number; y: number }

export type ResultadoMedicion = { medidas: Medidas; puntos: Punto[]; ancho: number; alto: number }

export async function medirRostro(fotoFrontal: string): Promise<ResultadoMedicion | null> {
  try {
    const landmarker = await obtenerLandmarker()
    const img = await cargarImagen(fotoFrontal)
    const res = landmarker.detect(img)
    const lm = res.faceLandmarks?.[0]
    if (!lm || lm.length < 474) return null

    // Coordenadas en píxeles para que las distancias no se deformen por la relación de aspecto
    const pts: Punto[] = lm.map((p) => ({ x: p.x * img.naturalWidth, y: p.y * img.naturalHeight }))
    const d = (a: number, b: number) => Math.hypot(pts[a].x - pts[b].x, pts[a].y - pts[b].y)

    const largo = d(P.frenteSup, P.menton)
    const anchoPomulos = d(P.pomuloIzq, P.pomuloDer)
    const anchoMandibula = d(P.mandibulaIzq, P.mandibulaDer)
    const anchoFrente = d(P.frenteIzq, P.frenteDer)

    const tSup = d(P.frenteSup, P.glabela)
    const tMed = d(P.glabela, P.subnasal)
    const tInf = d(P.subnasal, P.menton)
    const tTotal = tSup + tMed + tInf

    const pupilaMedia = {
      x: (pts[P.pupilaIzq].x + pts[P.pupilaDer].x) / 2,
      y: (pts[P.pupilaIzq].y + pts[P.pupilaDer].y) / 2,
    }
    const ojosBoca = Math.hypot(pupilaMedia.x - pts[P.bocaCentro].x, pupilaMedia.y - pts[P.bocaCentro].y)
    const interocular = d(P.pupilaIzq, P.pupilaDer)

    // Inclinación (roll) a partir de la línea de los ojos
    const dx = pts[P.ojoExtDer].x - pts[P.ojoExtIzq].x
    const dy = pts[P.ojoExtDer].y - pts[P.ojoExtIzq].y
    const inclinacion = (Math.atan2(dy, dx) * 180) / Math.PI

    // Simetría: distancia de cada punto al eje medio (glabela → mentón), comparada con su par
    const eje = { a: pts[P.glabela], b: pts[P.menton] }
    const distEje = (p: Punto) => {
      const { a, b } = eje
      const num = Math.abs((b.y - a.y) * p.x - (b.x - a.x) * p.y + b.x * a.y - b.y * a.x)
      return num / Math.hypot(b.y - a.y, b.x - a.x)
    }
    const difs = PARES.map(([i, j]) => {
      const di = distEje(pts[i])
      const dj = distEje(pts[j])
      return Math.abs(di - dj) / Math.max(di, dj, 1)
    })
    const simetria = Math.max(0, Math.min(100, 100 - (difs.reduce((s, v) => s + v, 0) / difs.length) * 100))

    const largoAncho = largo / anchoPomulos
    const mandibulaPomulo = anchoMandibula / anchoPomulos
    const frentePomulo = anchoFrente / anchoPomulos

    const medidas: Medidas = {
      largoAncho: redondear(largoAncho),
      mandibulaPomulo: redondear(mandibulaPomulo),
      frentePomulo: redondear(frentePomulo),
      tercios: {
        superior: Math.round((tSup / tTotal) * 100),
        medio: Math.round((tMed / tTotal) * 100),
        inferior: Math.round((tInf / tTotal) * 100),
      },
      ojosBocaLargo: redondear(ojosBoca / largo),
      interocularAncho: redondear(interocular / anchoPomulos),
      simetria: Math.round(simetria),
      inclinacion: Math.round(inclinacion * 10) / 10,
      formaGeometrica: clasificar(largoAncho, mandibulaPomulo, frentePomulo),
    }
    return { medidas, puntos: pts, ancho: img.naturalWidth, alto: img.naturalHeight }
  } catch (e) {
    console.warn("Medición facial no disponible:", e)
    return null
  }
}

function redondear(n: number) {
  return Math.round(n * 100) / 100
}

/**
 * Pre-clasificación geométrica. La malla va del alto de la frente (no del nacimiento del cabello)
 * al mentón y el ancho se toma casi a la altura del trago, así que la razón largo/ancho
 * sale menor que con cinta métrica (≈1.0–1.3). Los umbrales están ajustados a esa escala.
 * Es solo un punto de partida: la IA confirma o corrige con las fotos.
 */
function clasificar(la: number, mp: number, fp: number): (typeof FORMAS_ROSTRO)[number] {
  if (la >= 1.22) return mp >= 0.86 ? "rectangular" : "alargado"
  if (fp < 0.78 && mp < 0.78) return "diamante"
  if (fp >= 0.92 && mp < 0.78) return "corazon"
  if (mp > fp + 0.1) return "triangular"
  if (la <= 1.02) return mp >= 0.88 ? "cuadrado" : "redondo"
  return mp >= 0.9 ? "cuadrado" : "ovalado"
}

/** Puntos que se dibujan sobre la foto para mostrar al cliente qué se midió. */
export const PUNTOS_GUIA = {
  lineas: [
    [P.frenteSup, P.menton],
    [P.pomuloIzq, P.pomuloDer],
    [P.mandibulaIzq, P.mandibulaDer],
    [P.frenteIzq, P.frenteDer],
    [P.pupilaIzq, P.pupilaDer],
  ] as [number, number][],
  tercios: [P.frenteSup, P.glabela, P.subnasal, P.menton],
  // Contorno del óvalo facial de MediaPipe
  ovalo: [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150,
    136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10,
  ],
}
