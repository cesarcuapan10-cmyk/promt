"use server"
import { signIn } from "@/app/lib/auth"
import { redirect } from "next/navigation"
import { AuthError } from "next-auth"

export async function loginAction(correo: string, contrasena: string) {
  try {
    await signIn("credentials", { correo, contrasena, redirect: false })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Correo o contraseña incorrectos." }
    }
    throw error
  }
  redirect("/clientes")
}
