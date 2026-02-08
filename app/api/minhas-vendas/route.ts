import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import  prisma from "@/lib/prisma"

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const sales = await prisma.sale.findMany({
      where: { sellerUserId: userId },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    })

    const vendas = sales.map((s) => ({
      id: s.id,
      code: s.code,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString() ?? new Date(),
      payment: s.payment,
      totalCents: s.totalCents,
      buyerName: s.nomeComprador,
      status: s.status,
      itens: s.items.map((it) => ({
        id: it.id,
        nome: it.product.name,
        qty: it.qty,
        unitCents: it.unitCents,
        totalCents: it.totalCents,
      })),
    }))

    return NextResponse.json({ vendas })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}