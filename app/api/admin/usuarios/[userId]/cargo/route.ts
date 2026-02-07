import { NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { getCargoUsuario, isAdmin } from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

type Cargo = "ADMIN" | "CAIXA" | "ESTOQUISTA" | "SUPPORT"
type Body = { role: Cargo }

function isCargo(v: unknown): v is Cargo {
  return v === "ADMIN" || v === "CAIXA" || v === "ESTOQUISTA" || v === "SUPPORT"
}

export async function PATCH(req: Request, ctx: { params: Promise<{ userId: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })

  const cargo = await getCargoUsuario()
  if (!isAdmin(cargo)) return NextResponse.json({ error: "sem permissão" }, { status: 403 })

  const targetId = (await ctx.params).userId
  const raw = (await req.json().catch(() => null)) as unknown
  const role = (raw as Body | null)?.role

  if (!isCargo(role)) return NextResponse.json({ error: "role inválida" }, { status: 400 })

  const updated = await (await clerkClient()).users.updateUserMetadata(targetId, {
    publicMetadata: { role },
  })

  return NextResponse.json({
    ok: true,
    user: { id: updated.id, role: (updated.publicMetadata?.role as string | undefined) ?? null },
  })
}
