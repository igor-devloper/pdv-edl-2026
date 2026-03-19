import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

function padCode(n: number) {
  return `EDL-${String(n).padStart(6, "0")}`
}

/*
  POST /api/sales

  body.items: Array<{
    // Item produto simples:
    productId?: number
    variantId?: number       — se produto tem variações

    // Item combo:
    comboId?: number
    comboVariants?: Array<{   — escolhas de variação dentro do combo
      comboItemId: number
      variantId: number
    }>

    qty: number
    unitCents: number
  }>
*/
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const items: any[] = Array.isArray(body.items) ? body.items : []
  if (items.length === 0) return NextResponse.json({ error: "carrinho vazio" }, { status: 400 })

  const payment = ["PIX", "CASH", "CARD"].includes(body.payment) ? body.payment : null
  if (!payment) return NextResponse.json({ error: "pagamento inválido" }, { status: 400 })

  const buyerName = body.buyerName ? String(body.buyerName).trim() : null
  const nucleo = body.nucleo ? String(body.nucleo).trim() : null
  const descontoVendaCents = body.descontoVendaCents ? Number(body.descontoVendaCents) : null

  try {
    const result = await prisma.$transaction(async (tx) => {
      let totalCents = 0

      const saleItemsData: any[] = []

      for (const item of items) {
        const qty = Number(item.qty)
        const unitCents = Number(item.unitCents)
        const itemTotal = qty * unitCents
        totalCents += itemTotal

        if (item.comboId) {
          // === ITEM COMBO ===
          const combo = await tx.combo.findUnique({
            where: { id: Number(item.comboId) },
            include: {
              items: {
                include: {
                  product: { select: { id: true, hasVariants: true } },
                  variant: true,
                },
              },
            },
          })
          if (!combo) throw new Error(`Combo ${item.comboId} não encontrado`)
          if (!combo.active) throw new Error(`Combo "${combo.name}" está inativo`)

          // Valida e baixa estoque de cada item do combo
          const comboVariantChoices: Array<{ comboItemId: number; variantId: number; label: string }> = []

          for (const ci of combo.items) {
            // Determina qual variante usar para este item do combo
            let chosenVariantId: number | null = ci.variantId

            if (!chosenVariantId && ci.product.hasVariants) {
              // Variação livre: deve ter sido enviada em comboVariants
              const chosenEntry = (item.comboVariants || []).find(
                (cv: any) => Number(cv.comboItemId) === ci.id
              )
              if (!chosenEntry) throw new Error(`Escolha de variação faltando para "${ci.label || ci.product.id}" no combo "${combo.name}"`)
              chosenVariantId = Number(chosenEntry.variantId)
            }

            if (chosenVariantId) {
              const variant = await tx.productVariant.findUnique({ where: { id: chosenVariantId } })
              if (!variant) throw new Error(`Variante ${chosenVariantId} não encontrada`)
              if (variant.stockOnHand < ci.qty * qty) {
                throw new Error(`Estoque insuficiente: ${variant.label} (disponível: ${variant.stockOnHand})`)
              }

              // Baixa estoque da variante
              await tx.productVariant.update({
                where: { id: chosenVariantId },
                data: { stockOnHand: { decrement: ci.qty * qty } },
              })

              comboVariantChoices.push({ comboItemId: ci.id, variantId: chosenVariantId, label: variant.label })
            } else {
              // Produto sem variação no combo — baixa estoque do produto pai
              const prod = await tx.product.findUnique({ where: { id: ci.productId } })
              if (!prod) throw new Error(`Produto ${ci.productId} não encontrado`)
              if (prod.stockOnHand < ci.qty * qty) {
                throw new Error(`Estoque insuficiente: ${prod.name}`)
              }
              await tx.product.update({
                where: { id: ci.productId },
                data: { stockOnHand: { decrement: ci.qty * qty } },
              })
            }
          }

          saleItemsData.push({
            comboId: combo.id,
            qty,
            unitCents,
            totalCents: itemTotal,
            comboVariantSnapshot: comboVariantChoices.length > 0 ? JSON.stringify(comboVariantChoices) : null,
          })
        } else if (item.variantId) {
          // === ITEM COM VARIANTE ===
          const variant = await tx.productVariant.findUnique({
            where: { id: Number(item.variantId) },
            include: { product: true },
          })
          if (!variant) throw new Error(`Variante ${item.variantId} não encontrada`)
          if (variant.stockOnHand < qty) {
            throw new Error(`Estoque insuficiente: ${variant.label} (disponível: ${variant.stockOnHand})`)
          }

          await tx.productVariant.update({
            where: { id: variant.id },
            data: { stockOnHand: { decrement: qty } },
          })

          saleItemsData.push({
            productId: variant.productId,
            variantId: variant.id,
            qty,
            unitCents,
            totalCents: itemTotal,
          })
        } else {
          // === ITEM PRODUTO SIMPLES ===
          const productId = Number(item.productId)
          const produto = await tx.product.findUnique({ where: { id: productId } })
          if (!produto) throw new Error(`Produto ${productId} não encontrado`)
          if (produto.stockOnHand < qty) {
            throw new Error(`Estoque insuficiente: ${produto.name} (disponível: ${produto.stockOnHand})`)
          }

          await tx.product.update({
            where: { id: productId },
            data: { stockOnHand: { decrement: qty } },
          })

          saleItemsData.push({
            productId,
            qty,
            unitCents,
            totalCents: itemTotal,
          })
        }
      }

      // Aplica desconto da venda
      const totalFinal = descontoVendaCents
        ? Math.max(0, totalCents - descontoVendaCents)
        : totalCents

      // Gera código único
      const count = await tx.sale.count()
      const code = padCode(count + 1)

      const sale = await tx.sale.create({
        data: {
          code,
          sellerUserId: userId,
          payment,
          totalCents: totalFinal,
          nomeComprador: buyerName,
          nucleo,
          descontoVendaCents,
          items: {
            create: saleItemsData,
          },
        },
        include: {
          items: true,
        },
      })

      return sale
    })

    return NextResponse.json({
      ok: true,
      sale: {
        id: result.id,
        code: result.code,
        payment: result.payment,
        totalCents: result.totalCents,
        createdAt: result.createdAt,
        items: result.items.map((it) => ({
          productId: it.productId,
          variantId: it.variantId,
          comboId: it.comboId,
          qty: it.qty,
          unitCents: it.unitCents,
          totalCents: it.totalCents,
        })),
      },
    })
  } catch (error: any) {
    console.error("[sales POST]", error)
    return NextResponse.json({ error: error?.message || "Erro ao processar venda" }, { status: 400 })
  }
}
