// app/api/products/[id]/route.ts
import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getCargoUsuario, isAdmin, podeGerenciarEstoque } from "@/lib/auth-server"
import prisma from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

type Ctx = { params: Promise<{ id: string }> }

type BodyPatch = Partial<{
  name: string
  description: string | null
  price: number
  stock: number
  image_url: string | null
  category: string | null
  active: boolean
}>

function str(v: any) {
  return String(v ?? "").trim()
}

function mustInt(v: any, name: string) {
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${name} inválido`)
  return Math.trunc(n)
}

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })
  const cargo = await getCargoUsuario()
  if (!isAdmin(cargo)) return NextResponse.json({ error: "sem permissão" }, { status: 403 })

  const id = Number(ctx.params.id)
  if (!Number.isFinite(id) || id <= 0) return NextResponse.json({ error: "id inválido" }, { status: 400 })

  try {
    const body = await req.json()

    const data: any = {}
    if (body.sku != null) data.sku = str(body.sku)
    if (body.name != null) data.name = str(body.name)
    if (body.priceCents != null) data.priceCents = mustInt(body.priceCents, "priceCents")
    if (body.costCents !== undefined) data.costCents = body.costCents == null ? null : mustInt(body.costCents, "costCents")
    if (body.active != null) data.active = Boolean(body.active)

    const updated = await prisma.product.update({ where: { id }, data })
    return NextResponse.json({ ok: true, produto: updated })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "erro" }, { status: 400 })
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })

  const cargo = await getCargoUsuario()
  if (!podeGerenciarEstoque(cargo)) return NextResponse.json({ error: "sem permissão" }, { status: 403 })

  let id: number
  try {
    id = mustInt((await ctx.params).id, "id")
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }

  // Soft delete: só desativa
  const produto = await prisma.product.update({
    where: { id },
    data: { active: false },
  })

  return NextResponse.json({ ok: true, produto })
}
