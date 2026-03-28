import { NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const url = new URL(req.url)
    const sellerUserId = url.searchParams.get("sellerUserId")
    const productId    = url.searchParams.get("productId")
    const minValue     = Number(url.searchParams.get("minValue") || 0) * 100
    const maxValue     = Number(url.searchParams.get("maxValue") || 0) * 100

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
            product: { select: { id: true, name: true, costCents: true } },
            variant: { select: { label: true, priceCents: true } },
            combo: {
              select: {
                id: true, name: true, costCents: true,
                items: {
                  include: {
                    product: { select: { costCents: true } },
                    variant: { select: { id: true } },
                  },
                },
              },
            },
          },
        },
      },
    })

    const totalCents = sales.reduce((sum, s) => sum + s.totalCents, 0)
    const total      = totalCents / 100
    const quantidade = sales.length
    const ticketMedio = quantidade ? total / quantidade : 0

    // ─── Custo e Lucro ──────────────────────────────────────────────────────
    // Para produtos simples: product.costCents * item.qty
    // Para combos: soma o costCents de cada ComboItem (product.costCents * comboItem.qty)
    //              multiplicado pela quantidade de combos vendidos (item.qty)
    //              Se o combo tiver costCents próprio cadastrado, usa ele como fallback
    let totalCustoCents = 0
    for (const sale of sales) {
      for (const item of sale.items) {
        if (item.combo) {
          // Tenta somar custo item a item dentro do combo
          const comboItems = item.combo.items
          if (comboItems.length > 0) {
            const custoPorCombo = comboItems.reduce((sum, ci) => {
              return sum + (ci.product?.costCents ?? 0) * ci.qty
            }, 0)
            totalCustoCents += custoPorCombo * item.qty
          } else {
            // Fallback: costCents do combo direto (caso não tenha itens carregados)
            totalCustoCents += (item.combo.costCents ?? 0) * item.qty
          }
        } else if (item.product) {
          totalCustoCents += (item.product.costCents ?? 0) * item.qty
        }
      }
    }
    const totalCusto = totalCustoCents / 100
    const lucro      = total - totalCusto
    const margemPct  = total > 0 ? Math.round((lucro / total) * 100) : 0

    // ─── Pagamentos ─────────────────────────────────────────────────────────
    const pagamentos = Object.entries(
      sales.reduce((acc, s) => {
        acc[s.payment] = (acc[s.payment] || 0) + s.totalCents / 100
        return acc
      }, {} as Record<string, number>)
    ).map(([metodo, total]) => ({
      metodo:     metodo as "PIX" | "CASH" | "CARD",
      quantidade: sales.filter((s) => s.payment === metodo).length,
      total,
    }))

    // ─── Top produtos/combos ─────────────────────────────────────────────────
    const itemMap: Record<string, { nome: string; quantidade: number; total: number }> = {}

    for (const sale of sales) {
      for (const item of sale.items) {
        let key: string
        let nome: string

        if (item.combo) {
          key  = `c:${item.combo.id}`
          nome = `🎁 ${item.combo.name}`
        } else if (item.product && item.variant) {
          key  = `p:${item.product.id}`
          nome = item.product.name
        } else if (item.product) {
          key  = `p:${item.product.id}`
          nome = item.product.name
        } else {
          continue
        }

        if (!itemMap[key]) itemMap[key] = { nome, quantidade: 0, total: 0 }
        itemMap[key].quantidade += item.qty
        itemMap[key].total      += item.totalCents / 100
      }
    }

    const topProdutos = Object.entries(itemMap)
      .map(([key, data]) => ({
        productId: Number(key.slice(2)),
        ...data,
      }))
      .sort((a, b) => b.total - a.total)

    // ─── Top vendedores ──────────────────────────────────────────────────────
    const sellerMap: Record<string, { quantidade: number; total: number }> = {}
    for (const sale of sales) {
      if (!sellerMap[sale.sellerUserId]) sellerMap[sale.sellerUserId] = { quantidade: 0, total: 0 }
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

    // ─── Período ─────────────────────────────────────────────────────────────
    const now  = new Date()
    const from = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}`

    return NextResponse.json({
      periodo: { from, to: from },
      vendas:  { quantidade, total, ticketMedio },
      lucro:   { totalCusto, lucro, margemPct },
      pagamentos,
      topProdutos,
      topVendedores,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}