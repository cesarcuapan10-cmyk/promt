"use client"

import { cargarImagen } from "./imagen"

/**
 * Genera el post de antes/después (1080×1350, formato vertical de Instagram) con la marca
 * de la barbería. Cada cliente atendido se vuelve contenido para redes.
 */
export async function componerPost(o: {
  antes: string
  despues: string
  barberia: { nombre: string; colorMarca: string; logo: string | null; instagram: string }
  corte: string
  esSimulacion: boolean
}): Promise<Blob> {
  const W = 1080
  const H = 1350
  const c = document.createElement("canvas")
  c.width = W
  c.height = H
  const ctx = c.getContext("2d")!
  const color = o.barberia.colorMarca || "#d4af6a"

  ctx.fillStyle = "#0b0b0c"
  ctx.fillRect(0, 0, W, H)

  // Encabezado
  let x = 60
  if (o.barberia.logo) {
    const logo = await cargarImagen(o.barberia.logo).catch(() => null)
    if (logo) {
      redondeado(ctx, 60, 50, 90, 90, 18)
      ctx.save()
      ctx.clip()
      ctx.drawImage(logo, 60, 50, 90, 90)
      ctx.restore()
      x = 170
    }
  }
  ctx.fillStyle = "#ffffff"
  ctx.font = "600 44px system-ui, -apple-system, sans-serif"
  ctx.fillText(o.barberia.nombre, x, 100)
  ctx.fillStyle = color
  ctx.font = "500 24px system-ui, -apple-system, sans-serif"
  ctx.fillText("VISAGISMO CON IA", x, 136)

  // Fotos lado a lado
  const [a, d] = await Promise.all([cargarImagen(o.antes), cargarImagen(o.despues)])
  const top = 190
  const fw = 470
  const fh = 800
  const gap = 20
  const izq = (W - fw * 2 - gap) / 2
  dibujarCubriendo(ctx, a, izq, top, fw, fh, 28)
  dibujarCubriendo(ctx, d, izq + fw + gap, top, fw, fh, 28)
  etiqueta(ctx, "ANTES", izq + 24, top + 24, "rgba(0,0,0,0.65)", "#ffffff")
  etiqueta(ctx, o.esSimulacion ? "SIMULACIÓN" : "DESPUÉS", izq + fw + gap + 24, top + 24, color, "#0b0b0c")

  // Pie
  ctx.fillStyle = "#ffffff"
  ctx.font = "600 52px system-ui, -apple-system, sans-serif"
  envolver(ctx, o.corte, 60, 1080, W - 120, 60)
  ctx.fillStyle = "rgba(255,255,255,0.55)"
  ctx.font = "400 28px system-ui, -apple-system, sans-serif"
  ctx.fillText("Diagnóstico de rostro, cráneo y cabello con 478 puntos medidos", 60, 1240)
  if (o.barberia.instagram) {
    ctx.fillStyle = color
    ctx.font = "600 30px system-ui, -apple-system, sans-serif"
    ctx.fillText(`@${o.barberia.instagram}`, 60, 1290)
  }

  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("No se pudo generar"))), "image/jpeg", 0.92))
}

export async function compartirOdescargar(blob: Blob, nombre: string, texto: string) {
  const archivo = new File([blob], nombre, { type: "image/jpeg" })
  if (navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], text: texto })
      return
    } catch {
      // cancelado: se descarga
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = nombre
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

function redondeado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function dibujarCubriendo(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, r: number) {
  const escala = Math.max(w / img.naturalWidth, h / img.naturalHeight)
  const sw = w / escala
  const sh = h / escala
  const sx = (img.naturalWidth - sw) / 2
  // Para retratos, el rostro suele estar en el tercio superior: se recorta más abajo que arriba
  const sy = Math.max(0, Math.min(img.naturalHeight - sh, (img.naturalHeight - sh) * 0.3))
  ctx.save()
  redondeado(ctx, x, y, w, h, r)
  ctx.clip()
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
  ctx.restore()
}

function etiqueta(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, fondo: string, colorTexto: string) {
  ctx.font = "700 24px system-ui, -apple-system, sans-serif"
  const w = ctx.measureText(texto).width + 36
  ctx.fillStyle = fondo
  redondeado(ctx, x, y, w, 46, 23)
  ctx.fill()
  ctx.fillStyle = colorTexto
  ctx.fillText(texto, x + 18, y + 32)
}

function envolver(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, ancho: number, alto: number) {
  const palabras = texto.split(" ")
  let linea = ""
  let lineas = 0
  for (const p of palabras) {
    const prueba = linea ? `${linea} ${p}` : p
    if (ctx.measureText(prueba).width > ancho && linea) {
      ctx.fillText(linea, x, y + lineas * alto)
      linea = p
      if (++lineas === 2) return
    } else linea = prueba
  }
  ctx.fillText(linea, x, y + lineas * alto)
}
