import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { getCargoUsuario, isAdmin } from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

function asInt(v: any, name: string) {
  const n = Number(v)
  if (!Number.isFinite(n) || !Number.isInteger(n)) throw new Error(`${name} inválido`)
  return n
}
function str(v: any) {
  return String(v ?? "").trim()
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 })
  const cargo = await getCargoUsuario()
  if (!isAdmin(cargo)) return NextResponse.json({ error: "sem permissão" }, { status: 403 })

  const productId = Number(ctx.params.id)
  if (!Number.isFinite(productId) || productId <= 0) return NextResponse.json({ error: "id inválido" }, { status: 400 })

  try {
    const body = await req.json()
    const qty = asInt(body.qty, "qty") // pode ser + ou -
    const note = str(body.note)
    if (qty === 0) throw new Error("qty não pode ser 0")

    const updated = await prisma.$transaction(async (tx) => {
      await tx.stockMovement.create({
        data: {
          productId,
          type: "ADJUST",
          qty,
          note: note || null,
          actorUserId: userId,
        },
      })

      // evita ficar negativo
      const p = await tx.product.findUnique({ where: { id: productId } })
      if (!p) throw new Error("produto não encontrado")

      const novo = p.stockOnHand + qty
      if (novo < 0) throw new Error("estoque não pode ficar negativo")

      return tx.product.update({
        where: { id: productId },
        data: { stockOnHand: novo },
      })
    })

    return NextResponse.json({ ok: true, produto: updated })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "erro" }, { status: 400 })
  }
}
