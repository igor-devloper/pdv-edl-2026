// app/api/igor/usuarios/route.ts
// Retorna lista de todos os usuários (para filtros no painel Igor)

import { NextResponse } from "next/server"
import { clerkClient } from "@clerk/nextjs/server"
import { getCargoUsuario, isIgor } from "@/lib/auth-server"
import { auth } from "@clerk/nextjs/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  const cargo = await getCargoUsuario()
  if (!isIgor(cargo)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 })

  const client = await clerkClient()
  const res = await client.users.getUserList({ limit: 200 })

  const users = res.data.map((u) => ({
    id:    u.id,
    nome:  [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
           u.emailAddresses?.[0]?.emailAddress ||
           "Sem nome",
    email: u.emailAddresses?.[0]?.emailAddress ?? null,
    role:  (u.publicMetadata?.role as string | undefined) ?? null,
  }))

  return NextResponse.json({ users })
}
