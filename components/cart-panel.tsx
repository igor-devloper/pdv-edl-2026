"use client"

import * as React from "react"
import {
  ShoppingCart, Trash2, QrCode, Banknote, CreditCard,
  User, Building2, X, CheckCircle2, Copy, ArrowLeftRight,
  Tag, CircleDollarSign,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { QRCodeSVG } from "qrcode.react"

export type FormaPagamentoUI = "pix" | "dinheiro" | "cartao"

export type ItemCarrinho = {
  id: number
  nome: string
  preco: number        // preço original
  precoFinal: number   // preço já com desconto de produto aplicado
  quantidade: number
  descontoProduto: number // % de desconto do produto (0–100)
}

// ─────────────────────────────────────────────────────────────────────────────
const PIX_CONFIG = {
  chave: "wagnerigor9@gmail.com",
  nomeRecebedor: "Igor Wagner Gomes da Silva",
  cidade: "Joao Pessoa",
}
// ─────────────────────────────────────────────────────────────────────────────

const NUCLEOS = [
  "Núcleo da Mata",
  "Núcleo Central",
  "Núcleo Sul",
  "Núcleo Norte",
  "Núcleo Triângulo",
  "Núcleo Vale do Aço",
  "Núcleo Vertentes",
  "Outro / Externo",
] as const

// ─── Gerador PIX ─────────────────────────────────────────────────────────────
function padN(n: number): string {
  return n.toString().padStart(2, "0")
}
function calculateCRC16(str: string): string {
  let crc = 0xffff
  const polynomial = 0x1021
  for (let pos = 0; pos < str.length; pos++) {
    crc ^= str.charCodeAt(pos) << 8
    for (let i = 0; i < 8; i++) {
      crc = ((crc << 1) ^ (crc & 0x8000 ? polynomial : 0)) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0")
}
function buildPixPayload(valor: number): string {
  const { chave, nomeRecebedor, cidade } = PIX_CONFIG
  const formattedAmount = valor.toFixed(2)
  const cleanName = nomeRecebedor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9\s]/gi, "").substring(0, 25).trim().toUpperCase()
  const cleanCity = cidade.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9\s]/gi, "").substring(0, 15).trim().toUpperCase()
  const pixDomain = "br.gov.bcb.pix"
  const merchantAccInfo = ["00", padN(pixDomain.length), pixDomain, "01", padN(chave.length), chave].join("")
  const merchantField = `26${padN(merchantAccInfo.length)}${merchantAccInfo}`
  const txid = "***"
  const txidField = `62${padN(txid.length + 4)}0503${txid}`
  const payload = ["000201", merchantField, "52040000", "5303986", `54${padN(formattedAmount.length)}${formattedAmount}`, "5802BR", `59${padN(cleanName.length)}${cleanName}`, `60${padN(cleanCity.length)}${cleanCity}`, txidField, "6304"].join("")
  return payload + calculateCRC16(payload)
}

// ─── Modal QR PIX ─────────────────────────────────────────────────────────────
function PixQrModal({ open, onOpenChange, total, onConfirmar, carregando }: {
  open: boolean; onOpenChange: (v: boolean) => void
  total: number; onConfirmar: () => void; carregando: boolean
}) {
  const pixPayload = React.useMemo(() => buildPixPayload(total), [total])
  const [copied, setCopied] = React.useState(false)

  function copiar() {
    navigator.clipboard.writeText(pixPayload).then(() => {
      setCopied(true)
      toast.success("Código PIX copiado!")
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
        <div className="bg-gradient-to-br from-red-600 to-rose-500 p-5 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white text-lg font-bold">
              <QrCode className="h-5 w-5" />Pagamento via PIX
            </DialogTitle>
          </DialogHeader>
          <p className="mt-1 text-red-100 text-sm">Mostre o QR para o cliente escanear</p>
        </div>
        <div className="flex flex-col items-center gap-4 p-5">
          <div className="w-full rounded-2xl bg-gradient-to-br from-red-50 to-pink-50 border border-red-100 p-3 text-center">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Valor a pagar</p>
            <p className="text-3xl font-black text-red-600 mt-0.5 tabular-nums">
              R$ {total.toFixed(2).replace(".", ",")}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">{PIX_CONFIG.nomeRecebedor}</p>
          </div>
          <div className="rounded-2xl border-2 border-red-100 bg-white p-3 shadow-lg">
            <QRCodeSVG value={pixPayload} size={200} level="H" includeMargin={false} />
          </div>
          <button type="button" onClick={copiar}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl border-2 px-4 py-2.5 text-sm font-bold transition-all active:scale-[0.98] ${
              copied ? "border-green-300 bg-green-50 text-green-700" : "border-red-200 bg-white text-red-600 hover:bg-red-50"
            }`}
          >
            <Copy className="h-4 w-4" />
            {copied ? "Copiado ✓" : "Copiar código Copia e Cola"}
          </button>
          <div className="flex w-full gap-2">
            <Button variant="outline" className="flex-1 rounded-full border-gray-200 text-gray-600 hover:bg-gray-50" onClick={() => onOpenChange(false)} disabled={carregando}>
              <X className="mr-1.5 h-4 w-4" />Cancelar
            </Button>
            <Button className="flex-1 rounded-full bg-gradient-to-r from-red-600 to-rose-500 font-bold hover:from-red-700 hover:to-rose-600 shadow-md" onClick={onConfirmar} disabled={carregando}>
              {carregando ? "Processando..." : <><CheckCircle2 className="mr-1.5 h-4 w-4" />Confirmar pago</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Modal Troco ──────────────────────────────────────────────────────────────
const CEDULAS = [2, 5, 10, 20, 50, 100, 200]

function TrocoModal({ open, onOpenChange, total, onConfirmar, carregando }: {
  open: boolean; onOpenChange: (v: boolean) => void
  total: number; onConfirmar: () => void; carregando: boolean
}) {
  const [valorStr, setValorStr] = React.useState("")
  React.useEffect(() => { if (open) setValorStr("") }, [open])

  const valorNum    = parseFloat(valorStr.replace(",", ".")) || 0
  const troco       = valorNum - total
  const trocoValido = valorNum >= total
  const sugestoes   = CEDULAS.filter((c) => c >= total).slice(0, 5)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
        <div className="bg-gradient-to-br from-emerald-600 to-teal-500 p-5 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white text-lg font-bold">
              <Banknote className="h-5 w-5" />Pagamento em Dinheiro
            </DialogTitle>
          </DialogHeader>
          <p className="mt-1 text-emerald-100 text-sm">Informe quanto o cliente entregou</p>
        </div>
        <div className="flex flex-col gap-4 p-5">
          <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-3 text-center">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Total da compra</p>
            <p className="text-3xl font-black text-emerald-600 tabular-nums">
              R$ {total.toFixed(2).replace(".", ",")}
            </p>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gray-500">Quanto o cliente entregou?</p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 select-none">R$</span>
              <Input type="number" inputMode="decimal" min={0} step="0.01" value={valorStr} onChange={(e) => setValorStr(e.target.value)} placeholder="0,00"
                className="rounded-2xl border-2 border-gray-200 pl-10 text-xl font-bold h-12 focus-visible:ring-emerald-500 focus-visible:border-emerald-400 tabular-nums" />
            </div>
            {sugestoes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {sugestoes.map((c) => (
                  <button key={c} type="button" onClick={() => setValorStr(String(c))}
                    className={`rounded-full border-2 px-3 py-1 text-xs font-bold transition-all ${
                      valorStr === String(c) ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:bg-emerald-50"
                    }`}
                  >R$ {c}</button>
                ))}
              </div>
            )}
          </div>
          <div className={`rounded-2xl border-2 p-4 text-center transition-all ${
            trocoValido ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50"
              : valorStr ? "border-red-200 bg-red-50" : "border-gray-100 bg-gray-50"
          }`}>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <ArrowLeftRight className={`h-3.5 w-3.5 ${trocoValido ? "text-emerald-500" : "text-gray-300"}`} />
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Troco</p>
            </div>
            {!valorStr ? <p className="text-2xl font-bold text-gray-200">—</p>
              : trocoValido ? (
                <p className="text-3xl font-black text-emerald-600 tabular-nums">R$ {troco.toFixed(2).replace(".", ",")}</p>
              ) : (
                <p className="text-base font-bold text-red-500">Faltam R$ {Math.abs(troco).toFixed(2).replace(".", ",")}</p>
              )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-full border-gray-200 text-gray-600 hover:bg-gray-50" onClick={() => onOpenChange(false)} disabled={carregando}>
              <X className="mr-1.5 h-4 w-4" />Cancelar
            </Button>
            <Button className="flex-1 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 font-bold hover:from-emerald-700 hover:to-teal-600 shadow-md disabled:opacity-40" onClick={onConfirmar} disabled={!trocoValido || carregando}>
              {carregando ? "Processando..." : <><CheckCircle2 className="mr-1.5 h-4 w-4" />Confirmar</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────
type Props = {
  itens: ItemCarrinho[]
  onRemoverItem: (id: number) => void
  onLimpar: () => void
  onFinalizar: (
    forma: FormaPagamentoUI,
    buyerName: string,
    nucleo: string,
    descontoVendaCents: number // valor fixo em centavos
  ) => void
  carregando: boolean
}

const paymentMethods: Array<{ value: FormaPagamentoUI; label: string; icon: React.ElementType }> = [
  { value: "pix",      label: "PIX",      icon: QrCode     },
  { value: "dinheiro", label: "Dinheiro", icon: Banknote   },
  { value: "cartao",   label: "Cartão",   icon: CreditCard },
]

// Atalhos rápidos de desconto em reais
const DESCONTO_ATALHOS = [1, 2, 5, 10]

// ─── Componente Principal ─────────────────────────────────────────────────────
export function CartPanel({ itens, onRemoverItem, onLimpar, onFinalizar, carregando }: Props) {
  const [selectedPayment, setSelectedPayment] = React.useState<FormaPagamentoUI>("pix")
  const [buyerName, setBuyerName]             = React.useState("")
  const [nucleo, setNucleo]                   = React.useState<string>("")
  const [descontoStr, setDescontoStr]         = React.useState("") // valor em R$
  const [pixModalOpen, setPixModalOpen]       = React.useState(false)
  const [trocoModalOpen, setTrocoModalOpen]   = React.useState(false)

  // Subtotal com descontos de produto já aplicados
  const subtotal = itens.reduce((s, i) => s + i.precoFinal * i.quantidade, 0)

  // Desconto da venda em reais — limitado ao subtotal
  const descontoVenda = Math.min(subtotal, Math.max(0, parseFloat(descontoStr.replace(",", ".")) || 0))
  const total = Math.max(0, subtotal - descontoVenda)
  const descontoVendaCents = Math.round(descontoVenda * 100)

  const temDescontoProdutos = itens.some((i) => i.descontoProduto > 0)
  const totalDescontoProdutos = itens.reduce((s, i) => s + (i.preco - i.precoFinal) * i.quantidade, 0)
  const temDescontoVenda = descontoVenda > 0

  const totalOriginal = itens.reduce((s, i) => s + i.preco * i.quantidade, 0)
  const totalEconomia = totalOriginal - total

  const totalItems = itens.reduce((s, i) => s + i.quantidade, 0)
  const canFinish  = itens.length > 0 && !carregando

  function handleFinalizarClick() {
    if (!canFinish) return
    if (selectedPayment === "pix")           setPixModalOpen(true)
    else if (selectedPayment === "dinheiro") setTrocoModalOpen(true)
    else                                     onFinalizar("cartao", buyerName, nucleo, descontoVendaCents)
  }

  function handleAtalho(valor: number) {
    setDescontoStr(descontoStr === String(valor) ? "" : String(valor))
  }

  return (
    <>
      <div className="flex h-full flex-col rounded-t-3xl lg:rounded-3xl border border-red-100 bg-white shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-red-50 p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-500">
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Carrinho</h2>
            {totalItems > 0 && (
              <Badge className="rounded-full bg-red-100 text-red-700 hover:bg-red-100 text-xs">{totalItems}</Badge>
            )}
          </div>
          {itens.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onLimpar} className="rounded-full text-gray-500 hover:bg-red-50 hover:text-red-600 h-8 text-xs sm:text-sm">
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
                <div key={item.id} className="group flex items-center justify-between rounded-2xl bg-gradient-to-br from-red-50 to-pink-50 p-2.5 sm:p-3 transition-all hover:shadow-md">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm sm:text-base font-semibold text-gray-900">{item.nome}</p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs text-gray-600">
                        {item.quantidade}x R$ {Number(item.precoFinal).toFixed(2).replace(".", ",")}
                      </p>
                      {item.descontoProduto > 0 && (
                        <Badge className="rounded-full bg-amber-100 text-amber-700 hover:bg-amber-100 text-[9px] px-1.5 py-0 font-bold">
                          <Tag className="h-2 w-2 mr-0.5" />-{item.descontoProduto}%
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      {item.descontoProduto > 0 && (
                        <p className="text-[10px] text-gray-400 line-through leading-none">
                          R$ {(item.preco * item.quantidade).toFixed(2).replace(".", ",")}
                        </p>
                      )}
                      <p className="whitespace-nowrap text-sm sm:text-base font-bold text-red-600">
                        R$ {(item.precoFinal * item.quantidade).toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 rounded-full opacity-0 transition-opacity hover:bg-red-100 hover:text-red-600 group-hover:opacity-100" onClick={() => onRemoverItem(item.id)}>
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
            {/* Nome */}
            <div>
              <p className="mb-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wide text-gray-500">Quem comprou?</p>
              <div className="relative">
                <User className="absolute left-2.5 sm:left-3 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-gray-400" />
                <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Nome (opcional)"
                  className="rounded-full border-red-100 pl-8 sm:pl-9 text-sm h-9 sm:h-10 focus-visible:ring-red-500" />
              </div>
            </div>

            {/* Núcleo */}
            <div>
              <p className="mb-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wide text-gray-500">Núcleo / Área</p>
              <div className="relative">
                <Building2 className="absolute left-2.5 sm:left-3 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" />
                <Select value={nucleo} onValueChange={setNucleo}>
                  <SelectTrigger className="rounded-full border-red-100 pl-8 sm:pl-9 text-sm h-9 sm:h-10 focus:ring-red-500 w-full">
                    <SelectValue placeholder="Selecione o núcleo (opcional)" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="nao_informado" className="rounded-xl text-gray-400 italic">Não informado</SelectItem>
                    {NUCLEOS.map((n) => (<SelectItem key={n} value={n} className="rounded-xl">{n}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ─── Desconto na venda (valor fixo R$) ───────────────── */}
            <div>
              <p className="mb-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wide text-gray-500 flex items-center gap-1">
                <CircleDollarSign className="h-3 w-3" />
                Desconto na venda
              </p>

              {/* Atalhos rápidos */}
              <div className="mb-2 flex gap-1.5 flex-wrap">
                {DESCONTO_ATALHOS.map((val) => (
                  <button key={val} type="button" onClick={() => handleAtalho(val)}
                    className={`rounded-full border-2 px-2.5 py-0.5 text-[10px] sm:text-xs font-bold transition-all ${
                      descontoStr === String(val)
                        ? "border-amber-500 bg-amber-50 text-amber-700"
                        : "border-gray-200 bg-white text-gray-500 hover:border-amber-300 hover:bg-amber-50"
                    }`}
                  >
                    -R$ {val}
                  </button>
                ))}
              </div>

              {/* Input manual */}
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 select-none pointer-events-none">
                  R$
                </span>
                <Input
                  type="number" inputMode="decimal" min={0} step={0.01}
                  value={descontoStr}
                  onChange={(e) => setDescontoStr(e.target.value)}
                  placeholder="0,00"
                  className="rounded-full border-amber-100 pl-9 text-sm h-9 sm:h-10 focus-visible:ring-amber-400 tabular-nums"
                />
              </div>

              {/* Aviso desconto alto */}
              {temDescontoVenda && descontoVenda > subtotal * 0.5 && (
                <p className="mt-1 text-[10px] text-amber-600 font-semibold">
                  ⚠ Desconto alto — mais de 50% do subtotal
                </p>
              )}
            </div>

            {/* Forma de pagamento */}
            <div>
              <p className="mb-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wide text-gray-500">Como vai pagar?</p>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {paymentMethods.map(({ value, label, icon: Icon }) => (
                  <button type="button" key={value} onClick={() => setSelectedPayment(value)}
                    className={`flex flex-col items-center gap-1 sm:gap-1.5 rounded-xl sm:rounded-2xl border-2 p-2 sm:p-3 text-[10px] sm:text-xs font-bold transition-all ${
                      selectedPayment === value
                        ? "border-red-600 bg-gradient-to-br from-red-50 to-pink-50 text-red-600 shadow-md"
                        : "border-gray-200 bg-white text-gray-600 hover:border-red-200 hover:bg-red-50"
                    }`}
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="leading-none">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Resumo de preços */}
            <div className="rounded-2xl bg-gradient-to-br from-red-50 to-pink-50 p-3 sm:p-4 space-y-1.5">
              {(temDescontoProdutos || temDescontoVenda) && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Subtotal</span>
                  <span className="text-sm font-semibold text-gray-700 tabular-nums">
                    R$ {subtotal.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              )}

              {temDescontoProdutos && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-amber-600 flex items-center gap-1">
                    <Tag className="h-3 w-3" />Desc. produtos
                  </span>
                  <span className="text-xs font-bold text-amber-600 tabular-nums">
                    -R$ {totalDescontoProdutos.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              )}

              {temDescontoVenda && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-amber-600 flex items-center gap-1">
                    <CircleDollarSign className="h-3 w-3" />Desc. venda
                  </span>
                  <span className="text-xs font-bold text-amber-600 tabular-nums">
                    -R$ {descontoVenda.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              )}

              {(temDescontoProdutos || temDescontoVenda) && (
                <div className="border-t border-red-100 pt-1.5" />
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm sm:text-base font-semibold text-gray-700">Total</span>
                <span className="text-xl sm:text-2xl font-bold text-red-600 tabular-nums">
                  R$ {total.toFixed(2).replace(".", ",")}
                </span>
              </div>

              {totalEconomia > 0.001 && (
                <div className="flex items-center justify-center gap-1 rounded-xl bg-green-50 border border-green-100 px-3 py-1.5 mt-1">
                  <Tag className="h-3 w-3 text-green-600" />
                  <span className="text-[10px] sm:text-xs font-bold text-green-700">
                    Economizou R$ {totalEconomia.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              )}
            </div>

            {/* Botão finalizar */}
            <Button
              className="w-full rounded-full bg-gradient-to-r from-red-600 to-red-500 py-5 sm:py-6 text-sm sm:text-base font-bold shadow-lg hover:from-red-700 hover:to-red-600 hover:shadow-xl disabled:opacity-50"
              onClick={handleFinalizarClick}
              disabled={!canFinish}
            >
              {carregando ? "Processando..."
                : selectedPayment === "pix" ? "Gerar QR Code PIX"
                : selectedPayment === "dinheiro" ? "Calcular Troco"
                : "Finalizar venda"}
            </Button>
          </div>
        )}
      </div>

      <PixQrModal
        open={pixModalOpen} onOpenChange={setPixModalOpen} total={total}
        onConfirmar={() => { setPixModalOpen(false); onFinalizar("pix", buyerName, nucleo, descontoVendaCents) }}
        carregando={carregando}
      />
      <TrocoModal
        open={trocoModalOpen} onOpenChange={setTrocoModalOpen} total={total}
        onConfirmar={() => { setTrocoModalOpen(false); onFinalizar("dinheiro", buyerName, nucleo, descontoVendaCents) }}
        carregando={carregando}
      />
    </>
  )
}