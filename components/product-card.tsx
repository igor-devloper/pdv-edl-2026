"use client"

import { useState } from "react"
import { Package, Plus, Minus, Tag, Check, ShoppingCart, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface VarianteAPI {
  id: number
  label: string
  color: string | null
  size: string | null
  priceCents: number | null
  stockOnHand: number
  imageUrl: string | null
}

export interface Produto {
  id: number
  nome: string
  descricao: string | null
  preco: number
  estoque: number
  imagemUrl: string | null
  categoria: string | null
  desconto: number
  hasVariants: boolean
  variantes: VarianteAPI[]
}

interface ProductCardProps {
  produto: Produto
  quantidade: number
  onAdicionar: (variantId?: number) => void
  onRemover: (variantId?: number) => void
  qtdPorVariante?: Record<number, number>
}

const SIZES_ORDER = ["PP", "P", "M", "G", "GG", "XG", "XGG", "2XG", "3XG"]

const COLOR_CLASSES: Record<string, string> = {
  vermelho: "bg-red-500", vermelha: "bg-red-500", red: "bg-red-500",
  bege: "bg-amber-200", beige: "bg-amber-200",
  preto: "bg-gray-900", preta: "bg-gray-900", black: "bg-gray-900",
  branco: "bg-white border border-gray-300", branca: "bg-white border border-gray-300",
  azul: "bg-blue-500", blue: "bg-blue-500",
  verde: "bg-green-500", green: "bg-green-500",
  rosa: "bg-pink-400", pink: "bg-pink-400",
  cinza: "bg-gray-400", gray: "bg-gray-400",
  amarelo: "bg-yellow-400", yellow: "bg-yellow-400",
}

function getColorClass(color: string | null) {
  if (!color) return "bg-gray-300"
  return COLOR_CLASSES[color.toLowerCase()] || "bg-gray-300"
}

// ─── Modal de seleção de variante ─────────────────────────────────────────────
// Usa overlay manual com fixed + z-[9999] para garantir que apareça
// independente de qualquer overflow:hidden ou transform nos elementos pai.

function VariantModal({
  open, onClose, produto, onAdicionar, onRemover, qtdPorVariante,
}: {
  open: boolean
  onClose: () => void
  produto: Produto
  onAdicionar: (variantId: number) => void
  onRemover: (variantId: number) => void
  qtdPorVariante: Record<number, number>
}) {
  const [selectedColor, setSelectedColor] = useState<string | null>(null)

  const cores = Array.from(
    new Set(produto.variantes.map(v => v.color || "").filter(Boolean))
  )

  const corAtiva = cores.length === 1 ? cores[0] : selectedColor

  const variantesDaCor = corAtiva
    ? produto.variantes
      .filter(v => v.color?.toLowerCase() === corAtiva.toLowerCase())
      .sort((a, b) => {
        const ia = SIZES_ORDER.indexOf(a.size || "")
        const ib = SIZES_ORDER.indexOf(b.size || "")
        if (ia !== -1 && ib !== -1) return ia - ib
        return (a.size || "").localeCompare(b.size || "")
      })
    : produto.variantes

  const temDesconto = produto.desconto > 0
  const totalNoCarrinho = Object.values(qtdPorVariante).reduce((s, q) => s + q, 0)

  if (!open) return null

  return (
    // fixed + inset-0 + z-[9999] garante que o overlay cubra a viewport
    // independente de transforms, overflow ou scroll da página
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative w-full max-w-sm max-h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Botão fechar */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 rounded-full bg-white/20 hover:bg-white/30 p-1 text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Cabeçalho fixo */}
        <div className="bg-gradient-to-br from-red-600 to-rose-500 p-4 text-white flex-shrink-0">
          <p className="text-white font-bold text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Escolher variação
          </p>
          <p className="text-red-100 text-sm mt-0.5 font-medium truncate">{produto.nome}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-black">
              R$ {(temDesconto ? produto.preco * (1 - produto.desconto / 100) : produto.preco).toFixed(2).replace(".", ",")}
            </p>
            {temDesconto && (
              <p className="text-red-200 line-through text-sm">
                R$ {produto.preco.toFixed(2).replace(".", ",")}
              </p>
            )}
          </div>
        </div>

        {/* Corpo com scroll */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">

          {/* Seletor de cores */}
          {cores.length > 1 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Cor</p>
              <div className="flex flex-wrap gap-2">
                {cores.map(cor => (
                  <button
                    key={cor}
                    onClick={() => setSelectedColor(cor)}
                    className={`flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-xs font-bold transition-all ${
                      corAtiva === cor
                        ? "border-red-500 bg-red-50 text-red-700"
                        : "border-gray-200 text-gray-600 hover:border-red-300"
                    }`}
                  >
                    <span className={`h-3.5 w-3.5 rounded-full flex-shrink-0 ${getColorClass(cor)}`} />
                    {cor}
                    {corAtiva === cor && <Check className="h-3 w-3" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Variantes */}
          {(corAtiva || cores.length === 0) && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                {cores.length > 0 ? "Tamanho" : "Opções"}
              </p>
              <div className="space-y-2">
                {variantesDaCor.map(v => {
                  const esgotado = v.stockOnHand <= 0
                  const qtd = qtdPorVariante[v.id] || 0
                  const precoVar = v.priceCents != null
                    ? (temDesconto ? (v.priceCents / 100) * (1 - produto.desconto / 100) : v.priceCents / 100)
                    : null

                  return (
                    <div
                      key={v.id}
                      className={`flex items-center justify-between rounded-xl border-2 px-3 py-2.5 transition-all ${
                        esgotado ? "border-gray-100 bg-gray-50 opacity-50"
                          : qtd > 0 ? "border-red-300 bg-red-50"
                            : "border-gray-200 bg-white hover:border-red-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {cores.length === 1 && v.color && (
                          <span className={`h-3.5 w-3.5 rounded-full flex-shrink-0 ${getColorClass(v.color)}`} />
                        )}
                        <div>
                          <p className={`text-sm font-bold ${esgotado ? "text-gray-400 line-through" : "text-gray-900"}`}>
                            {v.size || v.label}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            {esgotado ? "Esgotado" : `${v.stockOnHand} disponíveis`}
                            {precoVar != null && ` · R$ ${precoVar.toFixed(2).replace(".", ",")}`}
                          </p>
                        </div>
                      </div>

                      {!esgotado && (
                        qtd > 0 ? (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Button size="icon" variant="outline"
                              className="h-7 w-7 rounded-full border-red-200 hover:bg-red-50"
                              onClick={() => onRemover(v.id)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-5 text-center text-sm font-bold text-red-600">{qtd}</span>
                            <Button size="icon"
                              className="h-7 w-7 rounded-full bg-red-600 hover:bg-red-700"
                              onClick={() => onAdicionar(v.id)}
                              disabled={qtd >= v.stockOnHand}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm"
                            className="rounded-full bg-gradient-to-r from-red-600 to-red-500 text-xs h-7 px-3 flex-shrink-0"
                            onClick={() => onAdicionar(v.id)}>
                            <Plus className="h-3 w-3 mr-0.5" />Add
                          </Button>
                        )
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer fixo */}
        <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-gray-100 bg-white">
          {totalNoCarrinho > 0 ? (
            <div className="rounded-xl bg-green-50 border border-green-200 px-3 py-2 flex items-center justify-between">
              <p className="text-xs font-bold text-green-700">
                {totalNoCarrinho} {totalNoCarrinho === 1 ? "item" : "itens"} adicionados
              </p>
              <Button size="sm"
                className="rounded-full bg-green-600 hover:bg-green-700 text-xs h-7 px-3"
                onClick={onClose}>
                <Check className="h-3 w-3 mr-1" />Pronto
              </Button>
            </div>
          ) : (
            <Button variant="outline"
              className="w-full rounded-full border-gray-200 text-gray-600 text-sm"
              onClick={onClose}>
              Cancelar
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── ProductCard ──────────────────────────────────────────────────────────────

export function ProductCard({ produto, quantidade, onAdicionar, onRemover, qtdPorVariante = {} }: ProductCardProps) {
  const [modalOpen, setModalOpen] = useState(false)

  const temDesconto = produto.desconto > 0
  const precoExibido = temDesconto ? produto.preco * (1 - produto.desconto / 100) : produto.preco
  const semEstoque = produto.hasVariants
    ? produto.variantes.every(v => v.stockOnHand <= 0)
    : produto.estoque <= 0
  const estoqueTotal = produto.hasVariants
    ? produto.variantes.reduce((s, v) => s + v.stockOnHand, 0)
    : produto.estoque
  const cores = produto.hasVariants
    ? Array.from(new Set(produto.variantes.map(v => v.color || "").filter(Boolean))).slice(0, 6)
    : []

  return (
    <>
      <div className="group flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-red-100 bg-white shadow-md transition-all hover:shadow-xl">
        {/* Imagem */}
        <div className="relative flex h-32 sm:h-40 items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
          {produto.imagemUrl ? (
            <img src={produto.imagemUrl} alt={produto.nome} className="h-full w-full object-cover" crossOrigin="anonymous" />
          ) : (
            <Package className="h-10 w-10 sm:h-14 sm:w-14 text-red-200" />
          )}

          {temDesconto && !semEstoque && (
            <Badge className="absolute right-1.5 top-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-[10px] font-bold text-white px-2 py-0.5 flex items-center gap-0.5">
              <Tag className="h-2.5 w-2.5" />-{produto.desconto}%
            </Badge>
          )}

          {semEstoque && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm">
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-600">Esgotado</span>
            </div>
          )}

          {quantidade > 0 && (
            <div className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white text-xs font-black shadow-md">
              {quantidade}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col gap-1.5 p-2.5 sm:p-3">
          <h3 className="text-sm sm:text-base font-bold leading-tight text-gray-900 line-clamp-2">{produto.nome}</h3>

          {cores.length > 0 && (
            <div className="flex items-center gap-1">
              {cores.map(cor => (
                <span key={cor} title={cor} className={`h-3.5 w-3.5 rounded-full ${getColorClass(cor)}`} />
              ))}
              <span className="text-[10px] text-gray-400 ml-0.5">{produto.variantes.length} opções</span>
            </div>
          )}

          <div className="mt-auto flex items-center justify-between pt-1">
            <div>
              {temDesconto && (
                <p className="text-[10px] text-gray-400 line-through leading-none">
                  R$ {produto.preco.toFixed(2).replace(".", ",")}
                </p>
              )}
              <p className="text-base sm:text-lg font-bold text-red-600">
                R$ {precoExibido.toFixed(2).replace(".", ",")}
              </p>
              <p className="text-[10px] text-gray-500">{estoqueTotal} disponíveis</p>
            </div>

            {produto.hasVariants ? (
              <Button
                size="sm"
                className="rounded-full bg-gradient-to-r from-red-600 to-red-500 font-bold text-xs h-7 px-2.5"
                onClick={() => setModalOpen(true)}
                disabled={semEstoque}
              >
                {quantidade > 0 ? (
                  <><span className="font-black mr-0.5">{quantidade}</span>× Editar</>
                ) : (
                  <><Plus className="h-3 w-3 mr-0.5" />Add</>
                )}
              </Button>
            ) : quantidade > 0 ? (
              <div className="flex items-center gap-0.5">
                <Button variant="outline" size="icon"
                  className="h-7 w-7 rounded-full border-red-200 hover:bg-red-50"
                  onClick={() => onRemover()}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-6 text-center text-sm font-bold">{quantidade}</span>
                <Button size="icon"
                  className="h-7 w-7 rounded-full bg-gradient-to-r from-red-600 to-red-500"
                  onClick={() => onAdicionar()}
                  disabled={quantidade >= produto.estoque}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button size="sm"
                className="rounded-full bg-gradient-to-r from-red-600 to-red-500 font-bold text-xs h-7 px-2.5"
                onClick={() => onAdicionar()}
                disabled={semEstoque}>
                <Plus className="h-3 w-3 mr-0.5" />Add
              </Button>
            )}
          </div>
        </div>
      </div>

      {produto.hasVariants && (
        <VariantModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          produto={produto}
          onAdicionar={onAdicionar}
          onRemover={onRemover}
          qtdPorVariante={qtdPorVariante}
        />
      )}
    </>
  )
}