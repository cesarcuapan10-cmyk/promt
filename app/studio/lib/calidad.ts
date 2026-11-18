"use client"

import { cargarImagen } from "./imagen"
import { medirRostro } from "./medidas"
import type { Vista } from "../components/Camara"

/**
 * Revisión rápida de calidad al tomar la foto: si la foto es mala, el diagnóstico y la
 * simulación salen mal y el barbero pierde la confianza en la herramienta.
 */
export type Calidad = { estado: "revisando" | "ok" | "aviso"; avisos: string[] }

export async function revisarCalidad(foto: string, vista: Vista): Promise<Calidad> {
  const avisos: string[] = []
  const img = await cargarImagen(foto)

  // Luz y nitidez sobre una versión pequeña en escala de grises
  const lado = 256
  const escala = lado / Math.max(img.naturalWidth, img.naturalHeight)
  const w = Math.round(img.naturalWidth * escala)
  const h = Math.round(img.naturalHeight * escala)
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)
  const gris = new Float32Array(w * h)
  let suma = 0
  for (let i = 0; i < w * h; i++) {
    const g = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
    gris[i] = g
    suma += g
  }
  const brillo = suma / (w * h)
  if (brillo < 65) avisos.push("Poca luz: acerca al cliente a la luz o enciende la del espejo")
  if (brillo > 215) avisos.push("Foto sobreexpuesta: evita la luz directa por detrás o de frente")

  // Varianza del laplaciano: valores muy bajos = foto movida o fuera de foco
  let n = 0
  let media = 0
  let m2 = 0
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const lap = gris[i - w] + gris[i + w] + gris[i - 1] + gris[i + 1] - 4 * gris[i]
      n++
      const d = lap - media
      media += d / n
      m2 += d * (lap - media)
    }
  }
  if (m2 / n < 12) avisos.push("Foto movida o desenfocada: repite con el iPad firme")

  if (vista === "frente") {
    const m = await medirRostro(foto)
    if (!m) {
      avisos.push("No se detectó el rostro de frente: que mire a la cámara, sin gorra ni lentes")
    } else {
      if (Math.abs(m.medidas.inclinacion) > 8) avisos.push("Cabeza inclinada: barbilla recta y mirada al frente")
      const p = m.puntos
      const anchoCara = Math.hypot(p[454].x - p[234].x, p[454].y - p[234].y) / m.ancho
      if (anchoCara < 0.2) avisos.push("El rostro sale pequeño: acércate hasta llenar la guía")
    }
  }

  return { estado: avisos.length ? "aviso" : "ok", avisos }
}
