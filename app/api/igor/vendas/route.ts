// app/api/igor/vendas/route.ts
// Rota exclusiva do cargo IGOR — poder total sobre todas as vendas.
// GET    → lista todas as vendas com filtros avançados
// PATCH  → edita qualquer campo de qualquer venda
// DELETE → cancela qualquer venda e devolve estoque

import { NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { getCargoUsuario, isIgor } from "@/lib/auth-server"
import { Prisma } from "@/lib/generated/prisma/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

// ─── Guard ────────────────────────────────────────────────────────────────────
async function guardIgor() {
  const { userId } = await auth()
  if (!userId) return { userId: null, error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) }
  const cargo = await getCargoUsuario()
  if (!isIgor(cargo)) return { userId: null, error: NextResponse.json({ error: "Apenas IGOR pode acessar esta rota" }, { status: 403 }) }
  return { userId, error: null }
}

// ─── GET — lista todas as vendas com filtros ──────────────────────────────────
export async function GET(req: Request) {
  const { userId, error } = await guardIgor()
  if (error) return error

  const url = new URL(req.url)
  const take       = Math.min(Number(url.searchParams.get("take")  || 50), 200)
  const skip       = Number(url.searchParams.get("skip") || 0)
  const sellerUserId = url.searchParams.get("sellerUserId") || undefined
  const status     = url.searchParams.get("status") as "PAID" | "CANCELED" | null
  const payment    = url.searchParams.get("payment") as "PIX" | "CASH" | "CARD" | null
  const nucleo     = url.searchParams.get("nucleo") || undefined
  const search     = url.searchParams.get("search") || undefined   // busca por código ou comprador
  const minCents   = url.searchParams.get("minCents") ? Number(url.searchParams.get("minCents")) : undefined
  const maxCents   = url.searchParams.get("maxCents") ? Number(url.searchParams.get("maxCents")) : undefined
  const dateFrom   = url.searchParams.get("dateFrom") || undefined // ISO string
  const dateTo     = url.searchParams.get("dateTo")   || undefined // ISO string
  const productId  = url.searchParams.get("productId") ? Number(url.searchParams.get("productId")) : undefined

  const where: Prisma.SaleWhereInput = {
    ...(sellerUserId && { sellerUserId }),
    ...(status       && { status }),
    ...(payment      && { payment }),
    ...(nucleo       && { nucleo }),
    ...(search && {
      OR: [
        { code:          { contains: search, mode: "insensitive" } },
        { nomeComprador: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...((minCents !== undefined || maxCents !== undefined) && {
      totalCents: {
        ...(minCents !== undefined && { gte: minCents }),
        ...(maxCents !== undefined && { lte: maxCents }),
      },
    }),
    ...((dateFrom || dateTo) && {
      createdAt: {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo   && { lte: new Date(dateTo)   }),
      },
    }),
    ...(productId && {
      items: { some: { productId } },
    }),
  }

  const [total, sales] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
            variant: { select: { id: true, label: true, sku: true } },
            combo:   { select: { id: true, name: true, sku: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
  ])

  const client = await clerkClient()

  // Busca info dos vendedores em lote (sem repetir)
  const sellerIds = [...new Set(sales.map((s) => s.sellerUserId))]
  const usersMap: Record<string, string> = {}
  await Promise.all(
    sellerIds.map(async (sid) => {
      const u = await client.users.getUser(sid).catch(() => null)
      usersMap[sid] =
        u
          ? ([u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
             u.emailAddresses[0]?.emailAddress ||
             "Desconhecido")
          : "Desconhecido"
    })
  )

  const vendas = sales.map((s) => ({
    id:              s.id,
    code:            s.code,
    createdAt:       s.createdAt.toISOString(),
    updatedAt:       s.updatedAt?.toISOString() ?? null,
    status:          s.status,
    payment:         s.payment,
    totalCents:      s.totalCents,
    descontoVendaCents: s.descontoVendaCents,
    buyerName:       s.nomeComprador,
    nucleo:          s.nucleo,
    sellerUserId:    s.sellerUserId,
    sellerName:      usersMap[s.sellerUserId] ?? "Desconhecido",
    itens: s.items.map((it) => {
      let nome: string
      if (it.combo)                        nome = it.combo.name
      else if (it.product && it.variant)   nome = `${it.product.name} — ${it.variant.label}`
      else if (it.product)                 nome = it.product.name
      else                                  nome = "Item"
      return {
        id:         it.id,
        nome,
        productId:  it.productId,
        variantId:  it.variantId,
        comboId:    it.comboId,
        qty:        it.qty,
        unitCents:  it.unitCents,
        totalCents: it.totalCents,
      }
    }),
  }))

  return NextResponse.json({ total, take, skip, vendas })
}

// ─── PATCH — edita qualquer campo de qualquer venda ──────────────────────────
export async function PATCH(req: Request) {
  const { userId, error } = await guardIgor()
  if (error) return error

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  const id = Number(body.id)
  if (!id || isNaN(id)) return NextResponse.json({ error: "id inválido" }, { status: 400 })

  const venda = await prisma.sale.findUnique({ where: { id }, include: { items: true } })
  if (!venda) return NextResponse.json({ error: "Venda não encontrada" }, { status: 404 })

  // Campos editáveis pelo IGOR (poder absoluto, sem restrição de ownership)
  const data: Prisma.SaleUpdateInput = {}

  if ("buyerName"  in body) data.nomeComprador      = body.buyerName  == null ? null : String(body.buyerName).trim()  || null
  if ("nucleo"     in body) data.nucleo             = body.nucleo     == null ? null : String(body.nucleo).trim()     || null
  if ("payment"    in body) {
    const p = String(body.payment ?? "").toUpperCase()
    if (p !== "PIX" && p !== "CASH" && p !== "CARD")
      return NextResponse.json({ error: "payment inválido" }, { status: 400 })
    data.payment = p as "PIX" | "CASH" | "CARD"
  }
  if ("status" in body) {
    const s = String(body.status ?? "").toUpperCase()
    if (s !== "PAID" && s !== "CANCELED")
      return NextResponse.json({ error: "status inválido" }, { status: 400 })
    data.status = s as "PAID" | "CANCELED"
  }
  if ("totalCents" in body) {
    const v = Number(body.totalCents)
    if (isNaN(v) || v < 0) return NextResponse.json({ error: "totalCents inválido" }, { status: 400 })
    data.totalCents = v
  }
  if ("descontoVendaCents" in body) {
    const v = body.descontoVendaCents == null ? null : Number(body.descontoVendaCents)
    if (v !== null && isNaN(v)) return NextResponse.json({ error: "descontoVendaCents inválido" }, { status: 400 })
    data.descontoVendaCents = v
  }
  if ("sellerUserId" in body && body.sellerUserId) {
    data.sellerUserId = String(body.sellerUserId)
  }

  // Edição de itens individuais (opcional — array de {id, qty, unitCents})
  const itensPatch = Array.isArray(body.itens) ? body.itens as Array<{ id: number; qty?: number; unitCents?: number; nome?: string }> : []

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.sale.update({ where: { id }, data })

    for (const item of itensPatch) {
      const itemData: Prisma.SaleItemUpdateInput = {}
      if (item.qty        != null) itemData.qty        = Number(item.qty)
      if (item.unitCents  != null) itemData.unitCents  = Number(item.unitCents)
      if (item.qty != null && item.unitCents != null)
        itemData.totalCents = Number(item.qty) * Number(item.unitCents)

      if (Object.keys(itemData).length > 0)
        await tx.saleItem.update({ where: { id: item.id }, data: itemData })
    }
  })

  const updated = await prisma.sale.findUnique({
    where: { id },
    include: { items: { include: { product: true, variant: true, combo: true } } },
  })

  return NextResponse.json({ ok: true, sale: updated })
}

// ─── DELETE — cancela qualquer venda e devolve estoque ───────────────────────
export async function DELETE(req: Request) {
  const { userId, error } = await guardIgor()
  if (error) return error

  const url = new URL(req.url)
  const id  = Number(url.searchParams.get("id"))
  if (!id || isNaN(id)) return NextResponse.json({ error: "id inválido" }, { status: 400 })

  const venda = await prisma.sale.findUnique({
    where: { id },
    include: { items: true },
  })

  if (!venda) return NextResponse.json({ error: "Venda não encontrada" }, { status: 404 })
  if (venda.status === "CANCELED")
    return NextResponse.json({ error: "Venda já cancelada" }, { status: 409 })

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.sale.update({ where: { id }, data: { status: "CANCELED" } })

    for (const it of venda.items) {
      if (it.variantId) {
        await tx.productVariant.update({
          where: { id: it.variantId },
          data: { stockOnHand: { increment: it.qty } },
        })
        await tx.variantStockMovement.create({
          data: {
            variantId:   it.variantId,
            type:        "IN",
            qty:         it.qty,
            actorUserId: userId!,
            note:        `[IGOR] Cancelamento venda ${venda.code}`,
          },
        })
      } else if (it.productId) {
        await tx.product.update({
          where: { id: it.productId },
          data: { stockOnHand: { increment: it.qty } },
        })
        await tx.stockMovement.create({
          data: {
            productId:   it.productId,
            type:        "IN",
            qty:         it.qty,
            actorUserId: userId!,
            note:        `[IGOR] Cancelamento venda ${venda.code}`,
          },
        })
      }
    }
  })

  return NextResponse.json({ ok: true, message: "Venda cancelada e estoque devolvido" })
}
