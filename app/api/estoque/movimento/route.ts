// app/api/stock/movimento/route.ts
import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import prisma  from "@/lib/prisma"
import { getCargoUsuario, podeGerenciarEstoque } from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

type Body = {
  productId: number
  tipo: "ENTRADA" | "AJUSTE"
  quantidade: number // pode ser + ou - no AJUSTE
  motivo?: string | null
}

function mustInt(v: any, name: string) {
  const n = Number(v)
  if (!Number.isFinite(n)) throw new Error(`${name} inválido`)
  return Math.trunc(n)
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })

  const cargo = await getCargoUsuario()
  if (!podeGerenciarEstoque(cargo)) return NextResponse.json({ error: "sem permissão" }, { status: 403 })

  const body = (await req.json().catch(() => null)) as Body | null
  if (!body) return NextResponse.json({ error: "payload inválido" }, { status: 400 })

  let productId: number
  let quantidade: number
  try {
    productId = mustInt(body.productId, "productId")
    quantidade = mustInt(body.quantidade, "quantidade")
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }

  if (body.tipo === "ENTRADA") {
    if (quantidade <= 0) return NextResponse.json({ error: "quantidade deve ser > 0" }, { status: 400 })
  } else {
    // AJUSTE pode ser + ou -, mas não pode ser 0
    if (quantidade === 0) return NextResponse.json({ error: "quantidade não pode ser 0" }, { status: 400 })
  }

  const delta = body.tipo === "ENTRADA" ? Math.abs(quantidade) : quantidade

  const result = await prisma.$transaction(async (tx: { product: { findUnique: (arg0: { where: { id: number } }) => any; update: (arg0: { where: { id: number }; data: { stock: any } }) => any } }) => {
    const produto = await tx.product.findUnique({ where: { id: productId } })
    if (!produto || !produto.active) throw new Error("produto não encontrado")

    const novoEstoque = produto.stock + delta
    if (novoEstoque < 0) throw new Error("ajuste deixaria estoque negativo")

    // Se você ainda não tem tabela de movimentos, comente essa parte.
    // Recomendo MUITO ter (auditabilidade).
    // await tx.stockMovement.create({ data: { ... } })

    const atualizado = await tx.product.update({
      where: { id: productId },
      data: { stock: novoEstoque },
    })

    return atualizado
  })

  return NextResponse.json({ ok: true, produto: result })
}
