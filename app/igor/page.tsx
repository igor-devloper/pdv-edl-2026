"use client"

import { useState, useCallback, useMemo } from "react"
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
  Trophy, DollarSign, ShoppingBag, Building2, LayoutDashboard, Layers,
} from "lucide-react"
import { ExportVendasButton } from "@/components/export-vendas-button"

// ─── Tipos ────────────────────────────────────────────────────────────────────
type VendaItem = {
  id: number; nome: string; productId: number | null; variantId: number | null
  comboId: number | null; qty: number; unitCents: number; totalCents: number
}
type Venda = {
  id: number; code: string; createdAt: string; updatedAt: string | null
  status: "PAID" | "CANCELED"; payment: "PIX" | "CASH" | "CARD"
  totalCents: number; descontoVendaCents: number | null
  buyerName: string | null; nucleo: string | null
  sellerUserId: string; sellerName: string; itens: VendaItem[]
}
type Usuario = { id: string; nome: string; email: string | null; role: string | null }
type ApiResp = { total: number; take: number; skip: number; vendas: Venda[] }
type UsuariosResp = { users: Usuario[] }

type DashResumo = {
  periodo: { from: string; to: string }
  vendas: { quantidade: number; total: number; ticketMedio: number }
  lucro: { totalCusto: number; lucro: number; margemPct: number }
  pagamentos: Array<{ metodo: "PIX" | "CASH" | "CARD"; quantidade: number; total: number }>
  topProdutos: Array<{ productId: number; nome: string; quantidade: number; total: number }>
  topVendedores: Array<{ sellerUserId: string; sellerName: string; quantidade: number; total: number }>
}

type NucleoStat = {
  nucleo: string; totalCents: number; totalVendas: number
  ticketMedioCents: number; participacaoPct: number
}
type NucleoResp = {
  ok: boolean
  periodo: { from: string | null; to: string | null }
  totais: { totalCents: number; totalVendas: number }
  nucleos: NucleoStat[]
}

type Product = { id: number; name: string }

// ─── Constantes ───────────────────────────────────────────────────────────────
const NUCLEOS = [
  "Núcleo da Mata", "Núcleo Central", "Núcleo Sul", "Núcleo Norte",
  "Núcleo Triângulo", "Núcleo Vale do Aço", "Núcleo Vertentes", "Outro / Externo",
] as const
type NucleoName = typeof NUCLEOS[number]

const NUCLEO_COLORS: Record<string, { pill: string; bar: string; dot: string }> = {
  "Núcleo da Mata": { pill: "bg-green-100 text-green-800 border-green-200", bar: "bg-gradient-to-r from-green-400 to-emerald-500", dot: "bg-green-400" },
  "Núcleo Central": { pill: "bg-blue-100 text-blue-800 border-blue-200", bar: "bg-gradient-to-r from-blue-400 to-indigo-500", dot: "bg-blue-400" },
  "Núcleo Sul": { pill: "bg-orange-100 text-orange-800 border-orange-200", bar: "bg-gradient-to-r from-orange-400 to-amber-500", dot: "bg-orange-400" },
  "Núcleo Norte": { pill: "bg-cyan-100 text-cyan-800 border-cyan-200", bar: "bg-gradient-to-r from-cyan-400 to-sky-500", dot: "bg-cyan-400" },
  "Núcleo Triângulo": { pill: "bg-violet-100 text-violet-800 border-violet-200", bar: "bg-gradient-to-r from-violet-400 to-purple-500", dot: "bg-violet-400" },
  "Núcleo Vale do Aço": { pill: "bg-rose-100 text-rose-800 border-rose-200", bar: "bg-gradient-to-r from-rose-400 to-red-500", dot: "bg-rose-400" },
  "Núcleo Vertentes": { pill: "bg-teal-100 text-teal-800 border-teal-200", bar: "bg-gradient-to-r from-teal-400 to-cyan-500", dot: "bg-teal-400" },
  "Outro / Externo": { pill: "bg-gray-100 text-gray-700 border-gray-200", bar: "bg-gradient-to-r from-gray-300 to-gray-400", dot: "bg-gray-400" },
}
const FALLBACK_COLOR = { pill: "bg-red-100 text-red-700 border-red-200", bar: "bg-gradient-to-r from-red-400 to-pink-500", dot: "bg-red-400" }
function getNucleoColor(name: string) { return NUCLEO_COLORS[name] ?? FALLBACK_COLOR }
const TROPHY_EMOJIS = ["🥇", "🥈", "🥉"]
const TAKE = 50

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fetcher = (url: string) => fetch(url).then((r) => r.json())
function brl(v: number) { return `R$ ${v.toFixed(2).replace(".", ",")}` }
function brlCents(cents: number) { return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}` }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
}
function fmtDateShort(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR")
}
function paymentInfo(p: "PIX" | "CASH" | "CARD") {
  if (p === "PIX") return { label: "PIX", Icon: QrCode, color: "bg-violet-100 text-violet-700 border-violet-200" }
  if (p === "CASH") return { label: "Dinheiro", Icon: Banknote, color: "bg-emerald-100 text-emerald-700 border-emerald-200" }
  return { label: "Cartão", Icon: CreditCard, color: "bg-blue-100 text-blue-700 border-blue-200" }
}

// Sentinel para SelectItem que não pode ter value=""
const NONE = "_todos_"
function toSelect(v: string) { return v || NONE }
function fromSelect(v: string) { return v === NONE ? "" : v }

// ─── Abas ─────────────────────────────────────────────────────────────────────
type Tab = "metricas" | "nucleos" | "vendas"

// ─── Filtros de vendas ────────────────────────────────────────────────────────
type Filters = {
  search: string; status: "" | "PAID" | "CANCELED"
  payment: "" | "PIX" | "CASH" | "CARD"; sellerUserId: string
  nucleo: string; minCents: string; maxCents: string
  dateFrom: string; dateTo: string
}
const filtersDefault: Filters = {
  search: "", status: "", payment: "", sellerUserId: "",
  nucleo: "", minCents: "", maxCents: "", dateFrom: "", dateTo: "",
}
function buildVendasQuery(f: Filters, skip: number) {
  const p = new URLSearchParams()
  p.set("take", String(TAKE)); p.set("skip", String(skip))
  if (f.search) p.set("search", f.search)
  if (f.status) p.set("status", f.status)
  if (f.payment) p.set("payment", f.payment)
  if (f.sellerUserId) p.set("sellerUserId", f.sellerUserId)
  if (f.nucleo) p.set("nucleo", f.nucleo)
  if (f.minCents) p.set("minCents", String(Number(f.minCents) * 100))
  if (f.maxCents) p.set("maxCents", String(Number(f.maxCents) * 100))
  if (f.dateFrom) p.set("dateFrom", new Date(f.dateFrom + "T00:00:00").toISOString())
  if (f.dateTo) p.set("dateTo", new Date(f.dateTo + "T23:59:59").toISOString())
  return `/api/igor/vendas?${p.toString()}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// ABA MÉTRICAS
// ═══════════════════════════════════════════════════════════════════════════════
function TabMetricas() {
  const [sellerUserId, setSellerUserId] = useState("")
  const [productId, setProductId] = useState("")
  const [minValue, setMinValue] = useState("")
  const [maxValue, setMaxValue] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // ── query para /api/dashboard/resumo ──────────────────────────────────────
  // minValue/maxValue são enviados em reais — a API converte para cents internamente
  // dateFrom/dateTo como ISO string completa
  const query = new URLSearchParams({
    ...(sellerUserId && { sellerUserId }),
    ...(productId && { productId }),
    ...(minValue && { minValue }),
    ...(maxValue && { maxValue }),
    ...(dateFrom && { dateFrom: new Date(dateFrom + "T00:00:00").toISOString() }),
    ...(dateTo && { dateTo: new Date(dateTo + "T23:59:59").toISOString() }),
  }).toString()

  const { data: usersData } = useSWR<UsuariosResp>("/api/igor/usuarios", fetcher)
  const { data: productsData } = useSWR<{ produtos: Product[] }>("/api/products", fetcher)
  const { data, error, mutate } = useSWR<DashResumo>(
    `/api/dashboard/resumo?${query}`, fetcher, { refreshInterval: 15000 }
  )

  // ── query para vendas recentes — mesmos filtros, converte valor para cents ──
  const vendasQuery = new URLSearchParams({
    take: "20",
    ...(sellerUserId && { sellerUserId }),
    ...(productId && { productId }),
    ...(minValue && { minCents: String(Math.round(Number(minValue) * 100)) }),
    ...(maxValue && { maxCents: String(Math.round(Number(maxValue) * 100)) }),
    ...(dateFrom && { dateFrom: new Date(dateFrom + "T00:00:00").toISOString() }),
    ...(dateTo && { dateTo: new Date(dateTo + "T23:59:59").toISOString() }),
  }).toString()

  const { data: vendasData } = useSWR<ApiResp>(
    `/api/igor/vendas?${vendasQuery}`,
    fetcher, { refreshInterval: 15000 }
  )

  const temFiltros = !!(sellerUserId || productId || minValue || maxValue || dateFrom || dateTo)

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <Card className="rounded-2xl border-yellow-200 bg-yellow-50/50 p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-yellow-800 uppercase tracking-wide">Vendedor</Label>
            <Select value={toSelect(sellerUserId)} onValueChange={(v) => setSellerUserId(fromSelect(v))}>
              <SelectTrigger className="border-yellow-200 bg-white">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Todos os vendedores</SelectItem>
                {usersData?.users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-yellow-800 uppercase tracking-wide">Produto</Label>
            <Select value={toSelect(productId)} onValueChange={(v) => setProductId(fromSelect(v))}>
              <SelectTrigger className="border-yellow-200 bg-white">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Todos os produtos</SelectItem>
                {productsData?.produtos?.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-yellow-800 uppercase tracking-wide">Valor mínimo</Label>
            <Input
              type="number" placeholder="R$ 0,00" value={minValue}
              onChange={(e) => setMinValue(e.target.value)}
              className="border-yellow-200 bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-yellow-800 uppercase tracking-wide">Valor máximo</Label>
            <Input
              type="number" placeholder="R$ 999,99" value={maxValue}
              onChange={(e) => setMaxValue(e.target.value)}
              className="border-yellow-200 bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-yellow-800 uppercase tracking-wide flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Data de
            </Label>
            <Input
              type="date" value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border-yellow-200 bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-yellow-800 uppercase tracking-wide flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Data até
            </Label>
            <Input
              type="date" value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border-yellow-200 bg-white"
            />
          </div>
        </div>
        {temFiltros && (
          <div className="mt-3 pt-3 border-t border-yellow-200">
            <button
              onClick={() => {
                setSellerUserId(""); setProductId("")
                setMinValue(""); setMaxValue("")
                setDateFrom(""); setDateTo("")
              }}
              className="text-xs font-semibold text-yellow-700 hover:text-yellow-900 flex items-center gap-1"
            >
              <X className="h-3.5 w-3.5" /> Limpar filtros
            </button>
          </div>
        )}
      </Card>

      {/* KPIs */}
      {!data && !error ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gradient-to-br from-yellow-100 to-amber-100" />
          ))}
        </div>
      ) : error ? (
        <Card className="rounded-2xl p-4 text-red-600 text-sm">Erro ao carregar métricas</Card>
      ) : (
        <>
          {/* Linha 1 — Vendas */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              { label: "Total vendido", value: brl(data!.vendas.total), Icon: DollarSign },
              { label: "Nº de vendas", value: String(data!.vendas.quantidade), Icon: ShoppingBag },
              { label: "Ticket médio", value: brl(data!.vendas.ticketMedio), Icon: TrendingUp },
            ].map(({ label, value, Icon }) => (
              <Card key={label} className="rounded-2xl border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500">
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wide text-yellow-800">{label}</p>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-gray-900 tabular-nums">{value}</p>
                {data?.periodo && (
                  <p className="text-xs text-yellow-600 mt-1">
                    📅 {data.periodo.from} a {data.periodo.to}
                  </p>
                )}
              </Card>
            ))}
          </div>

          {/* Linha 2 — Financeiro */}
          {data!.lucro && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Card className="rounded-2xl border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-green-500">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Lucro bruto</p>
                </div>
                <p className={`text-2xl sm:text-3xl font-black tabular-nums ${data!.lucro.lucro >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                  {brl(data!.lucro.lucro)}
                </p>
                <p className="text-xs text-emerald-600 mt-1">margem de {data!.lucro.margemPct}%</p>
              </Card>

              <Card className="rounded-2xl border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500">
                    <DollarSign className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-800">Custo total</p>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-blue-700 tabular-nums">
                  {brl(data!.lucro.totalCusto)}
                </p>
                <p className="text-xs text-blue-500 mt-1">Baseado no custo cadastrado dos produtos</p>
              </Card>

              <Card className="rounded-2xl border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-purple-400 to-violet-500">
                    <Trophy className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wide text-purple-800">Margem</p>
                </div>
                <p className={`text-2xl sm:text-3xl font-black tabular-nums ${data!.lucro.margemPct >= 0 ? "text-purple-700" : "text-red-600"}`}>
                  {data!.lucro.margemPct}%
                </p>
                <div className="mt-2 h-2 w-full rounded-full bg-purple-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-400 to-violet-500 transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.max(0, data!.lucro.margemPct))}%` }}
                  />
                </div>
              </Card>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Card className="rounded-2xl border-yellow-100 p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-yellow-600" />
                <p className="font-bold text-gray-900">Pagamentos</p>
              </div>
              <div className="space-y-2">
                {data!.pagamentos.map((p) => {
                  const info = paymentInfo(p.metodo)
                  return (
                    <div key={p.metodo} className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${info.color}`}>
                      <div className="flex items-center gap-2">
                        <info.Icon className="h-4 w-4" />
                        <span className="font-bold text-sm">{info.label}</span>
                        <span className="text-xs opacity-70">{p.quantidade} vendas</span>
                      </div>
                      <span className="font-bold text-sm">{brl(p.total)}</span>
                    </div>
                  )
                })}
                {data!.pagamentos.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Sem dados</p>}
              </div>
            </Card>

            <Card className="rounded-2xl border-yellow-100 p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-600" />
                  <p className="font-bold text-gray-900">Todos os Produtos</p>
                </div>
                <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-700">
                  {data!.topProdutos.length}
                </span>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {data!.topProdutos.map((t, i) => (
                  <div key={t.productId} className="flex items-center justify-between rounded-xl bg-gradient-to-br from-yellow-50 to-amber-50 px-3 py-2.5">
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="text-lg font-black text-yellow-600 w-6">{TROPHY_EMOJIS[i] ?? `${i + 1}º`}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-900">{t.nome}</p>
                        <p className="text-xs text-gray-500">{t.quantidade} vendidos</p>
                      </div>
                    </div>
                    <span className="font-bold text-sm text-yellow-700 ml-2">{brl(t.total)}</span>
                  </div>
                ))}
                {data!.topProdutos.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Sem dados</p>}
              </div>
            </Card>
          </div>

          {/* Top Vendedores */}
          {data!.topVendedores.length > 0 && (
            <Card className="rounded-2xl border-yellow-100 p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                <p className="font-bold text-gray-900">Top Vendedores</p>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                {data!.topVendedores.map((v, i) => (
                  <div key={v.sellerUserId} className="flex items-center justify-between rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 px-3 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl font-black text-amber-600 w-7 shrink-0">{TROPHY_EMOJIS[i] ?? `${i + 1}º`}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-900">{v.sellerName}</p>
                        <p className="text-xs text-gray-500">{v.quantidade} vendas</p>
                      </div>
                    </div>
                    <span className="font-black text-base text-amber-700 ml-2 shrink-0">{brl(v.total)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Vendas recentes */}
          <Card className="rounded-2xl border-yellow-100 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-bold text-gray-900">Vendas Recentes</p>
              <Badge className="rounded-full bg-yellow-100 text-yellow-700 text-xs">
                {vendasData?.vendas?.length ?? 0}
              </Badge>
            </div>
            <div className="space-y-2">
              {(vendasData?.vendas || []).map((v) => (
                <div key={v.id} className="rounded-xl border border-yellow-100 bg-gradient-to-br from-yellow-50/50 to-amber-50/30 p-3">
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-gray-900">
                        {v.buyerName || "Cliente"}
                        <span className="ml-2 text-xs font-normal text-gray-400">• {v.code}</span>
                      </p>
                      <p className="text-xs text-gray-500">{fmtDate(v.createdAt)} • {v.sellerName}</p>
                    </div>
                    <span className="text-sm font-black text-yellow-700">{brlCents(v.totalCents)}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">
                    {v.itens.slice(0, 3).map((it, idx) => (
                      <span key={idx}>{it.qty}x {it.nome}{idx < Math.min(v.itens.length, 3) - 1 ? " · " : ""}</span>
                    ))}
                    {v.itens.length > 3 && <span> · +{v.itens.length - 3} itens</span>}
                  </p>
                </div>
              ))}
              {!vendasData?.vendas?.length && (
                <div className="rounded-xl border-2 border-dashed border-yellow-200 py-10 text-center text-sm text-gray-400">
                  Nenhuma venda ainda
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ABA NÚCLEOS
// ═══════════════════════════════════════════════════════════════════════════════
function TabNucleos() {
  const today = new Date().toISOString().slice(0, 10)
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(today)
  const [filtroAtivo, setFiltroAtivo] = useState({ from: firstOfMonth, to: today })
  const [selecionados, setSelecionados] = useState<Set<NucleoName>>(new Set())

  const url = `/api/admin/nucleos${(() => {
    const p = new URLSearchParams()
    if (filtroAtivo.from) p.set("from", filtroAtivo.from)
    if (filtroAtivo.to) p.set("to", filtroAtivo.to)
    const qs = p.toString()
    return qs ? `?${qs}` : ""
  })()}`

  const { data, isLoading, mutate } = useSWR<NucleoResp>(url, fetcher, { refreshInterval: 30000 })

  const todosNucleos = data?.nucleos ?? []
  const nucleosFiltrados = useMemo(() => {
    if (selecionados.size === 0) return todosNucleos
    return todosNucleos.filter((n) => selecionados.has(n.nucleo as NucleoName))
  }, [todosNucleos, selecionados])

  const totaisFiltrados = useMemo(() => ({
    totalCents: nucleosFiltrados.reduce((s, n) => s + n.totalCents, 0),
    totalVendas: nucleosFiltrados.reduce((s, n) => s + n.totalVendas, 0),
  }), [nucleosFiltrados])

  const maxCents = nucleosFiltrados[0]?.totalCents ?? 1
  const temFiltroNucleo = selecionados.size > 0

  function toggleNucleo(n: NucleoName) {
    setSelecionados((prev) => {
      const next = new Set(prev)
      next.has(n) ? next.delete(n) : next.add(n)
      return next
    })
  }

  return (
    <div className="space-y-5">
      {/* Filtro período */}
      <Card className="rounded-2xl border-yellow-200 bg-yellow-50/50 p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-yellow-600" />
          <p className="text-sm font-bold text-gray-700">Período</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-1">
            <Label className="text-[11px] font-bold uppercase tracking-wide text-gray-400">De</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="rounded-full border-yellow-200 h-9 text-sm" />
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Até</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="rounded-full border-yellow-200 h-9 text-sm" />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={() => setFiltroAtivo({ from, to })}
              className="rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 h-9 px-5 font-bold text-white">
              Filtrar
            </Button>
            <Button variant="outline" onClick={() => { setFrom(firstOfMonth); setTo(today); setFiltroAtivo({ from: firstOfMonth, to: today }) }}
              className="rounded-full border-yellow-300 hover:bg-yellow-50 h-9 px-4">
              Este mês
            </Button>
            <Button variant="ghost" size="icon" onClick={() => mutate()} className="h-9 w-9 rounded-full">
              <RefreshCw className="h-4 w-4 text-yellow-600" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Filtro por núcleo */}
      <Card className="rounded-2xl border-yellow-100 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-yellow-600" />
            <p className="text-sm font-bold text-gray-700">Filtrar por Núcleo</p>
            {temFiltroNucleo && (
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-bold text-yellow-700">
                {selecionados.size} selecionado{selecionados.size > 1 ? "s" : ""}
              </span>
            )}
          </div>
          {temFiltroNucleo && (
            <button onClick={() => setSelecionados(new Set())}
              className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-yellow-600 transition-colors">
              <X className="h-3.5 w-3.5" /> Limpar
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {NUCLEOS.map((n) => {
            const color = getNucleoColor(n)
            const ativo = selecionados.has(n)
            const temDados = todosNucleos.some((nd) => nd.nucleo === n)
            return (
              <button key={n} type="button" onClick={() => toggleNucleo(n)}
                disabled={!temDados && !ativo}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all active:scale-95
                  ${ativo ? `${color.pill} border-current shadow-sm scale-[1.03]`
                    : temDados ? "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                      : "border-gray-100 bg-gray-50 text-gray-300 opacity-60 cursor-default"}`}>
                <span className={`h-2 w-2 rounded-full shrink-0 ${ativo ? color.dot : "bg-gray-300"}`} />
                {n}
                {temDados && !ativo && (
                  <span className="text-[10px] text-gray-400 font-normal ml-0.5">
                    {brlCents(todosNucleos.find((nd) => nd.nucleo === n)?.totalCents ?? 0)}
                  </span>
                )}
                {ativo && <X className="h-3 w-3 ml-0.5 opacity-70" />}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Totais */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { Icon: DollarSign, label: "Faturamento", value: brlCents(totaisFiltrados.totalCents) },
          { Icon: ShoppingBag, label: "Vendas", value: String(totaisFiltrados.totalVendas) },
          { Icon: Building2, label: "Núcleos", value: String(nucleosFiltrados.length) },
        ].map(({ Icon, label, value }) => (
          <Card key={label} className="rounded-2xl border-yellow-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500">
                <Icon className="h-4 w-4 text-white" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{label}</p>
            </div>
            <p className="text-xl sm:text-2xl font-black text-gray-900 tabular-nums">{value}</p>
          </Card>
        ))}
      </div>

      {/* Ranking */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gradient-to-br from-yellow-100 to-amber-100" />
          ))}
        </div>
      ) : nucleosFiltrados.length === 0 ? (
        <Card className="rounded-2xl border-yellow-100 p-12 text-center shadow-sm">
          <Building2 className="mx-auto h-12 w-12 text-yellow-200 mb-3" />
          <p className="font-bold text-gray-400">Nenhuma venda com núcleo no período</p>
          <p className="text-xs text-gray-300 mt-1">Os núcleos aparecem quando o caixa seleciona a área do comprador</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {nucleosFiltrados.map((n, idx) => {
            const color = getNucleoColor(n.nucleo)
            const barPct = Math.round((n.totalCents / maxCents) * 100)
            const isTop3 = idx < 3
            return (
              <Card key={n.nucleo} className="rounded-2xl border-yellow-100 overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm ${isTop3
                        ? ["bg-gradient-to-br from-yellow-300 to-amber-400", "bg-gradient-to-br from-gray-200 to-gray-300", "bg-gradient-to-br from-orange-300 to-amber-400"][idx]
                        : "bg-gradient-to-br from-yellow-50 to-amber-50"
                        }`}>
                        {isTop3 ? <span className="text-lg">{TROPHY_EMOJIS[idx]}</span>
                          : <span className="text-sm font-black text-gray-500">{idx + 1}º</span>}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-bold text-gray-900 text-sm sm:text-base">{n.nucleo}</p>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${color.pill}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`} />
                            {n.participacaoPct}%
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {n.totalVendas} {n.totalVendas === 1 ? "pedido" : "pedidos"} · ticket médio {brlCents(n.ticketMedioCents)}
                        </p>
                      </div>
                    </div>
                    <p className="text-lg sm:text-2xl font-black text-yellow-700 tabular-nums shrink-0">{brlCents(n.totalCents)}</p>
                  </div>
                  <div className="mt-3 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${color.bar}`} style={{ width: `${barPct}%` }} />
                  </div>
                </div>
              </Card>
            )
          })}
          <p className="text-center text-xs text-gray-400 pt-1">
            {filtroAtivo.from && filtroAtivo.to
              ? `${fmtDateShort(filtroAtivo.from)} → ${fmtDateShort(filtroAtivo.to)}`
              : "Todos os períodos"}
            {temFiltroNucleo && ` · ${selecionados.size} núcleo${selecionados.size > 1 ? "s" : ""} filtrado${selecionados.size > 1 ? "s" : ""}`}
          </p>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ABA VENDAS — card de venda
// ═══════════════════════════════════════════════════════════════════════════════
function VendaCard({ venda, onEdit, onCancel }: { venda: Venda; onEdit: (v: Venda) => void; onCancel: (v: Venda) => void }) {
  const [expanded, setExpanded] = useState(false)
  const pay = paymentInfo(venda.payment)
  return (
    <Card className={`border transition-all ${venda.status === "CANCELED" ? "opacity-60 border-red-200 bg-red-50/30" : "border-gray-200 hover:border-yellow-300 hover:shadow-sm"}`}>
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">#{venda.code}</span>
            {venda.status === "CANCELED"
              ? <Badge className="bg-red-100 text-red-700 border border-red-200 text-xs"><XCircle className="h-3 w-3 mr-1" />Cancelada</Badge>
              : <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs"><CheckCircle className="h-3 w-3 mr-1" />Paga</Badge>}
            <Badge className={`border text-xs ${pay.color}`}><pay.Icon className="h-3 w-3 mr-1" />{pay.label}</Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-black text-gray-900">{brlCents(venda.totalCents)}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-yellow-100" onClick={() => onEdit(venda)} title="Editar">
              <Pencil className="h-3.5 w-3.5 text-yellow-700" />
            </Button>
            {venda.status === "PAID" && (
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-red-100" onClick={() => onCancel(venda)} title="Cancelar">
                <Trash2 className="h-3.5 w-3.5 text-red-600" />
              </Button>
            )}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          <span className="flex items-center gap-1"><User className="h-3.5 w-3.5 text-yellow-600" /><b>{venda.sellerName}</b></span>
          {venda.buyerName && <span className="flex items-center gap-1"><ShoppingCart className="h-3.5 w-3.5" />{venda.buyerName}</span>}
          {venda.nucleo && <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5 text-purple-500" />{venda.nucleo}</span>}
          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{fmtDate(venda.createdAt)}</span>
          {venda.descontoVendaCents != null && venda.descontoVendaCents > 0 && (
            <span className="flex items-center gap-1 text-purple-600"><TrendingUp className="h-3.5 w-3.5" />Desconto: {brlCents(venda.descontoVendaCents)}</span>
          )}
        </div>
        <button onClick={() => setExpanded((e) => !e)}
          className="mt-2 flex items-center gap-1 text-xs text-yellow-700 font-semibold hover:underline">
          {expanded ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {expanded ? "Ocultar itens" : `Ver ${venda.itens.length} ${venda.itens.length === 1 ? "item" : "itens"}`}
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {expanded && (
          <div className="mt-2 border-t border-yellow-100 pt-2 space-y-1">
            {venda.itens.map((it) => (
              <div key={it.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-gray-400 font-mono">×{it.qty}</span>
                  <span className="font-medium text-gray-800 truncate">{it.nome}</span>
                </div>
                <div className="flex items-center gap-3 ml-2 shrink-0">
                  <span className="text-gray-400">{brlCents(it.unitCents)}/un</span>
                  <span className="font-bold text-gray-900">{brlCents(it.totalCents)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL DE EDIÇÃO
// ═══════════════════════════════════════════════════════════════════════════════
function EditModal({ venda, onClose, onSaved }: { venda: Venda; onClose: () => void; onSaved: () => void }) {
  const [salvando, setSalvando] = useState(false)
  const [buyerName, setBuyerName] = useState(venda.buyerName ?? "")
  const [nucleo, setNucleo] = useState(venda.nucleo ?? "")
  const [payment, setPayment] = useState<"PIX" | "CASH" | "CARD">(venda.payment)
  const [status, setStatus] = useState<"PAID" | "CANCELED">(venda.status)
  const [totalReais, setTotalReais] = useState(String((venda.totalCents / 100).toFixed(2)))
  const [desconto, setDesconto] = useState(venda.descontoVendaCents != null ? String((venda.descontoVendaCents / 100).toFixed(2)) : "")
  const [itens, setItens] = useState(venda.itens.map((it) => ({
    ...it, qtyStr: String(it.qty), unitReais: String((it.unitCents / 100).toFixed(2)),
  })))

  function updateItem(i: number, field: "qtyStr" | "unitReais", v: string) {
    setItens((prev) => { const n = [...prev]; n[i] = { ...n[i], [field]: v }; return n })
  }

  async function salvar() {
    setSalvando(true)
    try {
      const res = await fetch("/api/igor/vendas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: venda.id, buyerName: buyerName.trim() || null,
          nucleo: nucleo.trim() || null, payment, status,
          totalCents: Math.round(parseFloat(totalReais.replace(",", ".")) * 100) || venda.totalCents,
          descontoVendaCents: desconto.trim() ? Math.round(parseFloat(desconto.replace(",", ".")) * 100) : null,
          itens: itens.map((it) => ({
            id: it.id,
            qty: parseInt(it.qtyStr, 10) || it.qty,
            unitCents: Math.round(parseFloat(it.unitReais.replace(",", ".")) * 100) || it.unitCents,
          })),
        }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Erro ao salvar")
      toast.success("Venda atualizada!"); onSaved(); onClose()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar")
    } finally { setSalvando(false) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Editar Venda <span className="font-mono text-sm text-gray-400">#{venda.code}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3">
            <p className="text-xs text-yellow-700 font-semibold">Vendedor</p>
            <p className="text-sm font-bold text-yellow-900 mt-0.5">{venda.sellerName}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Nome do Comprador</Label>
              <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Nome do comprador" /></div>
            <div className="space-y-1.5"><Label>Núcleo</Label>
              <Select value={toSelect(nucleo)} onValueChange={(v) => setNucleo(fromSelect(v))}>
                <SelectTrigger><SelectValue placeholder="Selecione o núcleo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— Não informado —</SelectItem>
                  {NUCLEOS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select></div>
            <div className="space-y-1.5"><Label>Método de Pagamento</Label>
              <Select value={payment} onValueChange={(v) => setPayment(v as "PIX" | "CASH" | "CARD")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="CASH">Dinheiro</SelectItem>
                  <SelectItem value="CARD">Cartão</SelectItem>
                </SelectContent>
              </Select></div>
            <div className="space-y-1.5"><Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as "PAID" | "CANCELED")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAID">✅ Paga</SelectItem>
                  <SelectItem value="CANCELED">❌ Cancelada</SelectItem>
                </SelectContent>
              </Select></div>
            <div className="space-y-1.5"><Label>Total (R$)</Label>
              <Input value={totalReais} onChange={(e) => setTotalReais(e.target.value)} placeholder="0,00" /></div>
            <div className="space-y-1.5"><Label>Desconto da Venda (R$)</Label>
              <Input value={desconto} onChange={(e) => setDesconto(e.target.value)} placeholder="0,00" /></div>
          </div>
          <Separator />
          <div>
            <p className="text-sm font-bold text-gray-800 mb-3">Itens da Venda</p>
            <div className="space-y-2">
              {itens.map((it, i) => (
                <div key={it.id} className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-700 mb-2 truncate">{it.nome}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Qtd</Label>
                      <Input value={it.qtyStr} onChange={(e) => updateItem(i, "qtyStr", e.target.value)} className="h-8 text-sm" /></div>
                    <div className="space-y-1"><Label className="text-xs">Preço unit. (R$)</Label>
                      <Input value={it.unitReais} onChange={(e) => updateItem(i, "unitReais", e.target.value)} className="h-8 text-sm" /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
            <div className="flex items-center gap-2 text-amber-800 text-xs font-semibold">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Alterações nos itens atualizam qty e unitCents individualmente. O totalCents da venda é editado separadamente.
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={salvando} className="rounded-full">Cancelar</Button>
          <Button onClick={salvar} disabled={salvando}
            className="rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white">
            {salvando ? "Salvando…" : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL DE CANCELAMENTO
// ═══════════════════════════════════════════════════════════════════════════════
function CancelModal({ venda, onClose, onCanceled }: { venda: Venda; onClose: () => void; onCanceled: () => void }) {
  const [loading, setLoading] = useState(false)
  async function confirmar() {
    setLoading(true)
    try {
      const res = await fetch(`/api/igor/vendas?id=${venda.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Erro ao cancelar")
      toast.success("Venda cancelada e estoque devolvido!"); onCanceled(); onClose()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao cancelar")
    } finally { setLoading(false) }
  }
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700"><Trash2 className="h-5 w-5" />Cancelar Venda</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-3">
          <div className="rounded-xl bg-red-50 border border-red-200 p-4">
            <p className="text-sm font-bold text-red-900">#{venda.code}</p>
            <p className="text-xs text-red-700 mt-1">Vendedor: {venda.sellerName} · {brlCents(venda.totalCents)}</p>
          </div>
          <p className="text-sm text-gray-600">Essa ação vai <b>cancelar a venda</b> e devolver o estoque dos itens. Não tem como desfazer manualmente.</p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading} className="rounded-full">Voltar</Button>
          <Button onClick={confirmar} disabled={loading} className="rounded-full bg-red-600 hover:bg-red-700 text-white">
            {loading ? "Cancelando…" : "Confirmar cancelamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ABA VENDAS
// ═══════════════════════════════════════════════════════════════════════════════
function TabVendas() {
  const [filters, setFilters] = useState<Filters>(filtersDefault)
  const [applied, setApplied] = useState<Filters>(filtersDefault)
  const [skip, setSkip] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [editVenda, setEditVenda] = useState<Venda | null>(null)
  const [cancelVenda, setCancelVenda] = useState<Venda | null>(null)

  const queryUrl = buildVendasQuery(applied, skip)
  const { data, mutate, isLoading } = useSWR<ApiResp>(queryUrl, fetcher, { refreshInterval: 20000 })
  const { data: usersData } = useSWR<UsuariosResp>("/api/igor/usuarios", fetcher)

  const vendas = data?.vendas ?? []
  const total = data?.total ?? 0
  const users = usersData?.users ?? []
  const temFiltros = Object.values(applied).some((v) => v !== "")

  const pagas = vendas.filter((v) => v.status === "PAID")
  const canceladas = vendas.filter((v) => v.status === "CANCELED")
  const totalPago = pagas.reduce((a, v) => a + v.totalCents, 0)

  const handleSaved = useCallback(() => mutate(), [mutate])
  const handleCanceled = useCallback(() => mutate(), [mutate])

  return (
    <div className="space-y-4">
      {/* Mini stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total visível", value: String(vendas.length), sub: "vendas", color: "from-yellow-50 to-amber-50 border-yellow-200 text-yellow-900" },
          { label: "Pagas", value: String(pagas.length), sub: brlCents(totalPago), color: "from-emerald-50 to-green-50 border-emerald-200 text-emerald-900" },
          { label: "Canceladas", value: String(canceladas.length), sub: "nesta página", color: "from-red-50 to-rose-50 border-red-200 text-red-900" },
          { label: "Total (DB)", value: String(total), sub: "no filtro", color: "from-purple-50 to-violet-50 border-purple-200 text-purple-900" },
        ].map(({ label, value, sub, color }) => (
          <Card key={label} className={`p-4 border bg-gradient-to-br ${color}`}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
            <p className="text-2xl font-black mt-1">{value}</p>
            <p className="text-xs mt-0.5 opacity-60">{sub}</p>
          </Card>
        ))}
      </div>

      {/* Controles */}
      <div className="flex items-center gap-2 flex-wrap">
        <ExportVendasButton filters={applied} />
        <Button variant="outline" size="sm" onClick={() => mutate()}
          className="rounded-full border-yellow-300 text-yellow-700 hover:bg-yellow-50">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Atualizar
        </Button>
        <Button variant={showFilters ? "default" : "outline"} size="sm"
          onClick={() => setShowFilters((v) => !v)}
          className={`rounded-full ${showFilters ? "bg-yellow-500 hover:bg-yellow-600 text-white" : "border-yellow-300 text-yellow-700 hover:bg-yellow-50"}`}>
          <Filter className="h-3.5 w-3.5 mr-1.5" />
          Filtros {temFiltros && <span className="ml-1 bg-white text-yellow-700 rounded-full px-1.5 text-xs font-black">!</span>}
        </Button>
        <span className="text-xs text-gray-400 ml-auto">{total} {total === 1 ? "venda encontrada" : "vendas encontradas"}</span>
      </div>

      {/* Painel de filtros */}
      {showFilters && (
        <Card className="border-yellow-200 bg-yellow-50/50 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold text-yellow-800">Busca (código ou comprador)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-500" />
                <Input value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  placeholder="Ex: VD-001 ou João" className="pl-9 border-yellow-200"
                  onKeyDown={(e) => { if (e.key === "Enter") { setSkip(0); setApplied({ ...filters }) } }} />
              </div>
            </div>
            {([
              { label: "Status", field: "status", options: [["_todos_", "Todos"], ["PAID", "✅ Pagas"], ["CANCELED", "❌ Canceladas"]] },
              { label: "Método", field: "payment", options: [["_todos_", "Todos"], ["PIX", "PIX"], ["CASH", "Dinheiro"], ["CARD", "Cartão"]] },
            ] as const).map(({ label, field, options }) => (
              <div key={field} className="space-y-1.5">
                <Label className="text-xs font-semibold text-yellow-800">{label}</Label>
                <Select value={toSelect(filters[field])} onValueChange={(v) => setFilters((f) => ({ ...f, [field]: fromSelect(v) as never }))}>
                  <SelectTrigger className="border-yellow-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {options.map(([val, lbl]) => <SelectItem key={lbl} value={val}>{lbl}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-yellow-800">Vendedor</Label>
              <Select value={toSelect(filters.sellerUserId)} onValueChange={(v) => setFilters((f) => ({ ...f, sellerUserId: fromSelect(v) }))}>
                <SelectTrigger className="border-yellow-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Todos</SelectItem>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-yellow-800">Núcleo</Label>
              <Select value={toSelect(filters.nucleo)} onValueChange={(v) => setFilters((f) => ({ ...f, nucleo: fromSelect(v) }))}>
                <SelectTrigger className="border-yellow-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Todos</SelectItem>
                  {NUCLEOS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-yellow-800">Valor mínimo (R$)</Label>
              <Input type="number" value={filters.minCents} onChange={(e) => setFilters((f) => ({ ...f, minCents: e.target.value }))} placeholder="0" className="border-yellow-200" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-yellow-800">Valor máximo (R$)</Label>
              <Input type="number" value={filters.maxCents} onChange={(e) => setFilters((f) => ({ ...f, maxCents: e.target.value }))} placeholder="9999" className="border-yellow-200" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-yellow-800">Data de</Label>
              <Input type="date" value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} className="border-yellow-200" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-yellow-800">Data até</Label>
              <Input type="date" value={filters.dateTo} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} className="border-yellow-200" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-yellow-200">
            <Button onClick={() => { setSkip(0); setApplied({ ...filters }) }}
              className="rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white">
              <Search className="h-3.5 w-3.5 mr-1.5" />Aplicar filtros
            </Button>
            {temFiltros && (
              <Button variant="ghost" onClick={() => { setFilters(filtersDefault); setApplied(filtersDefault); setSkip(0) }}
                className="rounded-full text-red-600 hover:bg-red-50">
                <X className="h-3.5 w-3.5 mr-1.5" />Limpar
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" />
            <p className="text-sm text-yellow-700 font-medium">Carregando vendas…</p>
          </div>
        </div>
      ) : vendas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center">
            <ShoppingCart className="h-8 w-8 text-yellow-400" />
          </div>
          <p className="text-gray-500 font-medium">Nenhuma venda encontrada</p>
          <p className="text-xs text-gray-400">Tente ajustar os filtros</p>
        </div>
      ) : (
        <div className="space-y-3">
          {vendas.map((v) => (
            <VendaCard key={v.id} venda={v} onEdit={setEditVenda} onCancel={setCancelVenda} />
          ))}
        </div>
      )}

      {/* Paginação */}
      {total > TAKE && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" size="sm" disabled={skip === 0}
            onClick={() => setSkip((s) => Math.max(0, s - TAKE))}
            className="rounded-full border-yellow-300 text-yellow-700 hover:bg-yellow-50">← Anterior</Button>
          <span className="text-xs text-gray-500">{skip + 1}–{Math.min(skip + TAKE, total)} de {total}</span>
          <Button variant="outline" size="sm" disabled={skip + TAKE >= total}
            onClick={() => setSkip((s) => s + TAKE)}
            className="rounded-full border-yellow-300 text-yellow-700 hover:bg-yellow-50">Próximo →</Button>
        </div>
      )}

      {/* Modais */}
      {editVenda && <EditModal venda={editVenda} onClose={() => setEditVenda(null)} onSaved={handleSaved} />}
      {cancelVenda && <CancelModal venda={cancelVenda} onClose={() => setCancelVenda(null)} onCanceled={handleCanceled} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAINEL PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: "metricas", label: "Métricas", Icon: LayoutDashboard },
  { id: "nucleos", label: "Núcleos", Icon: Building2 },
  { id: "vendas", label: "Vendas", Icon: Layers },
]

function IgorPainelContent() {
  const [tab, setTab] = useState<Tab>("metricas")

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-yellow-50/20">
      <Header />

      <main className="mx-auto max-w-7xl px-3 sm:px-4 py-6 space-y-6">

        {/* Título */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-yellow-200">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Painel Supremo</h1>
            <p className="text-xs text-yellow-700 font-semibold">Cargo IGOR — Acesso Total 👑</p>
          </div>
        </div>

        {/* Abas */}
        <div className="flex gap-1 bg-yellow-50 border border-yellow-200 rounded-2xl p-1">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition-all
                ${tab === id
                  ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-md shadow-yellow-200"
                  : "text-yellow-700 hover:bg-yellow-100"}`}>
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Conteúdo da aba */}
        {tab === "metricas" && <TabMetricas />}
        {tab === "nucleos" && <TabNucleos />}
        {tab === "vendas" && <TabVendas />}
      </main>
    </div>
  )
}

export default function IgorPage() {
  return (
    <IgorGuard>
      <IgorPainelContent />
    </IgorGuard>
  )
}