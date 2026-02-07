"use client"

import * as React from "react"
import { ShoppingCart, Trash2, QrCode, Banknote, CreditCard, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
    <div className="flex h-full flex-col rounded-t-3xl lg:rounded-3xl border border-red-100 bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-red-50 p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-500">
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Carrinho</h2>
          {totalItems > 0 && (
            <Badge className="rounded-full bg-red-100 text-red-700 hover:bg-red-100 text-xs">
              {totalItems}
            </Badge>
          )}
        </div>

        {itens.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onLimpar}
            className="rounded-full text-gray-500 hover:bg-red-50 hover:text-red-600 h-8 text-xs sm:text-sm"
          >
            <Trash2 className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Limpar</span>
          </Button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-auto p-3 sm:p-4">
        {itens.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-gray-400 py-8">
            <ShoppingCart className="mb-2 sm:mb-3 h-10 w-10 sm:h-12 sm:w-12 opacity-30" />
            <p className="text-sm font-medium">Carrinho vazio</p>
            <p className="text-xs">Adiciona alguns produtos!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {itens.map((item) => (
              <div
                key={item.id}
                className="group flex items-center justify-between rounded-2xl bg-gradient-to-br from-red-50 to-pink-50 p-2.5 sm:p-3 transition-all hover:shadow-md"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm sm:text-base font-semibold text-gray-900">{item.nome}</p>
                  <p className="text-xs text-gray-600">
                    {item.quantidade}x R$ {Number(item.preco).toFixed(2).replace(".", ",")}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <p className="whitespace-nowrap text-sm sm:text-base font-bold text-red-600">
                    R$ {(item.preco * item.quantidade).toFixed(2).replace(".", ",")}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-full opacity-0 transition-opacity hover:bg-red-100 hover:text-red-600 group-hover:opacity-100"
                    onClick={() => onRemoverItem(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {itens.length > 0 && (
        <div className="space-y-3 sm:space-y-4 border-t border-red-50 p-3 sm:p-4">
          {/* Nome do cliente */}
          <div>
            <p className="mb-1.5 sm:mb-2 text-[10px] sm:text-xs font-bold uppercase tracking-wide text-gray-500">
              Quem comprou?
            </p>
            <div className="relative">
              <User className="absolute left-2.5 sm:left-3 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Nome (opcional)"
                className="rounded-full border-red-100 pl-8 sm:pl-9 text-sm h-9 sm:h-10 focus-visible:ring-red-500"
              />
            </div>
          </div>

          {/* Pagamento */}
          <div>
            <p className="mb-1.5 sm:mb-2 text-[10px] sm:text-xs font-bold uppercase tracking-wide text-gray-500">
              Como vai pagar?
            </p>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {paymentMethods.map((method) => {
                const Icon = method.icon
                return (
                  <button
                    type="button"
                    key={method.value}
                    onClick={() => setSelectedPayment(method.value)}
                    className={`flex flex-col items-center gap-1 sm:gap-1.5 rounded-xl sm:rounded-2xl border-2 p-2 sm:p-3 text-[10px] sm:text-xs font-bold transition-all ${
                      selectedPayment === method.value
                        ? "border-red-600 bg-gradient-to-br from-red-50 to-pink-50 text-red-600 shadow-md"
                        : "border-gray-200 bg-white text-gray-600 hover:border-red-200 hover:bg-red-50"
                    }`}
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="leading-none">{method.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-red-50 to-pink-50 p-3 sm:p-4">
            <span className="text-sm sm:text-base font-semibold text-gray-700">Total</span>
            <span className="text-xl sm:text-2xl font-bold text-red-600">
              R$ {total.toFixed(2).replace(".", ",")}
            </span>
          </div>

          {/* Botão finalizar */}
          <Button
            className="w-full rounded-full bg-gradient-to-r from-red-600 to-red-500 py-5 sm:py-6 text-sm sm:text-base font-bold shadow-lg transition-all hover:from-red-700 hover:to-red-600 hover:shadow-xl disabled:opacity-50"
            onClick={() => onFinalizar(selectedPayment, buyerName)}
            disabled={!canFinish}
          >
            {carregando ? "Processando..." : "Finalizar venda"}
          </Button>
        </div>
      )}
    </div>
  )
}