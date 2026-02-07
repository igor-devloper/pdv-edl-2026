import { NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { getCargoUsuario, isAdmin } from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })

  const cargo = await getCargoUsuario()
  if (!isAdmin(cargo)) return NextResponse.json({ error: "sem permissão" }, { status: 403 })

  const res = await (await clerkClient()).users.getUserList({ limit: 100 })

  const users = res.data.map((u) => ({
    id: u.id,
    nome:
      [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
      u.username ||
      u.emailAddresses?.[0]?.emailAddress ||
      "Sem nome",
    email: u.emailAddresses?.[0]?.emailAddress ?? null,
    role: (u.publicMetadata?.role as string | undefined) ?? null,
    ativo: !u.banned,
    createdAt: u.createdAt,
  }))

  return NextResponse.json({ users })
}
