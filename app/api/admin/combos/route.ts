import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { getCargoUsuario, isAdmin } from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

function mustInt(v: any, name: string) {
  const n = Number(v)
  if (!Number.isFinite(n) || !Number.isInteger(n)) throw new Error(`${name} inválido`)
  return n
}
function mustStr(v: any, name: string) {
  const s = String(v ?? "").trim()
  if (!s) throw new Error(`${name} obrigatório`)
  return s
}

// GET /api/admin/combos — lista combos
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })

  const cargo = await getCargoUsuario()
  if (!isAdmin(cargo)) return NextResponse.json({ error: "sem permissão" }, { status: 403 })

  const combos = await prisma.combo.findMany({
    orderBy: { name: "asc" },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, hasVariants: true, imageUrl: true } },
          variant: { select: { id: true, label: true, color: true, size: true } },
        },
      },
    },
  })

  return NextResponse.json({ combos })
}

// POST /api/admin/combos — cria combo
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })

  const cargo = await getCargoUsuario()
  if (!isAdmin(cargo)) return NextResponse.json({ error: "sem permissão" }, { status: 403 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  /*
    body: {
      sku: string
      name: string
      priceCents: number
      costCents?: number
      active?: boolean
      desconto?: number
      imageUrl?: string
      description?: string
      items: Array<{
        productId: number
        variantId?: number | null   // null = variação livre
        qty?: number
        label?: string
      }>
    }
  */

  try {
    const sku = mustStr(body.sku, "sku")
    const name = mustStr(body.name, "name")
    const priceCents = mustInt(body.priceCents, "priceCents")
    const costCents = body.costCents == null ? null : mustInt(body.costCents, "costCents")
    const active = body.active == null ? true : Boolean(body.active)
    const desconto = body.desconto == null ? 0 : Math.min(100, Math.max(0, mustInt(body.desconto, "desconto")))
    const imageUrl = body.imageUrl || null
    const description = body.description ? String(body.description).trim() : null

    const items: any[] = Array.isArray(body.items) ? body.items : []
    if (items.length === 0) throw new Error("Um combo precisa ter ao menos 1 item")

    const combo = await prisma.combo.create({
      data: {
        sku,
        name,
        priceCents,
        costCents,
        active,
        desconto,
        imageUrl,
        description,
        items: {
          create: items.map((item: any) => ({
            productId: mustInt(item.productId, "productId"),
            variantId: item.variantId ? Number(item.variantId) : null,
            qty: item.qty ? mustInt(item.qty, "qty") : 1,
            label: item.label ? String(item.label).trim() : null,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, hasVariants: true } },
            variant: { select: { id: true, label: true } },
          },
        },
      },
    })

    return NextResponse.json({ ok: true, combo }, { status: 201 })
  } catch (e: any) {
    const msg = e?.code === "P2002" ? "SKU já existe" : e?.message || "Erro ao criar combo"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
