import { NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const url = new URL(req.url)
    const sellerUserId = url.searchParams.get("sellerUserId")
    const productId = url.searchParams.get("productId")
    const minValue = Number(url.searchParams.get("minValue") || 0) * 100
    const maxValue = Number(url.searchParams.get("maxValue") || 0) * 100

    const sales = await prisma.sale.findMany({
      where: {
        status: "PAID",
        ...(sellerUserId && { sellerUserId }),
        ...(minValue || maxValue ? {
          totalCents: {
            ...(minValue && { gte: minValue }),
            ...(maxValue && { lte: maxValue }),
          },
        } : {}),
        ...(productId && {
          items: { some: { productId: Number(productId) } },
        }),
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true } },
            variant: { select: { label: true } },
            combo:   { select: { id: true, name: true } },
          },
        },
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

    // Top produtos/combos — chave: "p:id" ou "c:id"
    const itemMap: Record<string, { nome: string; quantidade: number; total: number }> = {}

    for (const sale of sales) {
      for (const item of sale.items) {
        let key: string
        let nome: string

        if (item.combo) {
          key = `c:${item.combo.id}`
          nome = `🎁 ${item.combo.name}`
        } else if (item.product && item.variant) {
          // Variante: agrupa pelo produto pai
          key = `p:${item.product.id}`
          nome = item.product.name
        } else if (item.product) {
          key = `p:${item.product.id}`
          nome = item.product.name
        } else {
          continue // item sem produto nem combo, ignora
        }

        if (!itemMap[key]) {
          itemMap[key] = { nome, quantidade: 0, total: 0 }
        }
        itemMap[key].quantidade += item.qty
        itemMap[key].total += item.totalCents / 100
      }
    }

    const topProdutos = Object.entries(itemMap)
      .map(([key, data]) => ({
        productId: key.startsWith("p:") ? Number(key.slice(2)) : Number(key.slice(2)),
        ...data,
      }))
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

    // Período dinâmico baseado nas vendas
    const now = new Date()
    const from = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}`

    return NextResponse.json({
      periodo: { from, to: from },
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