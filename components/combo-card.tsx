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

const COLOR_DOT: Record<string, string> = {
  vermelho: "bg-red-500", vermelha: "bg-red-500",
  bege: "bg-amber-200", beige: "bg-amber-200",
  preto: "bg-gray-900", preta: "bg-gray-900",
  branco: "bg-gray-100 border border-gray-300", branca: "bg-gray-100 border border-gray-300",
  azul: "bg-blue-500", verde: "bg-green-500",
  rosa: "bg-pink-400", cinza: "bg-gray-400",
  amarelo: "bg-yellow-400",
}

function colorDot(color: string | null) {
  if (!color) return "bg-gray-300"
  return COLOR_DOT[color.toLowerCase()] || "bg-gray-300"
}

// Seletor simplificado: todos os botões visíveis de uma vez, sem passos ocultos
function FreeItemSelector({
  ci, chosenVariantId, attempted, onChoose,
}: {
  ci: ComboItemAPI
  chosenVariantId: number | undefined
  attempted: boolean
  onChoose: (comboItemId: number, variantId: number) => void
}) {
  const variants = ci.product.variants
  const chosen = variants.find(v => v.id === chosenVariantId)
  const missing = attempted && !chosenVariantId
  const hasCores = variants.some(v => v.color)
  const hasTamanhos = variants.some(v => v.size)

  return (
    <div className={`rounded-xl border-2 p-2.5 transition-all ${
      missing ? "border-red-300 bg-red-50/50"
      : chosen ? "border-green-200 bg-green-50/30"
      : "border-gray-200 bg-white"
    }`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-gray-700">{ci.label || ci.product.name}</p>
        {chosen ? (
          <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-100 rounded-full px-2 py-0.5">
            <Check className="h-3 w-3" />{chosen.label}
          </span>
        ) : (
          <span className="text-[10px] text-gray-400 italic">escolher</span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {variants.map(v => {
          const esgotado = v.stockOnHand <= 0
          const selecionado = chosenVariantId === v.id
          const btnLabel = hasCores && hasTamanhos
            ? `${v.color ?? ""} ${v.size ?? ""}`.trim()
            : hasCores ? (v.color ?? v.label)
            : (v.size ?? v.label)

          return (
            <button
              key={v.id}
              onClick={() => !esgotado && onChoose(ci.id, v.id)}
              disabled={esgotado}
              title={v.label}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold border-2 transition-all ${
                selecionado
                  ? "border-red-500 bg-red-500 text-white scale-105 shadow-sm"
                  : esgotado
                  ? "border-gray-100 bg-gray-50 text-gray-300 line-through cursor-not-allowed"
                  : "border-gray-200 bg-white text-gray-700 hover:border-red-300 hover:bg-red-50"
              }`}
            >
              {v.color && (
                <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${colorDot(v.color)}`} />
              )}
              {btnLabel}
              {esgotado && <span className="text-[9px] font-normal ml-0.5">(esg.)</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function ComboCard({ combo, quantidade, onAdicionar, onRemover }: ComboCardProps) {
  const [choices, setChoices] = useState<ComboVariantChoices>({})
  const [expanded, setExpanded] = useState(false)
  const [attempted, setAttempted] = useState(false)

  const freeItems = combo.items.filter(ci => ci.variantId === null && ci.product.hasVariants)
  const allChosen = freeItems.every(ci => choices[ci.id] != null)
  const pendingCount = freeItems.filter(ci => choices[ci.id] == null).length

  const temDesconto = combo.desconto > 0
  const precoFinal = temDesconto ? combo.preco * (1 - combo.desconto / 100) : combo.preco

  function handleAdicionar() {
    if (freeItems.length > 0 && !allChosen) {
      setAttempted(true)
      setExpanded(true)
      return
    }
    onAdicionar(choices)
    setChoices({})
    setAttempted(false)
    setExpanded(false)
  }

  function setChoice(comboItemId: number, variantId: number) {
    setChoices(prev => {
      const next = { ...prev, [comboItemId]: variantId }
      if (freeItems.every(ci => next[ci.id] != null)) setExpanded(false)
      return next
    })
  }

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-white shadow-md transition-all hover:shadow-xl">
      <div className="relative flex h-32 sm:h-36 items-center justify-center bg-gradient-to-br from-red-100 to-pink-100">
        {combo.imagemUrl ? (
          <img src={combo.imagemUrl} alt={combo.nome} className="h-full w-full object-cover" crossOrigin="anonymous" />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Gift className="h-10 w-10 text-red-400" />
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wide">Combo</span>
          </div>
        )}
        <Badge className="absolute left-1.5 top-1.5 rounded-full bg-gradient-to-r from-red-600 to-pink-600 text-[10px] font-bold text-white px-2 py-0.5">
          COMBO
        </Badge>
        {temDesconto && (
          <Badge className="absolute right-1.5 top-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-[10px] font-bold text-white px-2 py-0.5 flex items-center gap-0.5">
            <Tag className="h-2.5 w-2.5" />-{combo.desconto}%
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-2.5 sm:p-3">
        <h3 className="text-sm sm:text-base font-bold leading-tight text-gray-900">{combo.nome}</h3>
        {combo.descricao && <p className="text-[10px] text-gray-500 line-clamp-1">{combo.descricao}</p>}

        {/* Itens resumidos */}
        <div className="space-y-0.5">
          {combo.items.map(ci => {
            const isFree = ci.variantId === null && ci.product.hasVariants
            const chosen = isFree && choices[ci.id]
              ? ci.product.variants.find(v => v.id === choices[ci.id])
              : ci.variant
            const missing = attempted && isFree && !choices[ci.id]
            return (
              <div key={ci.id} className={`flex items-center gap-1.5 text-[10px] ${missing ? "text-red-500" : "text-gray-600"}`}>
                <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${missing ? "bg-red-400" : "bg-red-300"}`} />
                <span>
                  {ci.qty > 1 && <span className="font-bold">{ci.qty}x </span>}
                  {ci.label || ci.product.name}
                  {chosen
                    ? <span className="text-red-600 font-semibold"> — {chosen.label}</span>
                    : isFree && <span className="text-gray-400 italic"> (escolher)</span>}
                </span>
              </div>
            )
          })}
        </div>

        {/* Seletor de variações */}
        {freeItems.length > 0 && (
          <div>
            <button
              onClick={() => setExpanded(e => !e)}
              className={`flex items-center gap-1.5 text-[11px] font-bold rounded-lg px-2.5 py-1.5 w-full transition-all ${
                allChosen
                  ? "text-green-700 bg-green-50 border border-green-200"
                  : attempted && !allChosen
                  ? "text-red-600 bg-red-50 border border-red-200"
                  : "text-red-600 bg-red-50/50 border border-red-100 hover:bg-red-50"
              }`}
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {allChosen
                ? <><Check className="h-3 w-3 text-green-600" /> Variações escolhidas!</>
                : `Escolher variações${pendingCount > 0 ? ` (${pendingCount} faltando)` : ""}`}
            </button>

            {expanded && (
              <div className="mt-2 space-y-2">
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
                <p className="text-[10px] text-gray-400 line-through leading-none">
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
              className="rounded-full font-bold shadow-md text-xs h-7 px-2.5 bg-gradient-to-r from-red-600 to-red-500"
              onClick={handleAdicionar}>
              <Plus className="mr-0.5 h-3 w-3" />
              {freeItems.length > 0 && !allChosen ? "Escolher" : "Add"}
            </Button>
          )}
        </div>

        {attempted && !allChosen && (
          <p className="text-[10px] text-red-500 font-medium">
            ⚠ Escolha as variações acima antes de adicionar
          </p>
        )}
      </div>
    </div>
  )
}