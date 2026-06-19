import { auth } from "@/app/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const esLogueado = !!req.auth
  const { pathname } = req.nextUrl

  const rutasPublicas = ["/login", "/landing", "/agenda/", "/api/public/"]
  const esPublica =
    rutasPublicas.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"

  if (!esLogueado && !esPublica) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (esLogueado && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)"],
}
