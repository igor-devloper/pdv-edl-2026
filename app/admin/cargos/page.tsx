"use client"

import * as React from "react"
import useSWR from "swr"
import { Header } from "@/components/header"
import { AdminGuard } from "@/components/admin-guard"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Crown } from "lucide-react"

type Cargo = "ADMIN" | "CAIXA" | "ESTOQUISTA" | "SUPPORT" | "IGOR"

type UsuarioRow = {
  id: string
  nome: string
  email: string | null
  role: string | null
  ativo: boolean
  createdAt: number
}

type Resp = { users: UsuarioRow[] }

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const CARGO_LABELS: Record<Cargo, { label: string; desc: string; color: string }> = {
  ADMIN:      { label: "ADMIN",      desc: "Acesso completo ao painel admin",    color: "text-red-700 bg-red-50" },
  CAIXA:      { label: "CAIXA",      desc: "Pode vender no PDV",                color: "text-blue-700 bg-blue-50" },
  ESTOQUISTA: { label: "ESTOQUISTA", desc: "Gerencia estoque",                   color: "text-green-700 bg-green-50" },
  SUPPORT:    { label: "SUPPORT",    desc: "Suporte / visualização",             color: "text-gray-700 bg-gray-50" },
  IGOR:       { label: "IGOR 👑",    desc: "Cargo supremo — acesso total",       color: "text-yellow-700 bg-yellow-50" },
}

export default function AdminCargosPage() {
  const { data, mutate } = useSWR<Resp>("/api/admin/usuarios", fetcher)
  const [salvando, setSalvando] = React.useState<string | null>(null)
  const [draftRoles, setDraftRoles] = React.useState<Record<string, Cargo>>({})
  const [busca, setBusca] = React.useState("")

  React.useEffect(() => {
    if (!data?.users) return
    const next: Record<string, Cargo> = {}
    for (const u of data.users) {
      next[u.id] = (u.role || "CAIXA").toUpperCase() as Cargo
    }
    setDraftRoles(next)
  }, [data?.users])

  async function salvarCargo(userId: string) {
    const role = draftRoles[userId]
    if (!role) return

    setSalvando(userId)
    try {
      const res = await fetch(`/api/admin/usuarios/${userId}/cargo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })

      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || "Erro ao atualizar cargo")
      }

      toast.success("Cargo atualizado!")
      await mutate()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar cargo")
    } finally {
      setSalvando(null)
    }
  }

  const usuarios = (data?.users || []).filter((u) => {
    const q = busca.trim().toLowerCase()
    if (!q) return true
    return (
      u.nome.toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      String(u.role || "").toLowerCase().includes(q)
    )
  })

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-br from-red-50/30 via-white to-pink-50/30">
        <Header />

        <main className="mx-auto w-full max-w-7xl space-y-4 p-4 lg:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Cargos</h1>
              <p className="text-sm text-gray-600">Gerencia permissões por usuário</p>
            </div>

            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar..."
              className="rounded-full border-red-100 sm:max-w-xs"
            />
          </div>

          {/* Legenda de cargos */}
          {/* <Card className="rounded-2xl border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Legenda de cargos</p>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(CARGO_LABELS) as [Cargo, typeof CARGO_LABELS[Cargo]][]).map(([cargo, info]) => (
                <span key={cargo} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${info.color}`}>
                  {cargo === "IGOR" && <Crown className="h-3 w-3" />}
                  {info.label}
                  <span className="font-normal opacity-70">— {info.desc}</span>
                </span>
              ))}
            </div>
          </Card> */}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {usuarios.map((u) => {
              const current = (u.role || "CAIXA").toUpperCase() as Cargo
              const draft = draftRoles[u.id] ?? current
              const mudou = draft !== current
              const isIgorCargo = draft === "IGOR"

              return (
                <Card
                  key={u.id}
                  className={`rounded-3xl p-4 shadow-md transition-all ${
                    isIgorCargo
                      ? "border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50/50"
                      : "border-red-100"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-bold text-gray-900">{u.nome}</p>
                        {current === "IGOR" && <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />}
                      </div>
                      <p className="truncate text-xs text-gray-500">{u.email ?? "-"}</p>
                      <p className="mt-1 text-xs text-gray-600">
                        Atual: <b>{current}</b>
                      </p>
                    </div>

                    <div className="w-44 shrink-0">
                      <Select
                        value={draft}
                        onValueChange={(v) =>
                          setDraftRoles((prev) => ({ ...prev, [u.id]: v as Cargo }))
                        }
                      >
                        <SelectTrigger className={`rounded-full ${isIgorCargo ? "border-yellow-300 bg-white" : ""}`}>
                          <SelectValue placeholder="Cargo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">ADMIN</SelectItem>
                          <SelectItem value="CAIXA">CAIXA</SelectItem>
                          <SelectItem value="ESTOQUISTA">ESTOQUISTA</SelectItem>
                          <SelectItem value="SUPPORT">SUPPORT</SelectItem>
                          <SelectItem value="IGOR">
                            <span className="flex items-center gap-1.5">
                              <Crown className="h-3.5 w-3.5 text-yellow-500" />
                              IGOR 👑
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        className={`mt-2 w-full rounded-full ${
                          isIgorCargo && mudou
                            ? "bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600"
                            : "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600"
                        }`}
                        disabled={!mudou || salvando === u.id}
                        onClick={() => salvarCargo(u.id)}
                      >
                        {salvando === u.id ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}

            {!usuarios.length && (
              <Card className="rounded-3xl p-8 text-center text-gray-400">
                Nenhum usuário encontrado
              </Card>
            )}
          </div>
        </main>
      </div>
    </AdminGuard>
  )
}
