"use client"

import { useState, useCallback, useMemo } from "react"
import useSWR from "swr"
import { Header } from "@/components/header"
import { ProductCard, type Produto, type VarianteAPI } from "@/components/product-card"
import { ComboCard, type ComboAPI, type ComboVariantChoices } from "@/components/combo-card"
import { CartPanel, type ItemCarrinho, type FormaPagamentoUI } from "@/components/cart-panel"
import { VendaConcluidaDialog, type SaleReceipt } from "@/components/venda-concluida-dialog"
import { Search, ShoppingCart } from "lucide-react"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

// ─── Tipos da API ────────────────────────────────────────────────────────────

type VarianteRaw = {
  id: number
  label: string
  color: string | null
  size: string | null
  priceCents: number | null
  stockOnHand: number
  imageUrl: string | null
}

type ProdutoRaw = {
  id: number
  name: string
  priceCents: number
  stockOnHand: number
  imageUrl: string | null
  desconto: number
  hasVariants: boolean
  variants: VarianteRaw[]
}

type ComboItemRaw = {
  id: number
  label: string | null
  qty: number
  variantId: number | null
  product: {
    id: number
    name: string
    hasVariants: boolean
    imageUrl: string | null
    variants: Array<{ id: number; label: string; color: string | null; size: string | null; stockOnHand: number }>
  }
  variant: { id: number; label: string; color: string | null; size: string | null; stockOnHand: number } | null
}

type ComboRaw = {
  id: number
  name: string
  description: string | null
  priceCents: number
  imageUrl: string | null
  desconto: number | null
  items: ComboItemRaw[]
}

type ProductsApiResponse = {
  produtos: ProdutoRaw[]
  combos: ComboRaw[]
}

type SaleApiResponse = {
  ok: true
  sale: {
    id: number
    code: string
    payment: "PIX" | "CASH" | "CARD"
    totalCents: number
    createdAt: string
    items: Array<{
      productId: number | null
      variantId: number | null
      comboId: number | null
      qty: number
      unitCents: number
      totalCents: number
    }>
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const ct = res.headers.get("content-type") || ""
  if (!ct.includes("application/json")) {
    const text = await res.text().catch(() => "")
    throw new Error(`Resposta inválida da API (${res.status}). ${text?.slice(0, 120)}`)
  }
  return res.json()
}

function mapFormaPagamento(forma: FormaPagamentoUI): "PIX" | "CASH" | "CARD" {
  if (forma === "pix") return "PIX"
  if (forma === "dinheiro") return "CASH"
  return "CARD"
}

function adaptProduto(p: ProdutoRaw): Produto {
  return {
    id: p.id,
    nome: p.name,
    descricao: null,
    preco: Number((p.priceCents ?? 0) / 100),
    estoque: Number(p.stockOnHand ?? 0),
    imagemUrl: p.imageUrl,
    categoria: null,
    desconto: Number(p.desconto ?? 0),
    hasVariants: p.hasVariants,
    variantes: (p.variants || []).map(v => ({
      id: v.id,
      label: v.label,
      color: v.color,
      size: v.size,
      priceCents: v.priceCents,
      stockOnHand: v.stockOnHand,
      imageUrl: v.imageUrl,
    })),
  }
}

function adaptCombo(c: ComboRaw): ComboAPI {
  return {
    id: c.id,
    nome: c.name,
    descricao: c.description,
    preco: Number((c.priceCents ?? 0) / 100),
    imagemUrl: c.imageUrl,
    desconto: Number(c.desconto ?? 0),
    items: c.items,
  }
}

// Chave do carrinho: produto simples → "p:id", variante → "v:variantId", combo → "c:comboId:hash"
function itemKey(opts: { productId?: number; variantId?: number; comboId?: number; choices?: ComboVariantChoices }) {
  if (opts.variantId) return `v:${opts.variantId}`
  if (opts.comboId) {
    const choicesStr = opts.choices ? JSON.stringify(opts.choices) : ""
    return `c:${opts.comboId}:${choicesStr}`
  }
  return `p:${opts.productId}`
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PaginaPDVClient() {
  const { data, mutate } = useSWR<ProductsApiResponse>("/api/products", fetcher, {
    refreshInterval: 10000,
  })

  const produtos = useMemo(() => (data?.produtos || []).map(adaptProduto), [data])
  const combos = useMemo(() => (data?.combos || []).map(adaptCombo), [data])

  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [busca, setBusca] = useState("")
  const [checkoutCarregando, setCheckoutCarregando] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [vendaConcluida, setVendaConcluida] = useState<SaleReceipt | null>(null)

  const productNames = useMemo(() => {
    const map: Record<string, string> = {}
    for (const p of produtos) map[`p:${p.id}`] = p.nome
    for (const c of combos) map[`c:${c.id}`] = c.nome
    return map
  }, [produtos, combos])

  const produtosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return produtos
    return produtos.filter(p => p.nome.toLowerCase().includes(q))
  }, [produtos, busca])

  const combosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return combos
    return combos.filter(c => c.nome.toLowerCase().includes(q))
  }, [combos, busca])

  // Quantidade de um item no carrinho por sua chave
  const qtdNoCarrinho = (key: string) => carrinho.find(i => i.key === key)?.quantidade || 0

  // Adicionar produto simples ou com variante
  const adicionarProduto = useCallback((produto: Produto, variantId?: number) => {
    const variante = variantId ? produto.variantes.find(v => v.id === variantId) : null
    const estoque = variante ? variante.stockOnHand : produto.estoque
    const key = itemKey({ productId: produto.id, variantId })

    setCarrinho(prev => {
      const existente = prev.find(i => i.key === key)
      const qtdAtual = existente?.quantidade ?? 0

      if (qtdAtual >= estoque) {
        toast.error("Estoque esgotado!")
        return prev
      }

      const precoBase = variante?.priceCents != null
        ? variante.priceCents / 100
        : produto.preco
      const precoFinal = produto.desconto > 0
        ? precoBase * (1 - produto.desconto / 100)
        : precoBase

      const label = variante ? `${produto.nome} — ${variante.label}` : produto.nome

      if (existente) {
        return prev.map(i => i.key === key ? { ...i, quantidade: i.quantidade + 1 } : i)
      }

      return [...prev, {
        key,
        id: produto.id,
        variantId: variantId || null,
        comboId: null,
        nome: label,
        preco: precoBase,
        precoFinal,
        quantidade: 1,
        descontoProduto: produto.desconto,
      }]
    })
  }, [])

  // Adicionar combo (com escolhas de variação)
  const adicionarCombo = useCallback((combo: ComboAPI, choices: ComboVariantChoices) => {
    const key = itemKey({ comboId: combo.id, choices })
    const precoFinal = combo.desconto > 0
      ? combo.preco * (1 - combo.desconto / 100)
      : combo.preco

    // Descrição das escolhas para exibição
    const choicesLabel = Object.entries(choices).map(([ciId, vId]) => {
      const ci = combo.items.find(i => i.id === Number(ciId))
      const v = ci?.product.variants.find(v => v.id === vId)
      return v?.label || ""
    }).filter(Boolean).join(", ")

    const nome = choicesLabel ? `${combo.nome} (${choicesLabel})` : combo.nome

    setCarrinho(prev => {
      const existente = prev.find(i => i.key === key)
      if (existente) {
        return prev.map(i => i.key === key ? { ...i, quantidade: i.quantidade + 1 } : i)
      }
      return [...prev, {
        key,
        id: combo.id,
        variantId: null,
        comboId: combo.id,
        comboVariantChoices: choices,
        nome,
        preco: combo.preco,
        precoFinal,
        quantidade: 1,
        descontoProduto: combo.desconto,
      }]
    })
  }, [])

  const removerUmaUnidade = useCallback((key: string) => {
    setCarrinho(prev => {
      const existente = prev.find(i => i.key === key)
      if (existente && existente.quantidade > 1) {
        return prev.map(i => i.key === key ? { ...i, quantidade: i.quantidade - 1 } : i)
      }
      return prev.filter(i => i.key !== key)
    })
  }, [])

  const removerItemCompleto = useCallback((key: string) => {
    setCarrinho(prev => prev.filter(i => i.key !== key))
  }, [])

  const limparCarrinho = useCallback(() => setCarrinho([]), [])

  const finalizarVenda = useCallback(
    async (
      formaPagamentoUI: FormaPagamentoUI,
      buyerName: string,
      nucleo: string,
      descontoVendaCents: number
    ) => {
      if (carrinho.length === 0) return
      setCheckoutCarregando(true)

      try {
        const payload = {
          payment: mapFormaPagamento(formaPagamentoUI),
          buyerName: buyerName?.trim() ? buyerName.trim() : null,
          nucleo: nucleo && nucleo !== "nao_informado" ? nucleo : null,
          descontoVendaCents: descontoVendaCents > 0 ? descontoVendaCents : null,
          items: carrinho.map(i => {
            if (i.comboId) {
              // Item combo — envia comboVariants
              const comboVariants = Object.entries(i.comboVariantChoices || {}).map(
                ([ciId, vId]) => ({ comboItemId: Number(ciId), variantId: Number(vId) })
              )
              return {
                comboId: i.comboId,
                comboVariants,
                qty: i.quantidade,
                unitCents: Math.round(i.precoFinal * 100),
              }
            }
            if (i.variantId) {
              return {
                variantId: i.variantId,
                productId: i.id,
                qty: i.quantidade,
                unitCents: Math.round(i.precoFinal * 100),
              }
            }
            return {
              productId: i.id,
              qty: i.quantidade,
              unitCents: Math.round(i.precoFinal * 100),
            }
          }),
        }

        const res = await fetch("/api/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        const respData = (await res.json().catch(() => ({}))) as Partial<SaleApiResponse> & { error?: string }

        if (!res.ok) throw new Error(respData.error || "Erro ao processar venda")
        if (!respData.sale) throw new Error("Resposta inválida da API (sale ausente).")

        setVendaConcluida({
          id: respData.sale.id,
          code: respData.sale.code,
          payment: respData.sale.payment,
          totalCents: respData.sale.totalCents,
          createdAt: respData.sale.createdAt,
          items: respData.sale.items.map(it => ({
            productId: it.productId,
            qty: it.qty,
            unitCents: it.unitCents,
            totalCents: it.totalCents,
          })),
          productNames,
        })
        setDialogOpen(true)
        setCartOpen(false)
        toast.success("Venda finalizada!")
        setCarrinho([])
        mutate()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao processar venda")
      } finally {
        setCheckoutCarregando(false)
      }
    },
    [carrinho, mutate, productNames]
  )

  const totalCarrinho = carrinho.reduce((s, i) => s + i.precoFinal * i.quantidade, 0)
  const totalItens = carrinho.reduce((s, i) => s + i.quantidade, 0)
  const temItens = produtosFiltrados.length + combosFiltrados.length > 0

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-red-50/30 via-white to-pink-50/30">
      <Header />

      <VendaConcluidaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        sale={vendaConcluida}
        onNovaVenda={() => { setVendaConcluida(null); setDialogOpen(false) }}
      />

      <main className="mx-auto flex w-full max-w-7xl flex-1 gap-6 p-3 sm:p-4 lg:p-6">
        {/* Produtos */}
        <div className="flex flex-1 flex-col gap-3 sm:gap-4 pb-20 lg:pb-0">
          <div className="relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar produto ou combo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="rounded-full border-red-100 pl-9 sm:pl-11 text-sm sm:text-base h-10 sm:h-11 focus-visible:ring-red-500"
            />
          </div>

          {!data ? (
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 sm:h-72 animate-pulse rounded-3xl bg-gradient-to-br from-red-100 to-pink-100" />
              ))}
            </div>
          ) : !temItens ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-red-200 py-16 sm:py-20">
              <p className="text-sm font-semibold text-gray-400">Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Combos */}
              {combosFiltrados.length > 0 && (
                <div>
                  <h2 className="mb-2 sm:mb-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-500">
                    🎁 Combos
                  </h2>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3">
                    {combosFiltrados.map(combo => {
                      // Para combos, a chave no carrinho é só "c:id" (simplificado para contagem)
                      const qtd = carrinho
                        .filter(i => i.comboId === combo.id)
                        .reduce((s, i) => s + i.quantidade, 0)

                      return (
                        <ComboCard
                          key={combo.id}
                          combo={combo}
                          quantidade={qtd}
                          onAdicionar={(choices) => adicionarCombo(combo, choices)}
                          onRemover={() => {
                            // Remove o último item combo adicionado deste combo
                            setCarrinho(prev => {
                              const idx = [...prev].reverse().findIndex(i => i.comboId === combo.id)
                              if (idx === -1) return prev
                              const realIdx = prev.length - 1 - idx
                              const item = prev[realIdx]
                              if (item.quantidade > 1) {
                                return prev.map((i, index) =>
                                  index === realIdx ? { ...i, quantidade: i.quantidade - 1 } : i
                                )
                              }
                              return prev.filter((_, index) => index !== realIdx)
                            })
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Produtos */}
              {produtosFiltrados.length > 0 && (
                <div>
                  <h2 className="mb-2 sm:mb-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-500">
                    Produtos
                  </h2>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3">
                    {produtosFiltrados.map(produto => {
                      // Quantidade total no carrinho para este produto
                      const qtdTotal = produto.hasVariants
                        ? carrinho
                            .filter(i => !i.comboId && i.id === produto.id)
                            .reduce((s, i) => s + i.quantidade, 0)
                        : qtdNoCarrinho(`p:${produto.id}`)

                      // Mapa variantId → quantidade no carrinho (para o modal)
                      const qtdPorVariante: Record<number, number> = {}
                      if (produto.hasVariants) {
                        for (const item of carrinho) {
                          if (!item.comboId && item.id === produto.id && item.variantId) {
                            qtdPorVariante[item.variantId] = item.quantidade
                          }
                        }
                      }

                      return (
                        <ProductCard
                          key={produto.id}
                          produto={produto}
                          quantidade={qtdTotal}
                          qtdPorVariante={qtdPorVariante}
                          onAdicionar={(variantId) => adicionarProduto(produto, variantId)}
                          onRemover={(variantId) => {
                            const key = itemKey({ productId: produto.id, variantId })
                            removerUmaUnidade(key)
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Carrinho desktop */}
        <aside className="hidden w-80 shrink-0 lg:block">
          <div className="sticky top-20">
            <CartPanel
              itens={carrinho}
              onRemoverItem={removerItemCompleto}
              onLimpar={limparCarrinho}
              onFinalizar={finalizarVenda}
              carregando={checkoutCarregando}
            />
          </div>
        </aside>
      </main>

      {/* Carrinho mobile */}
      {carrinho.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
          <div className="border-t border-red-100 bg-white/95 backdrop-blur-lg p-3 shadow-lg">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-600">{totalItens} {totalItens === 1 ? "item" : "itens"}</p>
                <p className="text-lg sm:text-xl font-bold text-red-600 truncate">
                  R$ {totalCarrinho.toFixed(2).replace(".", ",")}
                </p>
              </div>
              <Sheet open={cartOpen} onOpenChange={setCartOpen}>
                <SheetTrigger asChild>
                  <Button className="rounded-full bg-gradient-to-r from-red-600 to-red-500 px-4 sm:px-6 py-5 sm:py-6 font-bold text-white shadow-lg">
                    <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Ver carrinho
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[85vh] p-0 rounded-t-3xl">
                  <div className="h-full overflow-hidden">
                    <CartPanel
                      itens={carrinho}
                      onRemoverItem={removerItemCompleto}
                      onLimpar={limparCarrinho}
                      onFinalizar={finalizarVenda}
                      carregando={checkoutCarregando}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}