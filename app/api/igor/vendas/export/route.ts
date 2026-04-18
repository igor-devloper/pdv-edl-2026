// app/api/igor/vendas/export/route.ts
import { NextResponse } from "next/server"
import { clerkClient } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { getCargoUsuario, isIgor } from "@/lib/auth-server"
import { auth } from "@clerk/nextjs/server"
import { Prisma } from "@/lib/generated/prisma/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  const cargo = await getCargoUsuario()
  if (!isIgor(cargo)) return NextResponse.json({ error: "Apenas IGOR pode exportar" }, { status: 403 })

  const url = new URL(req.url)
  const sellerUserId = url.searchParams.get("sellerUserId") || undefined
  const status       = url.searchParams.get("status")  as "PAID" | "CANCELED" | null
  const payment      = url.searchParams.get("payment") as "PIX" | "CASH" | "CARD" | null
  const nucleo       = url.searchParams.get("nucleo")  || undefined
  const search       = url.searchParams.get("search")  || undefined
  const minCents     = url.searchParams.get("minCents") ? Number(url.searchParams.get("minCents")) : undefined
  const maxCents     = url.searchParams.get("maxCents") ? Number(url.searchParams.get("maxCents")) : undefined
  const dateFrom     = url.searchParams.get("dateFrom") || undefined
  const dateTo       = url.searchParams.get("dateTo")   || undefined

  const where: Prisma.SaleWhereInput = {
    ...(sellerUserId && { sellerUserId }),
    ...(status  && { status }),
    ...(payment && { payment }),
    ...(nucleo  && { nucleo }),
    ...(search  && { OR: [
      { code:          { contains: search, mode: "insensitive" } },
      { nomeComprador: { contains: search, mode: "insensitive" } },
    ] }),
    ...((minCents !== undefined || maxCents !== undefined) && { totalCents: {
      ...(minCents !== undefined && { gte: minCents }),
      ...(maxCents !== undefined && { lte: maxCents }),
    } }),
    ...((dateFrom || dateTo) && { createdAt: {
      ...(dateFrom && { gte: new Date(dateFrom) }),
      ...(dateTo   && { lte: new Date(dateTo)   }),
    } }),
  }

  // Busca SEM limite — exporta tudo
  const sales = await prisma.sale.findMany({
    where,
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true } },
          variant: { select: { id: true, label: true, sku: true } },
          combo:   { select: { id: true, name: true, sku: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Resolve nomes dos vendedores
  const client = await clerkClient()
  const sellerIds = [...new Set(sales.map((s) => s.sellerUserId))]
  const usersMap: Record<string, string> = {}
  await Promise.all(sellerIds.map(async (sid) => {
    const u = await client.users.getUser(sid).catch(() => null)
    usersMap[sid] = u
      ? ([u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.emailAddresses[0]?.emailAddress || "Desconhecido")
      : "Desconhecido"
  }))

  // Achata em linhas — uma linha por item da venda
  const rows = sales.flatMap((s) => {
    const sellerName = usersMap[s.sellerUserId] ?? "Desconhecido"
    const paymentLabel = s.payment === "PIX" ? "PIX" : s.payment === "CASH" ? "Dinheiro" : "Cartão"
    const statusLabel  = s.status  === "PAID" ? "Paga"  : "Cancelada"
    const dataVenda    = new Date(s.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })

    return s.items.map((it) => {
      let nomeItem: string
      let tipo: string
      if (it.combo)                      { nomeItem = it.combo.name;                      tipo = "Combo" }
      else if (it.product && it.variant) { nomeItem = `${it.product.name} — ${it.variant.label}`; tipo = "Produto c/ variante" }
      else if (it.product)               { nomeItem = it.product.name;                    tipo = "Produto" }
      else                               { nomeItem = "Item";                              tipo = "—" }

      return {
        "Código":           s.code,
        "Data":             dataVenda,
        "Status":           statusLabel,
        "Método Pagamento": paymentLabel,
        "Vendedor":         sellerName,
        "Comprador":        s.nomeComprador ?? "",
        "Núcleo":           s.nucleo        ?? "",
        "Item":             nomeItem,
        "Tipo":             tipo,
        "Qtd":              it.qty,
        "Preço Unit. (R$)": it.unitCents  / 100,
        "Total Item (R$)":  it.totalCents / 100,
        "Desconto Venda (R$)": s.descontoVendaCents != null ? s.descontoVendaCents / 100 : 0,
        "Total Venda (R$)": s.totalCents  / 100,
      }
    })
  })

  return NextResponse.json({ rows, total: sales.length })
}