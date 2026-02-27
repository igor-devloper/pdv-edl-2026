"use client"

import useSWR from "swr"
import { AdminGuard } from "@/components/admin-guard"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import {
  Building2, TrendingUp, ShoppingBag, DollarSign,
  Trophy, RefreshCw, Calendar,
} from "lucide-react"

// ─── Tipos ────────────────────────────────────────────────────────────────────
type NucleoStat = {
  nucleo: string
  totalCents: number
  totalVendas: number
  ticketMedioCents: number
  participacaoPct: number
}

type ApiResponse = {
  ok: boolean
  periodo: { from: string | null; to: string | null }
  totais: { totalCents: number; totalVendas: number }
  nucleos: NucleoStat[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fetcher = (url: string) => fetch(url).then((r) => r.json())

function brl(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`
}

function buildUrl(from: string, to: string) {
  const params = new URLSearchParams()
  if (from) params.set("from", from)
  if (to)   params.set("to", to)
  const qs = params.toString()
  return `/api/admin/nucleos${qs ? `?${qs}` : ""}`
}

// Paleta de cores por posição no ranking
const RANK_COLORS = [
  { bg: "from-yellow-400 to-amber-400",   text: "text-yellow-900",  badge: "bg-yellow-100 text-yellow-800",  bar: "bg-gradient-to-r from-yellow-400 to-amber-400"   },
  { bg: "from-gray-300 to-gray-400",      text: "text-gray-800",    badge: "bg-gray-100 text-gray-700",      bar: "bg-gradient-to-r from-gray-300 to-gray-400"       },
  { bg: "from-orange-300 to-amber-500",   text: "text-orange-900",  badge: "bg-orange-100 text-orange-800",  bar: "bg-gradient-to-r from-orange-300 to-amber-500"    },
]
const DEFAULT_COLOR = { bg: "from-red-100 to-pink-100", text: "text-red-900", badge: "bg-red-50 text-red-700", bar: "bg-gradient-to-r from-red-400 to-pink-400" }

function getColor(idx: number) {
  return RANK_COLORS[idx] ?? DEFAULT_COLOR
}

const TROPHY_ICONS = ["🥇", "🥈", "🥉"]

// ─── Componente Principal ─────────────────────────────────────────────────────
function NucleosDashContent() {
  const today = new Date().toISOString().slice(0, 10)
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().slice(0, 10)

  const [from, setFrom] = useState(firstOfMonth)
  const [to,   setTo]   = useState(today)
  const [filtroAtivo, setFiltroAtivo] = useState({ from: firstOfMonth, to: today })

  const url = buildUrl(filtroAtivo.from, filtroAtivo.to)
  const { data, isLoading, mutate } = useSWR<ApiResponse>(url, fetcher, {
    refreshInterval: 30000,
  })

  function aplicarFiltro() {
    setFiltroAtivo({ from, to })
  }

  function resetarFiltro() {
    setFrom(firstOfMonth)
    setTo(today)
    setFiltroAtivo({ from: firstOfMonth, to: today })
  }

  const nucleos  = data?.nucleos  ?? []
  const totais   = data?.totais   ?? { totalCents: 0, totalVendas: 0 }
  const maxCents = nucleos[0]?.totalCents ?? 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50/30 via-white to-pink-50/30">
      <Header />

      <main className="mx-auto w-full max-w-5xl space-y-5 p-3 sm:p-4 lg:p-6">

        {/* ── Título ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="h-6 w-6 text-red-500" />
              Ranking de Núcleos
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Análise de vendas por núcleo da empresa júnior
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-red-200 hover:bg-red-50 self-start sm:self-auto"
            onClick={() => mutate()}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Atualizar
          </Button>
        </div>

        {/* ── Filtro de período ─────────────────────────────────────────────── */}
        <Card className="rounded-3xl border-red-100 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-red-500" />
            <p className="text-sm font-bold text-gray-700">Período</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1 block">De</label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-full border-red-100 h-9 text-sm focus-visible:ring-red-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1 block">Até</label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-full border-red-100 h-9 text-sm focus-visible:ring-red-500"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                className="rounded-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 h-9 px-5 font-bold"
                onClick={aplicarFiltro}
              >
                Filtrar
              </Button>
              <Button
                variant="outline"
                className="rounded-full border-red-200 hover:bg-red-50 h-9 px-4"
                onClick={resetarFiltro}
              >
                Este mês
              </Button>
            </div>
          </div>
        </Card>

        {/* ── Cards de totais ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card className="rounded-3xl border-red-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-500">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Total</p>
            </div>
            <p className="text-xl sm:text-2xl font-black text-gray-900 tabular-nums">
              {brl(totais.totalCents)}
            </p>
          </Card>

          <Card className="rounded-3xl border-red-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-500">
                <ShoppingBag className="h-4 w-4 text-white" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Vendas</p>
            </div>
            <p className="text-xl sm:text-2xl font-black text-gray-900 tabular-nums">
              {totais.totalVendas}
            </p>
          </Card>

          <Card className="col-span-2 sm:col-span-1 rounded-3xl border-red-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-500">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Núcleos</p>
            </div>
            <p className="text-xl sm:text-2xl font-black text-gray-900 tabular-nums">
              {nucleos.length}
            </p>
          </Card>
        </div>

        {/* ── Skeleton ─────────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-3xl bg-gradient-to-br from-red-100 to-pink-100" />
            ))}
          </div>

        /* Vazio */
        ) : nucleos.length === 0 ? (
          <Card className="rounded-3xl border-red-100 p-12 text-center shadow-sm">
            <Building2 className="mx-auto h-12 w-12 text-red-200 mb-3" />
            <p className="font-bold text-gray-400">Nenhuma venda com núcleo no período</p>
            <p className="text-xs text-gray-300 mt-1">
              Os núcleos aparecem quando o caixa seleciona a área do comprador
            </p>
          </Card>

        /* Ranking */
        ) : (
          <div className="space-y-3">
            {nucleos.map((n, idx) => {
              const color = getColor(idx)
              const barPct = Math.round((n.totalCents / maxCents) * 100)
              const isTop3 = idx < 3

              return (
                <Card
                  key={n.nucleo}
                  className={`rounded-3xl border-red-100 overflow-hidden shadow-md transition-transform hover:-translate-y-0.5 hover:shadow-lg`}
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">

                      {/* Posição + nome */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Badge de posição */}
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${color.bg} shadow-sm`}>
                          {isTop3 ? (
                            <span className="text-lg leading-none">{TROPHY_ICONS[idx]}</span>
                          ) : (
                            <span className={`text-sm font-black ${color.text}`}>{idx + 1}º</span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-sm sm:text-base truncate">
                            {n.nucleo}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${color.badge}`}>
                              {n.participacaoPct}% das vendas
                            </span>
                            <span className="text-[11px] text-gray-400">
                              {n.totalVendas} {n.totalVendas === 1 ? "pedido" : "pedidos"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Valores */}
                      <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1 sm:gap-0 shrink-0">
                        <p className="text-lg sm:text-xl font-black text-red-600 tabular-nums">
                          {brl(n.totalCents)}
                        </p>
                        <p className="text-[11px] text-gray-400 tabular-nums">
                          Ticket médio: {brl(n.ticketMedioCents)}
                        </p>
                      </div>
                    </div>

                    {/* Barra de progresso */}
                    <div className="mt-3 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${color.bar}`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>
                </Card>
              )
            })}

            {/* Legenda do período ativo */}
            <p className="text-center text-xs text-gray-400 pt-1">
              {filtroAtivo.from && filtroAtivo.to
                ? `Período: ${new Date(filtroAtivo.from + "T12:00:00").toLocaleDateString("pt-BR")} → ${new Date(filtroAtivo.to + "T12:00:00").toLocaleDateString("pt-BR")}`
                : "Todos os períodos"}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

// ─── Export com AdminGuard ────────────────────────────────────────────────────
export default function AdminNucleos() {
  return (
    <AdminGuard>
      <NucleosDashContent />
    </AdminGuard>
  )
}