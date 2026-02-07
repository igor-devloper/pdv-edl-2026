"use client"

import * as React from "react"
import useSWR from "swr"
import { Header } from "@/components/header"
import { AdminGuard } from "@/components/admin-guard"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Plus, Pencil, Boxes } from "lucide-react"
import { Switch } from "@/components/ui/switch"

type Produto = {
  id: number
  sku: string
  name: string
  priceCents: number
  costCents: number | null
  active: boolean
  stockOnHand: number
}

type Resp = { produtos: Produto[] }

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function brlFromCents(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`
}

export default function EstoquePage() {
  const { data, mutate } = useSWR<Resp>("/api/admin/produtos", fetcher)
  const [busca, setBusca] = React.useState("")

  const [editOpen, setEditOpen] = React.useState(false)
  const [estoqueOpen, setEstoqueOpen] = React.useState(false)

  const [produtoSel, setProdutoSel] = React.useState<Produto | null>(null)

  // form produto
  const [sku, setSku] = React.useState("")
  const [name, setName] = React.useState("")
  const [price, setPrice] = React.useState("0")
  const [cost, setCost] = React.useState("")
  const [active, setActive] = React.useState(true)

  // ajuste estoque
  const [qty, setQty] = React.useState("0")
  const [note, setNote] = React.useState("")

  const produtos = (data?.produtos || []).filter((p) => {
    const q = busca.trim().toLowerCase()
    if (!q) return true
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
  })

  function abrirNovo() {
    setProdutoSel(null)
    setSku("")
    setName("")
    setPrice("0")
    setCost("")
    setActive(true)
    setEditOpen(true)
  }

  function abrirEditar(p: Produto) {
    setProdutoSel(p)
    setSku(p.sku)
    setName(p.name)
    setPrice(String((p.priceCents / 100).toFixed(2)))
    setCost(p.costCents == null ? "" : String((p.costCents / 100).toFixed(2)))
    setActive(p.active)
    setEditOpen(true)
  }

  function abrirAjuste(p: Produto) {
    setProdutoSel(p)
    setQty("0")
    setNote("")
    setEstoqueOpen(true)
  }

  async function salvarProduto() {
    const payload = {
      sku: sku.trim(),
      name: name.trim(),
      priceCents: Math.round(Number(price.replace(",", ".")) * 100),
      costCents: cost.trim() ? Math.round(Number(cost.replace(",", ".")) * 100) : null,
      active,
    }

    try {
      if (!payload.sku) throw new Error("SKU obrigatório")
      if (!payload.name) throw new Error("Nome obrigatório")
      if (!Number.isFinite(payload.priceCents)) throw new Error("Preço inválido")

      // ✅ CORRIGIDO: PATCH vai pro admin
      const url = produtoSel ? `/api/admin/produtos/${produtoSel.id}` : "/api/admin/produtos"
      const method = produtoSel ? "PATCH" : "POST"
      const body = produtoSel ? payload : { ...payload, stockOnHand: 0 }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || "Erro ao salvar produto")

      toast.success("Produto salvo!")
      setEditOpen(false)
      await mutate()
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar produto")
    }
  }

  async function ajustarEstoque() {
    if (!produtoSel) return
    try {
      const n = Number(qty)
      if (!Number.isFinite(n) || !Number.isInteger(n)) throw new Error("Quantidade inválida (inteiro)")
      if (n === 0) throw new Error("Quantidade não pode ser 0")

      const res = await fetch(`/api/admin/produtos/${produtoSel.id}/estoque`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qty: n, note }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || "Erro ao ajustar estoque")

      toast.success("Estoque atualizado!")
      setEstoqueOpen(false)
      await mutate()
    } catch (e: any) {
      toast.error(e?.message || "Erro ao ajustar estoque")
    }
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-background">
        <Header />

        <main className="mx-auto w-full max-w-7xl p-4 lg:p-6 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold">Estoque</h1>
              <p className="text-sm text-muted-foreground">Adicionar/editar produtos e ajustar estoque</p>
            </div>

            <div className="flex gap-2">
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou SKU..."
                className="rounded-xl"
              />
              <Button className="rounded-xl" onClick={abrirNovo}>
                <Plus className="h-4 w-4 mr-2" />
                Produto
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {produtos.map((p) => (
              <Card key={p.id} className="p-4 rounded-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">SKU: {p.sku}</p>
                    <p className="text-sm mt-2">
                      <span className="text-muted-foreground">Preço:</span>{" "}
                      <b>{brlFromCents(p.priceCents)}</b>
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Estoque:</span>{" "}
                      <b>{p.stockOnHand}</b>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Status: {p.active ? "Ativo" : "Inativo"}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button variant="outline" className="rounded-xl" onClick={() => abrirEditar(p)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button className="rounded-xl" onClick={() => abrirAjuste(p)}>
                      <Boxes className="h-4 w-4 mr-2" />
                      Ajustar
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {!produtos.length && (
              <Card className="p-10 rounded-2xl text-center text-muted-foreground">
                Nenhum produto encontrado.
              </Card>
            )}
          </div>
        </main>

        {/* Dialog editar/criar */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>{produtoSel ? "Editar produto" : "Novo produto"}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-3">
              <div className="grid gap-1">
                <Label>SKU</Label>
                <Input value={sku} onChange={(e) => setSku(e.target.value)} className="rounded-xl" />
              </div>
              <div className="grid gap-1">
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <Label>Preço (R$)</Label>
                  <Input value={price} onChange={(e) => setPrice(e.target.value)} className="rounded-xl" />
                </div>
                <div className="grid gap-1">
                  <Label>Custo (R$)</Label>
                  <Input value={cost} onChange={(e) => setCost(e.target.value)} className="rounded-xl" />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border p-3">
                <div>
                  <p className="font-medium">Ativo</p>
                  <p className="text-xs text-muted-foreground">Se inativo, não aparece no PDV</p>
                </div>
                <Switch checked={active} onCheckedChange={setActive} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" className="rounded-xl" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button className="rounded-xl" onClick={salvarProduto}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog ajuste estoque */}
        <Dialog open={estoqueOpen} onOpenChange={setEstoqueOpen}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Ajustar estoque</DialogTitle>
            </DialogHeader>

            <div className="space-y-2">
              <p className="text-sm">
                Produto: <b>{produtoSel?.name}</b>
              </p>

              <div className="grid gap-1">
                <Label>Quantidade (inteiro)</Label>
                <Input value={qty} onChange={(e) => setQty(e.target.value)} className="rounded-xl" />
                <p className="text-xs text-muted-foreground">
                  Use <b>positivo</b> para entrada e <b>negativo</b> para saída/ajuste.
                </p>
              </div>

              <div className="grid gap-1">
                <Label>Observação</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} className="rounded-xl" />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" className="rounded-xl" onClick={() => setEstoqueOpen(false)}>
                Cancelar
              </Button>
              <Button className="rounded-xl" onClick={ajustarEstoque}>
                Aplicar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminGuard>
  )
}
