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

type Cargo = "ADMIN" | "CAIXA" | "ESTOQUISTA" | "SUPPORT"

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

export default function AdminCargosPage() {
  const { data, mutate } = useSWR<Resp>("/api/admin/usuarios", fetcher)
  const [salvando, setSalvando] = React.useState<string | null>(null)
  const [draftRoles, setDraftRoles] = React.useState<Record<string, Cargo>>({})
  const [busca, setBusca] = React.useState("")

  React.useEffect(() => {
    if (!data?.users) return
    const next: Record<string, Cargo> = {}
    for (const u of data.users) {
      next[u.id] = ((u.role || "CAIXA").toUpperCase() as Cargo)
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
    } catch (e: any) {
      toast.error(e?.message || "Erro ao atualizar cargo")
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
      <div className="min-h-screen bg-background">
        <Header />

        <main className="mx-auto w-full max-w-7xl p-4 lg:p-6 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold">Cargos</h1>
              <p className="text-sm text-muted-foreground">Gerencie permissões por usuário</p>
            </div>

            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, email, cargo..."
              className="sm:max-w-xs rounded-xl"
            />
          </div>

          {/* ✅ Mobile: cards | Desktop: grid */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {usuarios.map((u) => {
              const current = ((u.role || "CAIXA").toUpperCase() as Cargo)
              const draft = draftRoles[u.id] ?? current
              const mudou = draft !== current

              return (
                <Card key={u.id} className="p-4 rounded-2xl">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{u.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email ?? "-"}</p>
                      <p className="text-xs text-muted-foreground mt-1">
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
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">ADMIN</SelectItem>
                          <SelectItem value="CAIXA">CAIXA</SelectItem>
                          <SelectItem value="ESTOQUISTA">ESTOQUISTA</SelectItem>
                          <SelectItem value="SUPPORT">SUPPORT</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        className="w-full mt-2 rounded-xl"
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
              <Card className="p-8 rounded-2xl text-center text-muted-foreground">
                Nenhum usuário encontrado.
              </Card>
            )}
          </div>
        </main>
      </div>
    </AdminGuard>
  )
}
