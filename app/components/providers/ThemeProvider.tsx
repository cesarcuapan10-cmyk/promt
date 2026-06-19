"use client"
import { createContext, useContext, useEffect, useState, useCallback } from "react"

type Tema = "CLARO" | "OSCURO" | "AUTOMATICO"

interface TemaContextType {
  tema: Tema
  setTema: (t: Tema) => void
}

const TemaContext = createContext<TemaContextType>({
  tema: "AUTOMATICO",
  setTema: () => {},
})

function aplicarTema(t: Tema) {
  const root = document.documentElement
  if (t === "CLARO") {
    root.classList.remove("dark")
  } else if (t === "OSCURO") {
    root.classList.add("dark")
  } else {
    const prefiereDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    root.classList.toggle("dark", prefiereDark)
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [tema, setTemaState] = useState<Tema>("AUTOMATICO")

  useEffect(() => {
    const guardado = (localStorage.getItem("tema") as Tema) || "AUTOMATICO"
    setTemaState(guardado)
    aplicarTema(guardado)
  }, [])

  const setTema = useCallback((t: Tema) => {
    setTemaState(t)
    localStorage.setItem("tema", t)
    aplicarTema(t)
  }, [])

  // Escuchar cambios del sistema cuando está en "Automático"
  useEffect(() => {
    if (tema !== "AUTOMATICO") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => aplicarTema("AUTOMATICO")
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [tema])

  return (
    <TemaContext.Provider value={{ tema, setTema }}>
      {children}
    </TemaContext.Provider>
  )
}

export const useTema = () => useContext(TemaContext)
