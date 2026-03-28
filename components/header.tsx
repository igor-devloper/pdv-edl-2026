"use client"

import { cn } from "@/lib/utils"
import { UserButton, useUser } from "@clerk/nextjs"
import {
  ShoppingBag, LayoutDashboard, Package, Users, AlertTriangle,
  Menu, Receipt, PieChart, Gift, Crown,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { getCargoFromUser, isAdminCargo, isIgorCargo } from "@/lib/cargo-client"
import { useState } from "react"
import Image from "next/image"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

export function Header() {
  const { user, isLoaded } = useUser()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const cargo    = getCargoFromUser(user)
  const isAdmin  = isAdminCargo(cargo)
  const isIgor   = isIgorCargo(cargo)
  const semCargo = isLoaded && !!user && cargo === ""
  const logado   = isLoaded && !!user

  // Helper para o estilo dos links
  const linkClass = (active: boolean, igor = false) =>
    cn(
      "flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-all",
      active
        ? igor
          ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-md shadow-yellow-200"
          : "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-md"
        : igor
          ? "text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700"
          : "text-gray-600 hover:bg-red-50 hover:text-red-600"
    )

  const NavLinks = () => (
    <>
      {/* PDV — visível para todos */}
      <Link href="/" onClick={() => setOpen(false)} className={linkClass(pathname === "/")}>
        <ShoppingBag className="h-4 w-4" />
        <span>Vendas</span>
      </Link>

      {/* Minhas Vendas — qualquer logado */}
      {logado && (
        <Link href="/minhas-vendas" onClick={() => setOpen(false)} className={linkClass(pathname === "/minhas-vendas")}>
          <Receipt className="h-4 w-4" />
          <span>Minhas Vendas</span>
        </Link>
      )}

      {/* ADMIN normal — Dashboard, Estoque, Combos, Cargos, Núcleos */}
      {isAdmin && !isIgor && (
        <>
          <Link href="/admin" onClick={() => setOpen(false)} className={linkClass(pathname === "/admin")}>
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>

          <Link href="/admin/estoque" onClick={() => setOpen(false)} className={linkClass(pathname.startsWith("/admin/estoque"))}>
            <Package className="h-4 w-4" />
            <span>Estoque</span>
          </Link>

          <Link href="/admin/combos" onClick={() => setOpen(false)} className={linkClass(pathname.startsWith("/admin/combos"))}>
            <Gift className="h-4 w-4" />
            <span>Combos</span>
          </Link>

          <Link href="/admin/cargos" onClick={() => setOpen(false)} className={linkClass(pathname.startsWith("/admin/cargos"))}>
            <Users className="h-4 w-4" />
            <span>Cargos</span>
          </Link>

          <Link href="/admin/nucleos" onClick={() => setOpen(false)} className={linkClass(pathname.startsWith("/admin/nucleos"))}>
            <PieChart className="h-4 w-4" />
            <span>Núcleos</span>
          </Link>
        </>
      )}

      {/* IGOR — Estoque, Cargos e Painel Supremo */}
      {isIgor && (
        <>
          <Link href="/admin/estoque" onClick={() => setOpen(false)} className={linkClass(pathname.startsWith("/admin/estoque"))}>
            <Package className="h-4 w-4" />
            <span>Estoque</span>
          </Link>

          <Link href="/admin/cargos" onClick={() => setOpen(false)} className={linkClass(pathname.startsWith("/admin/cargos"))}>
            <Users className="h-4 w-4" />
            <span>Cargos</span>
          </Link>

          <Link href="/igor" onClick={() => setOpen(false)} className={linkClass(pathname.startsWith("/igor"), true)}>
            <Crown className="h-4 w-4" />
            <span>Supremo</span>
          </Link>
        </>
      )}
    </>
  )

  return (
    <header className="sticky top-0 z-50 border-b border-red-100 bg-white/95 backdrop-blur-lg">
      <div className="mx-auto flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 max-w-7xl">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="EDL Minas"
            width={140}
            height={50}
            className="h-9 sm:h-11 w-auto object-contain"
            style={{ filter: "invert(1)" }}
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-2">
          <NavLinks />
          <div className="ml-2 border-l border-red-100 pl-3">
            <UserButton
              afterSignOutUrl="/login"
              appearance={{ elements: { avatarBox: "h-8 w-8 sm:h-9 sm:w-9 rounded-full shadow-md" } }}
            />
          </div>
        </nav>

        {/* Mobile Nav */}
        <div className="flex md:hidden items-center gap-2">
          <UserButton
            afterSignOutUrl="/login"
            appearance={{ elements: { avatarBox: "h-8 w-8 rounded-full shadow-md" } }}
          />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 p-4">
              <div className="flex flex-col gap-2 mt-8">
                <NavLinks />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Alerta sem cargo */}
      {semCargo && (
        <div className="border-t border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm text-amber-900">
            <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span>
              Você ainda <b>não tem cargo</b>. Chama um admin pra tu ficar fortão 💪!
            </span>
          </div>
        </div>
      )}
    </header>
  )
}