// app/api/admin/nucleos/route.ts
// GET /api/admin/nucleos
// Retorna ranking de vendas agrupado por núcleo para o dashboard.
// Protegido: apenas ADMIN.

import { NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

async function getRole(userId: string): Promise<string> {
  const user = await (await clerkClient()).users.getUser(userId)
  const role = (user.publicMetadata?.role as string | undefined) ?? ""
  return role.toUpperCase()
}

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })

  const role = await getRole(userId)
  if (role !== "ADMIN")
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 })

  // Query params opcionais: ?from=2024-01-01&to=2024-12-31
  const { searchParams } = new URL(req.url)
  const fromRaw = searchParams.get("from")
  const toRaw   = searchParams.get("to")

  const where: {
    status: "PAID"
    nucleo: { not: null }
    createdAt?: { gte?: Date; lte?: Date }
  } = {
    status: "PAID",
    nucleo: { not: null },
  }

  if (fromRaw || toRaw) {
    where.createdAt = {}
    if (fromRaw) where.createdAt.gte = new Date(fromRaw)
    if (toRaw)   where.createdAt.lte = new Date(toRaw + "T23:59:59Z")
  }

  // Agrupamento por núcleo
  const grouped = await prisma.sale.groupBy({
    by: ["nucleo"],
    where,
    _sum:   { totalCents: true },
    _count: { id: true },
    orderBy: { _sum: { totalCents: "desc" } },
  })

  // Totais gerais (para % de participação)
  const totalGeral = grouped.reduce((acc, g) => acc + (g._sum.totalCents ?? 0), 0)
  const vendasGeral = grouped.reduce((acc, g) => acc + g._count.id, 0)

  const nucleos = grouped.map((g) => {
    const totalCents  = g._sum.totalCents ?? 0
    const totalVendas = g._count.id
    return {
      nucleo:        g.nucleo ?? "Não informado",
      totalCents,
      totalVendas,
      ticketMedioCents: totalVendas > 0 ? Math.round(totalCents / totalVendas) : 0,
      participacaoPct:  totalGeral > 0 ? Math.round((totalCents / totalGeral) * 1000) / 10 : 0,
    }
  })

  return NextResponse.json({
    ok: true,
    periodo: { from: fromRaw ?? null, to: toRaw ?? null },
    totais: { totalCents: totalGeral, totalVendas: vendasGeral },
    nucleos,
  })
}