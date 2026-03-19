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

// GET /api/admin/combos/[id]
export async function GET(_: Request, ctx: Ctx) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })

  const cargo = await getCargoUsuario()
  if (!isAdmin(cargo)) return NextResponse.json({ error: "sem permissão" }, { status: 403 })

  const { id } = await ctx.params
  const comboId = mustInt(id, "id")

  const combo = await prisma.combo.findUnique({
    where: { id: comboId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              hasVariants: true,
              imageUrl: true,
              variants: {
                where: { active: true },
                select: { id: true, label: true, color: true, size: true, stockOnHand: true },
              },
            },
          },
          variant: { select: { id: true, label: true, color: true, size: true } },
        },
      },
    },
  })

  if (!combo) return NextResponse.json({ error: "combo não encontrado" }, { status: 404 })
  return NextResponse.json({ combo })
}

// PATCH /api/admin/combos/[id]
export async function PATCH(req: Request, ctx: Ctx) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })

  const cargo = await getCargoUsuario()
  if (!isAdmin(cargo)) return NextResponse.json({ error: "sem permissão" }, { status: 403 })

  const { id } = await ctx.params
  const comboId = mustInt(id, "id")

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  try {
    const data: any = {}
    if (body.sku != null) data.sku = mustStr(body.sku, "sku")
    if (body.name != null) data.name = mustStr(body.name, "name")
    if (body.priceCents != null) data.priceCents = mustInt(body.priceCents, "priceCents")
    if (body.costCents !== undefined) data.costCents = body.costCents == null ? null : mustInt(body.costCents, "costCents")
    if (body.active != null) data.active = Boolean(body.active)
    if (body.desconto !== undefined) data.desconto = body.desconto == null ? 0 : Math.min(100, Math.max(0, mustInt(body.desconto, "desconto")))
    if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl || null
    if (body.description !== undefined) data.description = body.description ? String(body.description).trim() : null

    // Se enviou items, recria todos (delete + create)
    if (Array.isArray(body.items)) {
      const items: any[] = body.items
      if (items.length === 0) throw new Error("Um combo precisa ter ao menos 1 item")

      await prisma.$transaction([
        prisma.comboItem.deleteMany({ where: { comboId } }),
        prisma.combo.update({
          where: { id: comboId },
          data: {
            ...data,
            items: {
              create: items.map((item: any) => ({
                productId: mustInt(item.productId, "productId"),
                variantId: item.variantId ? Number(item.variantId) : null,
                qty: item.qty ? mustInt(item.qty, "qty") : 1,
                label: item.label ? String(item.label).trim() : null,
              })),
            },
          },
        }),
      ])
    } else {
      await prisma.combo.update({ where: { id: comboId }, data })
    }

    const updated = await prisma.combo.findUnique({
      where: { id: comboId },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, hasVariants: true } },
            variant: { select: { id: true, label: true } },
          },
        },
      },
    })

    return NextResponse.json({ ok: true, combo: updated })
  } catch (e: any) {
    const msg =
      e?.code === "P2025" ? "combo não encontrado" :
      e?.code === "P2002" ? "SKU já existe" :
      e?.message || "Erro ao atualizar combo"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

// DELETE /api/admin/combos/[id]
export async function DELETE(_: Request, ctx: Ctx) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })

  const cargo = await getCargoUsuario()
  if (!isAdmin(cargo)) return NextResponse.json({ error: "sem permissão" }, { status: 403 })

  const { id } = await ctx.params
  const comboId = mustInt(id, "id")

  try {
    await prisma.combo.delete({ where: { id: comboId } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    const msg =
      e?.code === "P2025" ? "combo não encontrado" :
      e?.code === "P2003" ? "não pode apagar: combo usado em vendas" :
      e?.message || "Erro ao apagar combo"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
