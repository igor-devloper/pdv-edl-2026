// components/cart-panel.tsx
"use client"

import * as React from "react"
import { ShoppingCart, Trash2, CreditCard, Banknote, QrCode, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"

export type FormaPagamentoUI = "pix" | "dinheiro" | "cartao"

export type ItemCarrinho = {
  id: number
  nome: string
  preco: number
  quantidade: number
}

type Props = {
  itens: ItemCarrinho[]
  onRemoverItem: (id: number) => void
  onLimpar: () => void
  onFinalizar: (forma: FormaPagamentoUI, buyerName: string) => void
  carregando: boolean
}

const paymentMethods: Array<{ value: FormaPagamentoUI; label: string; icon: any }> = [
  { value: "pix", label: "PIX", icon: QrCode },
  { value: "dinheiro", label: "Dinheiro", icon: Banknote },
  { value: "cartao", label: "Cartão", icon: CreditCard },
]

export function CartPanel({ itens, onRemoverItem, onLimpar, onFinalizar, carregando }: Props) {
  const [selectedPayment, setSelectedPayment] = React.useState<FormaPagamentoUI>("pix")
  const [buyerName, setBuyerName] = React.useState("")

  const total = itens.reduce((sum, item) => sum + item.preco * item.quantidade, 0)
  const totalItems = itens.reduce((sum, item) => sum + item.quantidade, 0)

  const canFinish = itens.length > 0 && !carregando

  return (
    <div className="flex h-full flex-col rounded-2xl border bg-card">
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Carrinho</h2>
          {totalItems > 0 && <Badge className="text-xs">{totalItems}</Badge>}
        </div>

        {itens.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onLimpar} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Limpar
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4">
        {itens.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <ShoppingCart className="mb-2 h-10 w-10 opacity-30" />
            <p className="text-sm">Carrinho vazio</p>
            <p className="text-xs">Adicione produtos para vender</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {itens.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl bg-muted/50 p-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantidade}x R$ {Number(item.preco).toFixed(2).replace(".", ",")}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground whitespace-nowrap">
                    R$ {(item.preco * item.quantidade).toFixed(2).replace(".", ",")}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemoverItem(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {itens.length > 0 && (
        <div className="border-t p-4 space-y-3">
          {/* ✅ Nome do cliente */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Cliente</p>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Nome de quem comprou (opcional)"
                className="pl-9 rounded-xl"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Pagamento</p>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map((method) => {
                const Icon = method.icon
                return (
                  <button
                    type="button"
                    key={method.value}
                    onClick={() => setSelectedPayment(method.value)}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-xs font-medium transition-colors ${
                      selectedPayment === method.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {method.label}
                  </button>
                )
              })}
            </div>
          </div>

          <Separator className="my-1" />

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total</span>
            <span className="text-xl font-bold text-primary">
              R$ {total.toFixed(2).replace(".", ",")}
            </span>
          </div>

          <Button
            className="w-full rounded-xl"
            size="lg"
            onClick={() => onFinalizar(selectedPayment, buyerName)}
            disabled={!canFinish}
          >
            {carregando ? "Processando..." : "Finalizar Venda"}
          </Button>
        </div>
      )}
    </div>
  )
}
