import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const isProtected = createRouteMatcher(["/app(.*)"])
const isAdminRoute = createRouteMatcher(["/app/admin(.*)", "/app/dashboard(.*)"])
const isStockRoute = createRouteMatcher(["/app/estoque(.*)", "/app/produtos(.*)"])
const isSellRoute = createRouteMatcher(["/app/pdv(.*)"])

export default clerkMiddleware(async (auth, req) => {
  if (!isProtected(req)) return NextResponse.next()

  const { userId } = await auth()
  if (!userId) return NextResponse.redirect(new URL("/login", req.url))

  // role check é melhor fazer no server (pra não depender de middleware buscar user)
  // aqui você pode só proteger "área app" e fazer o RBAC dentro das páginas/handlers.
  // (se quiser forte no middleware: dá, mas envolve buscar user e aumenta latência.)
  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
}
