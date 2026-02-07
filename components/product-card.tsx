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
    <div className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md">
      <div className="relative flex h-36 items-center justify-center bg-muted">
        {produto.imagemUrl ? (
          <img
            src={produto.imagemUrl || "/placeholder.svg"}
            alt={produto.nome}
            className="h-full w-full object-cover"
            crossOrigin="anonymous"
          />
        ) : (
          <Package className="h-12 w-12 text-muted-foreground/40" />
        )}

        {produto.categoria && (
          <Badge variant="secondary" className="absolute left-2 top-2 text-xs">
            {produto.categoria}
          </Badge>
        )}

        {semEstoque && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <span className="text-sm font-semibold text-muted-foreground">Esgotado</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="text-sm font-semibold leading-tight text-foreground">{produto.nome}</h3>

        {produto.descricao && (
          <p className="text-xs text-muted-foreground line-clamp-2">{produto.descricao}</p>
        )}

        <div className="mt-auto flex items-center justify-between pt-1">
          <div>
            <p className="text-lg font-bold text-primary">
              R$ {Number(produto.preco).toFixed(2).replace(".", ",")}
            </p>
            <p className="text-xs text-muted-foreground">{produto.estoque} em estoque</p>
          </div>

          {quantidade > 0 ? (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 bg-transparent"
                onClick={onRemover}
                disabled={semEstoque}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>

              <span className="w-8 text-center text-sm font-bold text-foreground">{quantidade}</span>

              <Button size="icon" className="h-8 w-8" onClick={onAdicionar} disabled={limiteAtingido}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={onAdicionar} disabled={semEstoque}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Adicionar
            </Button>
          )}
        </div>

        {limiteAtingido && !semEstoque && (
          <p className="text-[11px] text-muted-foreground">Limite do estoque atingido no carrinho.</p>
        )}
      </div>
    </div>
  )
}
