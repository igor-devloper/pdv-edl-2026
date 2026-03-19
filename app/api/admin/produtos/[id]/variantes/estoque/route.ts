import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { getCargoUsuario, isAdmin } from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

type Ctx = { params: Promise<{ id: string }> }

// POST /api/admin/produtos/[id]/variantes/estoque
// body: { variantId, qty, note? }
export async function POST(req: Request, ctx: Ctx) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })

  const cargo = await getCargoUsuario()
  if (!isAdmin(cargo)) return NextResponse.json({ error: "sem permissão" }, { status: 403 })

  const { id } = await ctx.params
  const productId = Number(id)

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const variantId = Number(body.variantId)
  const qty = Number(body.qty)
  const note = body.note ? String(body.note).trim() : null

  if (!Number.isInteger(variantId) || variantId <= 0)
    return NextResponse.json({ error: "variantId inválido" }, { status: 400 })
  if (!Number.isInteger(qty) || qty === 0)
    return NextResponse.json({ error: "Quantidade inválida (não pode ser 0)" }, { status: 400 })

  try {
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId, productId },
    })
    if (!variant) return NextResponse.json({ error: "variante não encontrada" }, { status: 404 })

    const novoEstoque = variant.stockOnHand + qty
    if (novoEstoque < 0)
      return NextResponse.json(
        { error: `Estoque insuficiente (atual: ${variant.stockOnHand})` },
        { status: 400 }
      )

    const [updated] = await prisma.$transaction([
      prisma.productVariant.update({
        where: { id: variantId },
        data: { stockOnHand: novoEstoque },
      }),
      prisma.variantStockMovement.create({
        data: {
          variantId,
          type: qty > 0 ? "IN" : "OUT",
          qty: Math.abs(qty),
          note,
          actorUserId: userId,
        },
      }),
    ])

    return NextResponse.json({ ok: true, stockOnHand: updated.stockOnHand })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro ao ajustar estoque" }, { status: 400 })
  }
}