/** Utilidades de imagen en el navegador: reducir tamaño antes de subir y convertir formatos. */

export const LADO_MAX = 1024

export function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("No se pudo leer la imagen"))
    img.src = src
  })
}

/** Dibuja una fuente (video o imagen) en un canvas reducido y devuelve un data URL JPEG. */
export function aJpeg(
  fuente: HTMLVideoElement | HTMLImageElement,
  { espejo = false, ladoMax = LADO_MAX, calidad = 0.88 } = {},
): string {
  const w = fuente instanceof HTMLVideoElement ? fuente.videoWidth : fuente.naturalWidth
  const h = fuente instanceof HTMLVideoElement ? fuente.videoHeight : fuente.naturalHeight
  const escala = Math.min(1, ladoMax / Math.max(w, h))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(w * escala)
  canvas.height = Math.round(h * escala)
  const ctx = canvas.getContext("2d")!
  if (espejo) {
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(fuente, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL("image/jpeg", calidad)
}

export async function archivoAJpeg(archivo: File): Promise<string> {
  const url = URL.createObjectURL(archivo)
  try {
    const img = await cargarImagen(url)
    return aJpeg(img)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function soloBase64(dataUrl: string) {
  return dataUrl.slice(dataUrl.indexOf(",") + 1)
}

/** Reduce una imagen ya en data URL (para guardar historial sin llenar el almacenamiento). */
export async function miniatura(dataUrl: string, ladoMax = 360) {
  const img = await cargarImagen(dataUrl)
  return aJpeg(img, { ladoMax, calidad: 0.75 })
}
