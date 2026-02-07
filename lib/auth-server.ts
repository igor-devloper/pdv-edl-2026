// lib/auth-server.ts
import { auth, clerkClient } from "@clerk/nextjs/server"

export type Cargo = "ADMIN" | "CAIXA" | "ESTOQUISTA" | "SUPPORT"

export async function getCargoUsuario(): Promise<Cargo | null> {
  const { userId } = await auth()
  if (!userId) return null

  const user = await (await clerkClient()).users.getUser(userId)
  const role = (user.publicMetadata?.role as string | undefined) ?? null
  if (!role) return null
  return role.toUpperCase() as Cargo
}

export function podeVender(cargo: Cargo | null) {
  return cargo === "ADMIN" || cargo === "CAIXA"
}

export function podeGerenciarEstoque(cargo: Cargo | null) {
  return cargo === "ADMIN" || cargo === "ESTOQUISTA"
}

export function isAdmin(cargo: Cargo | null) {
  return cargo === "ADMIN"
}
