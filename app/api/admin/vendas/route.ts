import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { getCargoUsuario, isAdmin } from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })

  const cargo = await getCargoUsuario()
  if (!isAdmin(cargo)) return NextResponse.json({ error: "sem permissão" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const take = Math.min(Number(searchParams.get("take") || 20), 100)

  const vendas = await prisma.sale.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: {
      items: {
        include: { product: { select: { name: true } } },
      },
    },
  })

  return NextResponse.json({
    vendas: vendas.map((v) => ({
      id: v.id,
      code: v.code,
      createdAt: v.createdAt,
      payment: v.payment,
      totalCents: v.totalCents,
      buyerName: v.nomeComprador ?? null,
      itens: v.items.map((it) => ({
        productId: it.productId,
        nome: it.product.name,
        qty: it.qty,
        totalCents: it.totalCents,
      })),
    })),
  })
}
