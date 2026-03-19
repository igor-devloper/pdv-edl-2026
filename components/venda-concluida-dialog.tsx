"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Gift } from "lucide-react"

export type Payment = "PIX" | "CASH" | "CARD"

export type SaleReceipt = {
  id: number
  code: string
  payment: Payment
  totalCents: number
  createdAt: string | Date
  items: Array<{
    productId: number | null   // null quando é item de combo
    variantId?: number | null
    comboId?: number | null
    qty: number
    unitCents: number
    totalCents: number
  }>
  productNames?: Record<string, string>  // key pode ser número ou string
}

function centsToBRL(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",")
}

function paymentLabel(p: Payment) {
  if (p === "PIX") return "PIX"
  if (p === "CASH") return "Dinheiro"
  return "Cartão"
}

export function VendaConcluidaDialog(props: {
  open: boolean
  onOpenChange: (v: boolean) => void
  sale: SaleReceipt | null
  onNovaVenda: () => void
}) {
  const { open, onOpenChange, sale, onNovaVenda } = props

  const handlePrint = React.useCallback(() => {
    window.print()
  }, [])

  if (!sale) return null

  function getNome(it: SaleReceipt["items"][number]): string {
    const names = sale!.productNames || {}

    // Tenta por comboId
    if (it.comboId) {
      return names[`c:${it.comboId}`] || names[String(it.comboId)] || `Combo ${it.comboId}`
    }
    // Tenta por variantId
    if (it.variantId) {
      return names[`v:${it.variantId}`] || names[String(it.variantId)] || `Variante ${it.variantId}`
    }
    // Tenta por productId
    if (it.productId != null) {
      return names[`p:${it.productId}`] || names[String(it.productId)] || `Produto ${it.productId}`
    }
    return "Item"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl print:max-w-none print:border-0 print:shadow-none">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-green-600">
            <CheckCircle2 className="h-9 w-9 text-white" />
          </div>
          <DialogTitle className="text-center text-2xl font-bold">Venda concluída!</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 print:text-black">
          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-red-50 to-pink-50 p-3">
            <span className="text-sm font-semibold text-gray-700">Código</span>
            <span className="font-mono text-lg font-bold text-red-600">{sale.code}</span>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-red-50 to-pink-50 p-3">
            <span className="text-sm font-semibold text-gray-700">Pagamento</span>
            <span className="font-bold text-gray-900">{paymentLabel(sale.payment)}</span>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-red-50 to-pink-50 p-3">
            <span className="text-sm font-semibold text-gray-700">Total</span>
            <span className="text-2xl font-bold text-red-600">R$ {centsToBRL(sale.totalCents)}</span>
          </div>

          <div className="rounded-2xl border border-red-100 p-4">
            <p className="mb-3 font-bold text-gray-900">Itens</p>

            <div className="space-y-2">
              {sale.items.map((it, idx) => {
                const nome = getNome(it)
                const isCombo = !!it.comboId

                return (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="min-w-0 flex items-center gap-1.5">
                      {isCombo && <Gift className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />}
                      <div>
                        <p className="truncate font-semibold text-gray-900">{nome}</p>
                        <p className="text-xs text-gray-600">
                          {it.qty} x R$ {centsToBRL(it.unitCents)}
                        </p>
                      </div>
                    </div>
                    <div className="font-bold text-red-600 flex-shrink-0 ml-2">
                      R$ {centsToBRL(it.totalCents)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <p className="pt-2 text-center text-xs text-gray-500 print:hidden">
            Clica em "Imprimir" pra gerar o comprovante
          </p>
        </div>

        <DialogFooter className="print:hidden">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="rounded-full border-red-200 hover:bg-red-50"
          >
            Imprimir
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false)
              onNovaVenda()
            }}
            className="rounded-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600"
          >
            Nova venda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}