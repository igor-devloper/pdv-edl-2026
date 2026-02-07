"use client"

import * as React from "react"
import { useUser } from "@clerk/nextjs"
import { getCargoFromUser, isAdminCargo } from "@/lib/cargo-client"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ShieldAlert } from "lucide-react"

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser()

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-3xl border-red-100 bg-linear-to-br from-red-50 to-pink-50 p-8 shadow-lg">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-red-600 to-red-500">
            <ShieldAlert className="h-7 w-7 text-white" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-gray-900">Acesso restrito</h3>
          <p className="mb-6 text-sm text-gray-600">
            Você precisa estar logado pra acessar essa área
          </p>
          <Button asChild className="w-full rounded-full bg-linear-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600">
            <Link href="/login">Fazer login</Link>
          </Button>
        </Card>
      </div>
    )
  }

  const cargo = getCargoFromUser(user)

  if (cargo === "") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-3xl border-amber-100 bg-linear-to-br from-amber-50 to-orange-50 p-8 shadow-lg">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-amber-500 to-orange-500">
            <ShieldAlert className="h-7 w-7 text-white" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-gray-900">Acesso pendente</h3>
          <p className="text-sm text-gray-600">
            Seu acesso ainda não foi liberado. Chama algum admin pra te dar permissão!
          </p>
        </Card>
      </div>
    )
  }

  if (!isAdminCargo(cargo)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-3xl border-red-100 bg-linear-to-br from-red-50 to-pink-50 p-8 shadow-lg">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-red-600 to-red-500">
            <ShieldAlert className="h-7 w-7 text-white" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-gray-900">Sem permissão</h3>
          <p className="text-sm text-gray-600">
            Seu cargo é <b>{cargo}</b>. Só <b>ADMIN</b> pode acessar essa área.
          </p>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}