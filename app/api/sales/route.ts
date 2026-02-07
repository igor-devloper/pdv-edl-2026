import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import prisma  from "@/lib/prisma"
import { Prisma } from "@/lib/generated/prisma/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

type Payment = "PIX" | "CASH" | "CARD"
type SaleItemInput = { productId: number; qty: number }
type SaleCreateBody = { payment: Payment; buyerName?: string | null; items: SaleItemInput[] }

type ProdutoRow = { id: number; priceCents: number; stockOnHand: number }

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null
}
function parseIntStrict(v: unknown, field: string): number {
  const n = typeof v === "number" ? v : Number(v)
  if (!Number.isFinite(n) || !Number.isInteger(n)) throw new Error(`${field} inválido`)
  return n
}
function parsePayment(v: unknown): Payment {
  const s = String(v ?? "").toUpperCase()
  if (s === "PIX" || s === "CASH" || s === "CARD") return s
  throw new Error("payment inválido (use PIX | CASH | CARD)")
}
function parseBody(raw: unknown): SaleCreateBody {
  if (!isRecord(raw)) throw new Error("payload inválido")
  const payment = parsePayment(raw.payment)

  const buyerNameRaw = isRecord(raw) ? (raw.buyerName as any) : null
  const buyerName = buyerNameRaw == null ? null : String(buyerNameRaw).trim()

  if (!Array.isArray(raw.items) || raw.items.length === 0) throw new Error("items é obrigatório")

  const items: SaleItemInput[] = raw.items.map((it, idx) => {
    if (!isRecord(it)) throw new Error(`items[${idx}] inválido`)
    const productId = parseIntStrict(it.productId, `items[${idx}].productId`)
    const qty = parseIntStrict(it.qty, `items[${idx}].qty`)
    if (qty <= 0) throw new Error(`items[${idx}].qty deve ser > 0`)
    return { productId, qty }
  })

  return { payment, buyerName: buyerName || null, items }
}
function genCode(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase()
  return `EDL-${y}${m}${day}-${rand}`
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })

  let body: SaleCreateBody
  try {
    body = parseBody((await req.json()) as unknown)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "payload inválido"
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  try {
    const sale = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const productIds = body.items.map((i) => i.productId)

      const produtos: ProdutoRow[] = await tx.product.findMany({
        where: { id: { in: productIds }, active: true },
        select: { id: true, priceCents: true, stockOnHand: true },
      })

      const byId = new Map<number, ProdutoRow>(produtos.map((p) => [p.id, p]))

      for (const it of body.items) {
        const p = byId.get(it.productId)
        if (!p) throw new Error(`PRODUTO_NAO_ENCONTRADO:${it.productId}`)
        if (p.stockOnHand < it.qty) throw new Error(`ESTOQUE_INSUFICIENTE:${p.id}`)
      }

      const totalCents = body.items.reduce((acc, it) => {
        const p = byId.get(it.productId)!
        return acc + p.priceCents * it.qty
      }, 0)

      const created = await tx.sale.create({
        data: {
          code: genCode(),
          sellerUserId: userId,
          payment: body.payment,
          totalCents,
          nomeComprador: body.buyerName ?? null,
          items: {
            create: body.items.map((it) => {
              const p = byId.get(it.productId)!
              return {
                productId: p.id,
                qty: it.qty,
                unitCents: p.priceCents,
                totalCents: p.priceCents * it.qty,
              }
            }),
          },
        },
        include: { items: true },
      })

      for (const it of body.items) {
        await tx.stockMovement.create({
          data: {
            productId: it.productId,
            type: "OUT",
            qty: -Math.abs(it.qty),
            actorUserId: userId,
            note: `Venda ${created.code}`,
          },
        })
        await tx.product.update({
          where: { id: it.productId },
          data: { stockOnHand: { decrement: it.qty } },
        })
      }

      return created
    })

    return NextResponse.json({ ok: true, sale })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro interno"
    if (msg.startsWith("PRODUTO_NAO_ENCONTRADO:")) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 })
    if (msg.startsWith("ESTOQUE_INSUFICIENTE:")) return NextResponse.json({ error: "Estoque insuficiente" }, { status: 409 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
