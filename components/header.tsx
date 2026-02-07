"use client"

import { cn } from "@/lib/utils"
import { UserButton, useUser } from "@clerk/nextjs"
import { ShoppingBag, LayoutDashboard, Package, Users, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { getCargoFromUser, isAdminCargo } from "@/lib/cargo-client"

export function Header() {
  const { user, isLoaded } = useUser()
  const pathname = usePathname()

  const cargo = getCargoFromUser(user)
  const isAdmin = isAdminCargo(cargo)
  const semCargo = isLoaded && !!user && cargo === ""

  return (
    <header className="sticky top-0 z-50 border-b bg-card">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <ShoppingBag className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight text-foreground">PDV EDL</h1>
            <p className="text-xs text-muted-foreground leading-none">EDL Minas • Lojinha</p>
          </div>
        </div>

        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Vendas</span>
          </Link>

          {isAdmin && (
            <>
              <Link
                href="/admin"
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  pathname === "/admin"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>

              <Link
                href="/admin/estoque"
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  pathname.startsWith("/admin/estoque")
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Estoque</span>
              </Link>

              <Link
                href="/admin/cargos"
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  pathname.startsWith("/admin/cargos")
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Cargos</span>
              </Link>
            </>
          )}

          <div className="ml-2 border-l pl-3">
            <UserButton
              afterSignOutUrl="/sign-in"
              appearance={{ elements: { avatarBox: "h-8 w-8" } }}
            />
          </div>
        </nav>
      </div>

      {semCargo && (
        <div className="border-t bg-amber-50/60 dark:bg-amber-900/20">
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 text-sm text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            <span>
              Você ainda <b>não tem cargo</b>. Peça ao administrador para liberar seu acesso.
            </span>
          </div>
        </div>
      )}
    </header>
  )
}
