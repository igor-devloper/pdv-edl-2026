"use client"

import { useState } from "react"
import useSWR from "swr"
import { useUser } from "@clerk/nextjs"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Pencil, Trash2, AlertCircle } from "lucide-react"

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
  status: "PAID" | "CANCELED"
  itens: VendaItem[]
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function brlFromCents(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`
}

export default function MinhasVendasPage() {
  const { user } = useUser()
  const { data, mutate } = useSWR<{ vendas: Venda[] }>("/api/minhas-vendas", fetcher, {
    refreshInterval: 10000,
  })

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [vendaSel, setVendaSel] = useState<Venda | null>(null)

  const [buyerName, setBuyerName] = useState("")
  const [payment, setPayment] = useState<"PIX" | "CASH" | "CARD">("PIX")
  const [salvando, setSalvando] = useState(false)

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Carregando...</p>
      </div>
    )
  }

  function abrirEditar(v: Venda) {
    setVendaSel(v)
    setBuyerName(v.buyerName || "")
    setPayment(v.payment)
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
      const res = await fetch(`/api/minhas-vendas/${vendaSel.id}`, {
        method: "DELETE",
      })

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

  const vendas = data?.vendas || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50/30 via-white to-pink-50/30">
      <Header />

      <main className="mx-auto w-full max-w-7xl space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Minhas Vendas</h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Visualize e edite suas vendas registradas
          </p>
        </div>

        {!data ? (
          <div className="grid grid-cols-1 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-2xl sm:rounded-3xl bg-gradient-to-br from-red-100 to-pink-100"
              />
            ))}
          </div>
        ) : vendas.length === 0 ? (
          <Card className="rounded-2xl sm:rounded-3xl border-red-100 p-8 sm:p-12 text-center">
            <p className="text-gray-400 font-semibold">Você ainda não registrou vendas</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {vendas.map((v) => (
              <Card
                key={v.id}
                className={`rounded-2xl sm:rounded-3xl border-red-100 p-4 sm:p-5 shadow-md ${
                  v.status === "CANCELED" ? "opacity-50" : ""
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-900 text-sm sm:text-base">
                        {v.buyerName || "Cliente"}
                      </p>
                      <Badge
                        variant="secondary"
                        className="rounded-full text-xs bg-red-100 text-red-700"
                      >
                        {v.code}
                      </Badge>
                      {v.status === "CANCELED" && (
                        <Badge variant="destructive" className="rounded-full text-xs">
                          CANCELADA
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      {new Date(v.createdAt).toLocaleString("pt-BR")} • {v.payment}
                    </p>

                    <div className="mt-2 text-xs sm:text-sm text-gray-600">
                      {v.itens.slice(0, 3).map((it, idx) => (
                        <span key={idx}>
                          {it.qty}x {it.nome}
                          {idx < Math.min(v.itens.length, 3) - 1 ? " • " : ""}
                        </span>
                      ))}
                      {v.itens.length > 3 && <span> • +{v.itens.length - 3} itens</span>}
                    </div>

                    <p className="mt-2 text-lg sm:text-xl font-bold text-red-600">
                      {brlFromCents(v.totalCents)}
                    </p>
                  </div>

                  {v.status === "PAID" && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full border-red-200 hover:bg-red-50 text-xs sm:text-sm"
                        onClick={() => abrirEditar(v)}
                      >
                        <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full border-red-200 text-red-600 hover:bg-red-50 text-xs sm:text-sm"
                        onClick={() => abrirExcluir(v)}
                      >
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Dialog Editar */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-2xl sm:rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Venda {vendaSel?.code}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4">
            <div>
              <Label className="text-xs sm:text-sm">Nome do Cliente</Label>
              <Input
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Nome (opcional)"
                className="rounded-full mt-1.5"
              />
            </div>

            <div>
              <Label className="text-xs sm:text-sm">Forma de Pagamento</Label>
              <Select value={payment} onValueChange={(v) => setPayment(v as any)}>
                <SelectTrigger className="rounded-full mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="CASH">Dinheiro</SelectItem>
                  <SelectItem value="CARD">Cartão</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  Você pode editar apenas o nome do cliente e forma de pagamento. Para alterar
                  itens, cancele e crie nova venda.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setEditOpen(false)}
            >
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

      {/* Dialog Excluir */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-2xl sm:rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar Venda?</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Tem certeza que quer cancelar a venda <b>{vendaSel?.code}</b>?
            </p>

            <div className="rounded-2xl bg-red-50 border border-red-200 p-3">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-red-800 space-y-1">
                  <p className="font-semibold">Esta ação vai:</p>
                  <ul className="list-disc list-inside space-y-0.5 ml-2">
                    <li>Marcar a venda como CANCELADA</li>
                    <li>Devolver os produtos ao estoque</li>
                    <li>Não pode ser desfeita</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setDeleteOpen(false)}
            >
              Não, voltar
            </Button>
            <Button
              variant="destructive"
              className="rounded-full"
              onClick={excluirVenda}
              disabled={salvando}
            >
              {salvando ? "Cancelando..." : "Sim, cancelar venda"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}