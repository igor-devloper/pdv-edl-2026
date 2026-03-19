"use client"

import * as React from "react"
import useSWR from "swr"
import { Header } from "@/components/header"
import { AdminGuard } from "@/components/admin-guard"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Plus, Pencil, Trash2, Package, Layers, ChevronDown, ChevronRight,
  Search, Save, X, RefreshCw,
} from "lucide-react"

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Variante = {
  id: number
  sku: string
  label: string
  color: string | null
  size: string | null
  priceCents: number | null
  stockOnHand: number
  active: boolean
  imageUrl: string | null
}

type Produto = {
  id: number
  sku: string
  name: string
  imageUrl: string | null
  priceCents: number
  active: boolean
  stockOnHand: number
  hasVariants: boolean
}

type VariantesResp = { variantes: Variante[] }
type ProdutosResp = { produtos: Produto[] }

const fetcher = (url: string) => fetch(url).then(r => r.json())

const SIZES_PRESET = ["PP", "P", "M", "G", "GG", "XG", "XGG", "2XG", "3XG"]
const COLORS_PRESET = ["Vermelho", "Bege", "Preto", "Branco", "Azul", "Verde", "Rosa", "Cinza", "Amarelo"]

// ─── Formulário de variante ────────────────────────────────────────────────────

type VarianteForm = {
  id?: number
  sku: string
  label: string
  color: string
  size: string
  priceCents: string
  stockOnHand: string
  active: boolean
}

function emptyForm(productSku: string, color = "", size = ""): VarianteForm {
  const label = [color, size].filter(Boolean).join(" / ")
  const sku = [productSku, color, size].filter(Boolean).join("-").toUpperCase().replace(/\s+/g, "")
  return { sku, label, color, size, priceCents: "", stockOnHand: "0", active: true }
}

// ─── Modal de variante ────────────────────────────────────────────────────────

function VarianteDialog({
  open, onClose, produto, variante, onSaved,
}: {
  open: boolean
  onClose: () => void
  produto: Produto
  variante: Variante | null
  onSaved: () => void
}) {
  const [form, setForm] = React.useState<VarianteForm>(emptyForm(produto.sku))
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    if (variante) {
      setForm({
        id: variante.id,
        sku: variante.sku,
        label: variante.label,
        color: variante.color || "",
        size: variante.size || "",
        priceCents: variante.priceCents != null ? String(variante.priceCents / 100) : "",
        stockOnHand: String(variante.stockOnHand),
        active: variante.active,
      })
    } else {
      setForm(emptyForm(produto.sku))
    }
  }, [open, variante, produto.sku])

  function handleColorSelect(cor: string) {
    const label = [cor, form.size].filter(Boolean).join(" / ")
    const sku = [produto.sku, cor, form.size].filter(Boolean).join("-").toUpperCase().replace(/\s+/g, "")
    setForm(f => ({ ...f, color: cor, label, sku }))
  }

  function handleSizeSelect(size: string) {
    const label = [form.color, size].filter(Boolean).join(" / ")
    const sku = [produto.sku, form.color, size].filter(Boolean).join("-").toUpperCase().replace(/\s+/g, "")
    setForm(f => ({ ...f, size, label, sku }))
  }

  async function handleSave() {
    if (!form.sku.trim() || !form.label.trim()) {
      toast.error("SKU e Label são obrigatórios")
      return
    }
    setSaving(true)
    try {
      const priceVal = form.priceCents.trim()
        ? Math.round(parseFloat(form.priceCents.replace(",", ".")) * 100)
        : null

      const body = {
        sku: form.sku.trim(),
        label: form.label.trim(),
        color: form.color || null,
        size: form.size || null,
        priceCents: priceVal,
        stockOnHand: parseInt(form.stockOnHand) || 0,
        active: form.active,
      }

      const url = `/api/admin/produtos/${produto.id}/variantes`
      const method = form.id ? "PATCH" : "POST"
      const endpoint = form.id ? `${url}?variantId=${form.id}` : url

      // Use POST for create, custom PATCH for update (via PUT for single)
      const res = await fetch(url, {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form.id ? { variantes: [{ ...body, id: form.id }] } : body),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao salvar")

      toast.success(form.id ? "Variante atualizada!" : "Variante criada!")
      onSaved()
      onClose()
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar variante")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-3xl border-0 shadow-2xl p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-red-600 to-rose-500 p-5 text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
              <Layers className="h-5 w-5" />
              {form.id ? "Editar Variante" : "Nova Variante"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-red-100 text-sm mt-1">{produto.name}</p>
        </div>

        <div className="p-5 space-y-4">
          {/* Cores */}
          <div>
            <Label className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2 block">Cor</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COLORS_PRESET.map(cor => (
                <button
                  key={cor}
                  type="button"
                  onClick={() => handleColorSelect(cor)}
                  className={`rounded-full px-3 py-1 text-xs font-bold border-2 transition-all ${
                    form.color === cor
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-gray-200 text-gray-600 hover:border-red-300"
                  }`}
                >
                  {cor}
                </button>
              ))}
            </div>
            <Input
              value={form.color}
              onChange={e => {
                const cor = e.target.value
                setForm(f => ({ ...f, color: cor }))
              }}
              placeholder="Ou digite a cor..."
              className="rounded-xl h-9 text-sm border-gray-200"
            />
          </div>

          {/* Tamanhos */}
          <div>
            <Label className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2 block">Tamanho</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {SIZES_PRESET.map(size => (
                <button
                  key={size}
                  type="button"
                  onClick={() => handleSizeSelect(size)}
                  className={`rounded-lg px-3 py-1 text-xs font-bold border-2 transition-all ${
                    form.size === size
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-gray-200 text-gray-600 hover:border-red-300"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
            <Input
              value={form.size}
              onChange={e => {
                const size = e.target.value
                const label = [form.color, size].filter(Boolean).join(" / ")
                setForm(f => ({ ...f, size, label }))
              }}
              placeholder="Ou digite o tamanho (ex: 38, XL...)"
              className="rounded-xl h-9 text-sm border-gray-200"
            />
          </div>

          {/* Label e SKU */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1 block">Label exibição</Label>
              <Input
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="ex: Vermelho / GG"
                className="rounded-xl h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1 block">SKU</Label>
              <Input
                value={form.sku}
                onChange={e => setForm(f => ({ ...f, sku: e.target.value.toUpperCase() }))}
                placeholder="CAMISA-VM-GG"
                className="rounded-xl h-9 text-sm font-mono"
              />
            </div>
          </div>

          {/* Preço e Estoque */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1 block">
                Preço (R$) <span className="text-gray-400 normal-case font-normal">opcional</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-bold">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.priceCents}
                  onChange={e => setForm(f => ({ ...f, priceCents: e.target.value }))}
                  placeholder="usa preço do produto"
                  className="rounded-xl h-9 text-sm pl-9"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1 block">Estoque</Label>
              <Input
                type="number"
                min={0}
                value={form.stockOnHand}
                onChange={e => setForm(f => ({ ...f, stockOnHand: e.target.value }))}
                className="rounded-xl h-9 text-sm"
              />
            </div>
          </div>

          {/* Ativo */}
          <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
            <Label className="text-sm font-semibold text-gray-700">Ativa</Label>
            <Switch
              checked={form.active}
              onCheckedChange={v => setForm(f => ({ ...f, active: v }))}
            />
          </div>
        </div>

        <DialogFooter className="px-5 pb-5 gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-full" disabled={saving}>
            <X className="h-4 w-4 mr-1" />Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="rounded-full bg-gradient-to-r from-red-600 to-red-500 font-bold"
            disabled={saving}
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            {form.id ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Linha do produto com variantes expandíveis ───────────────────────────────

function ProdutoRow({
  produto, onRefetch,
}: {
  produto: Produto
  onRefetch: () => void
}) {
  const [expanded, setExpanded] = React.useState(false)
  const [varianteDialog, setVarianteDialog] = React.useState(false)
  const [varianteSel, setVarianteSel] = React.useState<Variante | null>(null)

  const { data, mutate } = useSWR<VariantesResp>(
    expanded ? `/api/admin/produtos/${produto.id}/variantes` : null,
    fetcher
  )

  const variantes = data?.variantes || []
  const totalEstoque = produto.hasVariants
    ? variantes.reduce((s, v) => s + v.stockOnHand, 0)
    : produto.stockOnHand

  async function handleDelete(variantId: number) {
    if (!confirm("Apagar esta variante?")) return
    const res = await fetch(`/api/admin/produtos/${produto.id}/variantes?variantId=${variantId}`, {
      method: "DELETE",
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || "Erro"); return }
    toast.success("Variante removida")
    mutate()
    onRefetch()
  }

  return (
    <div className="border border-red-100 rounded-2xl overflow-hidden">
      {/* Header do produto */}
      <div
        className="flex items-center gap-3 p-3 sm:p-4 bg-white hover:bg-red-50/30 cursor-pointer transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 flex-shrink-0">
          {produto.imageUrl ? (
            <img src={produto.imageUrl} alt="" className="h-full w-full object-cover rounded-xl" />
          ) : (
            <Package className="h-5 w-5 text-red-300" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 text-sm truncate">{produto.name}</p>
            {!produto.active && <Badge className="text-[10px] bg-gray-100 text-gray-500">Inativo</Badge>}
            {produto.hasVariants && (
              <Badge className="text-[10px] bg-red-100 text-red-700">
                <Layers className="h-2.5 w-2.5 mr-0.5" />Variações
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-500 font-mono">{produto.sku}</p>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-red-600">
            R$ {(produto.priceCents / 100).toFixed(2).replace(".", ",")}
          </p>
          <p className="text-xs text-gray-500">{totalEstoque} und.</p>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full h-8 w-8 p-0 hover:bg-red-100 text-red-600"
            onClick={e => {
              e.stopPropagation()
              setVarianteSel(null)
              setVarianteDialog(true)
              setExpanded(true)
            }}
            title="Adicionar variante"
          >
            <Plus className="h-4 w-4" />
          </Button>
          {expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
        </div>
      </div>

      {/* Variantes expandidas */}
      {expanded && (
        <div className="border-t border-red-50 bg-red-50/20">
          {variantes.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-xs text-gray-400">Nenhuma variante cadastrada</p>
              <Button
                size="sm"
                className="mt-2 rounded-full bg-red-600 text-white text-xs h-7 px-3"
                onClick={() => { setVarianteSel(null); setVarianteDialog(true) }}
              >
                <Plus className="h-3 w-3 mr-1" />Criar primeira variante
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-red-50">
              {variantes.map(v => (
                <div key={v.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-800">{v.label}</p>
                      {!v.active && <Badge className="text-[9px] bg-gray-100 text-gray-400 px-1.5">Inativa</Badge>}
                    </div>
                    <p className="text-[11px] font-mono text-gray-400">{v.sku}</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-bold text-gray-700">
                      {v.priceCents != null
                        ? `R$ ${(v.priceCents / 100).toFixed(2).replace(".", ",")}`
                        : <span className="text-gray-400">preço pai</span>}
                    </p>
                    <p className={`font-semibold ${v.stockOnHand <= 0 ? "text-red-500" : "text-gray-500"}`}>
                      {v.stockOnHand} und.
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 rounded-full hover:bg-blue-100 text-blue-600"
                      onClick={() => { setVarianteSel(v); setVarianteDialog(true) }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 rounded-full hover:bg-red-100 text-red-600"
                      onClick={() => handleDelete(v.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}

              <div className="px-4 py-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full text-xs h-7 px-3 border-dashed border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => { setVarianteSel(null); setVarianteDialog(true) }}
                >
                  <Plus className="h-3 w-3 mr-1" />Adicionar variante
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <VarianteDialog
        open={varianteDialog}
        onClose={() => setVarianteDialog(false)}
        produto={produto}
        variante={varianteSel}
        onSaved={() => { mutate(); onRefetch() }}
      />
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────

export default function VariantesPage() {
  const { data, mutate } = useSWR<ProdutosResp>("/api/admin/produtos", fetcher)
  const [busca, setBusca] = React.useState("")

  const produtos = (data?.produtos || []).filter(p =>
    p.name.toLowerCase().includes(busca.toLowerCase()) ||
    p.sku.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-br from-red-50/30 via-white to-pink-50/30">
        <Header />
        <main className="mx-auto w-full max-w-4xl space-y-4 p-3 sm:p-4 lg:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Variações de Produtos</h1>
              <p className="text-xs sm:text-sm text-gray-500">Gerencie cores, tamanhos e estoque por variação</p>
            </div>
          </div>

          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar produto..."
              className="w-full rounded-full border border-red-100 pl-11 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
            />
          </div>

          {/* Lista */}
          <div className="space-y-2">
            {!data ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-red-50" />
              ))
            ) : produtos.length === 0 ? (
              <Card className="rounded-2xl p-8 text-center border-red-100">
                <Package className="mx-auto h-10 w-10 text-gray-200 mb-2" />
                <p className="text-gray-400 text-sm">Nenhum produto encontrado</p>
              </Card>
            ) : (
              produtos.map(p => (
                <ProdutoRow key={p.id} produto={p} onRefetch={mutate} />
              ))
            )}
          </div>
        </main>
      </div>
    </AdminGuard>
  )
}
