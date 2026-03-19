import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { getCargoUsuario, isAdmin } from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  // Produtos simples ativos
  const produtos = await prisma.product.findMany({
    where: { active: true },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      priceCents: true,
      stockOnHand: true,
      imageUrl: true,
      desconto: true,
      hasVariants: true,
      variants: {
        where: { active: true },
        select: {
          id: true,
          label: true,
          color: true,
          size: true,
          priceCents: true,
          stockOnHand: true,
          imageUrl: true,
        },
        orderBy: [{ color: "asc" }, { size: "asc" }],
      },
    },
  })

  // Combos ativos
  const combos = await prisma.combo.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              hasVariants: true,
              imageUrl: true,
              variants: {
                where: { active: true },
                select: {
                  id: true,
                  label: true,
                  color: true,
                  size: true,
                  stockOnHand: true,
                },
              },
            },
          },
          variant: {
            select: { id: true, label: true, color: true, size: true, stockOnHand: true },
          },
        },
      },
    },
  })

  return NextResponse.json({ produtos, combos })
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })
  const cargo = await getCargoUsuario()
  if (!isAdmin(cargo)) return NextResponse.json({ error: "sem permissão" }, { status: 403 })

  try {
    const body = await req.json()
    const sku = String(body.sku ?? "").trim()
    const name = String(body.name ?? "").trim()
    const imageUrl = body.imageUrl || null
    const priceCents = Number(body.priceCents)
    const costCents = body.costCents == null ? null : Number(body.costCents)
    const active = body.active == null ? true : Boolean(body.active)
    const stockOnHand = body.stockOnHand == null ? 0 : Number(body.stockOnHand)
    const desconto = body.desconto == null ? 0 : Math.min(100, Math.max(0, Number(body.desconto)))

    if (!sku) throw new Error("sku obrigatório")
    if (!name) throw new Error("name obrigatório")
    if (!Number.isFinite(priceCents) || priceCents < 0) throw new Error("priceCents inválido")

    const created = await prisma.product.create({
      data: { sku, name, imageUrl, priceCents, costCents, active, stockOnHand, desconto },
    })

    return NextResponse.json({ ok: true, produto: created })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "erro" }, { status: 400 })
  }
}
