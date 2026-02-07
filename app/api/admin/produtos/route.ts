// app/api/admin/produtos/route.ts
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

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })

  const cargo = await getCargoUsuario()
  if (!isAdmin(cargo)) return NextResponse.json({ error: "sem permissão" }, { status: 403 })

  const produtos = await prisma.product.findMany({
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      sku: true,
      name: true,
      priceCents: true,
      costCents: true,
      active: true,
      stockOnHand: true,
    },
  })

  return NextResponse.json({ produtos })
}

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

  try {
    const sku = mustStr(body.sku, "sku")
    const name = mustStr(body.name, "name")
    const priceCents = mustInt(body.priceCents, "priceCents")
    const costCents = body.costCents == null ? null : mustInt(body.costCents, "costCents")
    const active = Boolean(body.active)
    const stockOnHand = body.stockOnHand == null ? 0 : mustInt(body.stockOnHand, "stockOnHand")

    if (priceCents < 0) throw new Error("priceCents não pode ser negativo")
    if (costCents != null && costCents < 0) throw new Error("costCents não pode ser negativo")

    const created = await prisma.product.create({
      data: { sku, name, priceCents, costCents, active, stockOnHand },
      select: {
        id: true,
        sku: true,
        name: true,
        priceCents: true,
        costCents: true,
        active: true,
        stockOnHand: true,
      },
    })

    return NextResponse.json({ ok: true, produto: created }, { status: 201 })
  } catch (e: any) {
    const msg = e?.code === "P2002" ? "SKU já existe" : e?.message || "Erro ao criar produto"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
