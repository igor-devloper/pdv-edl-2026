"use client"

import * as React from "react"
import { useUser } from "@clerk/nextjs"
import { getCargoFromUser, isIgorCargo } from "@/lib/cargo-client"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Crown } from "lucide-react"

export function IgorGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser()

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-3xl border-yellow-100 bg-gradient-to-br from-yellow-50 to-amber-50 p-8 shadow-lg">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-500">
            <Crown className="h-7 w-7 text-white" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-gray-900">Acesso Supremo</h3>
          <p className="mb-6 text-sm text-gray-600">
            Você precisa estar logado para acessar o Painel Supremo.
          </p>
          <Button asChild className="w-full rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600">
            <Link href="/login">Fazer login</Link>
          </Button>
        </Card>
      </div>
    )
  }

  const cargo = getCargoFromUser(user)

  if (!isIgorCargo(cargo)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-3xl border-yellow-100 bg-gradient-to-br from-yellow-50 to-amber-50 p-8 shadow-lg">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-500">
            <Crown className="h-7 w-7 text-white" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-gray-900">Área Suprema 👑</h3>
          <p className="text-sm text-gray-600">
            Esta área é exclusiva do cargo <b>IGOR</b>. Seu cargo atual é{" "}
            <b>{cargo || "nenhum"}</b>.
          </p>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}