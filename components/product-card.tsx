"use client"

import { Package, Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface Produto {
  id: number
  nome: string
  descricao: string | null
  preco: number
  estoque: number
  imagemUrl: string | null
  categoria: string | null
}

interface ProductCardProps {
  produto: Produto
  quantidade: number
  onAdicionar: () => void
  onRemover: () => void
}

export function ProductCard({ produto, quantidade, onAdicionar, onRemover }: ProductCardProps) {
  const semEstoque = produto.estoque <= 0
  const limiteAtingido = quantidade >= produto.estoque

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-red-100 bg-white shadow-md transition-all hover:shadow-xl">
      {/* Imagem */}
      <div className="relative flex h-32 sm:h-40 items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
        {produto.imagemUrl ? (
          <img
            src={produto.imagemUrl || "/placeholder.svg"}
            alt={produto.nome}
            className="h-full w-full object-cover"
            crossOrigin="anonymous"
          />
        ) : (
          <Package className="h-10 w-10 sm:h-14 sm:w-14 text-red-200" />
        )}

        {produto.categoria && (
          <Badge className="absolute left-1.5 top-1.5 sm:left-2 sm:top-2 rounded-full bg-white/90 text-[10px] sm:text-xs font-bold text-red-600 shadow-sm px-2 py-0.5">
            {produto.categoria}
          </Badge>
        )}

        {semEstoque && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm">
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs sm:text-sm font-bold text-red-600">
              Esgotado
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1.5 sm:gap-2 p-2.5 sm:p-4">
        <h3 className="text-sm sm:text-base font-bold leading-tight text-gray-900 line-clamp-2">{produto.nome}</h3>

        {produto.descricao && (
          <p className="line-clamp-1 text-[10px] sm:text-xs text-gray-600">{produto.descricao}</p>
        )}

        <div className="mt-auto flex items-center justify-between pt-1 sm:pt-2">
          <div>
            <p className="text-base sm:text-xl font-bold text-red-600">
              R$ {Number(produto.preco).toFixed(2).replace(".", ",")}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500">{produto.estoque} disponíveis</p>
          </div>

          {quantidade > 0 ? (
            <div className="flex items-center gap-0.5 sm:gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 sm:h-9 sm:w-9 rounded-full border-red-200 hover:bg-red-50 hover:text-red-600"
                onClick={onRemover}
                disabled={semEstoque}
              >
                <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>

              <span className="w-6 sm:w-8 text-center text-sm sm:text-base font-bold text-gray-900">{quantidade}</span>

              <Button
                size="icon"
                className="h-7 w-7 sm:h-9 sm:w-9 rounded-full bg-gradient-to-r from-red-600 to-red-500 shadow-md hover:from-red-700 hover:to-red-600"
                onClick={onAdicionar}
                disabled={limiteAtingido}
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              className="rounded-full bg-gradient-to-r from-red-600 to-red-500 font-bold shadow-md hover:from-red-700 hover:to-red-600 text-xs sm:text-sm h-7 sm:h-8 px-2.5 sm:px-3"
              onClick={onAdicionar}
              disabled={semEstoque}
            >
              <Plus className="mr-0.5 sm:mr-1 h-3 w-3 sm:h-4 sm:w-4" />
              Add
            </Button>
          )}
        </div>

        {limiteAtingido && !semEstoque && (
          <p className="text-[9px] sm:text-[11px] text-amber-600">Limite atingido</p>
        )}
      </div>
    </div>
  )
}