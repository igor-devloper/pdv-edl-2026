"use client"

import { useState } from "react"
import { Plus, Tag, Gift, ChevronDown, ChevronUp, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface ComboItemAPI {
  id: number
  label: string | null
  qty: number
  variantId: number | null
  product: {
    id: number
    name: string
    hasVariants: boolean
    imageUrl: string | null
    variants: Array<{
      id: number
      label: string
      color: string | null
      size: string | null
      stockOnHand: number
    }>
  }
  variant: {
    id: number
    label: string
    color: string | null
    size: string | null
    stockOnHand: number
  } | null
}

export interface ComboAPI {
  id: number
  nome: string
  descricao: string | null
  preco: number
  imagemUrl: string | null
  desconto: number
  items: ComboItemAPI[]
}

export type ComboVariantChoices = Record<number, number>

interface ComboCardProps {
  combo: ComboAPI
  quantidade: number
  onAdicionar: (choices: ComboVariantChoices) => void
  onRemover: () => void
}

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

const SIZES_ORDER = ["PP", "P", "M", "G", "GG", "XG", "XGG", "2XG", "3XG"]

// ─── Componente separado para seletor de variação de um item livre ────────────
// MOTIVO: useState não pode ser chamado dentro de .map() — viola Rules of Hooks.
// Cada item livre precisa do seu próprio estado de cor selecionada,
// então extraímos para um componente próprio.

interface FreeItemSelectorProps {
  ci: ComboItemAPI
  chosenVariantId: number | undefined
  attempted: boolean
  onChoose: (comboItemId: number, variantId: number) => void
}

function FreeItemSelector({ ci, chosenVariantId, attempted, onChoose }: FreeItemSelectorProps) {
  // ✅ useState aqui é válido — está no nível do componente, não dentro de map()
  const [localColor, setLocalColor] = useState<string | null>(null)

  const cores = Array.from(
    new Set(ci.product.variants.map(v => v.color || "").filter(Boolean))
  )

  // Auto-seleciona se só tem 1 cor
  const corAtiva = cores.length === 1 ? cores[0] : localColor

  const tamanhosDaCor = corAtiva
    ? ci.product.variants
        .filter(v => v.color?.toLowerCase() === corAtiva.toLowerCase())
        .sort((a, b) => {
          const ia = SIZES_ORDER.indexOf(a.size || "")
          const ib = SIZES_ORDER.indexOf(b.size || "")
          if (ia !== -1 && ib !== -1) return ia - ib
          return (a.size || "").localeCompare(b.size || "")
        })
    : []

  const missing = attempted && !chosenVariantId

  return (
    <div className={`rounded-xl p-2 border transition-all ${missing ? "border-red-300 bg-red-50" : "border-gray-100 bg-white"}`}>
      <p className="text-[10px] font-bold text-gray-700 mb-1.5 flex items-center gap-1">
        {ci.label || ci.product.name}
        {chosenVariantId
          ? <Check className="h-3 w-3 text-green-500" />
          : <span className="text-gray-400 font-normal italic">(escolher)</span>}
      </p>

      {/* Cores — só mostra se tiver mais de 1 */}
      {cores.length > 1 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {cores.map(cor => (
            <button
              key={cor}
              title={cor}
              onClick={() => setLocalColor(cor)}
              className={`h-5 w-5 rounded-full transition-all ${getColorClass(cor)} ${
                corAtiva === cor
                  ? "ring-2 ring-offset-1 ring-red-500 scale-110"
                  : "hover:scale-105"
              }`}
            />
          ))}
        </div>
      )}

      {/* Tamanhos */}
      {corAtiva && tamanhosDaCor.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tamanhosDaCor.map(v => {
            const esgotado = v.stockOnHand <= 0
            const selecionado = chosenVariantId === v.id
            return (
              <button
                key={v.id}
                onClick={() => !esgotado && onChoose(ci.id, v.id)}
                disabled={esgotado}
                className={`min-w-[26px] h-6 px-1.5 rounded text-[10px] font-bold border transition-all ${
                  selecionado
                    ? "bg-red-600 text-white border-red-600"
                    : esgotado
                    ? "bg-gray-100 text-gray-300 border-gray-200 line-through cursor-not-allowed"
                    : "bg-white text-gray-700 border-gray-300 hover:border-red-400"
                }`}
              >
                {v.size || v.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Aviso se não selecionou cor ainda (mais de 1 cor) */}
      {cores.length > 1 && !corAtiva && (
        <p className="text-[10px] text-gray-400">Escolha a cor primeiro</p>
      )}
    </div>
  )
}

// ─── ComboCard ────────────────────────────────────────────────────────────────

export function ComboCard({ combo, quantidade, onAdicionar, onRemover }: ComboCardProps) {
  const [choices, setChoices] = useState<ComboVariantChoices>({})
  const [expanded, setExpanded] = useState(false)
  const [attempted, setAttempted] = useState(false)

  const freeItems = combo.items.filter(ci => ci.variantId === null && ci.product.hasVariants)
  const allChosen = freeItems.every(ci => choices[ci.id] != null)

  const temDesconto = combo.desconto > 0
  const precoFinal = temDesconto ? combo.preco * (1 - combo.desconto / 100) : combo.preco

  function handleAdicionar() {
    if (freeItems.length > 0 && !allChosen) {
      setAttempted(true)
      setExpanded(true)
      return
    }
    onAdicionar(choices)
  }

  function setChoice(comboItemId: number, variantId: number) {
    setChoices(prev => ({ ...prev, [comboItemId]: variantId }))
  }

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-white shadow-md transition-all hover:shadow-xl">
      {/* Imagem */}
      <div className="relative flex h-32 sm:h-36 items-center justify-center bg-gradient-to-br from-red-100 to-pink-100">
        {combo.imagemUrl ? (
          <img src={combo.imagemUrl} alt={combo.nome} className="h-full w-full object-cover" crossOrigin="anonymous" />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Gift className="h-10 w-10 text-red-400" />
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wide">Combo</span>
          </div>
        )}

        <Badge className="absolute left-1.5 top-1.5 rounded-full bg-gradient-to-r from-red-600 to-pink-600 text-[10px] font-bold text-white shadow-sm px-2 py-0.5">
          COMBO
        </Badge>

        {temDesconto && (
          <Badge className="absolute right-1.5 top-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-[10px] font-bold text-white shadow-sm px-2 py-0.5 flex items-center gap-0.5">
            <Tag className="h-2.5 w-2.5" />-{combo.desconto}%
          </Badge>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-2.5 sm:p-3">
        <h3 className="text-sm sm:text-base font-bold leading-tight text-gray-900">{combo.nome}</h3>

        {combo.descricao && (
          <p className="text-[10px] text-gray-500 line-clamp-2">{combo.descricao}</p>
        )}

        {/* Lista resumida dos itens */}
        <div className="space-y-0.5">
          {combo.items.map(ci => {
            const isFree = ci.variantId === null && ci.product.hasVariants
            const chosenVariant = isFree && choices[ci.id]
              ? ci.product.variants.find(v => v.id === choices[ci.id])
              : ci.variant
            const missing = attempted && isFree && !choices[ci.id]

            return (
              <div key={ci.id} className={`flex items-center gap-1.5 ${missing ? "text-red-500" : "text-gray-600"}`}>
                <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${missing ? "bg-red-400" : "bg-red-300"}`} />
                <span className="text-[10px]">
                  {ci.qty > 1 && <span className="font-bold">{ci.qty}x </span>}
                  {ci.label || ci.product.name}
                  {chosenVariant && <span className="text-red-600 font-medium"> — {chosenVariant.label}</span>}
                  {isFree && !chosenVariant && <span className="text-gray-400 italic"> (escolher)</span>}
                </span>
              </div>
            )
          })}
        </div>

        {/* Seletores de variação livre */}
        {freeItems.length > 0 && (
          <div>
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1 text-[10px] font-semibold text-red-600 hover:text-red-700"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {allChosen ? "Variações escolhidas ✓" : "Escolher variações"}
            </button>

            {expanded && (
              <div className="mt-2 space-y-2 rounded-xl bg-red-50 p-2 border border-red-100">
                {/* ✅ FreeItemSelector é um componente separado — pode usar useState */}
                {freeItems.map(ci => (
                  <FreeItemSelector
                    key={ci.id}
                    ci={ci}
                    chosenVariantId={choices[ci.id]}
                    attempted={attempted}
                    onChoose={setChoice}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Preço e botões */}
        <div className="mt-auto flex items-center justify-between pt-1">
          <div>
            {temDesconto ? (
              <>
                <p className="text-[10px] text-gray-400 line-through">
                  R$ {combo.preco.toFixed(2).replace(".", ",")}
                </p>
                <p className="text-base sm:text-lg font-bold text-red-600">
                  R$ {precoFinal.toFixed(2).replace(".", ",")}
                </p>
              </>
            ) : (
              <p className="text-base sm:text-lg font-bold text-red-600">
                R$ {combo.preco.toFixed(2).replace(".", ",")}
              </p>
            )}
          </div>

          {quantidade > 0 ? (
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon"
                className="h-7 w-7 rounded-full border-red-200 hover:bg-red-50"
                onClick={onRemover}>
                <span className="text-base font-bold leading-none">−</span>
              </Button>
              <span className="w-6 text-center text-sm font-bold">{quantidade}</span>
              <Button size="icon"
                className="h-7 w-7 rounded-full bg-gradient-to-r from-red-600 to-red-500"
                onClick={handleAdicionar}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button size="sm"
              className="rounded-full bg-gradient-to-r from-red-600 to-red-500 font-bold shadow-md text-xs h-7 px-2.5"
              onClick={handleAdicionar}>
              <Plus className="mr-0.5 h-3 w-3" />Add
            </Button>
          )}
        </div>

        {attempted && !allChosen && (
          <p className="text-[10px] text-red-500 font-medium">Escolha as variações acima para adicionar</p>
        )}
      </div>
    </div>
  )
}