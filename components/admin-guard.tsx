"use client"

import * as React from "react"
import { useUser } from "@clerk/nextjs"
import { getCargoFromUser, isAdminCargo } from "@/lib/cargo-client"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser()

  if (!isLoaded) return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>

  if (!user) {
    return (
      <div className="p-6">
        <Card className="p-6 rounded-2xl">
          <p className="font-semibold">Você precisa entrar.</p>
          <p className="text-sm text-muted-foreground mt-1">Faça login para acessar.</p>
          <div className="mt-4">
            <Button asChild className="rounded-xl">
              <Link href="/sign-in">Ir para login</Link>
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const cargo = getCargoFromUser(user)

  if (cargo === "") {
    return (
      <div className="p-6">
        <Card className="p-6 rounded-2xl">
          <p className="font-semibold">Acesso não liberado</p>
          <p className="text-sm text-muted-foreground mt-1">
            Você ainda não tem cargo no sistema. Peça ao administrador para atribuir um cargo.
          </p>
        </Card>
      </div>
    )
  }

  if (!isAdminCargo(cargo)) {
    return (
      <div className="p-6">
        <Card className="p-6 rounded-2xl">
          <p className="font-semibold">Sem permissão</p>
          <p className="text-sm text-muted-foreground mt-1">
            Seu cargo atual é <b>{cargo}</b>. Apenas <b>ADMIN</b> pode acessar esta área.
          </p>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
