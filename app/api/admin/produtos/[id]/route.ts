// app/api/admin/produtos/[id]/route.ts
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { getCargoUsuario, isAdmin } from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

type Ctx = { params: Promise<{ id: string }> }

function mustInt(v: any, name: string) {
  const n = Number(v)
  if (!Number.isFinite(n) || !Number.isInteger(n)) throw new Error(`${name} inválido`)
  return n
}
function mustStr(v: any, name: string) {
  const s = String(v ?? "").trim()
  if (!s) throw new Error(`${name} obrigatório`)
  return s
}

export async function GET(_: Request, ctx: Ctx) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })

  const cargo = await getCargoUsuario()
  if (!isAdmin(cargo)) return NextResponse.json({ error: "sem permissão" }, { status: 403 })

  const { id } = await ctx.params
  const productId = mustInt(id, "id")

  const produto = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      sku: true,
      name: true,
      priceCents: true,
      costCents: true,
      active: true,
      stockOnHand: true,
    },
  })

  if (!produto) return NextResponse.json({ error: "produto não encontrado" }, { status: 404 })
  return NextResponse.json({ produto })
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })

  const cargo = await getCargoUsuario()
  if (!isAdmin(cargo)) return NextResponse.json({ error: "sem permissão" }, { status: 403 })

  const { id } = await ctx.params
  const productId = mustInt(id, "id")

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  try {
    // PATCH parcial
    const data: any = {}

    if (body.sku != null) data.sku = mustStr(body.sku, "sku")
    if (body.name != null) data.name = mustStr(body.name, "name")

    if (body.priceCents != null) {
      const n = mustInt(body.priceCents, "priceCents")
      if (n < 0) throw new Error("priceCents não pode ser negativo")
      data.priceCents = n
    }

    if (body.costCents !== undefined) {
      if (body.costCents == null) data.costCents = null
      else {
        const n = mustInt(body.costCents, "costCents")
        if (n < 0) throw new Error("costCents não pode ser negativo")
        data.costCents = n
      }
    }

    if (body.active != null) data.active = Boolean(body.active)

    const updated = await prisma.product.update({
      where: { id: productId },
      data,
      select: {
        id: true,
        sku: true,
        name: true,
        priceCents: true,
        costCents: true,
        active: true,
        stockOnHand: true,
      },
    })

    return NextResponse.json({ ok: true, produto: updated })
  } catch (e: any) {
    const msg =
      e?.code === "P2025" ? "produto não encontrado" :
      e?.code === "P2002" ? "SKU já existe" :
      e?.message || "Erro ao atualizar produto"

    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(_: Request, ctx: Ctx) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })

  const cargo = await getCargoUsuario()
  if (!isAdmin(cargo)) return NextResponse.json({ error: "sem permissão" }, { status: 403 })

  const { id } = await ctx.params
  const productId = mustInt(id, "id")

  try {
    await prisma.product.delete({ where: { id: productId } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    const msg =
      e?.code === "P2025" ? "produto não encontrado" :
      e?.code === "P2003" ? "não pode apagar: produto usado em vendas/movimentos" :
      e?.message || "Erro ao apagar produto"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
