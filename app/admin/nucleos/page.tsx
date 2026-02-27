"use client"

import useSWR from "swr"
import { AdminGuard } from "@/components/admin-guard"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, useMemo } from "react"
import {
  Building2, TrendingUp, ShoppingBag, DollarSign,
  RefreshCw, Calendar, X, Filter,
} from "lucide-react"

// ─── Núcleos ─────────────────────────────────────────────────────────────────
const NUCLEOS = [
  "Núcleo da Mata",
  "Núcleo Central",
  "Núcleo Sul",
  "Núcleo Norte",
  "Núcleo Triângulo",
  "Núcleo Vale do Aço",
  "Núcleo Vertentes",
  "Outro / Externo",
] as const

type NucleoName = typeof NUCLEOS[number]

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

// Paleta de cores por núcleo (consistente, não muda com a posição)
const NUCLEO_COLORS: Record<string, { pill: string; bar: string; dot: string }> = {
  "Núcleo da Mata":      { pill: "bg-green-100 text-green-800 border-green-200",    bar: "bg-gradient-to-r from-green-400 to-emerald-500",   dot: "bg-green-400"   },
  "Núcleo Central":      { pill: "bg-blue-100 text-blue-800 border-blue-200",       bar: "bg-gradient-to-r from-blue-400 to-indigo-500",     dot: "bg-blue-400"    },
  "Núcleo Sul":          { pill: "bg-orange-100 text-orange-800 border-orange-200", bar: "bg-gradient-to-r from-orange-400 to-amber-500",    dot: "bg-orange-400"  },
  "Núcleo Norte":        { pill: "bg-cyan-100 text-cyan-800 border-cyan-200",       bar: "bg-gradient-to-r from-cyan-400 to-sky-500",        dot: "bg-cyan-400"    },
  "Núcleo Triângulo":    { pill: "bg-violet-100 text-violet-800 border-violet-200", bar: "bg-gradient-to-r from-violet-400 to-purple-500",   dot: "bg-violet-400"  },
  "Núcleo Vale do Aço":  { pill: "bg-rose-100 text-rose-800 border-rose-200",       bar: "bg-gradient-to-r from-rose-400 to-red-500",        dot: "bg-rose-400"    },
  "Núcleo Vertentes":    { pill: "bg-teal-100 text-teal-800 border-teal-200",       bar: "bg-gradient-to-r from-teal-400 to-cyan-500",       dot: "bg-teal-400"    },
  "Outro / Externo":     { pill: "bg-gray-100 text-gray-700 border-gray-200",       bar: "bg-gradient-to-r from-gray-300 to-gray-400",       dot: "bg-gray-400"    },
}
const FALLBACK_COLOR = { pill: "bg-red-100 text-red-700 border-red-200", bar: "bg-gradient-to-r from-red-400 to-pink-500", dot: "bg-red-400" }

function getNucleoColor(name: string) {
  return NUCLEO_COLORS[name] ?? FALLBACK_COLOR
}

const TROPHY = ["🥇", "🥈", "🥉"]

// ─── Componente Principal ─────────────────────────────────────────────────────
function NucleosDashContent() {
  const today        = new Date().toISOString().slice(0, 10)
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().slice(0, 10)

  // ── Filtro de período ──────────────────────────────────────────────────────
  const [from, setFrom]             = useState(firstOfMonth)
  const [to,   setTo]               = useState(today)
  const [filtroAtivo, setFiltroAtivo] = useState({ from: firstOfMonth, to: today })

  // ── Filtro de núcleos selecionados ─────────────────────────────────────────
  // Set vazio = todos visíveis
  const [selecionados, setSelecionados] = useState<Set<NucleoName>>(new Set())

  const url = buildUrl(filtroAtivo.from, filtroAtivo.to)
  const { data, isLoading, mutate } = useSWR<ApiResponse>(url, fetcher, {
    refreshInterval: 30000,
  })

  // ── Filtragem local (sem nova chamada à API) ────────────────────────────────
  const todosNucleos = data?.nucleos ?? []

  const nucleosFiltrados = useMemo(() => {
    if (selecionados.size === 0) return todosNucleos
    return todosNucleos.filter((n) => selecionados.has(n.nucleo as NucleoName))
  }, [todosNucleos, selecionados])

  // Recalcula totais com base nos filtrados
  const totaisFiltrados = useMemo(() => ({
    totalCents:  nucleosFiltrados.reduce((s, n) => s + n.totalCents,  0),
    totalVendas: nucleosFiltrados.reduce((s, n) => s + n.totalVendas, 0),
  }), [nucleosFiltrados])

  const maxCents = nucleosFiltrados[0]?.totalCents ?? 1

  function toggleNucleo(n: NucleoName) {
    setSelecionados((prev) => {
      const next = new Set(prev)
      next.has(n) ? next.delete(n) : next.add(n)
      return next
    })
  }

  function limparFiltroNucleos() {
    setSelecionados(new Set())
  }

  function aplicarFiltro() {
    setFiltroAtivo({ from, to })
  }

  function resetarPeriodo() {
    setFrom(firstOfMonth)
    setTo(today)
    setFiltroAtivo({ from: firstOfMonth, to: today })
  }

  const temFiltroNucleo = selecionados.size > 0

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
              Análise de vendas por núcleo — filtre por período e/ou núcleos específicos
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
                onClick={resetarPeriodo}
              >
                Este mês
              </Button>
            </div>
          </div>
        </Card>

        {/* ── Filtro por núcleo ─────────────────────────────────────────────── */}
        <Card className="rounded-3xl border-red-100 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-red-500" />
              <p className="text-sm font-bold text-gray-700">Filtrar por Núcleo</p>
              {temFiltroNucleo && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                  {selecionados.size} selecionado{selecionados.size > 1 ? "s" : ""}
                </span>
              )}
            </div>
            {temFiltroNucleo && (
              <button
                type="button"
                onClick={limparFiltroNucleos}
                className="flex items-center gap-1 rounded-full text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Limpar
              </button>
            )}
          </div>

          {/* Pills dos núcleos */}
          <div className="flex flex-wrap gap-2">
            {NUCLEOS.map((n) => {
              const color    = getNucleoColor(n)
              const ativo    = selecionados.has(n)
              // Verifica se esse núcleo tem dados no período atual
              const temDados = todosNucleos.some((nd) => nd.nucleo === n)

              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => toggleNucleo(n)}
                  className={`
                    inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold
                    transition-all active:scale-95
                    ${ativo
                      ? `${color.pill} border-current shadow-sm scale-[1.03]`
                      : temDados
                        ? "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                        : "border-gray-100 bg-gray-50 text-gray-300 cursor-default opacity-60"
                    }
                  `}
                  disabled={!temDados && !ativo}
                >
                  {/* Dot colorido */}
                  <span className={`h-2 w-2 rounded-full shrink-0 ${ativo ? color.dot : "bg-gray-300"}`} />
                  {n}
                  {temDados && !ativo && (
                    <span className="text-[10px] text-gray-400 font-normal ml-0.5">
                      {brl(todosNucleos.find((nd) => nd.nucleo === n)?.totalCents ?? 0)}
                    </span>
                  )}
                  {ativo && (
                    <X className="h-3 w-3 ml-0.5 opacity-70" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Hint */}
          <p className="text-[11px] text-gray-400 mt-3">
            {temFiltroNucleo
              ? `Mostrando apenas: ${Array.from(selecionados).join(", ")}`
              : "Clique nos núcleos para filtrar. Sem seleção = todos visíveis."}
          </p>
        </Card>

        {/* ── Cards de totais (reagem ao filtro de núcleo) ──────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { icon: DollarSign, label: "Faturamento",  value: brl(totaisFiltrados.totalCents)  },
            { icon: ShoppingBag, label: "Vendas",      value: String(totaisFiltrados.totalVendas) },
            { icon: TrendingUp,  label: "Núcleos",     value: String(nucleosFiltrados.length)   },
          ].map(({ icon: Icon, label, value }) => (
            <Card
              key={label}
              className={`rounded-3xl border-red-100 p-4 shadow-sm ${label === "Núcleos" ? "col-span-2 sm:col-span-1" : ""}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-500">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{label}</p>
              </div>
              <p className="text-xl sm:text-2xl font-black text-gray-900 tabular-nums">{value}</p>
            </Card>
          ))}
        </div>

        {/* ── Ranking ───────────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-3xl bg-gradient-to-br from-red-100 to-pink-100" />
            ))}
          </div>

        ) : nucleosFiltrados.length === 0 ? (
          <Card className="rounded-3xl border-red-100 p-12 text-center shadow-sm">
            <Building2 className="mx-auto h-12 w-12 text-red-200 mb-3" />
            <p className="font-bold text-gray-400">
              {temFiltroNucleo
                ? "Nenhuma venda encontrada para os núcleos selecionados"
                : "Nenhuma venda com núcleo no período"}
            </p>
            <p className="text-xs text-gray-300 mt-1">
              {temFiltroNucleo
                ? "Tente selecionar outros núcleos ou ampliar o período"
                : "Os núcleos aparecem quando o caixa seleciona a área do comprador"}
            </p>
            {temFiltroNucleo && (
              <button
                type="button"
                onClick={limparFiltroNucleos}
                className="mt-4 text-xs font-bold text-red-500 hover:underline"
              >
                Limpar filtro de núcleos
              </button>
            )}
          </Card>

        ) : (
          <div className="space-y-3">
            {nucleosFiltrados.map((n, idx) => {
              const color  = getNucleoColor(n.nucleo)
              const barPct = Math.round((n.totalCents / maxCents) * 100)
              const isTop3 = idx < 3

              return (
                <Card
                  key={n.nucleo}
                  className="rounded-3xl border-red-100 overflow-hidden shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">

                      {/* Posição + nome */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-sm ${
                          isTop3
                            ? ["from-yellow-300 to-amber-400", "from-gray-200 to-gray-300", "from-orange-300 to-amber-400"][idx]
                            : "from-red-50 to-pink-50"
                        }`}>
                          {isTop3 ? (
                            <span className="text-lg leading-none">{TROPHY[idx]}</span>
                          ) : (
                            <span className="text-sm font-black text-gray-500">{idx + 1}º</span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="font-bold text-gray-900 text-sm sm:text-base">
                              {n.nucleo}
                            </p>
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${color.pill}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`} />
                              {n.participacaoPct}%
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {n.totalVendas} {n.totalVendas === 1 ? "pedido" : "pedidos"} · ticket médio {brl(n.ticketMedioCents)}
                          </p>
                        </div>
                      </div>

                      {/* Total */}
                      <p className="text-lg sm:text-2xl font-black text-red-600 tabular-nums shrink-0">
                        {brl(n.totalCents)}
                      </p>
                    </div>

                    {/* Barra de progresso com cor do núcleo */}
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

            <p className="text-center text-xs text-gray-400 pt-1">
              {filtroAtivo.from && filtroAtivo.to
                ? `${new Date(filtroAtivo.from + "T12:00:00").toLocaleDateString("pt-BR")} → ${new Date(filtroAtivo.to + "T12:00:00").toLocaleDateString("pt-BR")}`
                : "Todos os períodos"}
              {temFiltroNucleo && ` · ${selecionados.size} núcleo${selecionados.size > 1 ? "s" : ""} filtrado${selecionados.size > 1 ? "s" : ""}`}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

export default function AdminNucleos() {
  return (
    <AdminGuard>
      <NucleosDashContent />
    </AdminGuard>
  )
}