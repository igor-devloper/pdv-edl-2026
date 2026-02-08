import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import  prisma  from "@/lib/prisma"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const saleId = Number((await params).id)
    if (!saleId) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })

    const sale = await prisma.sale.findUnique({ where: { id: saleId } })
    if (!sale) return NextResponse.json({ error: "Venda não encontrada" }, { status: 404 })
    if (sale.sellerUserId !== userId) {
      return NextResponse.json({ error: "Você só pode editar suas próprias vendas" }, { status: 403 })
    }
    if (sale.status === "CANCELED") {
      return NextResponse.json({ error: "Não pode editar venda cancelada" }, { status: 400 })
    }

    const body = await req.json()
    const { buyerName, payment } = body

    const updated = await prisma.sale.update({
      where: { id: saleId },
      data: {
        nomeComprador: buyerName || null,
        payment: payment || sale.payment,
      },
    })

    return NextResponse.json({ ok: true, sale: updated })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const saleId = Number((await params).id)
    if (!saleId) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { items: true },
    })

    if (!sale) return NextResponse.json({ error: "Venda não encontrada" }, { status: 404 })
    if (sale.sellerUserId !== userId) {
      return NextResponse.json({ error: "Você só pode cancelar suas próprias vendas" }, { status: 403 })
    }
    if (sale.status === "CANCELED") {
      return NextResponse.json({ error: "Venda já foi cancelada" }, { status: 400 })
    }

    // Devolver produtos ao estoque
    for (const item of sale.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stockOnHand: { increment: item.qty } },
      })

      await prisma.stockMovement.create({
        data: {
          productId: item.productId,
          type: "IN",
          qty: item.qty,
          note: `Devolução por cancelamento da venda ${sale.code}`,
          actorUserId: userId,
        },
      })
    }

    // Marcar como cancelada
    await prisma.sale.update({
      where: { id: saleId },
      data: { status: "CANCELED" },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}