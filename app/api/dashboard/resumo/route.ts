import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import  prisma  from "@/lib/prisma"
import { getCargoUsuario, isAdmin } from "@/lib/auth-server"
import { PaymentMethod } from "@/lib/generated/prisma/enums"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

function isoHoje() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function centsToBRL(cents: number | null | undefined) {
  return Number(((cents ?? 0) / 100).toFixed(2))
}

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })

  const cargo = await getCargoUsuario()
  if (!isAdmin(cargo)) return NextResponse.json({ error: "sem permissão" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from") ?? isoHoje()
  const to = searchParams.get("to") ?? isoHoje()

  const dtFrom = new Date(`${from}T00:00:00.000Z`)
  const dtTo = new Date(`${to}T23:59:59.999Z`)

  const [qtdVendas, somaTotal, porPagamento, topItens] = await Promise.all([
    prisma.sale.count({ where: { createdAt: { gte: dtFrom, lte: dtTo } } }),

    prisma.sale.aggregate({
      where: { createdAt: { gte: dtFrom, lte: dtTo } },
      _sum: { totalCents: true },
      _avg: { totalCents: true },
    }),

    prisma.sale.groupBy({
      by: ["payment"],
      where: { createdAt: { gte: dtFrom, lte: dtTo } },
      _count: { _all: true },
      _sum: { totalCents: true },
      orderBy: { _sum: { totalCents: "desc" } },
    }),

    prisma.saleItem.groupBy({
      by: ["productId"],
      where: { sale: { createdAt: { gte: dtFrom, lte: dtTo } } },
      _sum: { qty: true, totalCents: true },
      orderBy: { _sum: { qty: "desc" } },
      take: 10,
    }),
  ])

  // Para nome do produto, busca os IDs do top e faz um lookup
  const topIds = topItens.map((t) => t.productId)
  const produtos = topIds.length
    ? await prisma.product.findMany({
        where: { id: { in: topIds } },
        select: { id: true, name: true },
      })
    : []

  const nomeById = new Map(produtos.map((p) => [p.id, p.name]))

  return NextResponse.json({
    periodo: { from, to },

    vendas: {
      quantidade: qtdVendas,
      total: centsToBRL(somaTotal._sum.totalCents),
      ticketMedio: centsToBRL(somaTotal._avg.totalCents),
    },

    pagamentos: porPagamento.map((p) => ({
      metodo: p.payment as PaymentMethod,
      quantidade: p._count._all,
      total: centsToBRL(p._sum.totalCents),
    })),

    topProdutos: topItens.map((t) => ({
      productId: t.productId,
      nome: nomeById.get(t.productId) ?? `Produto ${t.productId}`,
      quantidade: Number(t._sum.qty ?? 0),
      total: centsToBRL(t._sum.totalCents),
    })),
  })
}
