"use client"

import { cn } from "@/lib/utils"
import { UserButton, useUser } from "@clerk/nextjs"
import { ShoppingBag, LayoutDashboard, Package, Users, AlertTriangle, Menu } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { getCargoFromUser, isAdminCargo } from "@/lib/cargo-client"
import { useState } from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

export function Header() {
  const { user, isLoaded } = useUser()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const cargo = getCargoFromUser(user)
  const isAdmin = isAdminCargo(cargo)
  const semCargo = isLoaded && !!user && cargo === ""

  const NavLinks = () => (
    <>
      <Link
        href="/"
        onClick={() => setOpen(false)}
        className={cn(
          "flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-all",
          pathname === "/"
            ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-md"
            : "text-gray-600 hover:bg-red-50 hover:text-red-600"
        )}
      >
        <ShoppingBag className="h-4 w-4" />
        <span>Vendas</span>
      </Link>

      {isAdmin && (
        <>
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-all",
              pathname === "/admin"
                ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-md"
                : "text-gray-600 hover:bg-red-50 hover:text-red-600"
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>

          <Link
            href="/admin/estoque"
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-all",
              pathname.startsWith("/admin/estoque")
                ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-md"
                : "text-gray-600 hover:bg-red-50 hover:text-red-600"
            )}
          >
            <Package className="h-4 w-4" />
            <span>Estoque</span>
          </Link>

          <Link
            href="/admin/cargos"
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-all",
              pathname.startsWith("/admin/cargos")
                ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-md"
                : "text-gray-600 hover:bg-red-50 hover:text-red-600"
            )}
          >
            <Users className="h-4 w-4" />
            <span>Cargos</span>
          </Link>
        </>
      )}
    </>
  )

  return (
    <header className="sticky top-0 z-50 border-b border-red-100 bg-white/95 backdrop-blur-lg">
      <div className="mx-auto flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 max-w-7xl">
        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-500 shadow-md">
            <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm sm:text-lg font-bold leading-tight text-gray-900">PDV EDL</h1>
            <p className="text-[10px] sm:text-xs font-medium leading-none text-gray-500">EDL Minas</p>
          </div>
        </div>

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
              Você ainda <b>não tem cargo</b>. Chama um admin!
            </span>
          </div>
        </div>
      )}
    </header>
  )
}