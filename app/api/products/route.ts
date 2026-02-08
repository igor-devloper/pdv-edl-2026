import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { getCargoUsuario, isAdmin } from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

type ProdutoAPI = {
  id: number
  name: string
  description: string | null
  price: number
  stock: number
  image_url: string | null
  category: string | null
}

function asInt(v: any, name: string) {
  const n = Number(v)
  if (!Number.isFinite(n) || !Number.isInteger(n)) throw new Error(`${name} inválido`)
  return n
}

function str(v: any) {
  return String(v ?? "").trim()
}

export async function GET() {
  const rows = await prisma.product.findMany({
    where: { active: true },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      priceCents: true,
      stockOnHand: true,
      imageUrl: true, // ✅ ADICIONADO
    },
  })

  const data: ProdutoAPI[] = rows.map((p) => ({
    id: p.id,
    name: p.name,
    description: null,
    category: null,
    image_url: p.imageUrl, // ✅ MAPEADO
    price: Number((p.priceCents ?? 0) / 100),
    stock: Number(p.stockOnHand ?? 0),
  }))

  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })
  const cargo = await getCargoUsuario()
  if (!isAdmin(cargo)) return NextResponse.json({ error: "sem permissão" }, { status: 403 })

  try {
    const body = await req.json()

    const sku = str(body.sku)
    const name = str(body.name)
    const imageUrl = body.imageUrl || null // ✅ ADICIONADO
    const priceCents = asInt(body.priceCents, "priceCents")
    const costCents = body.costCents == null ? null : asInt(body.costCents, "costCents")
    const active = body.active == null ? true : Boolean(body.active)
    const stockOnHand = body.stockOnHand == null ? 0 : asInt(body.stockOnHand, "stockOnHand")

    if (!sku) throw new Error("sku obrigatório")
    if (!name) throw new Error("name obrigatório")
    if (priceCents < 0) throw new Error("priceCents inválido")
    if (stockOnHand < 0) throw new Error("stockOnHand inválido")

    const created = await prisma.product.create({
      data: { 
        sku, 
        name, 
        imageUrl, // ✅ ADICIONADO
        priceCents, 
        costCents, 
        active, 
        stockOnHand 
      },
    })

    return NextResponse.json({ ok: true, produto: created })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "erro" }, { status: 400 })
  }
}