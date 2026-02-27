// app/api/minhas-vendas/route.ts
// GET /api/minhas-vendas
// Retorna todas as vendas do usuário autenticado, da mais recente para a mais antiga.

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })

  const vendas = await prisma.sale.findMany({
    where: { sellerUserId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: { product: { select: { name: true } } },
      },
    },
  })

  const payload = vendas.map((v) => ({
    id: v.id,
    code: v.code,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
    payment: v.payment,
    totalCents: v.totalCents,
    buyerName: v.nomeComprador,
    nucleo: v.nucleo,
    status: v.status,
    itens: v.items.map((it) => ({
      id: it.id,
      nome: it.product?.name ?? `Produto #${it.productId}`,
      qty: it.qty,
      unitCents: it.unitCents,
      totalCents: it.totalCents,
    })),
  }))

  return NextResponse.json({ vendas: payload })
}