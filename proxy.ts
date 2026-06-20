import { auth } from "@/app/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Rutas públicas — no requieren sesión
  const esPublica =
    pathname === "/" ||
    pathname.startsWith("/agenda/") ||
    pathname.startsWith("/api/landing/") ||
    pathname.startsWith("/api/agenda-publica/") ||
    pathname.startsWith("/api/qr") ||
    pathname.startsWith("/api/onboarding-complete") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/manifest.json"

  if (esPublica) return NextResponse.next()

  // Protegido: requiere sesión
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
