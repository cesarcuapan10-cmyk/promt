"use client"

import { PUNTOS_GUIA, type ResultadoMedicion } from "../lib/medidas"

/** Foto frontal con la malla de medición encima: el cliente ve qué se midió. */
export function MapaFacial({ foto, medicion }: { foto: string; medicion: ResultadoMedicion | null }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={foto} alt="Foto frontal del cliente" className="block h-auto w-full" />
      {medicion && (
        <svg
          viewBox={`0 0 ${medicion.ancho} ${medicion.alto}`}
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
        >
          <polyline
            points={PUNTOS_GUIA.ovalo.map((i) => `${medicion.puntos[i].x},${medicion.puntos[i].y}`).join(" ")}
            fill="none"
            stroke="#d4af6a"
            strokeWidth={medicion.ancho / 300}
            strokeDasharray={`${medicion.ancho / 90} ${medicion.ancho / 140}`}
          />
          {PUNTOS_GUIA.lineas.map(([a, b]) => (
            <line
              key={`${a}-${b}`}
              x1={medicion.puntos[a].x}
              y1={medicion.puntos[a].y}
              x2={medicion.puntos[b].x}
              y2={medicion.puntos[b].y}
              stroke="#ffffff"
              strokeOpacity={0.75}
              strokeWidth={medicion.ancho / 450}
            />
          ))}
          {PUNTOS_GUIA.tercios.map((i) => (
            <g key={i}>
              <line
                x1={medicion.puntos[i].x - medicion.ancho * 0.16}
                x2={medicion.puntos[i].x + medicion.ancho * 0.16}
                y1={medicion.puntos[i].y}
                y2={medicion.puntos[i].y}
                stroke="#d4af6a"
                strokeOpacity={0.8}
                strokeWidth={medicion.ancho / 500}
              />
              <circle cx={medicion.puntos[i].x} cy={medicion.puntos[i].y} r={medicion.ancho / 160} fill="#d4af6a" />
            </g>
          ))}
        </svg>
      )}
    </div>
  )
}
