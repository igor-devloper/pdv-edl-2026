"use client"

import { useState, useCallback } from "react"
import useSWR from "swr"
import { IgorGuard } from "@/components/igor-guard"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  Crown, Search, Filter, RefreshCw, Pencil, Trash2, ChevronDown, ChevronUp,
  QrCode, Banknote, CreditCard, Calendar, User, Package, ShoppingCart,
  TrendingUp, X, CheckCircle, XCircle, AlertTriangle, Eye, EyeOff,
} from "lucide-react"

// ─── Tipos ────────────────────────────────────────────────────────────────────
type VendaItem = {
  id: number
  nome: string
  productId: number | null
  variantId: number | null
  comboId: number | null
  qty: number
  unitCents: number
  totalCents: number
}

type Venda = {
  id: number
  code: string
  createdAt: string
  updatedAt: string | null
  status: "PAID" | "CANCELED"
  payment: "PIX" | "CASH" | "CARD"
  totalCents: number
  descontoVendaCents: number | null
  buyerName: string | null
  nucleo: string | null
  sellerUserId: string
  sellerName: string
  itens: VendaItem[]
}

type Usuario = {
  id: string
  nome: string
  email: string | null
  role: string | null
}

type ApiResp = { total: number; take: number; skip: number; vendas: Venda[] }
type UsuariosResp = { users: Usuario[] }

// ─── Constantes ───────────────────────────────────────────────────────────────
const NUCLEOS = [
  "Núcleo da Mata", "Núcleo Central", "Núcleo Sul", "Núcleo Norte",
  "Núcleo Triângulo", "Núcleo Vale do Aço", "Núcleo Vertentes", "Outro / Externo",
]

const TAKE = 50

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fetcher = (url: string) => fetch(url).then((r) => r.json())

function brl(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
}

function paymentInfo(p: "PIX" | "CASH" | "CARD") {
  if (p === "PIX")  return { label: "PIX",      Icon: QrCode,    color: "bg-violet-100 text-violet-700 border-violet-200" }
  if (p === "CASH") return { label: "Dinheiro", Icon: Banknote,  color: "bg-emerald-100 text-emerald-700 border-emerald-200" }
  return                   { label: "Cartão",   Icon: CreditCard, color: "bg-blue-100 text-blue-700 border-blue-200" }
}

function buildQuery(filters: Filters, skip: number) {
  const p = new URLSearchParams()
  p.set("take", String(TAKE))
  p.set("skip", String(skip))
  if (filters.search)      p.set("search",      filters.search)
  if (filters.status && filters.status !== "ALL")    p.set("status",      filters.status)
  if (filters.payment && filters.payment !== "ALL")  p.set("payment",     filters.payment)
  if (filters.sellerUserId && filters.sellerUserId !== "ALL") p.set("sellerUserId", filters.sellerUserId)
  if (filters.nucleo && filters.nucleo !== "ALL")    p.set("nucleo",      filters.nucleo)
  if (filters.minCents)    p.set("minCents",    String(Number(filters.minCents) * 100))
  if (filters.maxCents)    p.set("maxCents",    String(Number(filters.maxCents) * 100))
  if (filters.dateFrom)    p.set("dateFrom",    new Date(filters.dateFrom + "T00:00:00").toISOString())
  if (filters.dateTo)      p.set("dateTo",      new Date(filters.dateTo   + "T23:59:59").toISOString())
  return `/api/igor/vendas?${p.toString()}`
}

// ─── Tipos de filtro ──────────────────────────────────────────────────────────
type Filters = {
  search:      string
  status:      "ALL" | "PAID" | "CANCELED"
  payment:     "ALL" | "PIX" | "CASH" | "CARD"
  sellerUserId: string
  nucleo:      string
  minCents:    string
  maxCents:    string
  dateFrom:    string
  dateTo:      string
}

const filtersDefault: Filters = {
  search: "", status: "ALL", payment: "ALL", sellerUserId: "ALL",
  nucleo: "ALL", minCents: "", maxCents: "", dateFrom: "", dateTo: "",
}

// ─── Componente de estatísticas ───────────────────────────────────────────────
function StatsBar({ vendas }: { vendas: Venda[] }) {
  const pagas     = vendas.filter((v) => v.status === "PAID")
  const canceladas = vendas.filter((v) => v.status === "CANCELED")
  const totalBruto = pagas.reduce((a, v) => a + v.totalCents, 0)
  const descontos  = pagas.reduce((a, v) => a + (v.descontoVendaCents ?? 0), 0)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card className="p-4 border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50">
        <p className="text-xs text-yellow-700 font-semibold uppercase tracking-wide">Total visível</p>
        <p className="text-2xl font-black text-yellow-900 mt-1">{vendas.length}</p>
        <p className="text-xs text-yellow-600 mt-0.5">vendas</p>
      </Card>
      <Card className="p-4 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50">
        <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wide">Pagas</p>
        <p className="text-2xl font-black text-emerald-900 mt-1">{pagas.length}</p>
        <p className="text-xs text-emerald-600 mt-0.5">{brl(totalBruto)}</p>
      </Card>
      <Card className="p-4 border-red-200 bg-gradient-to-br from-red-50 to-rose-50">
        <p className="text-xs text-red-700 font-semibold uppercase tracking-wide">Canceladas</p>
        <p className="text-2xl font-black text-red-900 mt-1">{canceladas.length}</p>
        <p className="text-xs text-red-600 mt-0.5">nesta página</p>
      </Card>
      <Card className="p-4 border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50">
        <p className="text-xs text-purple-700 font-semibold uppercase tracking-wide">Descontos</p>
        <p className="text-2xl font-black text-purple-900 mt-1">{brl(descontos)}</p>
        <p className="text-xs text-purple-600 mt-0.5">concedidos</p>
      </Card>
    </div>
  )
}

// ─── Linha de venda ───────────────────────────────────────────────────────────
function VendaCard({
  venda,
  onEdit,
  onCancel,
}: {
  venda: Venda
  onEdit: (v: Venda) => void
  onCancel: (v: Venda) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const pay = paymentInfo(venda.payment)

  return (
    <Card className={`border transition-all ${venda.status === "CANCELED" ? "opacity-60 border-red-200 bg-red-50/30" : "border-gray-200 hover:border-yellow-300 hover:shadow-sm"}`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              #{venda.code}
            </span>
            {venda.status === "CANCELED" ? (
              <Badge className="bg-red-100 text-red-700 border border-red-200 text-xs">
                <XCircle className="h-3 w-3 mr-1" /> Cancelada
              </Badge>
            ) : (
              <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" /> Paga
              </Badge>
            )}
            <Badge className={`border text-xs ${pay.color}`}>
              <pay.Icon className="h-3 w-3 mr-1" />
              {pay.label}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-gray-900">{brl(venda.totalCents)}</span>
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8 rounded-full hover:bg-yellow-100"
              onClick={() => onEdit(venda)}
              title="Editar venda"
            >
              <Pencil className="h-3.5 w-3.5 text-yellow-700" />
            </Button>
            {venda.status === "PAID" && (
              <Button
                variant="ghost" size="icon"
                className="h-8 w-8 rounded-full hover:bg-red-100"
                onClick={() => onCancel(venda)}
                title="Cancelar venda"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-600" />
              </Button>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-yellow-600 flex-shrink-0" />
            <span className="font-medium">{venda.sellerName}</span>
          </div>
          {venda.buyerName && (
            <div className="flex items-center gap-1.5">
              <ShoppingCart className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
              <span>{venda.buyerName}</span>
            </div>
          )}
          {venda.nucleo && (
            <div className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
              <span>{venda.nucleo}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span>{fmtDate(venda.createdAt)}</span>
          </div>
          {venda.descontoVendaCents != null && venda.descontoVendaCents > 0 && (
            <div className="flex items-center gap-1.5 text-purple-600">
              <TrendingUp className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Desconto: {brl(venda.descontoVendaCents)}</span>
            </div>
          )}
        </div>

        {/* Itens toggle */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-3 flex items-center gap-1 text-xs text-yellow-700 font-semibold hover:underline"
        >
          {expanded ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {expanded ? "Ocultar itens" : `Ver ${venda.itens.length} ${venda.itens.length === 1 ? "item" : "itens"}`}
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {/* Itens expandidos */}
        {expanded && (
          <div className="mt-3 border-t border-yellow-100 pt-3 space-y-1.5">
            {venda.itens.map((it) => (
              <div key={it.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-gray-400 font-mono">×{it.qty}</span>
                  <span className="font-medium text-gray-800 truncate">{it.nome}</span>
                </div>
                <div className="flex items-center gap-3 ml-2 flex-shrink-0">
                  <span className="text-gray-500">{brl(it.unitCents)}/un</span>
                  <span className="font-bold text-gray-900">{brl(it.totalCents)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

// ─── Modal de edição ──────────────────────────────────────────────────────────
function EditModal({
  venda,
  onClose,
  onSaved,
}: {
  venda: Venda
  onClose: () => void
  onSaved: () => void
}) {
  const [salvando, setSalvando] = useState(false)

  // Campos da venda
  const [buyerName, setBuyerName]   = useState(venda.buyerName ?? "")
  const [nucleo,    setNucleo]      = useState(venda.nucleo ?? "")
  const [payment,  setPayment]     = useState<"PIX" | "CASH" | "CARD">(venda.payment)
  const [status,   setStatus]      = useState<"PAID" | "CANCELED">(venda.status)
  const [totalReais, setTotalReais] = useState(String((venda.totalCents / 100).toFixed(2)))
  const [desconto, setDesconto]    = useState(
    venda.descontoVendaCents != null ? String((venda.descontoVendaCents / 100).toFixed(2)) : ""
  )

  // Itens editáveis
  const [itens, setItens] = useState(
    venda.itens.map((it) => ({
      ...it,
      qtyStr:      String(it.qty),
      unitReais:   String((it.unitCents / 100).toFixed(2)),
    }))
  )

  function updateItem(index: number, field: "qtyStr" | "unitReais", value: string) {
    setItens((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  async function salvar() {
    setSalvando(true)
    try {
      const body: Record<string, unknown> = {
        id:         venda.id,
        buyerName:  buyerName.trim() || null,
        nucleo:     nucleo.trim() || null,
        payment,
        status,
        totalCents: Math.round(parseFloat(totalReais.replace(",", ".")) * 100) || venda.totalCents,
        descontoVendaCents: desconto.trim()
          ? Math.round(parseFloat(desconto.replace(",", ".")) * 100)
          : null,
        itens: itens.map((it) => ({
          id:        it.id,
          qty:       parseInt(it.qtyStr, 10) || it.qty,
          unitCents: Math.round(parseFloat(it.unitReais.replace(",", ".")) * 100) || it.unitCents,
        })),
      }

      const res = await fetch("/api/igor/vendas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || "Erro ao salvar")
      }

      toast.success("Venda atualizada com sucesso!")
      onSaved()
      onClose()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar")
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Editar Venda{" "}
            <span className="font-mono text-sm text-gray-400">#{venda.code}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Vendedor (somente info) */}
          <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3">
            <p className="text-xs text-yellow-700 font-semibold">Vendedor</p>
            <p className="text-sm font-bold text-yellow-900 mt-0.5">{venda.sellerName}</p>
          </div>

          {/* Dados da venda */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome do Comprador</Label>
              <Input
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Nome do comprador"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Núcleo</Label>
              <Select value={nucleo || "__vazio"} onValueChange={(v) => setNucleo(v === "__vazio" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o núcleo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__vazio">— Não informado —</SelectItem>
                  {NUCLEOS.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Método de Pagamento</Label>
              <Select value={payment} onValueChange={(v) => setPayment(v as "PIX" | "CASH" | "CARD")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="CASH">Dinheiro</SelectItem>
                  <SelectItem value="CARD">Cartão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as "PAID" | "CANCELED")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAID">✅ Paga</SelectItem>
                  <SelectItem value="CANCELED">❌ Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Total (R$)</Label>
              <Input
                value={totalReais}
                onChange={(e) => setTotalReais(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Desconto da Venda (R$)</Label>
              <Input
                value={desconto}
                onChange={(e) => setDesconto(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>

          <Separator />

          {/* Itens */}
          <div>
            <p className="text-sm font-bold text-gray-800 mb-3">Itens da Venda</p>
            <div className="space-y-2">
              {itens.map((it, i) => (
                <div key={it.id} className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-700 mb-2 truncate">{it.nome}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Qtd</Label>
                      <Input
                        value={it.qtyStr}
                        onChange={(e) => updateItem(i, "qtyStr", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Preço unit. (R$)</Label>
                      <Input
                        value={it.unitReais}
                        onChange={(e) => updateItem(i, "unitReais", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
            <div className="flex items-center gap-2 text-amber-800 text-xs font-semibold">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              Alterações nos itens atualizam qty e unitCents individualmente. O totalCents da venda é editado separadamente.
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={salvando} className="rounded-full">
            Cancelar
          </Button>
          <Button
            onClick={salvar}
            disabled={salvando}
            className="rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white"
          >
            {salvando ? "Salvando…" : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Modal de cancelamento ────────────────────────────────────────────────────
function CancelModal({
  venda,
  onClose,
  onCanceled,
}: {
  venda: Venda
  onClose: () => void
  onCanceled: () => void
}) {
  const [loading, setLoading] = useState(false)

  async function confirmar() {
    setLoading(true)
    try {
      const res = await fetch(`/api/igor/vendas?id=${venda.id}`, { method: "DELETE" })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || "Erro ao cancelar")
      }
      toast.success("Venda cancelada e estoque devolvido!")
      onCanceled()
      onClose()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao cancelar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <Trash2 className="h-5 w-5" />
            Cancelar Venda
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-3">
          <div className="rounded-xl bg-red-50 border border-red-200 p-4">
            <p className="text-sm font-bold text-red-900">#{venda.code}</p>
            <p className="text-xs text-red-700 mt-1">
              Vendedor: {venda.sellerName} · {brl(venda.totalCents)}
            </p>
          </div>
          <p className="text-sm text-gray-600">
            Essa ação vai <b>cancelar a venda</b> e devolver o estoque dos itens. Não tem como desfazer manualmente.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading} className="rounded-full">Voltar</Button>
          <Button
            onClick={confirmar}
            disabled={loading}
            className="rounded-full bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? "Cancelando…" : "Confirmar cancelamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Painel principal ─────────────────────────────────────────────────────────
function IgorPainelContent() {
  const [filters, setFilters]     = useState<Filters>(filtersDefault)
  const [applied, setApplied]     = useState<Filters>(filtersDefault)
  const [skip, setSkip]           = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [editVenda, setEditVenda] = useState<Venda | null>(null)
  const [cancelVenda, setCancelVenda] = useState<Venda | null>(null)

  const queryUrl = buildQuery(applied, skip)

  const { data, mutate, isLoading } = useSWR<ApiResp>(queryUrl, fetcher, { refreshInterval: 20000 })
  const { data: usersData } = useSWR<UsuariosResp>("/api/igor/usuarios", fetcher)

  const vendas  = data?.vendas ?? []
  const total   = data?.total  ?? 0
  const users   = usersData?.users ?? []

  function aplicarFiltros() {
    setSkip(0)
    setApplied({ ...filters })
  }

  function limparFiltros() {
    setFilters(filtersDefault)
    setApplied(filtersDefault)
    setSkip(0)
  }

  const temFiltros = Object.entries(applied).some(([k, v]) => v && v !== "ALL" && v !== "")

  const handleSaved   = useCallback(() => mutate(), [mutate])
  const handleCanceled = useCallback(() => mutate(), [mutate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-yellow-50/20">
      <Header />

      <main className="mx-auto max-w-7xl px-3 sm:px-4 py-6 space-y-6">

        {/* Título */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-yellow-200">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900">Painel Supremo</h1>
              <p className="text-xs text-yellow-700 font-semibold">Cargo IGOR — Acesso Total 👑</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => mutate()}
              className="rounded-full border-yellow-300 text-yellow-700 hover:bg-yellow-50"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Atualizar
            </Button>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters((v) => !v)}
              className={`rounded-full ${showFilters ? "bg-yellow-500 hover:bg-yellow-600 text-white" : "border-yellow-300 text-yellow-700 hover:bg-yellow-50"}`}
            >
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              Filtros {temFiltros && <span className="ml-1 bg-white text-yellow-700 rounded-full px-1.5 text-xs font-black">!</span>}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <StatsBar vendas={vendas} />

        {/* Painel de filtros */}
        {showFilters && (
          <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50/50 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Busca */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-yellow-800">Busca (código ou comprador)</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-500" />
                  <Input
                    value={filters.search}
                    onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                    placeholder="Ex: VD-001 ou João"
                    className="pl-9 border-yellow-200 focus:ring-yellow-400"
                    onKeyDown={(e) => e.key === "Enter" && aplicarFiltros()}
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-yellow-800">Status</Label>
                <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v as Filters["status"] }))}>
                  <SelectTrigger className="border-yellow-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="PAID">✅ Pagas</SelectItem>
                    <SelectItem value="CANCELED">❌ Canceladas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Pagamento */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-yellow-800">Método</Label>
                <Select value={filters.payment} onValueChange={(v) => setFilters((f) => ({ ...f, payment: v as Filters["payment"] }))}>
                  <SelectTrigger className="border-yellow-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="CASH">Dinheiro</SelectItem>
                    <SelectItem value="CARD">Cartão</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Vendedor */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-yellow-800">Vendedor</Label>
                <Select value={filters.sellerUserId} onValueChange={(v) => setFilters((f) => ({ ...f, sellerUserId: v }))}>
                  <SelectTrigger className="border-yellow-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Núcleo */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-yellow-800">Núcleo</Label>
                <Select value={filters.nucleo} onValueChange={(v) => setFilters((f) => ({ ...f, nucleo: v }))}>
                  <SelectTrigger className="border-yellow-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    {NUCLEOS.map((n) => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Valor mínimo */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-yellow-800">Valor mínimo (R$)</Label>
                <Input
                  type="number"
                  value={filters.minCents}
                  onChange={(e) => setFilters((f) => ({ ...f, minCents: e.target.value }))}
                  placeholder="0,00"
                  className="border-yellow-200"
                />
              </div>

              {/* Valor máximo */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-yellow-800">Valor máximo (R$)</Label>
                <Input
                  type="number"
                  value={filters.maxCents}
                  onChange={(e) => setFilters((f) => ({ ...f, maxCents: e.target.value }))}
                  placeholder="9999,00"
                  className="border-yellow-200"
                />
              </div>

              {/* Data de */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-yellow-800">Data de</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                  className="border-yellow-200"
                />
              </div>

              {/* Data até */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-yellow-800">Data até</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                  className="border-yellow-200"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-yellow-200">
              <Button
                onClick={aplicarFiltros}
                className="rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white"
              >
                <Search className="h-3.5 w-3.5 mr-1.5" />
                Aplicar filtros
              </Button>
              {temFiltros && (
                <Button variant="ghost" onClick={limparFiltros} className="rounded-full text-red-600 hover:bg-red-50">
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Limpar
                </Button>
              )}
              <span className="text-xs text-yellow-700 ml-auto">
                {total} {total === 1 ? "venda encontrada" : "vendas encontradas"}
              </span>
            </div>
          </Card>
        )}

        {/* Lista de vendas */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" />
              <p className="text-sm text-yellow-700 font-medium">Carregando vendas…</p>
            </div>
          </div>
        ) : vendas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center">
              <ShoppingCart className="h-8 w-8 text-yellow-400" />
            </div>
            <p className="text-gray-500 font-medium">Nenhuma venda encontrada</p>
            <p className="text-xs text-gray-400">Tente ajustar os filtros</p>
          </div>
        ) : (
          <div className="space-y-3">
            {vendas.map((v) => (
              <VendaCard
                key={v.id}
                venda={v}
                onEdit={(v) => setEditVenda(v)}
                onCancel={(v) => setCancelVenda(v)}
              />
            ))}
          </div>
        )}

        {/* Paginação */}
        {total > TAKE && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={skip === 0}
              onClick={() => setSkip((s) => Math.max(0, s - TAKE))}
              className="rounded-full border-yellow-300 text-yellow-700 hover:bg-yellow-50"
            >
              ← Anterior
            </Button>
            <span className="text-xs text-gray-500">
              {skip + 1}–{Math.min(skip + TAKE, total)} de {total}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={skip + TAKE >= total}
              onClick={() => setSkip((s) => s + TAKE)}
              className="rounded-full border-yellow-300 text-yellow-700 hover:bg-yellow-50"
            >
              Próximo →
            </Button>
          </div>
        )}
      </main>

      {/* Modais */}
      {editVenda && (
        <EditModal
          venda={editVenda}
          onClose={() => setEditVenda(null)}
          onSaved={handleSaved}
        />
      )}
      {cancelVenda && (
        <CancelModal
          venda={cancelVenda}
          onClose={() => setCancelVenda(null)}
          onCanceled={handleCanceled}
        />
      )}
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function IgorPage() {
  return (
    <IgorGuard>
      <IgorPainelContent />
    </IgorGuard>
  )
}
