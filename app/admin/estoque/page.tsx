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
import { Plus, Pencil, Boxes, Package } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { ImageDropzone } from "@/components/image-dropzone"

type Produto = {
  id: number
  sku: string
  name: string
  imageUrl: string | null
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

  const [sku, setSku] = React.useState("")
  const [name, setName] = React.useState("")
  const [imageUrl, setImageUrl] = React.useState<string | null>(null)
  const [price, setPrice] = React.useState("0")
  const [cost, setCost] = React.useState("")
  const [active, setActive] = React.useState(true)

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
    setImageUrl(null)
    setPrice("0")
    setQty("0")
    setCost("")
    setActive(true)
    setEditOpen(true)
  }

  function abrirEditar(p: Produto) {
    setProdutoSel(p)
    setSku(p.sku)
    setName(p.name)
    setImageUrl(p.imageUrl)
    setPrice(String((p.priceCents / 100).toFixed(2)))
    setCost(p.costCents == null ? "" : String((p.costCents / 100).toFixed(2)))
    setActive(p.active)
    setQty("0")
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
      imageUrl: imageUrl || null,
      priceCents: Math.round(Number(price.replace(",", ".")) * 100),
      costCents: cost.trim() ? Math.round(Number(cost.replace(",", ".")) * 100) : null,
      active,
      stockOnHand: qty,
    }

    try {
      if (!payload.sku) throw new Error("SKU obrigatório")
      if (!payload.name) throw new Error("Nome obrigatório")
      if (!Number.isFinite(payload.priceCents)) throw new Error("Preço inválido")

      const url = produtoSel ? `/api/admin/produtos/${produtoSel.id}` : "/api/admin/produtos"
      const method = produtoSel ? "PATCH" : "POST"
      const body = produtoSel ? payload : { ...payload, stockOnHand: qty }

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
      if (!Number.isFinite(n) || !Number.isInteger(n)) throw new Error("Quantidade inválida")
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
      <div className="min-h-screen bg-gradient-to-br from-red-50/30 via-white to-pink-50/30">
        <Header />

        <main className="mx-auto w-full max-w-7xl space-y-4 p-3 sm:p-4 lg:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Estoque</h1>
              <p className="text-xs sm:text-sm text-gray-600">Gerencia produtos e ajusta estoque</p>
            </div>

            <div className="flex gap-2">
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar..."
                className="rounded-full border-red-100"
              />
              <Button className="rounded-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600" onClick={abrirNovo}>
                <Plus className="mr-2 h-4 w-4" />
                Produto
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {produtos.map((p) => (
              <Card key={p.id} className="rounded-2xl sm:rounded-3xl border-red-100 p-4 shadow-md">
                <div className="space-y-3">
                  {/* Imagem */}
                  <div className="relative flex h-32 items-center justify-center rounded-2xl bg-gradient-to-br from-red-50 to-pink-50 overflow-hidden">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-12 w-12 text-red-200" />
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="truncate font-bold text-gray-900 text-sm sm:text-base">{p.name}</p>
                    <p className="truncate text-xs text-gray-500">SKU: {p.sku}</p>
                    <p className="text-sm">
                      <span className="text-gray-600">Preço:</span>{" "}
                      <b className="text-red-600">{brlFromCents(p.priceCents)}</b>
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-600">Estoque:</span> <b>{p.stockOnHand}</b>
                    </p>
                    <p className="text-xs text-gray-500">
                      {p.active ? "✅ Ativo" : "❌ Inativo"}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1 rounded-full border-red-200 hover:bg-red-50 text-xs sm:text-sm" onClick={() => abrirEditar(p)}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button size="sm" className="flex-1 rounded-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-xs sm:text-sm" onClick={() => abrirAjuste(p)}>
                      <Boxes className="mr-1.5 h-3.5 w-3.5" />
                      Ajustar
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {!produtos.length && (
              <Card className="rounded-2xl sm:rounded-3xl p-10 text-center text-gray-400 col-span-full">
                Nenhum produto encontrado
              </Card>
            )}
          </div>
        </main>

        {/* Dialog editar/criar */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="rounded-2xl sm:rounded-3xl max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{produtoSel ? "Editar produto" : "Novo produto"}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4">
              {/* ✅ DROPZONE */}
              <div className="grid gap-2">
                <Label>Imagem do Produto</Label>
                <ImageDropzone value={imageUrl} onChange={setImageUrl} />
              </div>

              <div className="grid gap-2">
                <Label>SKU</Label>
                <Input value={sku} onChange={(e) => setSku(e.target.value)} className="rounded-full" />
              </div>
              <div className="grid gap-2">
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Preço (R$)</Label>
                  <Input value={price} onChange={(e) => setPrice(e.target.value)} className="rounded-full" />
                </div>
                <div className="grid gap-2">
                  <Label>Custo (R$)</Label>
                  <Input value={cost} onChange={(e) => setCost(e.target.value)} className="rounded-full" />
                </div>
                <div className="grid gap-2">
                  <Label>Quantidade</Label>
                  <Input value={qty} onChange={(e) => setQty(e.target.value)} className="rounded-full" />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-red-100 p-3">
                <div>
                  <p className="font-semibold text-sm">Ativo</p>
                  <p className="text-xs text-gray-500">Aparece no PDV?</p>
                </div>
                <Switch checked={active} onCheckedChange={setActive} />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button className="rounded-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600" onClick={salvarProduto}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog ajuste estoque */}
        <Dialog open={estoqueOpen} onOpenChange={setEstoqueOpen}>
          <DialogContent className="rounded-2xl sm:rounded-3xl">
            <DialogHeader>
              <DialogTitle>Ajustar estoque</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <p className="text-sm">
                Produto: <b>{produtoSel?.name}</b>
              </p>

              <div className="grid gap-2">
                <Label>Quantidade (+ entrada / - saída)</Label>
                <Input value={qty} onChange={(e) => setQty(e.target.value)} className="rounded-full" />
              </div>

              <div className="grid gap-2">
                <Label>Observação</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} className="rounded-full" />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => setEstoqueOpen(false)}>
                Cancelar
              </Button>
              <Button className="rounded-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600" onClick={ajustarEstoque}>
                Aplicar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminGuard>
  )
}