// app/api/minhas-vendas/[id]/route.ts
// PATCH /api/minhas-vendas/:id  → edita buyerName, payment e nucleo
// DELETE /api/minhas-vendas/:id → cancela a venda e devolve o estoque

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/generated/prisma/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

// ─── helpers ──────────────────────────────────────────────────────────────────
function parseId(raw: string): number {
  const n = parseInt(raw, 10)
  if (isNaN(n) || n <= 0) throw new Error("ID inválido")
  return n
}

function parsePayment(v: unknown): "PIX" | "CASH" | "CARD" {
  const s = String(v ?? "").toUpperCase()
  if (s === "PIX" || s === "CASH" || s === "CARD") return s
  throw new Error("payment inválido (use PIX | CASH | CARD)")
}

// ─── PATCH ────────────────────────────────────────────────────────────────────
export async function PATCH(req: Request, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })

  let id: number
  try {
    id = parseId((await params).id)
  } catch {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 })
  }

  // Verifica propriedade e status
  const venda = await prisma.sale.findUnique({ where: { id } })
  if (!venda) return NextResponse.json({ error: "Venda não encontrada" }, { status: 404 })
  if (venda.sellerUserId !== userId)
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
  if (venda.status === "CANCELED")
    return NextResponse.json({ error: "Venda já cancelada" }, { status: 409 })

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 })
  }

  // Campos editáveis: buyerName, payment, nucleo
  const data: Prisma.SaleUpdateInput = {}

  if ("buyerName" in body) {
    data.nomeComprador =
      body.buyerName == null ? null : String(body.buyerName).trim() || null
  }
  if ("payment" in body) {
    try {
      data.payment = parsePayment(body.payment)
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "payment inválido" },
        { status: 400 }
      )
    }
  }
  if ("nucleo" in body) {
    data.nucleo =
      body.nucleo == null ? null : String(body.nucleo).trim().slice(0, 100) || null
  }

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 })

  const updated = await prisma.sale.update({ where: { id }, data })

  return NextResponse.json({ ok: true, sale: updated })
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
export async function DELETE(_req: Request, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })

  let id: number
  try {
    id = parseId((await params).id)
  } catch {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 })
  }

  const venda = await prisma.sale.findUnique({
    where: { id },
    include: { items: true },
  })

  if (!venda) return NextResponse.json({ error: "Venda não encontrada" }, { status: 404 })
  if (venda.sellerUserId !== userId)
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
  if (venda.status === "CANCELED")
    return NextResponse.json({ error: "Venda já cancelada" }, { status: 409 })

  // Cancela e devolve estoque em transação
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 1. Marca como cancelada
    await tx.sale.update({
      where: { id },
      data: { status: "CANCELED" },
    })

    // 2. Devolve estoque + registra movimentação para cada item
    for (const it of venda.items) {
      await tx.product.update({
        where: { id: it.productId  ?? 0},
        data: { stockOnHand: { increment: it.qty } },
      })

      await tx.stockMovement.create({
        data: {
          productId: it.productId ?? 0,
          type: "IN",
          qty: it.qty,
          actorUserId: userId,
          note: `Cancelamento venda ${venda.code}`,
        },
      })
    }
  })

  return NextResponse.json({ ok: true, message: "Venda cancelada e estoque devolvido" })
}