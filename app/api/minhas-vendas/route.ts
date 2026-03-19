// app/api/minhas-vendas/route.ts
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
        include: {
          product: { select: { name: true } },
          variant: { select: { label: true } },
          combo:   { select: { name: true } },
        },
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
    itens: v.items.map((it) => {
      // Resolve o nome do item: combo > produto+variante > produto simples
      let nome: string
      if (it.combo) {
        nome = it.combo.name
      } else if (it.product && it.variant) {
        nome = `${it.product.name} — ${it.variant.label}`
      } else if (it.product) {
        nome = it.product.name
      } else {
        nome = "Item"
      }

      return {
        id: it.id,
        nome,
        qty: it.qty,
        unitCents: it.unitCents,
        totalCents: it.totalCents,
      }
    }),
  }))

  return NextResponse.json({ vendas: payload })
}