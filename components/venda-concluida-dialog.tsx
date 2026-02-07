"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

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
      <DialogContent className="max-w-lg print:max-w-none print:border-0 print:shadow-none">
        <DialogHeader>
          <DialogTitle>Venda concluída</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 print:text-black">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Código</span>
            <span className="font-mono font-semibold">{sale.code}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Pagamento</span>
            <span className="font-semibold">{paymentLabel(sale.payment)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-lg font-bold">R$ {centsToBRL(sale.totalCents)}</span>
          </div>

          <Separator className="my-2" />

          <div className="space-y-2">
            <p className="text-sm font-semibold">Itens</p>

            <div className="space-y-1">
              {sale.items.map((it, idx) => {
                const nome = sale.productNames?.[it.productId] ?? `Produto ${it.productId}`
                return (
                  <div key={`${it.productId}-${idx}`} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <p className="truncate">{nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {it.qty} x R$ {centsToBRL(it.unitCents)}
                      </p>
                    </div>
                    <div className="font-semibold">R$ {centsToBRL(it.totalCents)}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <p className="pt-2 text-xs text-muted-foreground print:hidden">
            Clique em “Imprimir” para gerar o comprovante.
          </p>
        </div>

        <DialogFooter className="print:hidden">
          <Button variant="outline" onClick={handlePrint}>
            Imprimir
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false)
              onNovaVenda()
            }}
          >
            Nova venda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
