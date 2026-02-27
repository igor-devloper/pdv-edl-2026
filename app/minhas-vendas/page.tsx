"use client"

import { useState } from "react"
import useSWR from "swr"
import { AuthGuard } from "@/components/admin-guard"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Pencil, Trash2, AlertCircle, Building2, QrCode, Banknote, CreditCard } from "lucide-react"

// ─── Tipos ────────────────────────────────────────────────────────────────────
type VendaItem = {
  id: number
  nome: string
  qty: number
  unitCents: number
  totalCents: number
}

type Venda = {
  id: number
  code: string
  createdAt: string
  updatedAt: string
  payment: "PIX" | "CASH" | "CARD"
  totalCents: number
  buyerName: string | null
  nucleo: string | null
  status: "PAID" | "CANCELED"
  itens: VendaItem[]
}

// ─── Núcleos (mesma lista do cart-panel) ─────────────────────────────────────
const NUCLEOS = [
  "Núcleo da Mata",
  "Outro / Externo",
] as const

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fetcher = (url: string) => fetch(url).then((r) => r.json())

function brlFromCents(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`
}

function paymentLabel(p: "PIX" | "CASH" | "CARD") {
  if (p === "PIX")  return { label: "PIX",      icon: QrCode,    color: "bg-violet-100 text-violet-700" }
  if (p === "CASH") return { label: "Dinheiro", icon: Banknote,  color: "bg-emerald-100 text-emerald-700" }
  return                   { label: "Cartão",   icon: CreditCard, color: "bg-blue-100 text-blue-700" }
}

// ─── Componente ───────────────────────────────────────────────────────────────
function MinhasVendasContent() {
  const { data, mutate } = useSWR<{ vendas: Venda[] }>("/api/minhas-vendas", fetcher, {
    refreshInterval: 15000,
  })

  const [editOpen,   setEditOpen]   = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [vendaSel,   setVendaSel]   = useState<Venda | null>(null)
  const [salvando,   setSalvando]   = useState(false)

  // Campos do form de edição
  const [buyerName, setBuyerName] = useState("")
  const [payment,   setPayment]   = useState<"PIX" | "CASH" | "CARD">("PIX")
  const [nucleo,    setNucleo]    = useState("")

  function abrirEditar(v: Venda) {
    setVendaSel(v)
    setBuyerName(v.buyerName ?? "")
    setPayment(v.payment)
    setNucleo(v.nucleo ?? "nao_informado")
    setEditOpen(true)
  }

  function abrirExcluir(v: Venda) {
    setVendaSel(v)
    setDeleteOpen(true)
  }

  async function salvarEdicao() {
    if (!vendaSel) return
    setSalvando(true)
    try {
      const res = await fetch(`/api/minhas-vendas/${vendaSel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerName: buyerName.trim() || null,
          payment,
          nucleo: nucleo && nucleo !== "nao_informado" ? nucleo : null,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || "Erro ao atualizar venda")
      toast.success("Venda atualizada!")
      setEditOpen(false)
      await mutate()
    } catch (e: any) {
      toast.error(e?.message || "Erro ao atualizar venda")
    } finally {
      setSalvando(false)
    }
  }

  async function excluirVenda() {
    if (!vendaSel) return
    setSalvando(true)
    try {
      const res = await fetch(`/api/minhas-vendas/${vendaSel.id}`, { method: "DELETE" })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || "Erro ao cancelar venda")
      toast.success("Venda cancelada e estoque devolvido!")
      setDeleteOpen(false)
      await mutate()
    } catch (e: any) {
      toast.error(e?.message || "Erro ao cancelar venda")
    } finally {
      setSalvando(false)
    }
  }

  const vendas = data?.vendas ?? []

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50/30 via-white to-pink-50/30">
      <Header />

      <main className="mx-auto w-full max-w-4xl space-y-4 sm:space-y-5 p-3 sm:p-4 lg:p-6">
        {/* Título */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Minhas Vendas</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Visualize e gerencie as vendas que você registrou
          </p>
        </div>

        {/* Skeleton */}
        {!data ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-3xl bg-gradient-to-br from-red-100 to-pink-100" />
            ))}
          </div>

        /* Vazio */
        ) : vendas.length === 0 ? (
          <Card className="rounded-3xl border-red-100 p-12 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
              <Banknote className="h-7 w-7 text-red-300" />
            </div>
            <p className="font-semibold text-gray-400">Você ainda não registrou vendas</p>
            <p className="text-xs text-gray-300 mt-1">As vendas que você fizer vão aparecer aqui</p>
          </Card>

        /* Lista */
        ) : (
          <div className="space-y-3">
            {vendas.map((v) => {
              const pm = paymentLabel(v.payment)
              const PmIcon = pm.icon
              return (
                <Card
                  key={v.id}
                  className={`rounded-3xl border-red-100 p-4 sm:p-5 shadow-md transition-opacity ${
                    v.status === "CANCELED" ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      {/* Linha 1 — nome + code + status */}
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-gray-900 text-sm sm:text-base">
                          {v.buyerName || "Cliente"}
                        </p>
                        <Badge className="rounded-full bg-red-100 text-red-700 hover:bg-red-100 text-xs font-mono">
                          {v.code}
                        </Badge>
                        {v.status === "CANCELED" && (
                          <Badge variant="destructive" className="rounded-full text-xs">CANCELADA</Badge>
                        )}
                      </div>

                      {/* Linha 2 — data + pagamento + nucleo */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {new Date(v.createdAt).toLocaleString("pt-BR")}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${pm.color}`}>
                          <PmIcon className="h-3 w-3" />
                          {pm.label}
                        </span>
                        {v.nucleo && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                            <Building2 className="h-3 w-3" />
                            {v.nucleo}
                          </span>
                        )}
                      </div>

                      {/* Linha 3 — itens */}
                      <p className="text-xs text-gray-500 leading-relaxed">
                        {v.itens.slice(0, 3).map((it, idx) => (
                          <span key={idx}>
                            {it.qty}x {it.nome}
                            {idx < Math.min(v.itens.length, 3) - 1 ? " · " : ""}
                          </span>
                        ))}
                        {v.itens.length > 3 && (
                          <span className="text-gray-400"> +{v.itens.length - 3} itens</span>
                        )}
                      </p>

                      {/* Linha 4 — total */}
                      <p className="text-lg sm:text-xl font-black text-red-600 tabular-nums">
                        {brlFromCents(v.totalCents)}
                      </p>
                    </div>

                    {/* Ações */}
                    {v.status === "PAID" && (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full border-red-200 hover:bg-red-50 text-xs sm:text-sm"
                          onClick={() => abrirEditar(v)}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1.5" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full border-red-200 text-red-600 hover:bg-red-50 text-xs sm:text-sm"
                          onClick={() => abrirExcluir(v)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      {/* ── Dialog Editar ─────────────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Venda {vendaSel?.code}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Nome */}
            <div>
              <Label className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Nome do Cliente
              </Label>
              <Input
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Nome (opcional)"
                className="rounded-full mt-1.5 border-red-100 focus-visible:ring-red-500"
              />
            </div>

            {/* Pagamento */}
            <div>
              <Label className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Forma de Pagamento
              </Label>
              <Select value={payment} onValueChange={(v) => setPayment(v as "PIX" | "CASH" | "CARD")}>
                <SelectTrigger className="rounded-full mt-1.5 border-red-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="CASH">Dinheiro</SelectItem>
                  <SelectItem value="CARD">Cartão</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Núcleo */}
            <div>
              <Label className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Núcleo / Área
              </Label>
              <div className="relative mt-1.5">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" />
                <Select value={nucleo} onValueChange={setNucleo}>
                  <SelectTrigger className="rounded-full border-red-100 pl-9 w-full">
                    <SelectValue placeholder="Selecionar núcleo" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="nao_informado" className="italic text-gray-400">
                      Não informado
                    </SelectItem>
                    {NUCLEOS.map((n) => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Aviso */}
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  Para alterar os itens da venda, cancele e crie uma nova.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600"
              onClick={salvarEdicao}
              disabled={salvando}
            >
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Cancelar ───────────────────────────────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar Venda?</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <p className="text-sm text-gray-600">
              Tem certeza que quer cancelar a venda <b className="font-mono">{vendaSel?.code}</b>?
            </p>
            <div className="rounded-2xl bg-red-50 border border-red-200 p-3">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs text-red-800 space-y-1">
                  <p className="font-bold">Esta ação vai:</p>
                  <p>• Marcar a venda como CANCELADA</p>
                  <p>• Devolver os produtos ao estoque</p>
                  <p>• Não pode ser desfeita</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setDeleteOpen(false)}>
              Não, voltar
            </Button>
            <Button variant="destructive" className="rounded-full" onClick={excluirVenda} disabled={salvando}>
              {salvando ? "Cancelando..." : "Sim, cancelar venda"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Export com guard ─────────────────────────────────────────────────────────
export default function MinhasVendasPage() {
  return (
    <AuthGuard>
      <MinhasVendasContent />
    </AuthGuard>
  )
}