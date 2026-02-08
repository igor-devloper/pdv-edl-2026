import { NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(req.url)

    const sellerUserId = url.searchParams.get("sellerUserId")
    const productId = url.searchParams.get("productId")
    const minValue = Number(url.searchParams.get("minValue") || 0) * 100
    const maxValue = Number(url.searchParams.get("maxValue") || 0) * 100

    const sales = await prisma.sale.findMany({
      where: {
        status: "PAID",
        ...(sellerUserId && { sellerUserId }),
        ...(minValue || maxValue
          ? {
              totalCents: {
                ...(minValue && { gte: minValue }),
                ...(maxValue && { lte: maxValue }),
              },
            }
          : {}),
        ...(productId && {
          items: {
            some: {
              productId: Number(productId),
            },
          },
        }),
      },
      include: {
        items: { include: { product: true } },
      },
    })

    const totalCents = sales.reduce((sum, s) => sum + s.totalCents, 0)
    const total = totalCents / 100
    const quantidade = sales.length
    const ticketMedio = quantidade ? total / quantidade : 0

    // Pagamentos
    const pagamentos = Object.entries(
      sales.reduce((acc, s) => {
        acc[s.payment] = (acc[s.payment] || 0) + s.totalCents / 100
        return acc
      }, {} as Record<string, number>)
    ).map(([metodo, total]) => ({
      metodo: metodo as "PIX" | "CASH" | "CARD",
      quantidade: sales.filter((s) => s.payment === metodo).length,
      total,
    }))

    // Top produtos
    const prodMap: Record<number, { nome: string; quantidade: number; total: number }> = {}
    for (const sale of sales) {
      for (const item of sale.items) {
        if (!prodMap[item.productId]) {
          prodMap[item.productId] = { nome: item.product.name, quantidade: 0, total: 0 }
        }
        prodMap[item.productId].quantidade += item.qty
        prodMap[item.productId].total += item.totalCents / 100
      }
    }

    const topProdutos = Object.entries(prodMap)
      .map(([id, data]) => ({ productId: Number(id), ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    // Top vendedores
    const sellerMap: Record<string, { quantidade: number; total: number }> = {}
    for (const sale of sales) {
      if (!sellerMap[sale.sellerUserId]) {
        sellerMap[sale.sellerUserId] = { quantidade: 0, total: 0 }
      }
      sellerMap[sale.sellerUserId].quantidade++
      sellerMap[sale.sellerUserId].total += sale.totalCents / 100
    }

    const client = await clerkClient()
    const topVendedores = await Promise.all(
      Object.entries(sellerMap)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5)
        .map(async ([id, data]) => {
          const user = await client.users.getUser(id).catch(() => null)
          return {
            sellerUserId: id,
            sellerName:
              user?.firstName ||
              user?.emailAddresses[0]?.emailAddress ||
              "Desconhecido",
            ...data,
          }
        })
    )

    return NextResponse.json({
      periodo: { from: "01/02", to: "07/02" },
      vendas: { quantidade, total, ticketMedio },
      pagamentos,
      topProdutos,
      topVendedores,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
