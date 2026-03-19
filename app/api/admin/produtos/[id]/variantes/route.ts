import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { getCargoUsuario, isAdmin } from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

type Ctx = { params: Promise<{ id: string }> }

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

// GET /api/admin/produtos/[id]/variantes — lista variantes do produto
export async function GET(_: Request, ctx: Ctx) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })

  const cargo = await getCargoUsuario()
  if (!isAdmin(cargo)) return NextResponse.json({ error: "sem permissão" }, { status: 403 })

  const { id } = await ctx.params
  const productId = mustInt(id, "id")

  const variantes = await prisma.productVariant.findMany({
    where: { productId },
    orderBy: [{ color: "asc" }, { size: "asc" }],
  })

  return NextResponse.json({ variantes })
}

// POST /api/admin/produtos/[id]/variantes — cria variante
export async function POST(req: Request, ctx: Ctx) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })

  const cargo = await getCargoUsuario()
  if (!isAdmin(cargo)) return NextResponse.json({ error: "sem permissão" }, { status: 403 })

  const { id } = await ctx.params
  const productId = mustInt(id, "id")

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  try {
    const sku = mustStr(body.sku, "sku")
    const label = mustStr(body.label, "label")
    const color = body.color ? String(body.color).trim() : null
    const size = body.size ? String(body.size).trim() : null
    const priceCents = body.priceCents == null ? null : mustInt(body.priceCents, "priceCents")
    const stockOnHand = body.stockOnHand == null ? 0 : mustInt(body.stockOnHand, "stockOnHand")
    const active = body.active == null ? true : Boolean(body.active)
    const imageUrl = body.imageUrl || null

    // Garante que o produto pai existe
    const produto = await prisma.product.findUnique({ where: { id: productId } })
    if (!produto) return NextResponse.json({ error: "produto não encontrado" }, { status: 404 })

    const variante = await prisma.productVariant.create({
      data: { productId, sku, label, color, size, priceCents, stockOnHand, active, imageUrl },
    })

    // Marca produto pai como hasVariants = true
    await prisma.product.update({
      where: { id: productId },
      data: { hasVariants: true },
    })

    return NextResponse.json({ ok: true, variante }, { status: 201 })
  } catch (e: any) {
    const msg = e?.code === "P2002" ? "SKU já existe" : e?.message || "Erro ao criar variante"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

// PUT /api/admin/produtos/[id]/variantes — atualiza lote de variantes (upsert)
export async function PUT(req: Request, ctx: Ctx) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })

  const cargo = await getCargoUsuario()
  if (!isAdmin(cargo)) return NextResponse.json({ error: "sem permissão" }, { status: 403 })

  const { id } = await ctx.params
  const productId = mustInt(id, "id")

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  // body.variantes: array de { id?, sku, label, color, size, priceCents, stockOnHand, active, imageUrl }
  const variantes: any[] = Array.isArray(body.variantes) ? body.variantes : []
  if (variantes.length === 0) {
    return NextResponse.json({ error: "variantes obrigatórias" }, { status: 400 })
  }

  try {
    const results = await prisma.$transaction(
      variantes.map((v) => {
        const data = {
          productId,
          sku: mustStr(v.sku, "sku"),
          label: mustStr(v.label, "label"),
          color: v.color ? String(v.color).trim() : null,
          size: v.size ? String(v.size).trim() : null,
          priceCents: v.priceCents == null ? null : mustInt(v.priceCents, "priceCents"),
          stockOnHand: v.stockOnHand == null ? 0 : mustInt(v.stockOnHand, "stockOnHand"),
          active: v.active == null ? true : Boolean(v.active),
          imageUrl: v.imageUrl || null,
        }

        if (v.id) {
          return prisma.productVariant.update({ where: { id: Number(v.id) }, data })
        }
        return prisma.productVariant.create({ data })
      })
    )

    await prisma.product.update({
      where: { id: productId },
      data: { hasVariants: true },
    })

    return NextResponse.json({ ok: true, variantes: results })
  } catch (e: any) {
    const msg = e?.code === "P2002" ? "SKU já existe" : e?.message || "Erro ao salvar variantes"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

// DELETE /api/admin/produtos/[id]/variantes?variantId=X
export async function DELETE(req: Request, ctx: Ctx) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })

  const cargo = await getCargoUsuario()
  if (!isAdmin(cargo)) return NextResponse.json({ error: "sem permissão" }, { status: 403 })

  const { id } = await ctx.params
  const productId = mustInt(id, "id")
  const url = new URL(req.url)
  const variantId = mustInt(url.searchParams.get("variantId"), "variantId")

  try {
    await prisma.productVariant.delete({ where: { id: variantId, productId } })

    // Se não houver mais variantes, desativa flag
    const remaining = await prisma.productVariant.count({ where: { productId } })
    if (remaining === 0) {
      await prisma.product.update({ where: { id: productId }, data: { hasVariants: false } })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    const msg = e?.code === "P2025" ? "variante não encontrada" : e?.message || "Erro ao apagar variante"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
