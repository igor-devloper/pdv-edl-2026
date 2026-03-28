// lib/cargo-client.ts
import type { UserResource } from "@clerk/types"

export type Cargo = "ADMIN" | "CAIXA" | "ESTOQUISTA" | "SUPPORT" | "IGOR" | ""

export function getCargoFromUser(user: UserResource | null | undefined): Cargo {
  const raw = (user?.publicMetadata as { role?: unknown } | undefined)?.role
  const role = typeof raw === "string" ? raw.trim().toUpperCase() : ""
  if (
    role === "ADMIN" ||
    role === "CAIXA" ||
    role === "ESTOQUISTA" ||
    role === "SUPPORT" ||
    role === "IGOR"
  )
    return role
  return ""
}

export function isAdminCargo(cargo: Cargo) {
  return cargo === "ADMIN" || cargo === "IGOR"
}

export function isIgorCargo(cargo: Cargo) {
  return cargo === "IGOR"
}
