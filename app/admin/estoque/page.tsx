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
import { Plus, Pencil, Boxes, Package, Tag, TrendingDown, Layers, Trash2, X, ChevronDown, ChevronUp } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { ImageDropzone } from "@/components/image-dropzone"
import { Badge } from "@/components/ui/badge"

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Variante = {
  id?: number        // undefined = nova (ainda não salva)
  sku: string
  label: string
  color: string
  size: string
  priceCents: string // string p/ input
  stockOnHand: string
  active: boolean
  imageUrl: string | null
}

type Produto = {
  id: number
  sku: string
  name: string
  imageUrl: string | null
  priceCents: number
  costCents: number | null
  active: boolean
  stockOnHand: number
  desconto: number
  hasVariants: boolean
}

type Resp = { produtos: Produto[] }

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function brlFromCents(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`
}
function precoComDesconto(priceCents: number, desconto: number) {
  return priceCents * (1 - desconto / 100)
}

const SIZES_PRESET = ["PP", "P", "M", "G", "GG", "XG", "XGG", "2XG", "3XG"]
const COLORS_PRESET = ["Vermelho", "Bege", "Preto", "Branco", "Azul", "Verde", "Rosa", "Cinza", "Amarelo"]

function novaVariante(produtoSku: string, color = "", size = ""): Variante {
  const label = [color, size].filter(Boolean).join(" / ")
  const sku = [produtoSku, color, size]
    .filter(Boolean)
    .join("-")
    .toUpperCase()
    .replace(/\s+/g, "")
  return { sku, label, color, size, priceCents: "", stockOnHand: "0", active: true, imageUrl: null }
}

// ─── Subcomponente: linha de variante ─────────────────────────────────────────

function VarianteRow({
  variante,
  produtoSku,
  onChange,
  onRemove,
}: {
  variante: Variante
  produtoSku: string
  onChange: (v: Variante) => void
  onRemove: () => void
}) {
  function setColor(color: string) {
    const label = [color, variante.size].filter(Boolean).join(" / ")
    const sku = [produtoSku, color, variante.size]
      .filter(Boolean).join("-").toUpperCase().replace(/\s+/g, "")
    onChange({ ...variante, color, label, sku })
  }

  function setSize(size: string) {
    const label = [variante.color, size].filter(Boolean).join(" / ")
    const sku = [produtoSku, variante.color, size]
      .filter(Boolean).join("-").toUpperCase().replace(/\s+/g, "")
    onChange({ ...variante, size, label, sku })
  }

  return (
    <div className="rounded-xl border border-red-100 bg-red-50/20 p-3 space-y-2.5">
      {/* Linha 1: cor + tamanho + botão remover */}
      <div className="flex items-start gap-2">
        {/* Cores */}
        <div className="flex-1">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Cor</p>
          <div className="flex flex-wrap gap-1 mb-1.5">
            {COLORS_PRESET.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border transition-all ${
                  variante.color === c
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-gray-200 text-gray-500 hover:border-red-300"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <Input
            value={variante.color}
            onChange={e => setColor(e.target.value)}
            placeholder="Ou digite..."
            className="h-7 text-xs rounded-lg"
          />
        </div>

        {/* Tamanhos */}
        <div className="flex-1">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Tamanho</p>
          <div className="flex flex-wrap gap-1 mb-1.5">
            {SIZES_PRESET.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={`rounded-lg px-2 py-0.5 text-[10px] font-bold border transition-all ${
                  variante.size === s
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-gray-200 text-gray-500 hover:border-red-300"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <Input
            value={variante.size}
            onChange={e => setSize(e.target.value)}
            placeholder="Ou digite..."
            className="h-7 text-xs rounded-lg"
          />
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="mt-5 rounded-full p-1 hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Linha 2: label gerado + SKU + estoque + preço próprio */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 mb-1">Label (gerado)</p>
          <Input
            value={variante.label}
            onChange={e => onChange({ ...variante, label: e.target.value })}
            placeholder="ex: Vermelho / GG"
            className="h-7 text-xs rounded-lg"
          />
        </div>
        <div>
          <p className="text-[10px] font-semibold text-gray-400 mb-1">SKU (gerado)</p>
          <Input
            value={variante.sku}
            onChange={e => onChange({ ...variante, sku: e.target.value.toUpperCase() })}
            className="h-7 text-xs rounded-lg font-mono"
          />
        </div>
        <div>
          <p className="text-[10px] font-semibold text-gray-400 mb-1">Estoque inicial</p>
          <Input
            type="number" min={0}
            value={variante.stockOnHand}
            onChange={e => onChange({ ...variante, stockOnHand: e.target.value })}
            className="h-7 text-xs rounded-lg"
          />
        </div>
        <div>
          <p className="text-[10px] font-semibold text-gray-400 mb-1">
            Preço próprio <span className="font-normal text-gray-400">(opcional)</span>
          </p>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">R$</span>
            <Input
              type="number" step="0.01" min={0}
              value={variante.priceCents}
              onChange={e => onChange({ ...variante, priceCents: e.target.value })}
              placeholder="usa preço base"
              className="h-7 text-xs rounded-lg pl-7"
            />
          </div>
        </div>
      </div>

      {/* Label do resultado */}
      {variante.label && (
        <p className="text-[10px] text-red-600 font-semibold">
          ✓ {variante.label} · {variante.sku}
        </p>
      )}
    </div>
  )
}

// ─── Página ────────────────────────────────────────────────────────────────────

const VARIANT_COLOR_MAP: Record<string, string> = {
  vermelho: "bg-red-500", vermelha: "bg-red-500", red: "bg-red-500",
  bege: "bg-amber-200", beige: "bg-amber-200",
  preto: "bg-gray-900", preta: "bg-gray-900", black: "bg-gray-900",
  branco: "bg-gray-200", branca: "bg-gray-200", white: "bg-gray-200",
  azul: "bg-blue-500", blue: "bg-blue-500",
  verde: "bg-green-500", green: "bg-green-500",
  rosa: "bg-pink-400", pink: "bg-pink-400",
  cinza: "bg-gray-400", gray: "bg-gray-400",
  amarelo: "bg-yellow-400", yellow: "bg-yellow-400",
}

// ─── Componente: linha editável de variante existente ─────────────────────────

function VarianteExistenteRow({ variante, onSave, onDelete, onAjustarEstoque }: {
  variante: any
  onSave: (v: any) => Promise<void>
  onDelete: () => void
  onAjustarEstoque: (variantId: number, qty: number, note: string) => Promise<void>
}) {
  const [expanded, setExpanded] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  // Campos editáveis locais
  const [label, setLabel] = React.useState(variante.label)
  const [sku, setSku] = React.useState(variante.sku)
  const [color, setColor] = React.useState(variante.color || "")
  const [size, setSize] = React.useState(variante.size || "")
  const [priceCents, setPriceCents] = React.useState(
    variante.priceCents != null ? String(variante.priceCents / 100) : ""
  )
  const [stockOnHand, setStockOnHand] = React.useState(String(variante.stockOnHand))
  const [active, setActive] = React.useState(variante.active)

  // Ajuste de estoque
  const [ajusteQty, setAjusteQty] = React.useState("")
  const [ajusteNote, setAjusteNote] = React.useState("")
  const [ajusteMode, setAjusteMode] = React.useState(false)

  const estoqueAtual = variante.stockOnHand
  const dirty = label !== variante.label || sku !== variante.sku ||
    color !== (variante.color || "") || size !== (variante.size || "") ||
    priceCents !== (variante.priceCents != null ? String(variante.priceCents / 100) : "") ||
    stockOnHand !== String(variante.stockOnHand) ||
    active !== variante.active

  async function handleSave() {
    setSaving(true)
    await onSave({
      id: variante.id,
      label, sku, color, size, active,
      priceCents: priceCents.trim()
        ? Math.round(parseFloat(priceCents.replace(",", ".")) * 100)
        : null,
      stockOnHand: parseInt(stockOnHand) || 0,
      imageUrl: variante.imageUrl,
    })
    setSaving(false)
    setExpanded(false)
  }

  async function handleAjuste() {
    const n = parseInt(ajusteQty)
    if (!n || isNaN(n) || n === 0) { toast.error("Quantidade inválida"); return }
    setSaving(true)
    await onAjustarEstoque(variante.id, n, ajusteNote)
    setSaving(false)
    setAjusteMode(false)
    setAjusteQty("")
    setAjusteNote("")
    // Atualiza stockOnHand local
    setStockOnHand(String((parseInt(stockOnHand) || 0) + n))
  }

  const qtdNum = parseInt(stockOnHand) || 0

  return (
    <div className={`rounded-xl border transition-all ${expanded ? "border-red-300 bg-white shadow-sm" : "border-red-100 bg-white"}`}>
      {/* Linha resumida */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Cor bolinha */}
        {color && (
          <span className={`h-3 w-3 rounded-full flex-shrink-0 ${VARIANT_COLOR_MAP[color.toLowerCase()] ?? "bg-gray-300"}`} />
        )}

        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-800 truncate">{label}</p>
          <p className="text-[10px] text-gray-400">
            {sku}
            <span className={`ml-1.5 font-semibold ${qtdNum <= 0 ? "text-red-500" : qtdNum <= 3 ? "text-amber-600" : "text-gray-500"}`}>
              · {qtdNum <= 0 ? "Esgotado" : `${qtdNum} un.`}
            </span>
            {!active && <span className="ml-1.5 text-gray-400 italic">· inativa</span>}
          </p>
        </div>

        {/* Botões */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => { setExpanded(e => !e); setAjusteMode(false) }}
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold border transition-all ${
              expanded
                ? "border-red-400 bg-red-50 text-red-600"
                : "border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500"
            }`}
          >
            {expanded ? "Fechar" : "Editar"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-full p-1 hover:bg-red-100 text-red-300 hover:text-red-600 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Painel expandido de edição */}
      {expanded && (
        <div className="border-t border-red-100 px-3 py-3 space-y-3">

          {/* Toggle ajuste de estoque / edição */}
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setAjusteMode(false)}
              className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold border transition-all ${
                !ajusteMode ? "border-red-400 bg-red-50 text-red-600" : "border-gray-200 text-gray-400 hover:border-gray-300"
              }`}
            >
              ✏️ Editar dados
            </button>
            <button
              type="button"
              onClick={() => setAjusteMode(true)}
              className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold border transition-all ${
                ajusteMode ? "border-red-400 bg-red-50 text-red-600" : "border-gray-200 text-gray-400 hover:border-gray-300"
              }`}
            >
              📦 Ajustar estoque
            </button>
          </div>

          {/* ── Modo ajuste de estoque ── */}
          {ajusteMode && (
            <div className="space-y-2">
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-center">
                <p className="text-[10px] text-gray-500">Estoque atual</p>
                <p className={`text-lg font-black ${qtdNum <= 0 ? "text-red-500" : "text-gray-800"}`}>
                  {qtdNum} unidades
                </p>
              </div>

              <div>
                <p className="text-[10px] font-semibold text-gray-500 mb-1">
                  Quantidade <span className="font-normal text-gray-400">(+ entrada / − saída)</span>
                </p>
                <div className="flex gap-1.5 mb-1.5">
                  {[1, 5, 10, -1, -5, -10].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAjusteQty(String(n))}
                      className={`flex-1 rounded-lg py-1 text-[10px] font-bold border transition-all ${
                        ajusteQty === String(n)
                          ? n > 0 ? "border-green-400 bg-green-50 text-green-700" : "border-red-400 bg-red-50 text-red-700"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {n > 0 ? `+${n}` : n}
                    </button>
                  ))}
                </div>
                <Input
                  type="number"
                  value={ajusteQty}
                  onChange={e => setAjusteQty(e.target.value)}
                  placeholder="ex: +5 ou -2"
                  className="h-8 text-xs rounded-lg"
                />
              </div>

              <div>
                <p className="text-[10px] font-semibold text-gray-500 mb-1">Observação</p>
                <Input
                  value={ajusteNote}
                  onChange={e => setAjusteNote(e.target.value)}
                  placeholder="ex: Entrada de mercadoria"
                  className="h-8 text-xs rounded-lg"
                />
              </div>

              {ajusteQty && parseInt(ajusteQty) !== 0 && (
                <div className={`rounded-lg px-3 py-2 text-center text-xs font-bold border ${
                  parseInt(ajusteQty) > 0
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}>
                  {parseInt(ajusteQty) > 0 ? "➕" : "➖"} {qtdNum} → {qtdNum + (parseInt(ajusteQty) || 0)} unidades
                </div>
              )}

              <Button
                size="sm"
                className="w-full rounded-full bg-gradient-to-r from-red-600 to-red-500 text-xs h-8"
                onClick={handleAjuste}
                disabled={saving || !ajusteQty || parseInt(ajusteQty) === 0}
              >
                {saving ? "Salvando..." : "Confirmar ajuste"}
              </Button>
            </div>
          )}

          {/* ── Modo edição de dados ── */}
          {!ajusteMode && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 mb-1">Cor</p>
                  <Input value={color} onChange={e => setColor(e.target.value)}
                    placeholder="ex: Vermelho" className="h-7 text-xs rounded-lg" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 mb-1">Tamanho</p>
                  <Input value={size} onChange={e => setSize(e.target.value)}
                    placeholder="ex: GG" className="h-7 text-xs rounded-lg" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 mb-1">Label</p>
                  <Input value={label} onChange={e => setLabel(e.target.value)}
                    className="h-7 text-xs rounded-lg" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 mb-1">SKU</p>
                  <Input value={sku} onChange={e => setSku(e.target.value.toUpperCase())}
                    className="h-7 text-xs rounded-lg font-mono" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 mb-1">
                    Preço <span className="font-normal text-gray-400">(opcional)</span>
                  </p>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">R$</span>
                    <Input type="number" step="0.01" min={0}
                      value={priceCents} onChange={e => setPriceCents(e.target.value)}
                      placeholder="usa preço base" className="h-7 text-xs rounded-lg pl-6" />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-3 py-1">
                  <p className="text-[10px] font-semibold text-gray-600">Ativa</p>
                  <Switch checked={active} onCheckedChange={setActive} />
                </div>
              </div>

              {dirty && (
                <Button size="sm"
                  className="w-full rounded-full bg-gradient-to-r from-red-600 to-red-500 text-xs h-8"
                  onClick={handleSave} disabled={saving}>
                  {saving ? "Salvando..." : "💾 Salvar alterações"}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function EstoquePage() {
  const { data, mutate } = useSWR<Resp>("/api/admin/produtos", fetcher)
  const [busca, setBusca] = React.useState("")

  const [editOpen, setEditOpen] = React.useState(false)
  const [estoqueOpen, setEstoqueOpen] = React.useState(false)
  const [produtoSel, setProdutoSel] = React.useState<Produto | null>(null)

  // Campos do produto
  const [sku, setSku] = React.useState("")
  const [name, setName] = React.useState("")
  const [imageUrl, setImageUrl] = React.useState<string | null>(null)
  const [price, setPrice] = React.useState("0")
  const [cost, setCost] = React.useState("")
  const [descontoStr, setDescontoStr] = React.useState("0")
  const [active, setActive] = React.useState(true)
  const [qty, setQty] = React.useState("0")
  const [note, setNote] = React.useState("")

  // Variantes
  const [hasVariants, setHasVariants] = React.useState(false)
  const [variantes, setVariantes] = React.useState<Variante[]>([])
  const [variantesExistentes, setVariantesExistentes] = React.useState<any[]>([])
  const [variantesOpen, setVariantesOpen] = React.useState(false)
  const [loadingVariantes, setLoadingVariantes] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  // Preview desconto
  const descontoPct = Math.min(100, Math.max(0, parseFloat(descontoStr) || 0))
  const previewPriceCents = Math.round(Number(price.replace(",", ".")) * 100) || 0
  const previewFinalCents = descontoPct > 0 ? Math.round(previewPriceCents * (1 - descontoPct / 100)) : previewPriceCents
  const temPreviewDesconto = descontoPct > 0 && previewPriceCents > 0

  const produtos = (data?.produtos || []).filter((p) => {
    const q = busca.trim().toLowerCase()
    if (!q) return true
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
  })

  function abrirNovo() {
    setProdutoSel(null)
    setSku(""); setName(""); setImageUrl(null)
    setPrice("0"); setQty("0"); setCost(""); setDescontoStr("0"); setActive(true)
    setHasVariants(false); setVariantes([]); setVariantesExistentes([])
    setVariantesOpen(false)
    setEditOpen(true)
  }

  async function abrirEditar(p: Produto) {
    // Reseta e abre o dialog imediatamente — não espera o fetch
    setProdutoSel(p)
    setSku(p.sku); setName(p.name); setImageUrl(p.imageUrl)
    setPrice(String((p.priceCents / 100).toFixed(2)))
    setCost(p.costCents == null ? "" : String((p.costCents / 100).toFixed(2)))
    setDescontoStr(String(p.desconto ?? 0)); setActive(p.active); setQty("0")
    setHasVariants(p.hasVariants)
    setVariantes([])
    setVariantesExistentes([])
    setVariantesOpen(p.hasVariants)
    setEditOpen(true)  // ← abre o dialog antes do fetch

    // Carrega variantes em background (dialog já está aberto)
    if (p.hasVariants) {
      setLoadingVariantes(true)
      try {
        const r = await fetch(`/api/admin/produtos/${p.id}/variantes`)
        const d = await r.json()
        setVariantesExistentes(d.variantes || [])
      } catch {
        setVariantesExistentes([])
      } finally {
        setLoadingVariantes(false)
      }
    }
  }

  function abrirAjuste(p: Produto) {
    setProdutoSel(p); setQty("0"); setNote(""); setEstoqueOpen(true)
  }

  function addVariante() {
    setVariantes(vs => [...vs, novaVariante(sku)])
  }

  function updateVariante(idx: number, v: Variante) {
    setVariantes(vs => vs.map((old, i) => i === idx ? v : old))
  }

  function removeVariante(idx: number) {
    setVariantes(vs => vs.filter((_, i) => i !== idx))
  }

  async function deleteVarianteExistente(variantId: number) {
    if (!produtoSel) return
    if (!confirm("Remover esta variação?")) return
    const res = await fetch(`/api/admin/produtos/${produtoSel.id}/variantes?variantId=${variantId}`, {
      method: "DELETE",
    })
    const d = await res.json()
    if (!res.ok) { toast.error(d.error || "Erro"); return }
    setVariantesExistentes(vs => vs.filter(v => v.id !== variantId))
    toast.success("Variação removida")
    mutate()
  }

  async function salvarVarianteExistente(v: any) {
    if (!produtoSel) return
    const body = {
      variantes: [{
        id: v.id,
        sku: v.sku,
        label: v.label,
        color: v.color || null,
        size: v.size || null,
        priceCents: v.priceCents || null,
        stockOnHand: parseInt(v.stockOnHand) || 0,
        active: v.active,
        imageUrl: v.imageUrl || null,
      }]
    }
    const res = await fetch(`/api/admin/produtos/${produtoSel.id}/variantes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const d = await res.json()
    if (!res.ok) { toast.error(d.error || "Erro ao salvar"); return }
    // Atualiza localmente
    setVariantesExistentes(vs => vs.map(old => old.id === v.id ? { ...old, ...v } : old))
    toast.success("Variação salva!")
    mutate()
  }

  async function ajustarEstoqueVariante(variantId: number, qty: number, note: string) {
    if (!produtoSel) return
    const res = await fetch(`/api/admin/produtos/${produtoSel.id}/variantes/estoque`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId, qty, note }),
    })
    const d = await res.json()
    if (!res.ok) { toast.error(d.error || "Erro ao ajustar"); return }
    setVariantesExistentes(vs =>
      vs.map(v => v.id === variantId ? { ...v, stockOnHand: v.stockOnHand + qty } : v)
    )
    toast.success("Estoque ajustado!")
    mutate()
  }

  async function salvarProduto() {
    setSaving(true)
    try {
      const payload = {
        sku: sku.trim(),
        name: name.trim(),
        imageUrl: imageUrl || null,
        priceCents: Math.round(Number(price.replace(",", ".")) * 100),
        costCents: cost.trim() ? Math.round(Number(cost.replace(",", ".")) * 100) : null,
        desconto: Math.min(100, Math.max(0, parseInt(descontoStr) || 0)),
        active,
        stockOnHand: hasVariants ? 0 : qty, // se tem variantes, estoque vai por variante
      }

      if (!payload.sku) throw new Error("SKU obrigatório")
      if (!payload.name) throw new Error("Nome obrigatório")
      if (!Number.isFinite(payload.priceCents)) throw new Error("Preço inválido")

      // 1. Salva o produto
      const url = produtoSel ? `/api/admin/produtos/${produtoSel.id}` : "/api/admin/produtos"
      const method = produtoSel ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || "Erro ao salvar produto")

      const produtoId = produtoSel?.id ?? j.produto?.id

      // 2. Salva as novas variantes (se houver)
      if (hasVariants && variantes.length > 0 && produtoId) {
        const variantesBody = variantes.map(v => ({
          sku: v.sku.trim(),
          label: v.label.trim() || [v.color, v.size].filter(Boolean).join(" / "),
          color: v.color || null,
          size: v.size || null,
          priceCents: v.priceCents.trim()
            ? Math.round(parseFloat(v.priceCents.replace(",", ".")) * 100)
            : null,
          stockOnHand: parseInt(v.stockOnHand) || 0,
          active: v.active,
          imageUrl: v.imageUrl || null,
        }))

        const resV = await fetch(`/api/admin/produtos/${produtoId}/variantes`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variantes: variantesBody }),
        })
        const jV = await resV.json().catch(() => ({}))
        if (!resV.ok) throw new Error(jV.error || "Erro ao salvar variações")
      }

      toast.success(produtoSel ? "Produto atualizado!" : "Produto criado!")
      setEditOpen(false)
      await mutate()
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar produto")
    } finally {
      setSaving(false)
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
              <Button
                className="rounded-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600"
                onClick={abrirNovo}
              >
                <Plus className="mr-2 h-4 w-4" />Produto
              </Button>
            </div>
          </div>

          {/* Cards de produtos */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {produtos.map((p) => {
              const temDesconto = (p.desconto ?? 0) > 0
              const finalCents = temDesconto ? precoComDesconto(p.priceCents, p.desconto) : p.priceCents
              const estoqueBaixo = p.stockOnHand > 0 && p.stockOnHand <= 3

              return (
                <Card key={p.id} className={`rounded-2xl sm:rounded-3xl border p-0 shadow-md overflow-hidden transition-all hover:shadow-lg ${
                  !p.active ? "opacity-60" : ""
                } ${temDesconto ? "border-amber-200" : "border-red-100"}`}>
                  <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-red-50 to-pink-50 overflow-hidden">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-12 w-12 text-red-200" />
                    )}

                    {temDesconto && (
                      <div className="absolute top-2 right-2">
                        <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1 text-xs font-black text-white shadow-md">
                          <Tag className="h-3 w-3" />-{p.desconto}%
                        </span>
                      </div>
                    )}

                    {p.hasVariants && (
                      <div className="absolute top-2 left-2">
                        <span className="flex items-center gap-1 rounded-full bg-red-600/90 px-2 py-0.5 text-[10px] font-bold text-white">
                          <Layers className="h-2.5 w-2.5" />Variações
                        </span>
                      </div>
                    )}

                    {!p.active && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                        <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-bold text-gray-500">Inativo</span>
                      </div>
                    )}

                    {estoqueBaixo && p.active && (
                      <div className="absolute bottom-2 left-2">
                        <span className="rounded-full bg-red-100 border border-red-200 px-2 py-0.5 text-[10px] font-bold text-red-600">
                          ⚠ Estoque baixo
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-2">
                    <div>
                      <p className="truncate font-bold text-gray-900 text-sm sm:text-base leading-tight">{p.name}</p>
                      <p className="truncate text-[11px] text-gray-400 mt-0.5">SKU: {p.sku}</p>
                    </div>

                    <div className="flex items-end gap-2">
                      {temDesconto ? (
                        <div>
                          <p className="text-[11px] text-gray-400 line-through leading-none">{brlFromCents(p.priceCents)}</p>
                          <p className="text-lg font-black text-red-600 leading-tight">{brlFromCents(finalCents)}</p>
                        </div>
                      ) : (
                        <p className="text-lg font-black text-red-600">{brlFromCents(p.priceCents)}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-semibold ${p.stockOnHand === 0 ? "text-red-500" : estoqueBaixo ? "text-amber-600" : "text-gray-600"}`}>
                        {p.hasVariants ? "📦 Ver variações" : p.stockOnHand === 0 ? "🚫 Esgotado" : `📦 ${p.stockOnHand} un.`}
                      </span>
                      {p.costCents != null && (
                        <span className="text-gray-400">Custo: {brlFromCents(p.costCents)}</span>
                      )}
                    </div>

                    {temDesconto && (
                      <div className="flex items-center gap-1 rounded-xl bg-amber-50 border border-amber-100 px-2.5 py-1.5">
                        <TrendingDown className="h-3 w-3 text-amber-600 shrink-0" />
                        <span className="text-[10px] font-bold text-amber-700">
                          Economia de {brlFromCents(p.priceCents - finalCents)} por unidade
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" size="sm"
                        className="flex-1 rounded-full border-red-200 hover:bg-red-50 text-xs sm:text-sm"
                        onClick={() => abrirEditar(p)}>
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />Editar
                      </Button>
                      {!p.hasVariants && (
                        <Button size="sm"
                          className="flex-1 rounded-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-xs sm:text-sm"
                          onClick={() => abrirAjuste(p)}>
                          <Boxes className="mr-1.5 h-3.5 w-3.5" />Ajustar
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}

            {!produtos.length && (
              <Card className="rounded-2xl sm:rounded-3xl p-10 text-center text-gray-400 col-span-full">
                Nenhum produto encontrado
              </Card>
            )}
          </div>
        </main>

        {/* ─── Dialog criar/editar produto ──────────────────────────────────── */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="rounded-2xl sm:rounded-3xl max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{produtoSel ? "Editar produto" : "Novo produto"}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4">
              {/* Imagem */}
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
                  <Input value={price} onChange={(e) => setPrice(e.target.value)} className="rounded-full" placeholder="0,00" />
                </div>
                <div className="grid gap-2">
                  <Label>Custo (R$)</Label>
                  <Input value={cost} onChange={(e) => setCost(e.target.value)} className="rounded-full" placeholder="0,00" />
                </div>
                {/* Estoque inicial — só quando NÃO tem variantes e é produto novo */}
                {!produtoSel && !hasVariants && (
                  <div className="grid gap-2">
                    <Label>Estoque inicial</Label>
                    <Input value={qty} onChange={(e) => setQty(e.target.value)} className="rounded-full" placeholder="0" />
                  </div>
                )}
              </div>

              {/* Desconto */}
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-amber-500" />
                  Desconto do produto (%)
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {[0, 5, 10, 15, 20, 25, 30, 50].map((pct) => (
                    <button key={pct} type="button" onClick={() => setDescontoStr(String(pct))}
                      className={`rounded-full border-2 px-3 py-1 text-xs font-bold transition-all ${
                        descontoStr === String(pct)
                          ? "border-amber-500 bg-amber-50 text-amber-700"
                          : "border-gray-200 bg-white text-gray-500 hover:border-amber-300 hover:bg-amber-50"
                      }`}>
                      {pct === 0 ? "Sem desconto" : `-${pct}%`}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Input type="number" min={0} max={100} step={1}
                    value={descontoStr} onChange={(e) => setDescontoStr(e.target.value)}
                    className="rounded-full border-amber-200 pr-10 focus-visible:ring-amber-400" placeholder="0" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 select-none">%</span>
                </div>
                {temPreviewDesconto && (
                  <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 px-4 py-3">
                    <div>
                      <p className="text-[11px] text-gray-400 font-medium">Preço original</p>
                      <p className="text-sm font-bold text-gray-500 line-through">{brlFromCents(previewPriceCents)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-amber-600 font-medium">Com desconto</p>
                      <p className="text-lg font-black text-amber-700">{brlFromCents(previewFinalCents)}</p>
                    </div>
                    <div className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-black text-white shadow">
                      -{descontoPct}%
                    </div>
                  </div>
                )}
              </div>

              {/* ─── TOGGLE: Produto com variações ──────────────────────── */}
              <div
                className={`rounded-2xl border-2 p-3 transition-all ${
                  hasVariants ? "border-red-300 bg-red-50/40" : "border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-red-500" />
                      Produto com variações
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Ex: camiseta em cores e tamanhos diferentes
                    </p>
                  </div>
                  <Switch
                    checked={hasVariants}
                    onCheckedChange={(v) => {
                      setHasVariants(v)
                      setVariantesOpen(v)
                      if (v && variantes.length === 0) {
                        setVariantes([novaVariante(sku)])
                      }
                    }}
                  />
                </div>

                {/* Variantes existentes (edição) */}
                {hasVariants && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                      Variações já cadastradas
                    </p>

                    {loadingVariantes && (
                      <div className="space-y-1.5">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-10 animate-pulse rounded-xl bg-red-100/60" />
                        ))}
                      </div>
                    )}

                    {!loadingVariantes && variantesExistentes.length === 0 && (
                      <p className="text-[10px] text-gray-400 italic">Nenhuma variação cadastrada ainda</p>
                    )}

                    {!loadingVariantes && variantesExistentes.map(v => (
                      <VarianteExistenteRow
                        key={v.id}
                        variante={v}
                        onSave={salvarVarianteExistente}
                        onDelete={() => deleteVarianteExistente(v.id)}
                        onAjustarEstoque={ajustarEstoqueVariante}
                      />
                    ))}
                  </div>
                )}

                {/* Novas variantes */}
                {hasVariants && (
                  <div className="mt-3 space-y-2">
                    {variantesExistentes.length > 0 && (
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                        Adicionar novas variações
                      </p>
                    )}

                    {variantes.map((v, idx) => (
                      <VarianteRow
                        key={idx}
                        variante={v}
                        produtoSku={sku}
                        onChange={(updated) => updateVariante(idx, updated)}
                        onRemove={() => removeVariante(idx)}
                      />
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addVariante}
                      className="w-full rounded-full border-dashed border-red-300 text-red-600 hover:bg-red-50 text-xs h-8"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Adicionar variação (cor + tamanho)
                    </Button>
                  </div>
                )}
              </div>

              {/* Ativo */}
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
              <Button
                className="rounded-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600"
                onClick={salvarProduto}
                disabled={saving}
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Dialog ajuste estoque ────────────────────────────────────────── */}
        <Dialog open={estoqueOpen} onOpenChange={setEstoqueOpen}>
          <DialogContent className="rounded-2xl sm:rounded-3xl">
            <DialogHeader>
              <DialogTitle>Ajustar estoque</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm">Produto: <b>{produtoSel?.name}</b></p>
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
              <Button
                className="rounded-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600"
                onClick={ajustarEstoque}
              >
                Aplicar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminGuard>
  )
}