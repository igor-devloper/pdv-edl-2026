import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { getCargoUsuario } from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

function mustInt(v: any, name: string) {
  const n = Number(v)
  if (!Number.isFinite(n) || !Number.isInteger(n)) throw new Error(`${name} inválido`)
  return n
}

// Gera código único da venda, ex: EDL-000123
async function gerarCodigo(): Promise<string> {
  const last = await prisma.sale.findFirst({
    orderBy: { id: "desc" },
    select: { id: true },
  })
  const next = (last?.id ?? 0) + 1
  return `EDL-${String(next).padStart(6, "0")}`
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })

  // Qualquer usuário autenticado pode registrar venda
  await getCargoUsuario()

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const { payment, buyerName, nucleo, items, descontoVendaPct } = body

  if (!["PIX", "CASH", "CARD"].includes(payment)) {
    return NextResponse.json({ error: "payment inválido" }, { status: 400 })
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items obrigatório" }, { status: 400 })
  }

  // descontoVendaPct: percentual inteiro 0–100 (opcional)
  const descontoPct = descontoVendaPct != null
    ? Math.min(100, Math.max(0, Number(descontoVendaPct) || 0))
    : 0

  try {
    const sale = await prisma.$transaction(async (tx) => {
      // 1. Verifica estoque e calcula valores para cada item
      const saleItems: Array<{
        productId: number
        qty: number
        unitCents: number
        totalCents: number
      }> = []

      for (const item of items) {
        const productId = mustInt(item.productId, "productId")
        const qty = mustInt(item.qty, "qty")
        if (qty <= 0) throw new Error(`qty inválido para produto ${productId}`)

        const produto = await tx.product.findUnique({
          where: { id: productId },
          select: { id: true, priceCents: true, desconto: true, stockOnHand: true, active: true },
        })

        if (!produto || !produto.active) throw new Error(`produto ${productId} não encontrado`)
        if (produto.stockOnHand < qty) throw new Error(`estoque insuficiente para produto ${productId}`)

        // Se o frontend enviou unitCents (preço já com desconto de produto), usa esse valor.
        // Senão, recalcula a partir do priceCents + desconto do produto.
        let unitCents: number
        if (item.unitCents != null) {
          unitCents = mustInt(item.unitCents, "unitCents")
        } else {
          const descontoProdutoPct = produto.desconto ?? 0
          unitCents = descontoProdutoPct > 0
            ? Math.round(produto.priceCents * (1 - descontoProdutoPct / 100))
            : produto.priceCents
        }

        saleItems.push({
          productId,
          qty,
          unitCents,
          totalCents: unitCents * qty,
        })
      }

      // 2. Calcula subtotal dos itens
      const subtotalCents = saleItems.reduce((s, i) => s + i.totalCents, 0)

      // 3. Aplica desconto de venda
      const descontoVendaCents = descontoPct > 0
        ? Math.round(subtotalCents * (descontoPct / 100))
        : 0
      const totalCents = Math.max(0, subtotalCents - descontoVendaCents)

      // 4. Cria a venda
      const code = await gerarCodigo()

      const novaSale = await tx.sale.create({
        data: {
          code,
          sellerUserId: userId,
          payment,
          nomeComprador: buyerName || null,
          nucleo: nucleo || null,
          totalCents,
          // Armazena o desconto de venda no registro para relatórios
          // (garanta que o campo existe no schema — veja abaixo)
          ...(descontoPct > 0 ? { descontoVendaPct: descontoPct } : {}),
          items: {
            create: saleItems,
          },
        },
        include: { items: true },
      })

      // 5. Baixa estoque e registra movimentos
      for (const item of saleItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockOnHand: { decrement: item.qty } },
        })

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "OUT",
            qty: -item.qty,
            note: `Venda ${code}`,
            actorUserId: userId,
          },
        })
      }

      return novaSale
    })

    return NextResponse.json({
      ok: true,
      sale: {
        id: sale.id,
        code: sale.code,
        payment: sale.payment,
        totalCents: sale.totalCents,
        createdAt: sale.createdAt,
        items: sale.items.map((i) => ({
          productId: i.productId,
          qty: i.qty,
          unitCents: i.unitCents,
          totalCents: i.totalCents,
        })),
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro ao processar venda" }, { status: 400 })
  }
}

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const take = Math.min(100, parseInt(searchParams.get("limit") ?? "20"))
  const skip = parseInt(searchParams.get("offset") ?? "0")

  const sales = await prisma.sale.findMany({
    orderBy: { createdAt: "desc" },
    take,
    skip,
    include: { items: true },
  })

  return NextResponse.json({ sales })
}