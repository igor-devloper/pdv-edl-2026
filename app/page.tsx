// app/page.tsx
"use client"

import { useState, useCallback, useMemo } from "react"
import useSWR from "swr"
import { Header } from "@/components/header"
import { ProductCard, type Produto } from "@/components/product-card"
import { CartPanel, type ItemCarrinho, type FormaPagamentoUI } from "@/components/cart-panel"
import { VendaConcluidaDialog, type SaleReceipt } from "@/components/venda-concluida-dialog"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

type ProdutoAPI = {
  id: number
  name: string
  description: string | null
  price: number
  stock: number
  image_url: string | null
  category: string | null
}

type ProductsApiResponse = ProdutoAPI[] | { products: ProdutoAPI[] }

type SaleApiResponse = {
  ok: true
  sale: {
    id: number
    code: string
    payment: "PIX" | "CASH" | "CARD"
    totalCents: number
    createdAt: string
    items: Array<{
      productId: number
      qty: number
      unitCents: number
      totalCents: number
    }>
  }
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const ct = res.headers.get("content-type") || ""
  if (!ct.includes("application/json")) {
    // evita quebrar se vier HTML/erro do server
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

function adaptProduto(p: ProdutoAPI): Produto {
  return {
    id: p.id,
    nome: p.name,
    descricao: p.description,
    preco: Number(p.price),
    estoque: Number(p.stock),
    imagemUrl: p.image_url,
    categoria: p.category,
  }
}

function normalizeProdutos(resp: ProductsApiResponse | undefined): ProdutoAPI[] {
  if (!resp) return []
  if (Array.isArray(resp)) return resp
  if (typeof resp === "object" && Array.isArray((resp as any).products)) return (resp as any).products
  return []
}

export default function PaginaPDV() {
  const { data: produtosRaw, mutate } = useSWR<ProductsApiResponse>("/api/products", fetcher, {
    refreshInterval: 10000,
  })

  const produtosAPI = useMemo(() => normalizeProdutos(produtosRaw), [produtosRaw])
  const produtos = useMemo(() => produtosAPI.map(adaptProduto), [produtosAPI])

  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [busca, setBusca] = useState("")
  const [checkoutCarregando, setCheckoutCarregando] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [vendaConcluida, setVendaConcluida] = useState<SaleReceipt | null>(null)

  const productNames = useMemo(() => {
    const map: Record<number, string> = {}
    for (const p of produtos) map[p.id] = p.nome
    return map
  }, [produtos])

  const produtosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return produtos
    return produtos.filter(
      (p) => p.nome.toLowerCase().includes(q) || (p.categoria || "").toLowerCase().includes(q)
    )
  }, [produtos, busca])

  const categorias = useMemo(() => {
    const cats = new Set<string>()
    for (const p of produtosFiltrados) cats.add((p.categoria || "Sem categoria").trim())
    return Array.from(cats).sort((a, b) => a.localeCompare(b, "pt-BR"))
  }, [produtosFiltrados])

  const quantidadeNoCarrinho = (produtoId: number) =>
    carrinho.find((i) => i.id === produtoId)?.quantidade || 0

  const adicionarAoCarrinho = useCallback((produto: Produto) => {
    setCarrinho((prev) => {
      const existente = prev.find((item) => item.id === produto.id)
      const qtdAtual = existente?.quantidade ?? 0

      if (qtdAtual >= produto.estoque) {
        toast.error("Sem estoque disponível para adicionar mais.")
        return prev
      }

      if (existente) {
        return prev.map((item) =>
          item.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item
        )
      }

      return [...prev, { id: produto.id, nome: produto.nome, preco: Number(produto.preco), quantidade: 1 }]
    })
  }, [])

  const removerUmaUnidade = useCallback((produtoId: number) => {
    setCarrinho((prev) => {
      const existente = prev.find((item) => item.id === produtoId)
      if (existente && existente.quantidade > 1) {
        return prev.map((item) =>
          item.id === produtoId ? { ...item, quantidade: item.quantidade - 1 } : item
        )
      }
      return prev.filter((item) => item.id !== produtoId)
    })
  }, [])

  const removerItemCompleto = useCallback((produtoId: number) => {
    setCarrinho((prev) => prev.filter((item) => item.id !== produtoId))
  }, [])

  const limparCarrinho = useCallback(() => setCarrinho([]), [])

  const finalizarVenda = useCallback(
    async (formaPagamentoUI: FormaPagamentoUI, buyerName: string) => {
      if (carrinho.length === 0) return
      setCheckoutCarregando(true)

      try {
        const payload = {
          payment: mapFormaPagamento(formaPagamentoUI),
          buyerName: buyerName?.trim() ? buyerName.trim() : null, // ✅ novo
          items: carrinho.map((i) => ({ productId: i.id, qty: i.quantidade })),
        }

        const res = await fetch("/api/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        const data = (await res.json().catch(() => ({}))) as Partial<SaleApiResponse> & { error?: string }

        if (!res.ok) throw new Error(data.error || "Erro ao processar venda")
        if (!data.sale) throw new Error("Resposta inválida da API (sale ausente).")

        // ✅ inclui buyerName no recibo se quiser
        setVendaConcluida({
          id: data.sale.id,
          code: data.sale.code,
          payment: data.sale.payment,
          totalCents: data.sale.totalCents,
          createdAt: data.sale.createdAt,
          items: data.sale.items.map((it) => ({
            productId: it.productId,
            qty: it.qty,
            unitCents: it.unitCents,
            totalCents: it.totalCents,
          })),
          productNames,
        })
        setDialogOpen(true)

        toast.success("Venda registrada com sucesso!")
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


  const totalCarrinho = carrinho.reduce((s, i) => s + i.preco * i.quantidade, 0)
  const totalItens = carrinho.reduce((s, i) => s + i.quantidade, 0)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <VendaConcluidaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        sale={vendaConcluida}
        onNovaVenda={() => {
          setVendaConcluida(null)
          setDialogOpen(false)
        }}
      />

      <main className="mx-auto flex w-full max-w-7xl flex-1 gap-6 p-4 lg:p-6">
        <div className="flex flex-1 flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar produto ou categoria..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>

          {!produtosRaw ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={`skeleton-${i}`} className="h-64 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : produtosFiltrados.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed py-16">
              <p className="text-sm text-muted-foreground">Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {categorias.map((cat) => (
                <div key={cat}>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{cat}</h2>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {produtosFiltrados
                      .filter((p) => (p.categoria || "Sem categoria").trim() === cat)
                      .map((produto) => (
                        <ProductCard
                          key={produto.id}
                          produto={produto}
                          quantidade={quantidadeNoCarrinho(produto.id)}
                          onAdicionar={() => adicionarAoCarrinho(produto)}
                          onRemover={() => removerUmaUnidade(produto.id)}
                        />
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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

      {carrinho.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-card p-4 lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{totalItens} itens</p>
              <p className="text-lg font-bold text-primary">R$ {totalCarrinho.toFixed(2).replace(".", ",")}</p>
            </div>

            <button
              type="button"
              onClick={() => finalizarVenda("pix", "")}
              disabled={checkoutCarregando}
              className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {checkoutCarregando ? "Processando..." : "Finalizar (PIX)"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
