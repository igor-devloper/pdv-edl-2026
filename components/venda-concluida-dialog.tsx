"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"

export type Payment = "PIX" | "CASH" | "CARD"

export type SaleReceipt = {
  id: number
  code: string
  payment: Payment
  totalCents: number
  createdAt: string | Date
  items: Array<{
    productId: number
    qty: number
    unitCents: number
    totalCents: number
  }>
  productNames?: Record<number, string>
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl print:max-w-none print:border-0 print:shadow-none">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-green-500 to-green-600">
            <CheckCircle2 className="h-9 w-9 text-white" />
          </div>
          <DialogTitle className="text-center text-2xl font-bold">Venda concluída!</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 print:text-black">
          <div className="flex items-center justify-between rounded-2xl bg-linear-to-brrom-red-50 to-pink-50 p-3">
            <span className="text-sm font-semibold text-gray-700">Código</span>
            <span className="font-mono text-lg font-bold text-red-600">{sale.code}</span>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-linear-to-br from-red-50 to-pink-50 p-3">
            <span className="text-sm font-semibold text-gray-700">Pagamento</span>
            <span className="font-bold text-gray-900">{paymentLabel(sale.payment)}</span>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-linear-to-br from-red-50 to-pink-50 p-3">
            <span className="text-sm font-semibold text-gray-700">Total</span>
            <span className="text-2xl font-bold text-red-600">R$ {centsToBRL(sale.totalCents)}</span>
          </div>

          <div className="rounded-2xl border border-red-100 p-4">
            <p className="mb-3 font-bold text-gray-900">Itens</p>

            <div className="space-y-2">
              {sale.items.map((it, idx) => {
                const nome = sale.productNames?.[it.productId] ?? `Produto ${it.productId}`
                return (
                  <div key={`${it.productId}-${idx}`} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{nome}</p>
                      <p className="text-xs text-gray-600">
                        {it.qty} x R$ {centsToBRL(it.unitCents)}
                      </p>
                    </div>
                    <div className="font-bold text-red-600">R$ {centsToBRL(it.totalCents)}</div>
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
            className="rounded-full bg-linear-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600"
          >
            Nova venda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}