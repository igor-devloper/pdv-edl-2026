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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import {
  Plus, Pencil, Trash2, Gift, Search, Save, X, RefreshCw,
  Package, Layers, Lock, Unlock,
} from "lucide-react"

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Variante = {
  id: number
  label: string
  color: string | null
  size: string | null
  stockOnHand: number
}

type ProdutoSimples = {
  id: number
  sku: string
  name: string
  imageUrl: string | null
  priceCents: number
  active: boolean
  hasVariants: boolean
  variants?: Variante[]
}

type ComboItemForm = {
  _key: string             // chave local única para React
  productId: string
  variantId: string        // "livre" ou id da variante fixada
  qty: string
  label: string
}

type ComboForm = {
  id?: number
  sku: string
  name: string
  description: string
  priceCents: string
  costCents: string
  active: boolean
  desconto: string
  items: ComboItemForm[]
}

type ComboItemAPI = {
  id: number
  label: string | null
  qty: number
  variantId: number | null
  product: {
    id: number
    name: string
    hasVariants: boolean
    imageUrl: string | null
    variants: Variante[]
  }
  variant: { id: number; label: string } | null
}

type ComboAPI = {
  id: number
  sku: string
  name: string
  description: string | null
  priceCents: number
  costCents: number | null
  active: boolean
  desconto: number | null
  items: ComboItemAPI[]
}

type ProdutosResp = { produtos: ProdutoSimples[] }
type CombosResp = { combos: ComboAPI[] }

const fetcher = (url: string) => fetch(url).then(r => r.json())

function emptyItem(): ComboItemForm {
  return { _key: Math.random().toString(36).slice(2), productId: "", variantId: "livre", qty: "1", label: "" }
}

function emptyForm(): ComboForm {
  return {
    sku: "",
    name: "",
    description: "",
    priceCents: "",
    costCents: "",
    active: true,
    desconto: "0",
    items: [emptyItem()],
  }
}

function comboToForm(c: ComboAPI): ComboForm {
  return {
    id: c.id,
    sku: c.sku,
    name: c.name,
    description: c.description || "",
    priceCents: String(c.priceCents / 100),
    costCents: c.costCents != null ? String(c.costCents / 100) : "",
    active: c.active,
    desconto: String(c.desconto || 0),
    items: c.items.map(ci => ({
      _key: String(ci.id),
      productId: String(ci.product.id),
      variantId: ci.variantId ? String(ci.variantId) : "livre",
      qty: String(ci.qty),
      label: ci.label || "",
    })),
  }
}

// ─── Dialog de criação/edição de combo ───────────────────────────────────────

function ComboDialog({
  open, onClose, combo, produtos, onSaved,
}: {
  open: boolean
  onClose: () => void
  combo: ComboAPI | null
  produtos: ProdutoSimples[]
  onSaved: () => void
}) {
  const [form, setForm] = React.useState<ComboForm>(emptyForm())
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setForm(combo ? comboToForm(combo) : emptyForm())
  }, [open, combo])

  function setField<K extends keyof ComboForm>(k: K, v: ComboForm[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function setItem(key: string, field: keyof ComboItemForm, value: string) {
    setForm(f => ({
      ...f,
      items: f.items.map(i =>
        i._key === key
          ? { ...i, [field]: value, ...(field === "productId" ? { variantId: "livre" } : {}) }
          : i
      ),
    }))
  }

  function addItem() {
    setForm(f => ({ ...f, items: [...f.items, emptyItem()] }))
  }

  function removeItem(key: string) {
    setForm(f => ({ ...f, items: f.items.filter(i => i._key !== key) }))
  }

  // Gera SKU automático do combo
  function gerarSku() {
    const base = form.name.toUpperCase().replace(/\s+/g, "-").replace(/[^A-Z0-9-]/g, "").slice(0, 20)
    setField("sku", `COMBO-${base}`)
  }

  async function handleSave() {
    if (!form.sku.trim() || !form.name.trim() || !form.priceCents.trim()) {
      toast.error("SKU, Nome e Preço são obrigatórios")
      return
    }
    if (form.items.length === 0 || form.items.some(i => !i.productId)) {
      toast.error("Todos os itens precisam ter um produto selecionado")
      return
    }

    setSaving(true)
    try {
      const body = {
        sku: form.sku.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        priceCents: Math.round(parseFloat(form.priceCents.replace(",", ".")) * 100),
        costCents: form.costCents.trim()
          ? Math.round(parseFloat(form.costCents.replace(",", ".")) * 100)
          : null,
        active: form.active,
        desconto: parseInt(form.desconto) || 0,
        items: form.items.map(i => ({
          productId: parseInt(i.productId),
          variantId: i.variantId !== "livre" ? parseInt(i.variantId) : null,
          qty: parseInt(i.qty) || 1,
          label: i.label.trim() || null,
        })),
      }

      const url = form.id ? `/api/admin/combos/${form.id}` : "/api/admin/combos"
      const method = form.id ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao salvar")

      toast.success(form.id ? "Combo atualizado!" : "Combo criado!")
      onSaved()
      onClose()
    } catch (e: any) {
      toast.error(e.message || "Erro")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-3xl border-0 shadow-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-br from-red-600 to-rose-500 p-5 text-white flex-shrink-0">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
              <Gift className="h-5 w-5" />
              {form.id ? "Editar Combo" : "Novo Combo"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-red-100 text-sm mt-1">Configure os produtos, variações e preço especial</p>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Nome e SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1 block">Nome do Combo *</Label>
              <Input
                value={form.name}
                onChange={e => setField("name", e.target.value)}
                placeholder="ex: Kit Camiseta + Pulseira"
                className="rounded-xl h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1 block">SKU *</Label>
              <div className="flex gap-1.5">
                <Input
                  value={form.sku}
                  onChange={e => setField("sku", e.target.value.toUpperCase())}
                  placeholder="COMBO-KIT-01"
                  className="rounded-xl h-9 text-sm font-mono flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={gerarSku}
                  className="rounded-xl h-9 px-2 text-xs border-dashed"
                  title="Gerar SKU automático"
                >
                  Auto
                </Button>
              </div>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <Label className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1 block">Descrição (opcional)</Label>
            <Input
              value={form.description}
              onChange={e => setField("description", e.target.value)}
              placeholder="ex: Leve mais por menos!"
              className="rounded-xl h-9 text-sm"
            />
          </div>

          {/* Preço, Custo, Desconto */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1 block">Preço (R$) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">R$</span>
                <Input
                  type="number" step="0.01" min={0}
                  value={form.priceCents}
                  onChange={e => setField("priceCents", e.target.value)}
                  placeholder="0,00"
                  className="rounded-xl h-9 text-sm pl-8"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1 block">Custo (R$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">R$</span>
                <Input
                  type="number" step="0.01" min={0}
                  value={form.costCents}
                  onChange={e => setField("costCents", e.target.value)}
                  placeholder="opcional"
                  className="rounded-xl h-9 text-sm pl-8"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1 block">Desconto %</Label>
              <Input
                type="number" min={0} max={100}
                value={form.desconto}
                onChange={e => setField("desconto", e.target.value)}
                className="rounded-xl h-9 text-sm"
              />
            </div>
          </div>

          {/* Items do combo */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-bold uppercase tracking-wide text-gray-500">Produtos do Combo</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addItem}
                className="rounded-full h-7 px-2.5 text-xs border-dashed border-red-300 text-red-600"
              >
                <Plus className="h-3 w-3 mr-1" />Adicionar item
              </Button>
            </div>

            <div className="space-y-2">
              {form.items.map((item, idx) => {
                const produtoSel = produtos.find(p => p.id === parseInt(item.productId))
                const variantes = produtoSel?.variants || []
                const temVariantes = produtoSel?.hasVariants && variantes.length > 0
                const varianteSelecionada = variantes.find(v => String(v.id) === item.variantId)

                return (
                  <div key={item._key} className="rounded-xl border border-red-100 bg-red-50/30 p-3 space-y-2">
                    {/* Header do item */}
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-600">
                        {idx + 1}
                      </span>
                      <p className="text-xs font-bold text-gray-600 flex-1">Item do combo</p>
                      {form.items.length > 1 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 rounded-full hover:bg-red-100 text-red-500"
                          onClick={() => removeItem(item._key)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {/* Linha principal: Produto + Qtd + Rótulo */}
                    <div className={`grid gap-2 ${temVariantes ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-3"}`}>
                      {/* Produto */}
                      <div>
                        <Label className="text-[10px] font-semibold text-gray-500 mb-1 block">Produto</Label>
                        <Select
                          value={item.productId}
                          onValueChange={v => setItem(item._key, "productId", v)}
                        >
                          <SelectTrigger className="rounded-xl h-8 text-xs">
                            <SelectValue placeholder="Selecionar produto..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {produtos.map(p => (
                              <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                                <div className="flex items-center gap-1.5">
                                  {p.hasVariants && <Layers className="h-3 w-3 text-red-400 flex-shrink-0" />}
                                  <span>{p.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Qtd */}
                      <div>
                        <Label className="text-[10px] font-semibold text-gray-500 mb-1 block">Quantidade</Label>
                        <Input
                          type="number" min={1}
                          value={item.qty}
                          onChange={e => setItem(item._key, "qty", e.target.value)}
                          className="rounded-xl h-8 text-xs"
                        />
                      </div>

                      {/* Rótulo */}
                      <div>
                        <Label className="text-[10px] font-semibold text-gray-500 mb-1 block">
                          Rótulo <span className="text-gray-400 normal-case font-normal">(como aparece no PDV)</span>
                        </Label>
                        <Input
                          value={item.label}
                          onChange={e => setItem(item._key, "label", e.target.value)}
                          placeholder="ex: Camiseta, Pulseira..."
                          className="rounded-xl h-8 text-xs"
                        />
                      </div>
                    </div>

                    {/* Seção de variação — só aparece se o produto tem variantes */}
                    {temVariantes && (
                      <div className="rounded-lg bg-white border border-red-100 p-2.5 space-y-2">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                          Variação de {produtoSel?.name}
                        </p>

                        {/* Opção: Livre ou Fixa */}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setItem(item._key, "variantId", "livre")}
                            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-2 text-xs font-bold transition-all ${
                              item.variantId === "livre"
                                ? "border-amber-400 bg-amber-50 text-amber-700"
                                : "border-gray-200 text-gray-500 hover:border-amber-300"
                            }`}
                          >
                            <Unlock className="h-3 w-3" />
                            Escolher na venda
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              // Ao clicar em "Fixar", pré-seleciona a primeira variante se ainda estiver em "livre"
                              if (item.variantId === "livre" && variantes.length > 0) {
                                setItem(item._key, "variantId", String(variantes[0].id))
                              }
                            }}
                            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-2 text-xs font-bold transition-all ${
                              item.variantId !== "livre"
                                ? "border-green-400 bg-green-50 text-green-700"
                                : "border-gray-200 text-gray-500 hover:border-green-300"
                            }`}
                          >
                            <Lock className="h-3 w-3" />
                            Fixar variação
                          </button>
                        </div>

                        {/* Select de variante fixa */}
                        {item.variantId !== "livre" && (
                          <Select
                            value={item.variantId}
                            onValueChange={v => setItem(item._key, "variantId", v)}
                          >
                            <SelectTrigger className="rounded-xl h-8 text-xs">
                              <SelectValue placeholder="Selecionar variação..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {variantes.map(v => (
                                <SelectItem key={v.id} value={String(v.id)} className="text-xs">
                                  {v.label}
                                  <span className={`ml-1 ${v.stockOnHand <= 0 ? "text-red-400" : "text-gray-400"}`}>
                                    ({v.stockOnHand} un.)
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {/* Aviso do modo escolhido */}
                        {item.variantId === "livre" ? (
                          <p className="text-[10px] text-amber-600">
                            O vendedor escolherá a variação (cor/tamanho) no momento da venda.
                          </p>
                        ) : varianteSelecionada ? (
                          <p className="text-[10px] text-green-600">
                            Sempre virá: <strong>{varianteSelecionada.label}</strong> ({varianteSelecionada.stockOnHand} em estoque)
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Ativo */}
          <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
            <Label className="text-sm font-semibold text-gray-700">Combo ativo</Label>
            <Switch
              checked={form.active}
              onCheckedChange={v => setField("active", v)}
            />
          </div>
        </div>

        <DialogFooter className="px-5 pb-5 gap-2 flex-shrink-0 border-t border-gray-100 pt-4">
          <Button variant="outline" onClick={onClose} className="rounded-full" disabled={saving}>
            <X className="h-4 w-4 mr-1" />Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="rounded-full bg-gradient-to-r from-red-600 to-red-500 font-bold"
            disabled={saving}
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            {form.id ? "Salvar alterações" : "Criar Combo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────

export default function CombosPage() {
  const { data: combosData, mutate: mutateCombos } = useSWR<CombosResp>("/api/admin/combos", fetcher)
  const { data: produtosData } = useSWR<ProdutosResp>("/api/admin/produtos", fetcher)

  const [busca, setBusca] = React.useState("")
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [comboSel, setComboSel] = React.useState<ComboAPI | null>(null)

  // Para combos, precisamos buscar os produtos com variantes
  const [produtosComVariantes, setProdutosComVariantes] = React.useState<ProdutoSimples[]>([])

  React.useEffect(() => {
    if (!produtosData?.produtos) return
    // Busca variantes para produtos que têm hasVariants=true
    const prods = produtosData.produtos
    const promises = prods.map(async p => {
      if (!p.hasVariants) return p
      const r = await fetch(`/api/admin/produtos/${p.id}/variantes`)
      const d = await r.json()
      return { ...p, variants: d.variantes || [] }
    })
    Promise.all(promises).then(setProdutosComVariantes)
  }, [produtosData])

  const combos = (combosData?.combos || []).filter(c =>
    c.name.toLowerCase().includes(busca.toLowerCase()) ||
    c.sku.toLowerCase().includes(busca.toLowerCase())
  )

  async function handleDelete(id: number) {
    if (!confirm("Apagar este combo?")) return
    const res = await fetch(`/api/admin/combos/${id}`, { method: "DELETE" })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || "Erro"); return }
    toast.success("Combo removido")
    mutateCombos()
  }

  async function handleToggleActive(c: ComboAPI) {
    const res = await fetch(`/api/admin/combos/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !c.active }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || "Erro"); return }
    mutateCombos()
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-br from-red-50/30 via-white to-pink-50/30">
        <Header />
        <main className="mx-auto w-full max-w-4xl space-y-4 p-3 sm:p-4 lg:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Combos</h1>
              <p className="text-xs sm:text-sm text-gray-500">Crie kits com preço especial e variações flexíveis</p>
            </div>
            <Button
              className="rounded-full bg-gradient-to-r from-red-600 to-red-500 font-bold shadow-md text-sm"
              onClick={() => { setComboSel(null); setDialogOpen(true) }}
            >
              <Plus className="h-4 w-4 mr-1" />Novo Combo
            </Button>
          </div>

          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar combo..."
              className="w-full rounded-full border border-red-100 pl-11 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
            />
          </div>

          {/* Lista de combos */}
          <div className="space-y-3">
            {!combosData ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-red-50" />
              ))
            ) : combos.length === 0 ? (
              <Card className="rounded-2xl p-10 text-center border-red-100">
                <Gift className="mx-auto h-10 w-10 text-gray-200 mb-3" />
                <p className="text-gray-400 font-medium mb-1">Nenhum combo cadastrado</p>
                <p className="text-xs text-gray-400 mb-4">Crie kits com preço especial e produtos variados</p>
                <Button
                  className="rounded-full bg-red-600 text-white text-sm"
                  onClick={() => { setComboSel(null); setDialogOpen(true) }}
                >
                  <Plus className="h-4 w-4 mr-1" />Criar primeiro combo
                </Button>
              </Card>
            ) : (
              combos.map(combo => (
                <Card key={combo.id} className="rounded-2xl border-red-100 p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    {/* Ícone */}
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-100 to-pink-100 flex-shrink-0">
                      <Gift className="h-5 w-5 text-red-500" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900 text-sm">{combo.name}</h3>
                        <Badge className="text-[10px] font-mono bg-gray-100 text-gray-500">{combo.sku}</Badge>
                        {!combo.active && <Badge className="text-[10px] bg-gray-100 text-gray-400">Inativo</Badge>}
                        {(combo.desconto || 0) > 0 && (
                          <Badge className="text-[10px] bg-amber-100 text-amber-700">-{combo.desconto}%</Badge>
                        )}
                      </div>

                      {combo.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{combo.description}</p>
                      )}

                      {/* Items */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {combo.items.map(ci => (
                          <span key={ci.id} className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-100 px-2 py-0.5 text-[10px] text-gray-600">
                            {ci.qty > 1 && <span className="font-bold">{ci.qty}x</span>}
                            {ci.label || ci.product.name}
                            {ci.variant
                              ? <span className="text-red-600 font-medium">— {ci.variant.label}</span>
                              : ci.product.hasVariants
                              ? <span className="text-amber-600 italic"> (livre)</span>
                              : null}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Preço e ações */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <p className="text-lg font-bold text-red-600">
                        R$ {(combo.priceCents / 100).toFixed(2).replace(".", ",")}
                      </p>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-full h-7 w-7 p-0 hover:bg-gray-100"
                          onClick={() => handleToggleActive(combo)}
                          title={combo.active ? "Desativar" : "Ativar"}
                        >
                          {combo.active
                            ? <Lock className="h-3.5 w-3.5 text-gray-500" />
                            : <Unlock className="h-3.5 w-3.5 text-green-600" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-full h-7 w-7 p-0 hover:bg-blue-100"
                          onClick={() => { setComboSel(combo); setDialogOpen(true) }}
                        >
                          <Pencil className="h-3.5 w-3.5 text-blue-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-full h-7 w-7 p-0 hover:bg-red-100"
                          onClick={() => handleDelete(combo.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </main>
      </div>

      <ComboDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        combo={comboSel}
        produtos={produtosComVariantes.length > 0 ? produtosComVariantes : (produtosData?.produtos || [])}
        onSaved={mutateCombos}
      />
    </AdminGuard>
  )
}