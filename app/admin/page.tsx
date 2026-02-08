"use client"

import useSWR from "swr"
import { Header } from "@/components/header"
import { AdminGuard } from "@/components/admin-guard"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, TrendingUp } from "lucide-react"
import { useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type ClerkUser = {
  id: string
  nome: string
  email: string | null
  role: string | null
  ativo: boolean
}

type Product = {
  id: number
  name: string
  description: string | null
  price: number
  stock: number
  image_url: string | null
  category: string | null
}

type DashboardResumo = {
  periodo: { from: string; to: string }
  vendas: { quantidade: number; total: number; ticketMedio: number }
  pagamentos: Array<{ metodo: "PIX" | "CASH" | "CARD"; quantidade: number; total: number }>
  topProdutos: Array<{ productId: number; nome: string; quantidade: number; total: number }>
  topVendedores: Array<{ sellerUserId: string; sellerName: string; quantidade: number; total: number }>
}

type VendasResp = {
  vendas: Array<{
    id: number
    code: string
    createdAt: string
    payment: "PIX" | "CASH" | "CARD"
    totalCents: number
    buyerName: string | null
    sellerName: string
    itens: Array<{ nome: string; qty: number; totalCents: number }>
  }>
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function brlFromCents(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`
}
function brl(v: number) {
  return `R$ ${v.toFixed(2).replace(".", ",")}`
}

export default function AdminDashboardPage() {
  const [sellerUserId, setSellerUserId] = useState("")
  const [productId, setProductId] = useState("")
  const [minValue, setMinValue] = useState("")
  const [maxValue, setMaxValue] = useState("")

  const query = new URLSearchParams({
    ...(sellerUserId && { sellerUserId }),
    ...(productId && { productId }),
    ...(minValue && { minValue }),
    ...(maxValue && { maxValue }),
  }).toString()

  const { data: usersData } = useSWR<{ users: ClerkUser[] }>(
    "/api/admin/usuarios",
    fetcher
  )

  const { data: productsData } = useSWR<Product[]>(
    "/api/products",
    fetcher
  )

  const { data, error } = useSWR<DashboardResumo>(
    `/api/dashboard/resumo?${query}`,
    fetcher,
    { refreshInterval: 8000 }
  )

  const { data: vendasData } = useSWR<VendasResp>(
    `/api/admin/vendas?take=20&${query}`,
    fetcher,
    { refreshInterval: 8000 }
  )

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-br from-red-50/30 via-white to-pink-50/30">
        <Header />

        <main className="mx-auto w-full max-w-7xl space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
          {/* Header com título e período */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-xs sm:text-sm text-gray-600">Visão geral de vendas</p>
            </div>
            {data && (
              <div className="text-xs sm:text-sm font-medium text-gray-500">
                📅 {data.periodo.from} a {data.periodo.to}
              </div>
            )}
          </div>

          {/* Card de Filtros */}
          <Card className="rounded-2xl sm:rounded-3xl border-red-100 p-4 sm:p-6 shadow-md">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* VENDEDOR */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Vendedor
                </label>
                <Select value={sellerUserId} onValueChange={setSellerUserId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos os vendedores" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* <SelectItem value="">Todos os vendedores</SelectItem> */}
                    {usersData?.users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* PRODUTO */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Produto
                </label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos os produtos" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* <SelectItem value="">Todos os produtos</SelectItem> */}
                    {productsData?.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* VALOR MÍNIMO */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Valor mínimo
                </label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  placeholder="R$ 0,00"
                  value={minValue}
                  onChange={(e) => setMinValue(e.target.value)}
                />
              </div>

              {/* VALOR MÁXIMO */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Valor máximo
                </label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  placeholder="R$ 999,99"
                  value={maxValue}
                  onChange={(e) => setMaxValue(e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Loading */}
          {!data && !error ? (
            <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 sm:h-28 animate-pulse rounded-2xl sm:rounded-3xl bg-gradient-to-br from-red-100 to-pink-100" />
              ))}
            </div>
          ) : error ? (
            <Card className="rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-red-600 text-sm">Erro ao carregar dashboard</Card>
          ) : (
            <>
              {/* KPIs principais */}
              <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-3">
                <Card className="rounded-2xl sm:rounded-3xl border-red-100 bg-gradient-to-br from-red-50 to-pink-50 p-4 sm:p-6 shadow-md">
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-gray-600">Total vendido</p>
                  <p className="mt-1 text-2xl sm:text-3xl font-bold text-red-600">{brl(data!.vendas.total)}</p>
                </Card>
                <Card className="rounded-2xl sm:rounded-3xl border-red-100 bg-gradient-to-br from-red-50 to-pink-50 p-4 sm:p-6 shadow-md">
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-gray-600">Vendas</p>
                  <p className="mt-1 text-2xl sm:text-3xl font-bold text-red-600">{data!.vendas.quantidade}</p>
                </Card>
                <Card className="rounded-2xl sm:rounded-3xl border-red-100 bg-gradient-to-br from-red-50 to-pink-50 p-4 sm:p-6 shadow-md">
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-gray-600">Ticket médio</p>
                  <p className="mt-1 text-2xl sm:text-3xl font-bold text-red-600">{brl(data!.vendas.ticketMedio)}</p>
                </Card>
              </div>

              {/* Pagamentos + Top produtos */}
              <div className="grid grid-cols-1 gap-2 sm:gap-3 lg:grid-cols-2">
                <Card className="rounded-2xl sm:rounded-3xl border-red-100 p-4 sm:p-6 shadow-md">
                  <div className="mb-3 sm:mb-4 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                    <p className="text-sm sm:text-base font-bold text-gray-900">Pagamentos</p>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    {data!.pagamentos.map((p) => (
                      <div key={p.metodo} className="flex items-center justify-between rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-50 to-pink-50 p-2.5 sm:p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm sm:text-base font-bold text-gray-900">{p.metodo}</span>
                          <span className="text-[10px] sm:text-xs text-gray-600">{p.quantidade} vendas</span>
                        </div>
                        <span className="text-sm sm:text-base font-bold text-red-600">{brl(p.total)}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="rounded-2xl sm:rounded-3xl border-red-100 p-4 sm:p-6 shadow-md">
                  <div className="mb-3 sm:mb-4 flex items-center gap-2">
                    <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                    <p className="text-sm sm:text-base font-bold text-gray-900">Top produtos</p>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    {data!.topProdutos.map((t) => (
                      <div key={t.productId} className="flex items-center justify-between rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-50 to-pink-50 p-2.5 sm:p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm sm:text-base font-bold text-gray-900">{t.nome}</p>
                          <p className="text-[10px] sm:text-xs text-gray-600">{t.quantidade} vendidos</p>
                        </div>
                        <span className="text-sm sm:text-base font-bold text-red-600">{brl(t.total)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Top vendedores */}
              {data!.topVendedores && data!.topVendedores.length > 0 && (
                <Card className="rounded-2xl sm:rounded-3xl border-red-100 p-4 sm:p-6 shadow-md">
                  <div className="mb-3 sm:mb-4 flex items-center gap-2">
                    <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                    <p className="text-sm sm:text-base font-bold text-gray-900">Top vendedores</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {data!.topVendedores.map((v, idx) => (
                      <div
                        key={v.sellerUserId}
                        className="flex items-center justify-between rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-3 sm:p-4"
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <span className="text-xl sm:text-2xl font-bold text-amber-600">#{idx + 1}</span>
                          <div className="min-w-0">
                            <p className="truncate text-sm sm:text-base font-bold text-gray-900">{v.sellerName}</p>
                            <p className="text-[10px] sm:text-xs text-gray-600">{v.quantidade} vendas</p>
                          </div>
                        </div>
                        <span className="text-base sm:text-lg font-bold text-amber-600">{brl(v.total)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Vendas recentes */}
              <Card className="rounded-2xl sm:rounded-3xl border-red-100 p-4 sm:p-6 shadow-md">
                <div className="mb-3 sm:mb-4 flex items-center justify-between">
                  <p className="text-sm sm:text-base font-bold text-gray-900">Vendas recentes</p>
                  <Badge className="rounded-full bg-red-100 text-red-700 text-xs">
                    {vendasData?.vendas?.length ?? 0}
                  </Badge>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  {(vendasData?.vendas || []).map((v) => (
                    <div key={v.id} className="rounded-xl sm:rounded-2xl border border-red-100 bg-gradient-to-br from-red-50/50 to-pink-50/50 p-3 sm:p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm sm:text-base font-bold text-gray-900">
                            {v.buyerName ? v.buyerName : "Cliente"}
                            <span className="ml-1.5 sm:ml-2 text-[10px] sm:text-xs font-normal text-gray-500">• {v.code}</span>
                          </p>
                          <p className="text-[10px] sm:text-xs text-gray-600">
                            {new Date(v.createdAt).toLocaleString("pt-BR")} • {v.payment}
                          </p>
                          <p className="text-[10px] sm:text-xs font-semibold text-gray-700">
                            Vendedor: {v.sellerName}
                          </p>
                        </div>
                        <div className="text-sm sm:text-base font-bold text-red-600">{brlFromCents(v.totalCents)}</div>
                      </div>

                      <div className="mt-2 text-[10px] sm:text-xs text-gray-600">
                        {v.itens.slice(0, 3).map((it, idx) => (
                          <span key={idx}>
                            {it.qty}x {it.nome}
                            {idx < Math.min(v.itens.length, 3) - 1 ? " • " : ""}
                          </span>
                        ))}
                        {v.itens.length > 3 ? <span> • +{v.itens.length - 3} itens</span> : null}
                      </div>
                    </div>
                  ))}

                  {!vendasData?.vendas?.length && (
                    <div className="rounded-xl sm:rounded-2xl border-2 border-dashed border-red-200 py-10 sm:py-12 text-center text-xs sm:text-sm text-gray-400">
                      Nenhuma venda ainda
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}
        </main>
      </div>
    </AdminGuard>
  )
}