"use client"

import { useState, useTransition } from "react"
import { Modal } from "@/app/components/ui/Modal"
import { Button } from "@/app/components/ui/Button"
import { Input, Select } from "@/app/components/ui/Input"
import { crearRecordatorio } from "@/app/actions/seguimiento"
import { useRouter } from "next/navigation"

interface Props {
  abierto: boolean
  onCerrar: () => void
  clientes: { id: string; nombre: string }[]
}

export function ModalRecordatorio({ abierto, onCerrar, clientes }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    titulo: "",
    tipo: "LLAMADA",
    fechaHora: "",
    clienteId: "",
  })
  const [error, setError] = useState("")

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo || !form.fechaHora) {
      setError("Título y fecha/hora son obligatorios")
      return
    }
    setError("")
    startTransition(async () => {
      try {
        const dt = new Date(form.fechaHora)
        const fecha = dt.toISOString().split("T")[0]
        const hora = dt.toTimeString().slice(0, 5)
        await crearRecordatorio({
          titulo: form.titulo,
          fecha,
          hora,
          clienteId: form.clienteId || null,
        })
        setForm({ titulo: "", tipo: "LLAMADA", fechaHora: "", clienteId: "" })
        onCerrar()
        router.refresh()
      } catch {
        setError("Error al crear el recordatorio")
      }
    })
  }

  const tipoOpciones = [
    { valor: "LLAMADA", label: "Llamada" },
    { valor: "WHATSAPP", label: "WhatsApp" },
    { valor: "EMAIL", label: "Email" },
    { valor: "REUNION", label: "Reunión" },
    { valor: "OTRO", label: "Otro" },
  ]

  const clienteOpciones = [
    { valor: "", label: "Sin cliente" },
    ...clientes.map((c) => ({ valor: c.id, label: c.nombre })),
  ]

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Nueva tarea" tamaño="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Título *"
          name="titulo"
          value={form.titulo}
          onChange={handleChange}
          placeholder="Ej: Llamar a Juan"
          required
        />
        <Select
          label="Tipo"
          name="tipo"
          value={form.tipo}
          onChange={handleChange}
          opciones={tipoOpciones}
        />
        <Input
          label="Fecha y hora *"
          name="fechaHora"
          type="datetime-local"
          value={form.fechaHora}
          onChange={handleChange}
          required
        />
        <Select
          label="Cliente (opcional)"
          name="clienteId"
          value={form.clienteId}
          onChange={handleChange}
          opciones={clienteOpciones}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" cargando={isPending}>
            Crear tarea
          </Button>
        </div>
      </form>
    </Modal>
  )
}
