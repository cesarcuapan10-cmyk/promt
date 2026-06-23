import "dotenv/config"
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { db } from "@/app/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"

const loginSchema = z.object({
  correo: z.string().email(),
  contrasena: z.string().min(1),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        correo: { label: "Correo", type: "email" },
        contrasena: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { correo, contrasena } = parsed.data

        // Verificar intentos de login (anti-fuerza bruta simple)
        const intentosRecientes = await db.intentoLogin.count({
          where: {
            correo,
            exitoso: false,
            creadoEn: { gte: new Date(Date.now() - 15 * 60 * 1000) },
          },
        })

        if (intentosRecientes >= 5) {
          throw new Error("Demasiados intentos. Espera 15 minutos.")
        }

        const usuario = await db.usuario.findUnique({ where: { correo } })

        const valido = usuario
          ? await bcrypt.compare(contrasena, usuario.contraseñaHash)
          : false

        await db.intentoLogin.create({
          data: {
            correo,
            exitoso: valido && !!usuario?.activo,
            usuarioId: valido && usuario ? usuario.id : null,
          },
        })

        if (!usuario || !usuario.activo || !valido) return null

        return {
          id: usuario.id,
          email: usuario.correo,
          name: usuario.nombre,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          rol: usuario.rol as any,
          nombre: usuario.nombre,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.rol = (user as any).rol
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.nombre = (user as any).nombre
      }
      return token
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(session.user as any).rol = token.rol
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(session.user as any).nombre = token.nombre
      }
      return session
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
})
