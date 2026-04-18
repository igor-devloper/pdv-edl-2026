"use client"

// components/igor/ExportVendasButton.tsx
// Uso: <ExportVendasButton filters={applied} />
// Depende de: SheetJS (xlsx) — adicione ao projeto:  npm install xlsx

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, Loader2 } from "lucide-react"
import { toast } from "sonner"
import * as XLSX from "xlsx"

type Filters = {
  search?: string
  status?: "" | "PAID" | "CANCELED"
  payment?: "" | "PIX" | "CASH" | "CARD"
  sellerUserId?: string
  nucleo?: string
  minCents?: string
  maxCents?: string
  dateFrom?: string
  dateTo?: string
}

interface ExportRow {
  "Código": string
  "Data": string
  "Status": string
  "Método Pagamento": string
  "Vendedor": string
  "Comprador": string
  "Núcleo": string
  "Item": string
  "Tipo": string
  "Qtd": number
  "Preço Unit. (R$)": number
  "Total Item (R$)": number
  "Desconto Venda (R$)": number
  "Total Venda (R$)": number
}

interface Props {
  filters?: Filters
  className?: string
}

export function ExportVendasButton({ filters = {}, className }: Props) {
  const [loading, setLoading] = useState(false)

  async function exportar() {
    setLoading(true)
    try {
      // Monta query com os mesmos filtros da aba de vendas
      const p = new URLSearchParams()
      if (filters.search)       p.set("search",       filters.search)
      if (filters.status)       p.set("status",       filters.status)
      if (filters.payment)      p.set("payment",      filters.payment)
      if (filters.sellerUserId) p.set("sellerUserId", filters.sellerUserId)
      if (filters.nucleo)       p.set("nucleo",       filters.nucleo)
      if (filters.minCents)     p.set("minCents",     String(Number(filters.minCents) * 100))
      if (filters.maxCents)     p.set("maxCents",     String(Number(filters.maxCents) * 100))
      if (filters.dateFrom)     p.set("dateFrom",     new Date(filters.dateFrom + "T00:00:00").toISOString())
      if (filters.dateTo)       p.set("dateTo",       new Date(filters.dateTo   + "T23:59:59").toISOString())

      const res = await fetch(`/api/igor/vendas/export?${p.toString()}`)
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Erro ao exportar")
      const { rows, total } = await res.json() as { rows: ExportRow[]; total: number }

      if (!rows.length) {
        toast.warning("Nenhuma venda encontrada para exportar")
        return
      }

      // ── Cria a planilha ────────────────────────────────────────────────────
      const wb = XLSX.utils.book_new()

      // ── Aba 1: Detalhe de vendas ──────────────────────────────────────────
      const ws = XLSX.utils.json_to_sheet(rows, {
        header: [
          "Código", "Data", "Status", "Método Pagamento",
          "Vendedor", "Comprador", "Núcleo",
          "Item", "Tipo", "Qtd",
          "Preço Unit. (R$)", "Total Item (R$)",
          "Desconto Venda (R$)", "Total Venda (R$)",
        ],
      })

      // Larguras das colunas
      ws["!cols"] = [
        { wch: 14 }, // Código
        { wch: 17 }, // Data
        { wch: 12 }, // Status
        { wch: 18 }, // Método
        { wch: 22 }, // Vendedor
        { wch: 22 }, // Comprador
        { wch: 22 }, // Núcleo
        { wch: 35 }, // Item
        { wch: 20 }, // Tipo
        { wch:  6 }, // Qtd
        { wch: 16 }, // Preço Unit
        { wch: 16 }, // Total Item
        { wch: 20 }, // Desconto
        { wch: 16 }, // Total Venda
      ]

      // Formata células de moeda (colunas K, L, M, N = índices 10-13)
      const currencyCols = [10, 11, 12, 13] // 0-indexed
      const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1")
      for (let R = range.s.r + 1; R <= range.e.r; R++) {
        currencyCols.forEach((C) => {
          const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })]
          if (cell) cell.z = '"R$" #,##0.00'
        })
      }

      XLSX.utils.book_append_sheet(wb, ws, "Vendas Detalhadas")

      // ── Aba 2: Resumo por vendedor ────────────────────────────────────────
      const vendedorMap: Record<string, { vendas: Set<string>; total: number }> = {}
      rows.forEach((r) => {
        if (!vendedorMap[r["Vendedor"]]) vendedorMap[r["Vendedor"]] = { vendas: new Set(), total: 0 }
        vendedorMap[r["Vendedor"]].vendas.add(r["Código"])
        // Soma total da venda apenas uma vez por código
      })
      // Recalcula totais únicos por venda
      const vendaUnica: Record<string, { vendedor: string; total: number }> = {}
      rows.forEach((r) => {
        if (!vendaUnica[r["Código"]]) vendaUnica[r["Código"]] = { vendedor: r["Vendedor"], total: r["Total Venda (R$)"] }
      })
      Object.values(vendaUnica).forEach(({ vendedor, total }) => {
        if (vendedorMap[vendedor]) vendedorMap[vendedor].total += total
      })

      const resumoVendedor = Object.entries(vendedorMap).map(([nome, { vendas, total }]) => ({
        "Vendedor":       nome,
        "Nº de Vendas":   vendas.size,
        "Total (R$)":     total,
        "Ticket Médio (R$)": vendas.size > 0 ? total / vendas.size : 0,
      })).sort((a, b) => b["Total (R$)"] - a["Total (R$)"])

      const wsVendedor = XLSX.utils.json_to_sheet(resumoVendedor)
      wsVendedor["!cols"] = [{ wch: 25 }, { wch: 14 }, { wch: 14 }, { wch: 18 }]
      const rvRange = XLSX.utils.decode_range(wsVendedor["!ref"] ?? "A1")
      for (let R = rvRange.s.r + 1; R <= rvRange.e.r; R++) {
        ;[2, 3].forEach((C) => {
          const cell = wsVendedor[XLSX.utils.encode_cell({ r: R, c: C })]
          if (cell) cell.z = '"R$" #,##0.00'
        })
      }
      XLSX.utils.book_append_sheet(wb, wsVendedor, "Resumo por Vendedor")

      // ── Aba 3: Resumo por Núcleo ──────────────────────────────────────────
      const nucleoMap: Record<string, { vendas: Set<string>; total: number }> = {}
      Object.values(vendaUnica).forEach(({ vendedor: _, total }, idx) => {
        const row = rows.find((r) => r["Código"] === Object.keys(vendaUnica)[idx])
        const n = row?.["Núcleo"] || "(Sem núcleo)"
        if (!nucleoMap[n]) nucleoMap[n] = { vendas: new Set(), total: 0 }
        nucleoMap[n].total += total
      })
      // Reconstrói pelo rows
      const vendaUnicaNucleo: Record<string, { nucleo: string; total: number }> = {}
      rows.forEach((r) => {
        if (!vendaUnicaNucleo[r["Código"]]) {
          vendaUnicaNucleo[r["Código"]] = {
            nucleo: r["Núcleo"] || "(Sem núcleo)",
            total:  r["Total Venda (R$)"],
          }
        }
      })
      const nucleoMapFinal: Record<string, { vendas: Set<string>; total: number }> = {}
      rows.forEach((r) => {
        const n = r["Núcleo"] || "(Sem núcleo)"
        if (!nucleoMapFinal[n]) nucleoMapFinal[n] = { vendas: new Set(), total: 0 }
        nucleoMapFinal[n].vendas.add(r["Código"])
      })
      Object.values(vendaUnicaNucleo).forEach(({ nucleo, total }) => {
        if (!nucleoMapFinal[nucleo]) nucleoMapFinal[nucleo] = { vendas: new Set(), total: 0 }
        nucleoMapFinal[nucleo].total += total
      })

      const resumoNucleo = Object.entries(nucleoMapFinal).map(([nome, { vendas, total }]) => ({
        "Núcleo":         nome,
        "Nº de Vendas":   vendas.size,
        "Total (R$)":     total,
        "Ticket Médio (R$)": vendas.size > 0 ? total / vendas.size : 0,
      })).sort((a, b) => b["Total (R$)"] - a["Total (R$)"])

      const wsNucleo = XLSX.utils.json_to_sheet(resumoNucleo)
      wsNucleo["!cols"] = [{ wch: 25 }, { wch: 14 }, { wch: 14 }, { wch: 18 }]
      const rnRange = XLSX.utils.decode_range(wsNucleo["!ref"] ?? "A1")
      for (let R = rnRange.s.r + 1; R <= rnRange.e.r; R++) {
        ;[2, 3].forEach((C) => {
          const cell = wsNucleo[XLSX.utils.encode_cell({ r: R, c: C })]
          if (cell) cell.z = '"R$" #,##0.00'
        })
      }
      XLSX.utils.book_append_sheet(wb, wsNucleo, "Resumo por Núcleo")

      // ── Download ───────────────────────────────────────────────────────────
      const now = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")
      XLSX.writeFile(wb, `vendas_${now}.xlsx`)

      toast.success(`${total} venda${total !== 1 ? "s" : ""} exportada${total !== 1 ? "s" : ""} com sucesso! 📊`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar planilha")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={exportar}
      disabled={loading}
      className={`rounded-full border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 transition-colors ${className ?? ""}`}
    >
      {loading
        ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
        : <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />}
      {loading ? "Exportando…" : "Exportar Excel"}
    </Button>
  )
}