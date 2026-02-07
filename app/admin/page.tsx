"use client"

import useSWR from "swr"
import { Header } from "@/components/header"
import { AdminGuard } from "@/components/admin-guard"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

type DashboardResumo = {
  periodo: { from: string; to: string }
  vendas: { quantidade: number; total: number; ticketMedio: number }
  pagamentos: Array<{ metodo: "PIX" | "CASH" | "CARD"; quantidade: number; total: number }>
  topProdutos: Array<{ productId: number; nome: string; quantidade: number; total: number }>
}

type VendasResp = {
  vendas: Array<{
    id: number
    code: string
    createdAt: string
    payment: "PIX" | "CASH" | "CARD"
    totalCents: number
    buyerName: string | null
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
  const { data, error } = useSWR<DashboardResumo>("/api/dashboard/resumo", fetcher, { refreshInterval: 8000 })
  const { data: vendasData } = useSWR<VendasResp>("/api/admin/vendas?take=20", fetcher, { refreshInterval: 8000 })

  return (
    <AdminGuard>
      <div className="min-h-screen bg-background">
        <Header />

        <main className="mx-auto w-full max-w-7xl p-4 lg:p-6 space-y-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Visão geral de vendas do evento</p>
            </div>
            {data && (
              <div className="text-xs text-muted-foreground">
                Período: {data.periodo.from} a {data.periodo.to}
              </div>
            )}
          </div>

          {!data && !error ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <Card className="p-4 rounded-2xl">Erro ao carregar dashboard.</Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card className="p-4 rounded-2xl">
                  <p className="text-xs text-muted-foreground">Total vendido</p>
                  <p className="text-2xl font-bold">{brl(data!.vendas.total)}</p>
                </Card>
                <Card className="p-4 rounded-2xl">
                  <p className="text-xs text-muted-foreground">Vendas</p>
                  <p className="text-2xl font-bold">{data!.vendas.quantidade}</p>
                </Card>
                <Card className="p-4 rounded-2xl">
                  <p className="text-xs text-muted-foreground">Ticket médio</p>
                  <p className="text-2xl font-bold">{brl(data!.vendas.ticketMedio)}</p>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <Card className="p-4 rounded-2xl">
                  <p className="text-sm font-semibold">Pagamentos</p>
                  <Separator className="my-3" />
                  <div className="space-y-2">
                    {data!.pagamentos.map((p) => (
                      <div key={p.metodo} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{p.metodo}</span>
                          <span className="text-xs text-muted-foreground">{p.quantidade} vendas</span>
                        </div>
                        <span className="font-semibold">{brl(p.total)}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-4 rounded-2xl">
                  <p className="text-sm font-semibold">Top produtos</p>
                  <Separator className="my-3" />
                  <div className="space-y-2">
                    {data!.topProdutos.map((t) => (
                      <div key={t.productId} className="flex items-center justify-between text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{t.nome}</p>
                          <p className="text-xs text-muted-foreground">{t.quantidade} un.</p>
                        </div>
                        <span className="font-semibold">{brl(t.total)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <Card className="p-4 rounded-2xl">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Vendas recentes</p>
                  <Badge variant="secondary">{vendasData?.vendas?.length ?? 0}</Badge>
                </div>
                <Separator className="my-3" />

                <div className="space-y-3">
                  {(vendasData?.vendas || []).map((v) => (
                    <div key={v.id} className="rounded-xl border p-3">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">
                            {v.buyerName ? v.buyerName : "Sem nome"}{" "}
                            <span className="text-xs text-muted-foreground">• {v.code}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(v.createdAt).toLocaleString("pt-BR")} • {v.payment}
                          </p>
                        </div>
                        <div className="font-bold text-primary">{brlFromCents(v.totalCents)}</div>
                      </div>

                      <div className="mt-2 text-xs text-muted-foreground">
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
                    <div className="text-sm text-muted-foreground text-center py-8">
                      Nenhuma venda registrada ainda.
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
