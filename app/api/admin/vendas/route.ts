import { NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(req.url)

    const take = Number(url.searchParams.get("take") || 20)
    const sellerUserId = url.searchParams.get("sellerUserId")
    const productId = url.searchParams.get("productId")
    const minValue = Number(url.searchParams.get("minValue") || 0) * 100
    const maxValue = Number(url.searchParams.get("maxValue") || 0) * 100

    const sales = await prisma.sale.findMany({
      where: {
        status: "PAID",
        ...(sellerUserId && { sellerUserId }),
        ...(minValue || maxValue
          ? {
              totalCents: {
                ...(minValue && { gte: minValue }),
                ...(maxValue && { lte: maxValue }),
              },
            }
          : {}),
        ...(productId && {
          items: {
            some: { productId: Number(productId) },
          },
        }),
      },
      include: {
        items: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
      take,
    })

    const client = await clerkClient()

    const vendas = await Promise.all(
      sales.map(async (s) => {
        const user = await client.users.getUser(s.sellerUserId).catch(() => null)

        return {
          id: s.id,
          code: s.code,
          createdAt: s.createdAt.toISOString(),
          payment: s.payment,
          totalCents: s.totalCents,
          buyerName: s.nomeComprador,
          sellerName:
            user?.firstName ||
            user?.emailAddresses[0]?.emailAddress ||
            "Desconhecido",
          itens: s.items.map((it) => ({
            nome: it.product.name,
            qty: it.qty,
            totalCents: it.totalCents,
          })),
        }
      })
    )

    return NextResponse.json({ vendas })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
